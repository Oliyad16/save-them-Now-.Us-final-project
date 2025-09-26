import { dataSourceManager } from '../data-sources/DataSourceManager'
import { changeDetectionService } from '../data-processing/ChangeDetectionService'
import { realtimeService } from '../realtime/RealtimeService'

export interface SchedulerConfig {
  intervals: {
    dataCollection: number // minutes
    changeDetection: number // minutes
    healthCheck: number // minutes
    amberAlerts: number // minutes
  }
  retries: {
    maxAttempts: number
    backoffMultiplier: number
  }
  priorities: {
    criticalCases: string[]
    highPrioritySources: string[]
  }
}

export class SchedulerService {
  private config: SchedulerConfig
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private isRunning = false
  private stats = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    lastSuccessfulRun: null as Date | null,
    averageRunTime: 0
  }

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = {
      intervals: {
        dataCollection: 30, // Every 30 minutes
        changeDetection: 5,  // Every 5 minutes  
        healthCheck: 1,     // Every minute
        amberAlerts: 2      // Every 2 minutes for AMBER alerts
      },
      retries: {
        maxAttempts: 3,
        backoffMultiplier: 2
      },
      priorities: {
        criticalCases: ['Missing Children', 'AMBER Alert'],
        highPrioritySources: ['amber_alerts', 'ncmec', 'namus']
      },
      ...config
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running')
      return
    }

    console.log('🚀 Starting Scheduler Service...')
    
    try {
      // Initialize data source manager
      await dataSourceManager.initialize()
      
      // Schedule different tasks
      this.scheduleDataCollection()
      this.scheduleChangeDetection()
      this.scheduleHealthChecks()
      this.scheduleAmberAlertMonitoring()
      
      this.isRunning = true
      console.log('✅ Scheduler Service started successfully')
      
      // Initial run
      await this.runInitialCollection()
      
    } catch (error) {
      console.error('❌ Failed to start Scheduler Service:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    console.log('🛑 Stopping Scheduler Service...')
    
    // Clear all intervals
    for (const [name, interval] of this.intervals) {
      clearTimeout(interval)
      console.log(`Cleared interval: ${name}`)
    }
    this.intervals.clear()
    
    // Stop data source manager
    await dataSourceManager.stopCollection()
    
    this.isRunning = false
    console.log('✅ Scheduler Service stopped')
  }

  private scheduleDataCollection(): void {
    const intervalMs = this.config.intervals.dataCollection * 60 * 1000
    
    const runCollection = async () => {
      try {
        console.log('📊 Starting scheduled data collection...')
        const startTime = Date.now()
        
        // Run data collection for high priority sources first
        await this.runPriorityCollection()
        
        // Then run regular collection
        await dataSourceManager.startCollection()
        
        const endTime = Date.now()
        const duration = endTime - startTime
        
        this.updateStats(true, duration)
        console.log(`✅ Data collection completed in ${duration}ms`)
        
      } catch (error) {
        console.error('❌ Scheduled data collection failed:', error)
        this.updateStats(false, 0)
      } finally {
        // Schedule next run
        const timeout = setTimeout(runCollection, intervalMs)
        this.intervals.set('dataCollection', timeout)
      }
    }

    // Start first run after a short delay
    const timeout = setTimeout(runCollection, 5000) // 5 seconds
    this.intervals.set('dataCollection', timeout)
  }

  private scheduleChangeDetection(): void {
    const intervalMs = this.config.intervals.changeDetection * 60 * 1000
    
    const runChangeDetection = async () => {
      try {
        console.log('🔍 Running change detection...')
        const changes = await changeDetectionService.processCollectedRecords()
        
        if (changes.length > 0) {
          console.log(`📱 Detected ${changes.length} changes`)
          
          // Broadcast critical changes immediately
          for (const change of changes) {
            if (change.priority === 'critical' || change.type === 'amber_alert') {
              await realtimeService.broadcastUpdate(change)
            }
          }
        }
        
      } catch (error) {
        console.error('❌ Change detection failed:', error)
      } finally {
        // Schedule next run
        const timeout = setTimeout(runChangeDetection, intervalMs)
        this.intervals.set('changeDetection', timeout)
      }
    }

    const timeout = setTimeout(runChangeDetection, 10000) // 10 seconds
    this.intervals.set('changeDetection', timeout)
  }

  private scheduleHealthChecks(): void {
    const intervalMs = this.config.intervals.healthCheck * 60 * 1000
    
    const runHealthCheck = async () => {
      try {
        console.log('🏥 Running health check...')
        
        // Check data source manager health
        const sourceStatuses = dataSourceManager.getAllStatus()
        const unhealthySources = sourceStatuses.filter(s => !s.isHealthy)
        
        if (unhealthySources.length > 0) {
          console.warn(`⚠️ ${unhealthySources.length} unhealthy data sources:`, 
            unhealthySources.map(s => s.sourceId))
        }
        
        // Check for stale data
        await this.checkDataStaleness()
        
        // Log overall health
        const healthyCount = sourceStatuses.length - unhealthySources.length
        console.log(`💚 System health: ${healthyCount}/${sourceStatuses.length} sources healthy`)
        
      } catch (error) {
        console.error('❌ Health check failed:', error)
      } finally {
        // Schedule next run
        const timeout = setTimeout(runHealthCheck, intervalMs)
        this.intervals.set('healthCheck', timeout)
      }
    }

    const timeout = setTimeout(runHealthCheck, 15000) // 15 seconds
    this.intervals.set('healthCheck', timeout)
  }

  private scheduleAmberAlertMonitoring(): void {
    const intervalMs = this.config.intervals.amberAlerts * 60 * 1000
    
    const runAmberAlertCheck = async () => {
      try {
        console.log('🚨 Checking for AMBER Alerts...')
        
        // Trigger specific AMBER alert collection
        await dataSourceManager.triggerManualSync('amber_alerts')
        
      } catch (error) {
        console.error('❌ AMBER Alert check failed:', error)
      } finally {
        // Schedule next run
        const timeout = setTimeout(runAmberAlertCheck, intervalMs)
        this.intervals.set('amberAlertCheck', timeout)
      }
    }

    const timeout = setTimeout(runAmberAlertCheck, 2000) // 2 seconds
    this.intervals.set('amberAlertCheck', timeout)
  }

  private async runInitialCollection(): Promise<void> {
    console.log('🎯 Running initial data collection...')
    
    try {
      // Start with high priority sources
      await this.runPriorityCollection()
      
      // Then start regular collection
      await dataSourceManager.startCollection()
      
      console.log('✅ Initial collection completed')
    } catch (error) {
      console.error('❌ Initial collection failed:', error)
    }
  }

  private async runPriorityCollection(): Promise<void> {
    const prioritySources = this.config.priorities.highPrioritySources
    
    for (const sourceId of prioritySources) {
      try {
        console.log(`⚡ Running priority collection for ${sourceId}`)
        await dataSourceManager.triggerManualSync(sourceId)
      } catch (error) {
        console.warn(`Priority collection failed for ${sourceId}:`, error)
      }
    }
  }

  private async checkDataStaleness(): Promise<void> {
    try {
      // Check when we last successfully collected data
      const recentHistory = await dataSourceManager.getRecentSyncHistory(5)
      
      if (recentHistory.length === 0) {
        console.warn('⚠️ No recent sync history found')
        return
      }

      const lastSuccessfulSync = recentHistory.find(h => h.success)
      if (lastSuccessfulSync) {
        const staleness = Date.now() - lastSuccessfulSync.endTime.getTime()
        const hoursStale = staleness / (1000 * 60 * 60)
        
        if (hoursStale > 6) { // 6 hours threshold
          console.warn(`⚠️ Data is ${hoursStale.toFixed(1)} hours stale`)
          
          if (hoursStale > 12) { // 12 hours = critical
            console.error('🚨 CRITICAL: Data staleness exceeds 12 hours')
            // Trigger immediate collection
            await this.runPriorityCollection()
          }
        }
      }
    } catch (error) {
      console.warn('Failed to check data staleness:', error)
    }
  }

  private updateStats(success: boolean, duration: number): void {
    this.stats.totalRuns++
    
    if (success) {
      this.stats.successfulRuns++
      this.stats.lastSuccessfulRun = new Date()
      
      // Update rolling average
      const totalDuration = this.stats.averageRunTime * (this.stats.successfulRuns - 1) + duration
      this.stats.averageRunTime = totalDuration / this.stats.successfulRuns
    } else {
      this.stats.failedRuns++
    }
  }

  getStatistics() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      activeIntervals: Array.from(this.intervals.keys()),
      successRate: this.stats.totalRuns > 0 ? 
        (this.stats.successfulRuns / this.stats.totalRuns * 100).toFixed(2) + '%' : '0%',
      config: this.config
    }
  }

  updateConfig(newConfig: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('📝 Scheduler configuration updated')
  }

  async forceCollection(sourceId?: string): Promise<void> {
    console.log('🔥 Forcing immediate collection...')
    
    if (sourceId) {
      await dataSourceManager.triggerManualSync(sourceId)
    } else {
      await this.runPriorityCollection()
    }
  }

  async restartUnhealthySources(): Promise<void> {
    console.log('🔄 Restarting unhealthy sources...')
    
    const unhealthySources = dataSourceManager.getAllStatus().filter(s => !s.isHealthy)
    
    for (const source of unhealthySources) {
      try {
        console.log(`Restarting source: ${source.sourceId}`)
        await dataSourceManager.triggerManualSync(source.sourceId)
      } catch (error) {
        console.error(`Failed to restart ${source.sourceId}:`, error)
      }
    }
  }
}

// Singleton instance
export const schedulerService = new SchedulerService()

// Auto-start in production
if (process.env.NODE_ENV === 'production' && process.env.AUTO_START_SCHEDULER === 'true') {
  schedulerService.start().catch(console.error)
}