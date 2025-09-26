import { adminDb } from '@/lib/firebase/admin'
import { ChangeEvent } from '../data-processing/ChangeDetectionService'
import { realtimeService } from '../realtime/RealtimeService'

export interface CriticalCaseAlert {
  id: string
  type: 'amber_alert' | 'missing_child' | 'high_risk_adult' | 'resolution' | 'urgent_update'
  priority: 'emergency' | 'critical' | 'high'
  caseData: any
  location: {
    city?: string
    state?: string
    coordinates?: { lat: number, lon: number }
    radius?: number // miles
  }
  alertChannels: string[]
  sentAt: Date
  metadata: {
    ageAtDisappearance?: number
    timeSinceMissing?: number // hours
    riskFactors?: string[]
    sourceConfidence?: number
  }
}

export interface AlertChannel {
  id: string
  name: string
  type: 'webhook' | 'email' | 'sms' | 'push' | 'social'
  config: {
    url?: string
    recipients?: string[]
    apiKey?: string
    enabled: boolean
  }
  filters: {
    priorities: string[]
    types: string[]
    locations?: string[]
    ageGroups?: string[]
  }
}

export class CriticalCaseAlertService {
  private alertChannels: Map<string, AlertChannel> = new Map()
  private sentAlerts: Map<string, Date> = new Map() // Prevent spam
  private isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('🚨 Initializing Critical Case Alert Service...')
    
    // Initialize default alert channels
    await this.setupDefaultChannels()
    
    // Load custom channels from database
    await this.loadAlertChannels()
    
    this.isInitialized = true
    console.log(`✅ Critical Case Alert Service initialized with ${this.alertChannels.size} channels`)
  }

  private async setupDefaultChannels(): Promise<void> {
    const defaultChannels: AlertChannel[] = [
      {
        id: 'webhook_primary',
        name: 'Primary Webhook',
        type: 'webhook',
        config: {
          url: process.env.CRITICAL_ALERT_WEBHOOK_URL || '',
          enabled: !!process.env.CRITICAL_ALERT_WEBHOOK_URL
        },
        filters: {
          priorities: ['emergency', 'critical'],
          types: ['amber_alert', 'missing_child', 'resolution']
        }
      },
      {
        id: 'social_twitter',
        name: 'Twitter/X Alerts',
        type: 'social',
        config: {
          apiKey: process.env.TWITTER_API_KEY || '',
          enabled: !!process.env.TWITTER_API_KEY
        },
        filters: {
          priorities: ['emergency', 'critical'],
          types: ['amber_alert', 'missing_child'],
          ageGroups: ['child', 'teen']
        }
      },
      {
        id: 'email_emergency',
        name: 'Emergency Email List',
        type: 'email',
        config: {
          recipients: (process.env.EMERGENCY_EMAIL_LIST || '').split(',').filter(Boolean),
          enabled: !!(process.env.EMERGENCY_EMAIL_LIST && process.env.EMAIL_SERVICE_CONFIGURED)
        },
        filters: {
          priorities: ['emergency', 'critical'],
          types: ['amber_alert', 'missing_child', 'high_risk_adult']
        }
      },
      {
        id: 'push_mobile',
        name: 'Mobile Push Notifications',
        type: 'push',
        config: {
          enabled: !!process.env.PUSH_NOTIFICATION_SERVICE_KEY
        },
        filters: {
          priorities: ['emergency', 'critical'],
          types: ['amber_alert', 'missing_child']
        }
      }
    ]

    for (const channel of defaultChannels) {
      this.alertChannels.set(channel.id, channel)
    }
  }

  private async loadAlertChannels(): Promise<void> {
    if (!adminDb) return

    try {
      const snapshot = await adminDb.collection('alert_channels').get()
      
      snapshot.docs.forEach(doc => {
        const channel = { id: doc.id, ...doc.data() } as AlertChannel
        this.alertChannels.set(channel.id, channel)
      })

      console.log(`📡 Loaded ${snapshot.size} custom alert channels`)
    } catch (error) {
      console.warn('Warning loading alert channels:', error)
    }
  }

  async processChangeEvent(changeEvent: ChangeEvent): Promise<CriticalCaseAlert[]> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    const alerts: CriticalCaseAlert[] = []
    
    try {
      // Determine if this change warrants a critical alert
      const alertType = this.determineAlertType(changeEvent)
      
      if (!alertType) {
        return alerts // Not a critical case
      }

      const priority = this.calculatePriority(changeEvent, alertType)
      
      // Create critical case alert
      const alert: CriticalCaseAlert = {
        id: `alert_${Date.now()}_${changeEvent.id.slice(-8)}`,
        type: alertType,
        priority,
        caseData: changeEvent.record,
        location: this.extractLocation(changeEvent.record),
        alertChannels: [],
        sentAt: new Date(),
        metadata: {
          ageAtDisappearance: this.calculateAge(changeEvent.record) ?? undefined,
          timeSinceMissing: this.calculateTimeSinceMissing(changeEvent.record) ?? undefined,
          riskFactors: this.identifyRiskFactors(changeEvent.record),
          sourceConfidence: changeEvent.record.confidence || 0.8
        }
      }

      // Determine which channels should receive this alert
      const targetChannels = this.selectAlertChannels(alert)
      alert.alertChannels = targetChannels.map(c => c.id)

      // Send alerts to all target channels
      const sendPromises = targetChannels.map(channel => 
        this.sendAlert(alert, channel)
      )

      await Promise.allSettled(sendPromises)

      // Store alert record
      await this.storeAlert(alert)

      // Broadcast via real-time service
      await realtimeService.broadcastUpdate(changeEvent)

      alerts.push(alert)
      
      console.log(`🚨 Critical alert sent: ${alertType} for ${changeEvent.record.name} via ${targetChannels.length} channels`)
      
    } catch (error) {
      console.error('Failed to process critical case alert:', error)
    }

    return alerts
  }

  private determineAlertType(changeEvent: ChangeEvent): CriticalCaseAlert['type'] | null {
    const record = changeEvent.record
    
    // AMBER Alert - highest priority
    if (changeEvent.type === 'amber_alert' || 
        record.category === 'AMBER Alert' ||
        record.status === 'AMBER Alert Active') {
      return 'amber_alert'
    }
    
    // Missing child (under 18)
    const age = this.calculateAge(record)
    if (age !== null && age < 18 && changeEvent.type === 'new_case') {
      return 'missing_child'
    }
    
    // High-risk adult cases
    if (age !== null && age >= 18 && changeEvent.type === 'new_case') {
      const riskFactors = this.identifyRiskFactors(record)
      if (riskFactors.length > 0) {
        return 'high_risk_adult'
      }
    }
    
    // Resolution (person found)
    if (changeEvent.type === 'resolution' || 
        (changeEvent.type === 'status_update' && 
         (record.status === 'Found' || record.status === 'Located'))) {
      return 'resolution'
    }
    
    // Urgent updates to existing cases
    if (changeEvent.priority === 'critical' && changeEvent.type === 'info_update') {
      return 'urgent_update'
    }
    
    return null
  }

  private calculatePriority(changeEvent: ChangeEvent, alertType: CriticalCaseAlert['type']): CriticalCaseAlert['priority'] {
    // AMBER Alerts are always emergency
    if (alertType === 'amber_alert') {
      return 'emergency'
    }
    
    // Missing children are critical
    if (alertType === 'missing_child') {
      const age = this.calculateAge(changeEvent.record)
      if (age !== null && age < 13) {
        return 'emergency' // Young children = emergency
      }
      return 'critical'
    }
    
    // Resolutions are high priority (good news to share)
    if (alertType === 'resolution') {
      return 'high'
    }
    
    // High-risk adults
    if (alertType === 'high_risk_adult') {
      const riskFactors = this.identifyRiskFactors(changeEvent.record)
      if (riskFactors.some(factor => ['dementia', 'alzheimers', 'suicidal'].includes(factor.toLowerCase()))) {
        return 'critical'
      }
      return 'high'
    }
    
    return 'high'
  }

  private extractLocation(record: any): CriticalCaseAlert['location'] {
    return {
      city: record.city,
      state: record.state,
      coordinates: (record.latitude && record.longitude) ? {
        lat: record.latitude,
        lon: record.longitude
      } : undefined,
      radius: 25 // Default 25-mile radius for location-based alerts
    }
  }

  private calculateAge(record: any): number | null {
    if (record.age && typeof record.age === 'number') {
      return record.age
    }
    
    if (record.ageText) {
      const ageMatch = record.ageText.match(/(\d+)/)
      return ageMatch ? parseInt(ageMatch[1]) : null
    }
    
    return null
  }

  private calculateTimeSinceMissing(record: any): number | null {
    if (!record.dateMissing) return null
    
    try {
      const missingDate = new Date(record.dateMissing)
      const now = new Date()
      return (now.getTime() - missingDate.getTime()) / (1000 * 60 * 60) // hours
    } catch {
      return null
    }
  }

  private identifyRiskFactors(record: any): string[] {
    const riskFactors: string[] = []
    const description = (record.description || '').toLowerCase()
    const circumstances = (record.circumstances || '').toLowerCase()
    const combined = `${description} ${circumstances}`.toLowerCase()
    
    // Medical risk factors
    if (combined.includes('dementia') || combined.includes('alzheimer')) {
      riskFactors.push('dementia/alzheimers')
    }
    if (combined.includes('diabetes') || combined.includes('diabetic')) {
      riskFactors.push('diabetes')
    }
    if (combined.includes('medication') || combined.includes('prescription')) {
      riskFactors.push('medication_dependent')
    }
    if (combined.includes('mental') || combined.includes('depression') || combined.includes('suicidal')) {
      riskFactors.push('mental_health')
    }
    
    // Environmental risk factors
    if (combined.includes('water') || combined.includes('lake') || combined.includes('river')) {
      riskFactors.push('near_water')
    }
    if (combined.includes('cold') || combined.includes('winter') || combined.includes('snow')) {
      riskFactors.push('extreme_weather')
    }
    
    // Age-based risk factors
    const age = this.calculateAge(record)
    if (age !== null) {
      if (age < 5) riskFactors.push('very_young_child')
      if (age > 70) riskFactors.push('elderly')
    }
    
    return riskFactors
  }

  private selectAlertChannels(alert: CriticalCaseAlert): AlertChannel[] {
    const selectedChannels: AlertChannel[] = []
    
    for (const channel of this.alertChannels.values()) {
      if (!channel.config.enabled) continue
      
      // Check priority filter
      if (channel.filters.priorities && !channel.filters.priorities.includes(alert.priority)) {
        continue
      }
      
      // Check type filter
      if (channel.filters.types && !channel.filters.types.includes(alert.type)) {
        continue
      }
      
      // Check location filter
      if (channel.filters.locations && alert.location.state) {
        const locationMatch = channel.filters.locations.some(loc => 
          alert.location.state?.toLowerCase().includes(loc.toLowerCase()) ||
          alert.location.city?.toLowerCase().includes(loc.toLowerCase())
        )
        if (!locationMatch) continue
      }
      
      // Check age group filter
      if (channel.filters.ageGroups && alert.metadata.ageAtDisappearance !== undefined) {
        const age = alert.metadata.ageAtDisappearance
        const ageGroup = age < 13 ? 'child' : age < 18 ? 'teen' : 'adult'
        if (!channel.filters.ageGroups.includes(ageGroup)) {
          continue
        }
      }
      
      selectedChannels.push(channel)
    }
    
    return selectedChannels
  }

  private async sendAlert(alert: CriticalCaseAlert, channel: AlertChannel): Promise<void> {
    // Prevent spam - don't send the same alert type to the same channel within 5 minutes
    const spamKey = `${alert.type}_${channel.id}`
    const lastSent = this.sentAlerts.get(spamKey)
    if (lastSent && (Date.now() - lastSent.getTime()) < 5 * 60 * 1000) {
      console.log(`⏭️ Skipping alert to ${channel.name} (recently sent)`)
      return
    }

    try {
      switch (channel.type) {
        case 'webhook':
          await this.sendWebhookAlert(alert, channel)
          break
        case 'email':
          await this.sendEmailAlert(alert, channel)
          break
        case 'social':
          await this.sendSocialAlert(alert, channel)
          break
        case 'push':
          await this.sendPushAlert(alert, channel)
          break
        default:
          console.warn(`Unknown alert channel type: ${channel.type}`)
      }
      
      this.sentAlerts.set(spamKey, new Date())
      console.log(`📡 Alert sent via ${channel.name}`)
      
    } catch (error) {
      console.error(`Failed to send alert via ${channel.name}:`, error)
    }
  }

  private async sendWebhookAlert(alert: CriticalCaseAlert, channel: AlertChannel): Promise<void> {
    if (!channel.config.url) return

    const payload = {
      text: this.formatAlertTitle(alert),
      attachments: [{
        color: alert.priority === 'emergency' ? '#ff0000' : 
               alert.priority === 'critical' ? '#ff6600' : '#ffaa00',
        title: `${alert.type.replace('_', ' ').toUpperCase()}: ${alert.caseData.name}`,
        fields: [
          {
            title: 'Location',
            value: `${alert.location.city || 'Unknown'}, ${alert.location.state || 'Unknown'}`,
            short: true
          },
          {
            title: 'Age',
            value: alert.metadata.ageAtDisappearance?.toString() || 'Unknown',
            short: true
          },
          {
            title: 'Time Missing',
            value: alert.metadata.timeSinceMissing ? 
              `${Math.round(alert.metadata.timeSinceMissing)} hours` : 'Unknown',
            short: true
          },
          {
            title: 'Risk Factors',
            value: alert.metadata.riskFactors?.join(', ') || 'None identified',
            short: false
          }
        ],
        footer: 'SaveThemNow.Jesus Critical Alert System',
        ts: Math.floor(alert.sentAt.getTime() / 1000)
      }]
    }

    await fetch(channel.config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  }

  private async sendEmailAlert(alert: CriticalCaseAlert, channel: AlertChannel): Promise<void> {
    if (!channel.config.recipients?.length) return

    // This would integrate with your email service
    console.log(`📧 Would send email alert to ${channel.config.recipients.length} recipients`)
    // Implementation depends on your email service (SendGrid, AWS SES, etc.)
  }

  private async sendSocialAlert(alert: CriticalCaseAlert, channel: AlertChannel): Promise<void> {
    if (!channel.config.apiKey) return

    // This would integrate with social media APIs
    console.log(`📱 Would send social media alert via ${channel.name}`)
    // Implementation depends on platform (Twitter API, Facebook Graph API, etc.)
  }

  private async sendPushAlert(alert: CriticalCaseAlert, channel: AlertChannel): Promise<void> {
    // This would integrate with push notification services
    console.log(`📲 Would send push notification for ${alert.type}`)
    // Implementation depends on service (Firebase Cloud Messaging, OneSignal, etc.)
  }

  private formatAlertTitle(alert: CriticalCaseAlert): string {
    const emoji = {
      'amber_alert': '🚨',
      'missing_child': '👶',
      'high_risk_adult': '⚠️',
      'resolution': '✅',
      'urgent_update': '🔄'
    }[alert.type] || '🚨'

    return `${emoji} ${alert.priority.toUpperCase()}: ${alert.type.replace('_', ' ').toUpperCase()}`
  }

  private async storeAlert(alert: CriticalCaseAlert): Promise<void> {
    if (!adminDb) return

    try {
      await adminDb.collection('critical_alerts').add({
        ...alert,
        sentAt: alert.sentAt
      })
    } catch (error) {
      console.warn('Failed to store critical alert:', error)
    }
  }

  // Public API methods
  async addAlertChannel(channel: Omit<AlertChannel, 'id'>): Promise<string> {
    const channelId = `custom_${Date.now()}`
    const newChannel: AlertChannel = { ...channel, id: channelId }
    
    this.alertChannels.set(channelId, newChannel)
    
    if (adminDb) {
      await adminDb.collection('alert_channels').doc(channelId).set(newChannel)
    }
    
    console.log(`➕ Added alert channel: ${newChannel.name}`)
    return channelId
  }

  async removeAlertChannel(channelId: string): Promise<void> {
    this.alertChannels.delete(channelId)
    
    if (adminDb) {
      await adminDb.collection('alert_channels').doc(channelId).delete()
    }
    
    console.log(`➖ Removed alert channel: ${channelId}`)
  }

  getAlertChannels(): AlertChannel[] {
    return Array.from(this.alertChannels.values())
  }

  async getRecentAlerts(hours: number = 24): Promise<CriticalCaseAlert[]> {
    if (!adminDb) return []

    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000)
      const snapshot = await adminDb.collection('critical_alerts')
        .where('sentAt', '>=', since)
        .orderBy('sentAt', 'desc')
        .limit(50)
        .get()

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as CriticalCaseAlert)
    } catch (error) {
      console.error('Failed to get recent alerts:', error)
      return []
    }
  }

  getAlertStatistics() {
    return {
      activeChannels: this.alertChannels.size,
      enabledChannels: Array.from(this.alertChannels.values()).filter(c => c.config.enabled).length,
      lastInitialized: this.isInitialized,
      supportedTypes: ['amber_alert', 'missing_child', 'high_risk_adult', 'resolution', 'urgent_update'],
      supportedChannelTypes: ['webhook', 'email', 'social', 'push']
    }
  }
}

// Singleton instance
export const criticalCaseAlertService = new CriticalCaseAlertService()

// Auto-initialize in production
if (process.env.NODE_ENV === 'production' && process.env.AUTO_START_ALERTS === 'true') {
  criticalCaseAlertService.initialize().catch(console.error)
}