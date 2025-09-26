import { DataSource, DataSourceStatus, SyncResult, CollectedRecord } from './types'
import { getDataSourceConfig } from './config'
import { adminDb } from '@/lib/firebase/admin'

export class DataSourceManager {
  private sources: Map<string, DataSource> = new Map()
  private schedules: Map<string, NodeJS.Timeout> = new Map()
  private status: Map<string, DataSourceStatus> = new Map()
  private isInitialized = false

  constructor() {
    this.loadConfiguration()
  }

  private loadConfiguration() {
    const config = getDataSourceConfig()
    
    for (const source of config.sources) {
      this.sources.set(source.id, source)
      this.status.set(source.id, {
        sourceId: source.id,
        isHealthy: true,
        lastSuccessfulSync: null,
        consecutiveErrors: 0,
        averageResponseTime: 0
      })
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('🔧 Initializing Data Source Manager...')
    
    // Create Firebase collections if they don't exist
    if (adminDb) {
      try {
        // Initialize data source tracking collection
        await this.initializeFirestoreCollections()
        console.log('✅ Firebase collections initialized')
      } catch (error) {
        console.warn('⚠️ Firebase initialization warning:', error)
      }
    }

    // Start health monitoring
    this.startHealthMonitoring()
    
    // Load previous status from database
    await this.loadStatusFromDatabase()
    
    this.isInitialized = true
    console.log(`✅ Data Source Manager initialized with ${this.sources.size} sources`)
  }

  private async initializeFirestoreCollections(): Promise<void> {
    if (!adminDb) return

    const collections = [
      'data_sources_status',
      'sync_history', 
      'collected_records'
    ]

    for (const collectionName of collections) {
      try {
        const testDoc = adminDb.collection(collectionName).doc('_init')
        await testDoc.set({ initialized: true, createdAt: new Date() })
        await testDoc.delete()
      } catch (error) {
        console.warn(`Warning initializing collection ${collectionName}:`, error)
      }
    }
  }

  private async loadStatusFromDatabase(): Promise<void> {
    if (!adminDb) return

    try {
      const snapshot = await adminDb.collection('data_sources_status').get()
      
      snapshot.docs.forEach(doc => {
        const data = doc.data() as DataSourceStatus
        this.status.set(data.sourceId, data)
      })

      console.log(`📊 Loaded status for ${snapshot.size} data sources`)
    } catch (error) {
      console.warn('Warning loading status from database:', error)
    }
  }

  async startCollection(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    console.log('🚀 Starting parallel data collection for all active sources...')

    const activeSources = this.getActiveSources()
    
    // Start all sources in parallel for faster initial collection
    const collectionPromises = activeSources.map(async (source) => {
      try {
        await this.scheduleSource(source.id)
        return { sourceId: source.id, success: true }
      } catch (error) {
        console.error(`Failed to start collection for ${source.id}:`, error)
        return { sourceId: source.id, success: false, error }
      }
    })

    const results = await Promise.allSettled(collectionPromises)
    const successful = results.filter(r => r.status === 'fulfilled').length
    
    console.log(`✅ Started collection: ${successful}/${activeSources.length} sources active`)
  }

  async stopCollection(): Promise<void> {
    console.log('🛑 Stopping all data collection...')

    for (const [sourceId, timeout] of Array.from(this.schedules.entries())) {
      clearTimeout(timeout)
      this.schedules.delete(sourceId)
    }

    console.log('✅ All data collection stopped')
  }

  private async scheduleSource(sourceId: string): Promise<void> {
    const source = this.sources.get(sourceId)
    if (!source || source.status !== 'active') return

    // Clear existing schedule
    const existingTimeout = this.schedules.get(sourceId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Schedule next collection
    const intervalMs = source.schedule.intervalMinutes * 60 * 1000
    const timeout = setTimeout(async () => {
      try {
        await this.collectFromSource(sourceId)
      } catch (error) {
        console.error(`Error collecting from ${sourceId}:`, error)
        await this.handleSourceError(sourceId, error as Error)
      }
      
      // Reschedule
      await this.scheduleSource(sourceId)
    }, intervalMs)

    this.schedules.set(sourceId, timeout)
    
    console.log(`⏰ Scheduled ${source.name} to run every ${source.schedule.intervalMinutes} minutes`)
  }

  private async collectFromSource(sourceId: string): Promise<SyncResult> {
    const source = this.sources.get(sourceId)
    if (!source) {
      throw new Error(`Source ${sourceId} not found`)
    }

    const startTime = new Date()
    console.log(`🔄 Starting collection from ${source.name}...`)

    try {
      // Dynamic import of collector based on source type
      const collector = await this.getCollector(source)
      const records = await collector.collect()

      // Process and store records
      const processedRecords = await this.processRecords(sourceId, records)
      
      const endTime = new Date()
      const syncResult: SyncResult = {
        sourceId,
        startTime,
        endTime,
        recordsProcessed: records.length,
        recordsAdded: processedRecords.added,
        recordsUpdated: processedRecords.updated,
        recordsSkipped: processedRecords.skipped,
        errors: [],
        success: true
      }

      // Update source status
      await this.updateSourceStatus(sourceId, {
        isHealthy: true,
        lastSuccessfulSync: endTime,
        consecutiveErrors: 0,
        averageResponseTime: endTime.getTime() - startTime.getTime()
      })

      // Save sync history
      await this.saveSyncHistory(syncResult)

      console.log(`✅ ${source.name}: Processed ${records.length} records (${processedRecords.added} new, ${processedRecords.updated} updated)`)
      
      return syncResult

    } catch (error) {
      const endTime = new Date()
      const syncResult: SyncResult = {
        sourceId,
        startTime,
        endTime,
        recordsProcessed: 0,
        recordsAdded: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        success: false
      }

      await this.handleSourceError(sourceId, error as Error)
      await this.saveSyncHistory(syncResult)

      throw error
    }
  }

  private async getCollector(source: DataSource): Promise<any> {
    switch (source.id) {
      case 'namus':
        const { NamusCollector } = await import('./collectors/NamusCollector')
        return new NamusCollector(source)
      
      case 'amber_alerts':
        const { AmberAlertCollector } = await import('./collectors/AmberAlertCollector')
        return new AmberAlertCollector(source)
        
      case 'ncmec':
        const { NCMECCollector } = await import('./collectors/NCMECCollector')
        return new NCMECCollector(source)

      case 'florida_fdle':
        const { FloridaFDLECollector } = await import('./collectors/FloridaFDLECollector')
        return new FloridaFDLECollector(source)

      case 'california_doj':
        const { CaliforniaDOJCollector } = await import('./collectors/CaliforniaDOJCollector')
        return new CaliforniaDOJCollector(source)

      case 'texas_dps':
        const { TexasDPSCollector } = await import('./collectors/TexasDPSCollector')
        return new TexasDPSCollector(source)
        
      default:
        throw new Error(`No collector available for source: ${source.id}`)
    }
  }

  private async processRecords(sourceId: string, records: CollectedRecord[]): Promise<{added: number, updated: number, skipped: number}> {
    // This will be enhanced with validation and deduplication
    let added = 0, updated = 0, skipped = 0

    for (const record of records) {
      try {
        // Store in collected_records collection for processing
        if (adminDb) {
          await adminDb.collection('collected_records').add({
            ...record,
            processedAt: new Date(),
            status: 'pending'
          })
          added++
        }
      } catch (error) {
        console.error(`Error storing record from ${sourceId}:`, error)
        skipped++
      }
    }

    return { added, updated, skipped }
  }

  private async updateSourceStatus(sourceId: string, updates: Partial<DataSourceStatus>): Promise<void> {
    const currentStatus = this.status.get(sourceId)
    if (!currentStatus) return

    const newStatus = { ...currentStatus, ...updates }
    this.status.set(sourceId, newStatus)

    // Save to database
    if (adminDb) {
      try {
        await adminDb.collection('data_sources_status').doc(sourceId).set(newStatus)
      } catch (error) {
        console.warn(`Warning saving status for ${sourceId}:`, error)
      }
    }
  }

  private async handleSourceError(sourceId: string, error: Error): Promise<void> {
    const source = this.sources.get(sourceId)
    if (!source) return

    source.errorCount++
    
    const status = this.status.get(sourceId)
    if (status) {
      status.consecutiveErrors++
      status.isHealthy = status.consecutiveErrors < 3
      status.lastError = error.message
      
      await this.updateSourceStatus(sourceId, status)
    }

    // Disable source if too many consecutive errors
    if (source.errorCount > 5) {
      source.status = 'error'
      console.error(`❌ Disabling source ${source.name} due to repeated errors`)
    }

    console.error(`Error in ${source.name}:`, error.message)
  }

  private async saveSyncHistory(result: SyncResult): Promise<void> {
    if (!adminDb) return

    try {
      await adminDb.collection('sync_history').add(result)
    } catch (error) {
      console.warn('Warning saving sync history:', error)
    }
  }

  private startHealthMonitoring(): void {
    const config = getDataSourceConfig()
    
    setInterval(async () => {
      for (const [sourceId, source] of Array.from(this.sources.entries())) {
        const status = this.status.get(sourceId)
        
        if (status && source.status === 'active') {
          const timeSinceLastSync = status.lastSuccessfulSync ? 
            Date.now() - status.lastSuccessfulSync.getTime() : Infinity
          
          const expectedInterval = source.schedule.intervalMinutes * 60 * 1000 * 2 // 2x tolerance
          
          if (timeSinceLastSync > expectedInterval) {
            console.warn(`⚠️ ${source.name} hasn't synced in ${Math.round(timeSinceLastSync / 60000)} minutes`)
            status.isHealthy = false
            await this.updateSourceStatus(sourceId, status)
          }
        }
      }
    }, config.globalSettings.healthCheckIntervalMs)
  }

  // Public API methods
  getActiveSources(): DataSource[] {
    return Array.from(this.sources.values()).filter(s => s.status === 'active')
  }

  getSourceStatus(sourceId: string): DataSourceStatus | undefined {
    return this.status.get(sourceId)
  }

  getAllStatus(): DataSourceStatus[] {
    return Array.from(this.status.values())
  }

  async getRecentSyncHistory(limit: number = 10): Promise<SyncResult[]> {
    if (!adminDb) return []

    try {
      const snapshot = await adminDb.collection('sync_history')
        .orderBy('startTime', 'desc')
        .limit(limit)
        .get()

      return snapshot.docs.map(doc => doc.data() as SyncResult)
    } catch (error) {
      console.warn('Warning getting sync history:', error)
      return []
    }
  }

  async triggerManualSync(sourceId: string): Promise<SyncResult> {
    const source = this.sources.get(sourceId)
    if (!source) {
      throw new Error(`Source ${sourceId} not found`)
    }

    console.log(`🔄 Manual sync triggered for ${source.name}`)
    return await this.collectFromSource(sourceId)
  }

  async runParallelCollection(sourceIds?: string[]): Promise<SyncResult[]> {
    console.log('⚡ Starting parallel collection...')
    
    const sourcesToCollect = sourceIds ? 
      sourceIds.map(id => this.sources.get(id)).filter(Boolean) as DataSource[] :
      this.getActiveSources()

    const collectionPromises = sourcesToCollect.map(async (source) => {
      try {
        const result = await this.collectFromSource(source.id)
        return { ...result, success: true }
      } catch (error) {
        console.error(`Parallel collection failed for ${source.name}:`, error)
        return {
          sourceId: source.id,
          startTime: new Date(),
          endTime: new Date(),
          recordsProcessed: 0,
          recordsAdded: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          errors: [error instanceof Error ? error.message : String(error)],
          success: false
        } as SyncResult
      }
    })

    const results = await Promise.all(collectionPromises)
    
    const successful = results.filter(r => r.success).length
    const totalRecords = results.reduce((sum, r) => sum + r.recordsProcessed, 0)
    
    console.log(`⚡ Parallel collection complete: ${successful}/${results.length} sources, ${totalRecords} total records`)
    
    return results
  }

  async runBatchProcessing(batchSize: number = 3): Promise<SyncResult[]> {
    console.log(`📦 Starting batch processing (batch size: ${batchSize})...`)
    
    const activeSources = this.getActiveSources()
    const results: SyncResult[] = []
    
    // Process sources in batches to manage resource usage
    for (let i = 0; i < activeSources.length; i += batchSize) {
      const batch = activeSources.slice(i, i + batchSize)
      const batchIds = batch.map(s => s.id)
      
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}: ${batchIds.join(', ')}`)
      
      const batchResults = await this.runParallelCollection(batchIds)
      results.push(...batchResults)
      
      // Small delay between batches to prevent overwhelming APIs
      if (i + batchSize < activeSources.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    console.log(`📦 Batch processing complete: ${results.length} total operations`)
    return results
  }
}

// Singleton instance
export const dataSourceManager = new DataSourceManager()