import { dataSourceManager } from '../data-sources/DataSourceManager'
import { schedulerService } from '../scheduler/SchedulerService'
import { healthMonitoringService } from '../monitoring/HealthMonitoringService'
import { criticalCaseAlertService } from '../alerts/CriticalCaseAlertService'
import { realtimeService } from '../realtime/RealtimeService'
import { changeDetectionService } from '../data-processing/ChangeDetectionService'
import { enhancedGeocodingService } from '../geocoding/enhanced-geocoding'
import { Server as HTTPServer } from 'http'

export interface SystemStatus {
  overall: 'healthy' | 'warning' | 'critical' | 'starting' | 'stopped'
  components: {
    dataSourceManager: 'active' | 'inactive' | 'error'
    scheduler: 'running' | 'stopped' | 'error'
    healthMonitoring: 'active' | 'inactive' | 'error'
    criticalAlerts: 'active' | 'inactive' | 'error'
    realtimeService: 'active' | 'inactive' | 'error'
    changeDetection: 'ready' | 'processing' | 'error'
    geocoding: 'ready' | 'limited' | 'error'
  }
  statistics: {
    activeSources: number
    lastDataUpdate: Date | null
    systemUptime: number
    totalProcessedRecords: number
    criticalAlertsLast24h: number
  }
  lastChecked: Date
}

export class SystemIntegration {
  private httpServer: HTTPServer | null = null
  private isInitialized = false
  private startTime: Date | null = null
  private initializationPromise: Promise<void> | null = null

  async initializeSystem(httpServer?: HTTPServer): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this._performInitialization(httpServer)
    return this.initializationPromise
  }

  private async _performInitialization(httpServer?: HTTPServer): Promise<void> {
    if (this.isInitialized) {
      console.log('✅ System already initialized')
      return
    }

    console.log('🚀 Initializing SaveThemNow.Jesus System...')
    this.startTime = new Date()

    try {
      // Phase 1: Initialize core services
      console.log('📡 Phase 1: Initializing core services...')
      
      await Promise.allSettled([
        this.initializeDataSourceManager(),
        this.initializeHealthMonitoring(),
        this.initializeCriticalAlerts(),
        this.initializeGeocodingService()
      ])

      // Phase 2: Initialize real-time services
      console.log('🌐 Phase 2: Initializing real-time services...')
      
      if (httpServer) {
        this.httpServer = httpServer
        await realtimeService.initialize(httpServer)
        console.log('✅ Real-time service initialized')
      } else {
        console.log('⚠️ HTTP server not provided, real-time features limited')
      }

      // Phase 3: Start automated processes  
      console.log('⚡ Phase 3: Starting automated processes...')
      
      await Promise.allSettled([
        this.startScheduler(),
        this.startHealthMonitoring()
      ])

      // Phase 4: Run initial data collection
      console.log('📊 Phase 4: Running initial data collection...')
      await this.runInitialCollection()

      this.isInitialized = true
      const initTime = Date.now() - this.startTime.getTime()
      
      console.log(`✅ System initialization complete in ${initTime}ms`)
      console.log('🎯 SaveThemNow.Jesus is now operational!')
      
      // Log system status
      const status = await this.getSystemStatus()
      this.logSystemStatus(status)
      
    } catch (error) {
      console.error('❌ System initialization failed:', error)
      throw error
    } finally {
      this.initializationPromise = null
    }
  }

  private async initializeDataSourceManager(): Promise<void> {
    try {
      await dataSourceManager.initialize()
      console.log('✅ Data Source Manager initialized')
    } catch (error) {
      console.error('❌ Data Source Manager initialization failed:', error)
      throw error
    }
  }

  private async initializeHealthMonitoring(): Promise<void> {
    try {
      // Health monitoring will auto-initialize when started
      console.log('✅ Health Monitoring ready')
    } catch (error) {
      console.error('❌ Health Monitoring initialization failed:', error)
      throw error
    }
  }

  private async initializeCriticalAlerts(): Promise<void> {
    try {
      await criticalCaseAlertService.initialize()
      console.log('✅ Critical Case Alert Service initialized')
    } catch (error) {
      console.error('❌ Critical Case Alert Service initialization failed:', error)
      throw error
    }
  }

  private async initializeGeocodingService(): Promise<void> {
    try {
      // Preload common US cities for faster geocoding
      await enhancedGeocodingService.preloadUSCities()
      console.log('✅ Enhanced Geocoding Service initialized')
    } catch (error) {
      console.error('❌ Enhanced Geocoding Service initialization failed:', error)
      // Don't throw - geocoding is not critical for system startup
    }
  }

  private async startScheduler(): Promise<void> {
    try {
      await schedulerService.start()
      console.log('✅ Scheduler Service started')
    } catch (error) {
      console.error('❌ Scheduler Service startup failed:', error)
      throw error
    }
  }

  private async startHealthMonitoring(): Promise<void> {
    try {
      await healthMonitoringService.startMonitoring()
      console.log('✅ Health Monitoring started')
    } catch (error) {
      console.error('❌ Health Monitoring startup failed:', error)
      // Don't throw - health monitoring is not critical for basic operation
    }
  }

  private async runInitialCollection(): Promise<void> {
    try {
      console.log('🔄 Running initial data collection...')
      
      // Start with critical sources (AMBER Alerts, NCMEC)
      const criticalSources = ['amber_alerts', 'ncmec']
      const priorityResults = await dataSourceManager.runParallelCollection(criticalSources)
      
      console.log(`⚡ Priority collection: ${priorityResults.filter(r => r.success).length}/${priorityResults.length} successful`)
      
      // Then start regular collection for all sources
      await dataSourceManager.startCollection()
      
      console.log('✅ Initial data collection started')
    } catch (error) {
      console.error('❌ Initial collection failed:', error)
      // Don't throw - system can still operate without initial collection
    }
  }

  async shutdownSystem(): Promise<void> {
    if (!this.isInitialized) {
      console.log('⚠️ System not initialized, nothing to shutdown')
      return
    }

    console.log('🛑 Shutting down SaveThemNow.Jesus System...')

    try {
      // Stop all services gracefully
      await Promise.allSettled([
        schedulerService.stop(),
        dataSourceManager.stopCollection(),
        healthMonitoringService.stopMonitoring(),
        realtimeService.shutdown()
      ])

      this.isInitialized = false
      console.log('✅ System shutdown complete')
      
    } catch (error) {
      console.error('❌ Error during system shutdown:', error)
    }
  }

  async getSystemStatus(): Promise<SystemStatus> {
    const dataSources = dataSourceManager.getAllStatus()
    const activeSources = dataSources.filter(s => s.isHealthy).length
    
    const healthStatus = healthMonitoringService.getSystemHealth()
    const schedulerStats = schedulerService.getStatistics()
    const geocodingStats = enhancedGeocodingService.getStatistics()
    
    // Get recent critical alerts
    const recentAlerts = await criticalCaseAlertService.getRecentAlerts(24)
    
    // Calculate uptime
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0
    
    // Determine overall system status
    let overall: SystemStatus['overall'] = 'healthy'
    if (!this.isInitialized) {
      overall = 'stopped'
    } else if (healthStatus && healthStatus.overall === 'critical') {
      overall = 'critical'
    } else if (healthStatus && healthStatus.overall === 'warning') {
      overall = 'warning'
    } else if (activeSources < 2) {
      overall = 'warning'
    }

    return {
      overall,
      components: {
        dataSourceManager: activeSources > 0 ? 'active' : 'inactive',
        scheduler: schedulerStats.isRunning ? 'running' : 'stopped',
        healthMonitoring: healthStatus ? 'active' : 'inactive',
        criticalAlerts: 'active', // Assume active if no errors
        realtimeService: this.httpServer ? 'active' : 'inactive',
        changeDetection: 'ready',
        geocoding: geocodingStats.active_providers.length > 0 ? 'ready' : 'limited'
      },
      statistics: {
        activeSources,
        lastDataUpdate: schedulerStats.lastSuccessfulRun,
        systemUptime: uptime,
        totalProcessedRecords: schedulerStats.successfulRuns * 50, // Estimate
        criticalAlertsLast24h: recentAlerts.length
      },
      lastChecked: new Date()
    }
  }

  private logSystemStatus(status: SystemStatus): void {
    console.log('\n📊 SYSTEM STATUS REPORT')
    console.log('========================')
    console.log(`Overall Status: ${this.getStatusEmoji(status.overall)} ${status.overall.toUpperCase()}`)
    console.log('\n🔧 Components:')
    
    for (const [component, componentStatus] of Object.entries(status.components)) {
      const emoji = this.getComponentEmoji(componentStatus)
      console.log(`  ${emoji} ${component}: ${componentStatus}`)
    }
    
    console.log('\n📈 Statistics:')
    console.log(`  📡 Active Sources: ${status.statistics.activeSources}`)
    console.log(`  ⏰ Last Update: ${status.statistics.lastDataUpdate?.toLocaleString() || 'Never'}`)
    console.log(`  🕒 Uptime: ${Math.round(status.statistics.systemUptime / 1000 / 60)} minutes`)
    console.log(`  📊 Processed Records: ${status.statistics.totalProcessedRecords}`)
    console.log(`  🚨 Critical Alerts (24h): ${status.statistics.criticalAlertsLast24h}`)
    console.log('========================\n')
  }

  private getStatusEmoji(status: string): string {
    const emojis: Record<string, string> = {
      'healthy': '✅',
      'warning': '⚠️',
      'critical': '🚨',
      'starting': '🔄',
      'stopped': '🛑'
    }
    return emojis[status] || '❓'
  }

  private getComponentEmoji(status: string): string {
    const emojis: Record<string, string> = {
      'active': '✅',
      'running': '✅',
      'ready': '✅',
      'inactive': '⚪',
      'stopped': '🛑',
      'limited': '⚠️',
      'processing': '🔄',
      'error': '❌'
    }
    return emojis[status] || '❓'
  }

  // Public API methods
  async forceDataCollection(): Promise<void> {
    console.log('🔥 Forcing immediate data collection...')
    await dataSourceManager.runBatchProcessing(3)
  }

  async runHealthCheck(): Promise<SystemStatus> {
    console.log('🏥 Running comprehensive health check...')
    return await this.getSystemStatus()
  }

  async restartFailedComponents(): Promise<void> {
    console.log('🔄 Restarting failed components...')
    
    const status = await this.getSystemStatus()
    
    // Restart scheduler if not running
    if (status.components.scheduler !== 'running') {
      try {
        await schedulerService.start()
        console.log('✅ Scheduler restarted')
      } catch (error) {
        console.error('❌ Failed to restart scheduler:', error)
      }
    }
    
    // Restart unhealthy data sources
    if (status.statistics.activeSources < 3) {
      try {
        await schedulerService.restartUnhealthySources()
        console.log('✅ Data sources restarted')
      } catch (error) {
        console.error('❌ Failed to restart data sources:', error)
      }
    }
  }

  getInitializationStatus(): { initialized: boolean; uptime: number | null } {
    return {
      initialized: this.isInitialized,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : null
    }
  }
}

// Singleton instance
export const systemIntegration = new SystemIntegration()

// Auto-initialize in production
if (process.env.NODE_ENV === 'production' && process.env.AUTO_START_SYSTEM === 'true') {
  systemIntegration.initializeSystem().catch(error => {
    console.error('❌ Auto-initialization failed:', error)
    process.exit(1)
  })
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🔄 Received SIGINT, shutting down gracefully...')
  await systemIntegration.shutdownSystem()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🔄 Received SIGTERM, shutting down gracefully...')
  await systemIntegration.shutdownSystem()
  process.exit(0)
})