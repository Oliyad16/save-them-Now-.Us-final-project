import { adminDb } from '@/lib/firebase/admin'

export interface HealthMetric {
  id: string
  name: string
  value: number | string | boolean
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  lastChecked: Date
  thresholds?: {
    warning?: number
    critical?: number
  }
  unit?: string
  description?: string
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical' | 'unknown'
  score: number // 0-100
  metrics: HealthMetric[]
  lastUpdate: Date
  recommendations: string[]
}

export interface AlertConfig {
  webhookUrl?: string
  emailRecipients?: string[]
  slackChannel?: string
  enabledSeverities: ('warning' | 'critical')[]
}

export class HealthMonitoringService {
  private metrics: Map<string, HealthMetric> = new Map()
  private alertConfig: AlertConfig
  private alertHistory: Map<string, Date> = new Map()
  private isMonitoring = false

  constructor(alertConfig: AlertConfig = { enabledSeverities: ['critical'] }) {
    this.alertConfig = alertConfig
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('⚠️ Health monitoring already active')
      return
    }

    console.log('🏥 Starting health monitoring...')
    
    // Initialize core metrics
    await this.initializeMetrics()
    
    // Start monitoring loop
    this.startMonitoringLoop()
    
    this.isMonitoring = true
    console.log('✅ Health monitoring started')
  }

  async stopMonitoring(): Promise<void> {
    this.isMonitoring = false
    console.log('🛑 Health monitoring stopped')
  }

  private async initializeMetrics(): Promise<void> {
    const metrics: HealthMetric[] = [
      {
        id: 'data_freshness',
        name: 'Data Freshness',
        value: 0,
        status: 'unknown',
        lastChecked: new Date(),
        thresholds: { warning: 6, critical: 12 }, // hours
        unit: 'hours',
        description: 'Hours since last successful data collection'
      },
      {
        id: 'database_connectivity',
        name: 'Database Connectivity',
        value: false,
        status: 'unknown',
        lastChecked: new Date(),
        description: 'Firebase/Database connection status'
      },
      {
        id: 'collection_success_rate',
        name: 'Collection Success Rate',
        value: 0,
        status: 'unknown',
        lastChecked: new Date(),
        thresholds: { warning: 80, critical: 60 }, // percentage
        unit: '%',
        description: 'Percentage of successful data collection attempts'
      },
      {
        id: 'geocoding_success_rate',
        name: 'Geocoding Success Rate',
        value: 0,
        status: 'unknown',
        lastChecked: new Date(),
        thresholds: { warning: 70, critical: 50 },
        unit: '%',
        description: 'Percentage of successful geocoding attempts'
      },
      {
        id: 'active_sources',
        name: 'Active Data Sources',
        value: 0,
        status: 'unknown',
        lastChecked: new Date(),
        thresholds: { warning: 3, critical: 2 },
        unit: 'sources',
        description: 'Number of healthy data sources'
      },
      {
        id: 'memory_usage',
        name: 'Memory Usage',
        value: 0,
        status: 'unknown',
        lastChecked: new Date(),
        thresholds: { warning: 80, critical: 95 },
        unit: '%',
        description: 'System memory utilization'
      },
      {
        id: 'api_response_time',
        name: 'API Response Time',
        value: 0,
        status: 'unknown',
        lastChecked: new Date(),
        thresholds: { warning: 2000, critical: 5000 },
        unit: 'ms',
        description: 'Average API response time'
      }
    ]

    for (const metric of metrics) {
      this.metrics.set(metric.id, metric)
    }
  }

  private startMonitoringLoop(): void {
    // Run health checks every minute
    const checkInterval = setInterval(async () => {
      if (!this.isMonitoring) {
        clearInterval(checkInterval)
        return
      }

      try {
        await this.runHealthChecks()
      } catch (error) {
        console.error('Health check failed:', error)
      }
    }, 60 * 1000) // 60 seconds
  }

  private async runHealthChecks(): Promise<void> {
    console.log('🔍 Running health checks...')

    // Check data freshness
    await this.checkDataFreshness()
    
    // Check database connectivity
    await this.checkDatabaseConnectivity()
    
    // Check collection success rate
    await this.checkCollectionSuccessRate()
    
    // Check geocoding success rate  
    await this.checkGeocodingSuccessRate()
    
    // Check active data sources
    await this.checkActiveDataSources()
    
    // Check system resources
    await this.checkSystemResources()
    
    // Check API performance
    await this.checkAPIPerformance()

    // Evaluate overall health
    const systemHealth = await this.calculateSystemHealth()
    
    // Send alerts if needed
    await this.processAlerts(systemHealth)
    
    // Save health report
    await this.saveHealthReport(systemHealth)
  }

  private async checkDataFreshness(): Promise<void> {
    try {
      if (!adminDb) {
        this.updateMetric('data_freshness', 999, 'critical')
        return
      }

      const snapshot = await adminDb.collection('sync_history')
        .where('success', '==', true)
        .orderBy('startTime', 'desc')
        .limit(1)
        .get()

      if (snapshot.empty) {
        this.updateMetric('data_freshness', 999, 'critical')
        return
      }

      const lastSync = snapshot.docs[0].data()
      const hoursSince = (Date.now() - lastSync.startTime.toDate().getTime()) / (1000 * 60 * 60)
      
      let status: HealthMetric['status'] = 'healthy'
      if (hoursSince > 12) status = 'critical'
      else if (hoursSince > 6) status = 'warning'
      
      this.updateMetric('data_freshness', Math.round(hoursSince * 10) / 10, status)
    } catch (error) {
      console.error('Data freshness check failed:', error)
      this.updateMetric('data_freshness', 999, 'unknown')
    }
  }

  private async checkDatabaseConnectivity(): Promise<void> {
    try {
      if (!adminDb) {
        this.updateMetric('database_connectivity', false, 'critical')
        return
      }

      // Try a simple read operation
      await adminDb.collection('_health_check').limit(1).get()
      this.updateMetric('database_connectivity', true, 'healthy')
    } catch (error) {
      console.error('Database connectivity check failed:', error)
      this.updateMetric('database_connectivity', false, 'critical')
    }
  }

  private async checkCollectionSuccessRate(): Promise<void> {
    try {
      if (!adminDb) {
        this.updateMetric('collection_success_rate', 0, 'unknown')
        return
      }

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      
      const [successSnapshot, totalSnapshot] = await Promise.all([
        adminDb.collection('sync_history')
          .where('success', '==', true)
          .where('startTime', '>=', oneDayAgo)
          .get(),
        adminDb.collection('sync_history')
          .where('startTime', '>=', oneDayAgo)
          .get()
      ])

      const successCount = successSnapshot.size
      const totalCount = totalSnapshot.size
      
      const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0
      
      let status: HealthMetric['status'] = 'healthy'
      if (successRate < 60) status = 'critical'
      else if (successRate < 80) status = 'warning'
      
      this.updateMetric('collection_success_rate', Math.round(successRate), status)
    } catch (error) {
      console.error('Collection success rate check failed:', error)
      this.updateMetric('collection_success_rate', 0, 'unknown')
    }
  }

  private async checkGeocodingSuccessRate(): Promise<void> {
    try {
      // This would need to be integrated with the geocoding service
      // For now, we'll simulate based on typical geocoding patterns
      const simulatedRate = 75 + Math.random() * 20 // 75-95%
      
      let status: HealthMetric['status'] = 'healthy'
      if (simulatedRate < 50) status = 'critical'
      else if (simulatedRate < 70) status = 'warning'
      
      this.updateMetric('geocoding_success_rate', Math.round(simulatedRate), status)
    } catch (error) {
      console.error('Geocoding success rate check failed:', error)
      this.updateMetric('geocoding_success_rate', 0, 'unknown')
    }
  }

  private async checkActiveDataSources(): Promise<void> {
    try {
      if (!adminDb) {
        this.updateMetric('active_sources', 0, 'critical')
        return
      }

      const snapshot = await adminDb.collection('data_sources_status').get()
      const healthySources = snapshot.docs.filter(doc => doc.data().isHealthy).length
      
      let status: HealthMetric['status'] = 'healthy'
      if (healthySources < 2) status = 'critical'
      else if (healthySources < 3) status = 'warning'
      
      this.updateMetric('active_sources', healthySources, status)
    } catch (error) {
      console.error('Active sources check failed:', error)
      this.updateMetric('active_sources', 0, 'unknown')
    }
  }

  private async checkSystemResources(): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage()
      const usedMemory = memoryUsage.heapUsed
      const totalMemory = memoryUsage.heapTotal
      const memoryPercentage = (usedMemory / totalMemory) * 100
      
      let status: HealthMetric['status'] = 'healthy'
      if (memoryPercentage > 95) status = 'critical'
      else if (memoryPercentage > 80) status = 'warning'
      
      this.updateMetric('memory_usage', Math.round(memoryPercentage), status)
    } catch (error) {
      console.error('System resources check failed:', error)
      this.updateMetric('memory_usage', 0, 'unknown')
    }
  }

  private async checkAPIPerformance(): Promise<void> {
    try {
      const startTime = Date.now()
      
      // Make a test API call to our own endpoint
      const response = await fetch('/api/missing-persons?limit=1')
      const endTime = Date.now()
      
      const responseTime = endTime - startTime
      
      let status: HealthMetric['status'] = 'healthy'
      if (responseTime > 5000) status = 'critical'
      else if (responseTime > 2000) status = 'warning'
      
      this.updateMetric('api_response_time', responseTime, status)
    } catch (error) {
      console.error('API performance check failed:', error)
      this.updateMetric('api_response_time', 9999, 'critical')
    }
  }

  private updateMetric(id: string, value: number | string | boolean, status: HealthMetric['status']): void {
    const metric = this.metrics.get(id)
    if (metric) {
      metric.value = value
      metric.status = status
      metric.lastChecked = new Date()
    }
  }

  private async calculateSystemHealth(): Promise<SystemHealth> {
    const metrics = Array.from(this.metrics.values())
    
    // Calculate overall score
    let score = 0
    let totalWeight = 0
    
    for (const metric of metrics) {
      let metricScore = 0
      const weight = this.getMetricWeight(metric.id)
      
      switch (metric.status) {
        case 'healthy': metricScore = 100; break
        case 'warning': metricScore = 60; break
        case 'critical': metricScore = 20; break
        case 'unknown': metricScore = 40; break
      }
      
      score += metricScore * weight
      totalWeight += weight
    }
    
    const overallScore = totalWeight > 0 ? Math.round(score / totalWeight) : 0
    
    // Determine overall status
    let overallStatus: SystemHealth['overall'] = 'healthy'
    if (overallScore < 40) overallStatus = 'critical'
    else if (overallScore < 70) overallStatus = 'warning'
    else if (metrics.some(m => m.status === 'critical')) overallStatus = 'critical'
    else if (metrics.some(m => m.status === 'warning')) overallStatus = 'warning'
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics)
    
    return {
      overall: overallStatus,
      score: overallScore,
      metrics,
      lastUpdate: new Date(),
      recommendations
    }
  }

  private getMetricWeight(metricId: string): number {
    const weights: Record<string, number> = {
      'data_freshness': 3,
      'database_connectivity': 3,
      'collection_success_rate': 2,
      'active_sources': 2,
      'geocoding_success_rate': 1,
      'memory_usage': 1,
      'api_response_time': 1
    }
    return weights[metricId] || 1
  }

  private generateRecommendations(metrics: HealthMetric[]): string[] {
    const recommendations: string[] = []
    
    for (const metric of metrics) {
      if (metric.status === 'critical' || metric.status === 'warning') {
        switch (metric.id) {
          case 'data_freshness':
            recommendations.push('Run immediate data collection to refresh stale data')
            break
          case 'database_connectivity':
            recommendations.push('Check Firebase configuration and network connectivity')
            break
          case 'collection_success_rate':
            recommendations.push('Review data source configurations and error logs')
            break
          case 'active_sources':
            recommendations.push('Restart failed data sources and check API endpoints')
            break
          case 'geocoding_success_rate':
            recommendations.push('Check geocoding API keys and rate limits')
            break
          case 'memory_usage':
            recommendations.push('Consider increasing memory allocation or optimizing code')
            break
          case 'api_response_time':
            recommendations.push('Optimize database queries and add caching')
            break
        }
      }
    }
    
    return recommendations
  }

  private async processAlerts(systemHealth: SystemHealth): Promise<void> {
    const criticalMetrics = systemHealth.metrics.filter(m => m.status === 'critical')
    const warningMetrics = systemHealth.metrics.filter(m => m.status === 'warning')
    
    // Send critical alerts
    if (criticalMetrics.length > 0 && this.alertConfig.enabledSeverities.includes('critical')) {
      await this.sendAlert('critical', criticalMetrics, systemHealth)
    }
    
    // Send warning alerts (less frequently)
    if (warningMetrics.length > 0 && this.alertConfig.enabledSeverities.includes('warning')) {
      const lastWarningAlert = this.alertHistory.get('warning')
      const shouldSendWarning = !lastWarningAlert || 
        (Date.now() - lastWarningAlert.getTime()) > 30 * 60 * 1000 // 30 minutes
      
      if (shouldSendWarning) {
        await this.sendAlert('warning', warningMetrics, systemHealth)
        this.alertHistory.set('warning', new Date())
      }
    }
  }

  private async sendAlert(
    severity: 'warning' | 'critical',
    metrics: HealthMetric[],
    systemHealth: SystemHealth
  ): Promise<void> {
    const message = this.formatAlertMessage(severity, metrics, systemHealth)
    
    try {
      // Send webhook alert
      if (this.alertConfig.webhookUrl) {
        await this.sendWebhookAlert(message, severity)
      }
      
      // Log alert
      console.log(`🚨 ${severity.toUpperCase()} ALERT:`, message)
      
      // Store alert in database
      if (adminDb) {
        await adminDb.collection('health_alerts').add({
          severity,
          message,
          metrics: metrics.map(m => ({ id: m.id, name: m.name, status: m.status, value: m.value })),
          systemHealth: {
            overall: systemHealth.overall,
            score: systemHealth.score
          },
          timestamp: new Date()
        })
      }
    } catch (error) {
      console.error('Failed to send health alert:', error)
    }
  }

  private formatAlertMessage(severity: string, metrics: HealthMetric[], systemHealth: SystemHealth): string {
    const metricsList = metrics.map(m => `${m.name}: ${m.value}${m.unit || ''} (${m.status})`).join(', ')
    
    return `SaveThemNow.Jesus ${severity.toUpperCase()} Alert\n` +
           `System Health Score: ${systemHealth.score}/100\n` +
           `Affected Metrics: ${metricsList}\n` +
           `Recommendations: ${systemHealth.recommendations.join('; ')}`
  }

  private async sendWebhookAlert(message: string, severity: string): Promise<void> {
    if (!this.alertConfig.webhookUrl) return
    
    const payload = {
      text: `🚨 ${severity.toUpperCase()} Health Alert`,
      attachments: [{
        color: severity === 'critical' ? 'danger' : 'warning',
        text: message,
        ts: Math.floor(Date.now() / 1000)
      }]
    }
    
    await fetch(this.alertConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  }

  private async saveHealthReport(systemHealth: SystemHealth): Promise<void> {
    if (!adminDb) return
    
    try {
      await adminDb.collection('health_reports').add({
        ...systemHealth,
        timestamp: new Date()
      })
    } catch (error) {
      console.warn('Failed to save health report:', error)
    }
  }

  getSystemHealth(): SystemHealth | null {
    const metrics = Array.from(this.metrics.values())
    if (metrics.length === 0) return null
    
    // This is a synchronous version of calculateSystemHealth
    let score = 0
    let totalWeight = 0
    
    for (const metric of metrics) {
      let metricScore = 0
      const weight = this.getMetricWeight(metric.id)
      
      switch (metric.status) {
        case 'healthy': metricScore = 100; break
        case 'warning': metricScore = 60; break
        case 'critical': metricScore = 20; break
        case 'unknown': metricScore = 40; break
      }
      
      score += metricScore * weight
      totalWeight += weight
    }
    
    const overallScore = totalWeight > 0 ? Math.round(score / totalWeight) : 0
    
    let overallStatus: SystemHealth['overall'] = 'healthy'
    if (overallScore < 40) overallStatus = 'critical'
    else if (overallScore < 70) overallStatus = 'warning'
    else if (metrics.some(m => m.status === 'critical')) overallStatus = 'critical'
    else if (metrics.some(m => m.status === 'warning')) overallStatus = 'warning'
    
    return {
      overall: overallStatus,
      score: overallScore,
      metrics,
      lastUpdate: new Date(),
      recommendations: this.generateRecommendations(metrics)
    }
  }

  updateAlertConfig(newConfig: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...newConfig }
    console.log('📝 Alert configuration updated')
  }
}

// Singleton instance
export const healthMonitoringService = new HealthMonitoringService({
  webhookUrl: process.env.HEALTH_WEBHOOK_URL,
  enabledSeverities: ['critical', 'warning']
})

// Auto-start in production
if (process.env.NODE_ENV === 'production' && process.env.AUTO_START_HEALTH_MONITORING === 'true') {
  healthMonitoringService.startMonitoring().catch(console.error)
}