import { BaseCollector } from './BaseCollector'
import { CollectedRecord } from '../types'

interface AmberAlert {
  id: string
  alertId: string
  title: string
  status: 'active' | 'cancelled' | 'expired'
  issuedDate: string
  expirationDate: string
  lastUpdated: string
  issuingAgency: {
    name: string
    contact: string
    jurisdiction: string
  }
  incidentInformation: {
    incidentDate: string
    incidentLocation: {
      city: string
      county: string
      state: string
      coordinates?: {
        latitude: number
        longitude: number
      }
    }
    circumstances: string
    possibleDestination?: string
  }
  children: Array<{
    id: string
    firstName: string
    lastName: string
    middleName?: string
    age: number
    dateOfBirth: string
    sex: string
    race: string
    ethnicity?: string
    height?: string
    weight?: string
    hairColor?: string
    eyeColor?: string
    clothing?: string
    distinguishingFeatures?: string
    photo?: string
  }>
  suspects?: Array<{
    id: string
    name: string
    age?: number
    sex?: string
    race?: string
    height?: string
    weight?: string
    hairColor?: string
    eyeColor?: string
    relationship: string
    clothing?: string
    description?: string
    photo?: string
  }>
  vehicles?: Array<{
    id: string
    make: string
    model: string
    year?: number
    color: string
    licensePlate?: string
    licenseState?: string
    vin?: string
    description?: string
  }>
  alertArea: {
    states: string[]
    regions: string[]
    broadcast: 'statewide' | 'regional' | 'national'
  }
  publicMessage: string
  contactInformation: {
    primaryContact: string
    secondaryContact?: string
    tipLine?: string
    caseNumber: string
  }
}

interface AmberAlertFeed {
  version: string
  feedUpdated: string
  alerts: AmberAlert[]
  totalActive: number
}

export class AmberAlertCollector extends BaseCollector {
  private readonly criticalPriority = true // AMBER alerts are always critical

  async collect(): Promise<CollectedRecord[]> {
    console.log(`🚨 Starting AMBER Alert collection (CRITICAL PRIORITY)...`)
    
    const records: CollectedRecord[] = []

    try {
      // Collect from multiple AMBER alert sources
      const sources = [
        this.collectFromNationalFeed(),
        this.collectFromStateFeed('FL'), // Florida - high volume
        this.collectFromStateFeed('CA'), // California - high volume  
        this.collectFromStateFeed('TX'), // Texas - high volume
        this.collectFromRSSFeeds()
      ]

      const results = await Promise.allSettled(sources)
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          records.push(...result.value)
        } else {
          console.warn('⚠️ AMBER Alert source failed:', result.reason)
        }
      }

      // Remove duplicates based on alert ID
      const uniqueRecords = this.deduplicateAlerts(records)

      console.log(`✅ AMBER Alert collection complete: ${uniqueRecords.length} unique alerts`)
      return uniqueRecords

    } catch (error) {
      console.error('❌ AMBER Alert collection failed:', error)
      throw error
    }
  }

  private async collectFromNationalFeed(): Promise<CollectedRecord[]> {
    try {
      console.log('🌐 Collecting from Weather Service AMBER alert feed...')
      
      // Use NOAA Weather Service API - most reliable for AMBER alerts
      const response = await this.makeRequest('https://api.weather.gov/alerts/active?event=Child%20Abduction%20Emergency', {
        headers: {
          'Accept': 'application/json'
        }
      })

      const data = await response.json()
      const records: CollectedRecord[] = []

      // Weather Service API format - features array contains alerts
      if (data.features && Array.isArray(data.features)) {
        for (const feature of data.features) {
          const alert = feature.properties
          
          // Only process Child Abduction Emergency alerts (AMBER alerts)
          if (alert.event === 'Child Abduction Emergency' && alert.status === 'Actual') {
            try {
              const normalizedData = this.normalizeWeatherServiceAlert(alert)
              
              const childRecord = this.createCollectedRecord(
                alert.id || `amber_${Date.now()}`,
                'amber_alert',
                {
                  ...normalizedData,
                  isAmberAlert: true,
                  priority: 'critical',
                  weatherServiceAlert: true
                }
              )
              records.push(childRecord)
            } catch (error) {
              console.warn(`⚠️ Error processing Weather Service AMBER alert ${alert.id}:`, error)
            }
          }
        }
      }

      console.log(`✅ National AMBER feed: ${records.length} records`)
      return records

    } catch (error) {
      console.warn('⚠️ National AMBER feed failed:', error)
      return []
    }
  }

  private async collectFromStateFeed(stateCode: string): Promise<CollectedRecord[]> {
    try {
      console.log(`🏛️ Collecting AMBER alerts for ${stateCode}...`)
      
      const response = await this.makeRequest(`https://api.amberalert.gov/alerts/state/${stateCode}`)
      const data = await response.json()
      const records: CollectedRecord[] = []

      if (data.alerts && Array.isArray(data.alerts)) {
        for (const alert of data.alerts) {
          if (alert.status === 'active') {
            const normalizedData = this.normalizeAmberAlert(alert)
            
            for (const child of alert.children) {
              const childRecord = this.createCollectedRecord(
                `${alert.alertId}_${child.id}`,
                'amber_alert',
                {
                  ...normalizedData,
                  childSpecific: child,
                  isAmberAlert: true,
                  priority: 'critical',
                  state: stateCode
                }
              )
              records.push(childRecord)
            }
          }
        }
      }

      console.log(`✅ ${stateCode} AMBER alerts: ${records.length} records`)
      return records

    } catch (error) {
      console.warn(`⚠️ ${stateCode} AMBER feed failed:`, error)
      return []
    }
  }

  private async collectFromRSSFeeds(): Promise<CollectedRecord[]> {
    try {
      console.log('📡 Collecting from AMBER Alert RSS feeds...')
      
      const rssFeeds = [
        'https://www.amberalert.gov/feeds/alerts.xml',
        'https://www.missingkids.org/gethelpnow/amber-alert/rss'
      ]

      const records: CollectedRecord[] = []

      for (const feedUrl of rssFeeds) {
        try {
          const response = await this.makeRequest(feedUrl)
          const xmlText = await response.text()
          
          // Parse RSS XML (simplified implementation)
          const itemRegex = /<item>([\s\S]*?)<\/item>/g
          const alertMatches = Array.from(xmlText.matchAll(itemRegex))
          
          for (const match of alertMatches) {
            try {
              const alertData = this.parseRSSAlert(match[1])
              if (alertData && alertData.isActive) {
                const record = this.createCollectedRecord(
                  alertData.id,
                  'amber_alert',
                  {
                    ...alertData,
                    isAmberAlert: true,
                    priority: 'critical',
                    source: 'AMBER-RSS'
                  }
                )
                records.push(record)
              }
            } catch (error) {
              console.warn('⚠️ Error parsing RSS alert:', error)
            }
          }
        } catch (error) {
          console.warn(`⚠️ RSS feed failed ${feedUrl}:`, error)
        }
      }

      console.log(`✅ RSS AMBER alerts: ${records.length} records`)
      return records

    } catch (error) {
      console.warn('⚠️ RSS AMBER collection failed:', error)
      return []
    }
  }

  private parseRSSAlert(itemXml: string): any | null {
    try {
      const extractField = (fieldName: string) => {
        const match = itemXml.match(new RegExp(`<${fieldName}[^>]*>(.*?)<\/${fieldName}>`, 's'))
        return match ? match[1].trim() : ''
      }

      const pubDate = extractField('pubDate')
      const description = extractField('description')
      
      // Check if alert is recent (within last 48 hours)
      const alertDate = new Date(pubDate)
      const hoursAgo = (Date.now() - alertDate.getTime()) / (1000 * 60 * 60)
      const isActive = hoursAgo <= 48

      return {
        id: extractField('guid') || `rss_${Date.now()}`,
        alertId: extractField('alertId'),
        title: extractField('title'),
        description: description,
        dateMissing: pubDate,
        dateReported: pubDate,
        isActive: isActive,
        sourceUrl: extractField('link'),
        // Parse child information from description if available
        ...this.parseChildInfoFromDescription(description)
      }
    } catch (error) {
      console.warn('Error parsing RSS alert:', error)
      return null
    }
  }

  private parseChildInfoFromDescription(description: string): any {
    // Try to extract child information from alert description
    const childInfo: any = {}

    // Extract name
    const nameMatch = description.match(/(?:Child|Missing|Name)[:\s]+([A-Za-z\s]+?)(?:\s|,|;|\.)/i)
    if (nameMatch) {
      const fullName = nameMatch[1].trim()
      const nameParts = fullName.split(' ')
      childInfo.firstName = nameParts[0]
      if (nameParts.length > 1) {
        childInfo.lastName = nameParts[nameParts.length - 1]
      }
    }

    // Extract age
    const ageMatch = description.match(/(?:age|aged?)[:\s]*(\d+)/i)
    if (ageMatch) {
      childInfo.age = parseInt(ageMatch[1])
    }

    // Extract location
    const locationMatch = description.match(/(?:from|in|near|location)[:\s]+([A-Za-z\s,]+?)(?:\s|;|\.)/i)
    if (locationMatch) {
      const location = locationMatch[1].trim()
      const locationParts = location.split(',')
      if (locationParts.length >= 2) {
        childInfo.city = locationParts[0].trim()
        childInfo.state = locationParts[1].trim()
      }
    }

    return childInfo
  }

  private normalizeWeatherServiceAlert(alert: any): any {
    // Parse Weather Service AMBER alert format
    const description = alert.description || ''
    
    // Extract child information from description text
    const childInfo = this.parseChildInfoFromDescription(description)
    
    const rawData = {
      id: alert.id,
      alertId: alert.id,
      caseNumber: alert.id,
      
      // Child information (extracted from description)
      firstName: childInfo.firstName,
      lastName: childInfo.lastName, 
      age: childInfo.age,
      sex: childInfo.gender || childInfo.sex,
      
      // Location information
      city: childInfo.city,
      state: childInfo.state,
      
      // Dates
      dateMissing: alert.onset,
      dateReported: alert.sent,
      dateModified: alert.sent,
      expirationDate: alert.expires,
      
      // Alert information
      status: 'Active',
      circumstances: description,
      headline: alert.headline,
      urgency: alert.urgency,
      severity: alert.severity,
      certainty: alert.certainty,
      
      // Source information
      sourceUrl: alert.web || `https://api.weather.gov/alerts/${alert.id}`,
      source: 'Weather-Service-AMBER',
      issuingAgency: alert.senderName,
      
      // Full alert data
      fullAlertData: alert
    }

    const normalized = this.normalizePersonData(rawData)
    
    // Override category for AMBER alerts
    normalized.category = 'AMBER Alert'
    normalized.isAmberAlert = true
    normalized.priority = 'critical'
    
    return normalized
  }

  private normalizeAmberAlert(alert: AmberAlert): any {
    // Convert AMBER alert to our standard missing person format
    const primaryChild = alert.children[0] // Use first child as primary

    const rawData = {
      id: alert.alertId,
      alertId: alert.alertId,
      caseNumber: alert.contactInformation.caseNumber,
      
      // Child information (from primary child)
      firstName: primaryChild?.firstName,
      lastName: primaryChild?.lastName,
      middleName: primaryChild?.middleName,
      age: primaryChild?.age,
      dateOfBirth: primaryChild?.dateOfBirth,
      sex: primaryChild?.sex,
      race: primaryChild?.race,
      ethnicity: primaryChild?.ethnicity,
      
      // Physical description
      height: primaryChild?.height,
      weight: primaryChild?.weight,
      hairColor: primaryChild?.hairColor,
      eyeColor: primaryChild?.eyeColor,
      clothing: primaryChild?.clothing,
      distinguishingFeatures: primaryChild?.distinguishingFeatures,
      
      // Location and incident information
      city: alert.incidentInformation.incidentLocation.city,
      county: alert.incidentInformation.incidentLocation.county,
      state: alert.incidentInformation.incidentLocation.state,
      latitude: alert.incidentInformation.incidentLocation.coordinates?.latitude,
      longitude: alert.incidentInformation.incidentLocation.coordinates?.longitude,
      
      // Dates
      dateMissing: alert.incidentInformation.incidentDate,
      dateReported: alert.issuedDate,
      dateModified: alert.lastUpdated,
      expirationDate: alert.expirationDate,
      
      // Case information
      status: alert.status === 'active' ? 'Active' : 'Inactive',
      circumstances: alert.incidentInformation.circumstances,
      possibleDestination: alert.incidentInformation.possibleDestination,
      
      // AMBER alert specific information
      issuingAgency: alert.issuingAgency,
      allChildren: alert.children,
      suspects: alert.suspects,
      vehicles: alert.vehicles,
      alertArea: alert.alertArea,
      publicMessage: alert.publicMessage,
      contactInformation: alert.contactInformation,
      
      // Source information
      sourceUrl: `https://www.amberalert.gov/alert/${alert.alertId}`,
      source: 'AMBER-Alert'
    }

    const normalized = this.normalizePersonData(rawData)
    
    // Override category for AMBER alerts
    normalized.category = 'AMBER Alert'
    normalized.isAmberAlert = true
    normalized.priority = 'critical'
    
    return normalized
  }

  private deduplicateAlerts(records: CollectedRecord[]): CollectedRecord[] {
    const seen = new Set<string>()
    const unique: CollectedRecord[] = []

    for (const record of records) {
      const alertId = record.data.alertId || record.sourceRecordId
      
      if (!seen.has(alertId)) {
        seen.add(alertId)
        unique.push(record)
      }
    }

    return unique
  }

  // Method for immediate alert checking (called every 5 minutes)
  async collectActiveAlerts(): Promise<CollectedRecord[]> {
    console.log(`🚨 Checking for active AMBER alerts (immediate check)...`)
    
    try {
      const response = await this.makeRequest('https://api.amberalert.gov/alerts/active')
      const data = await response.json()
      const records: CollectedRecord[] = []

      if (data.alerts && Array.isArray(data.alerts)) {
        for (const alert of data.alerts) {
          if (alert.status === 'active') {
            const normalizedData = this.normalizeAmberAlert(alert)
            
            for (const child of alert.children) {
              const childRecord = this.createCollectedRecord(
                `${alert.alertId}_${child.id}`,
                'amber_alert',
                {
                  ...normalizedData,
                  childSpecific: child,
                  isAmberAlert: true,
                  priority: 'critical',
                  immediateAlert: true
                }
              )
              records.push(childRecord)
            }
          }
        }
      }

      if (records.length > 0) {
        console.log(`🚨 CRITICAL: ${records.length} active AMBER alerts found!`)
      }

      return records

    } catch (error) {
      console.error('❌ Failed to check active AMBER alerts:', error)
      return []
    }
  }
}