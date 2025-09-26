import { BaseCollector } from './BaseCollector'
import { CollectedRecord } from '../types'

interface NCMECSearchResponse {
  missingChildren: NCMECCase[]
  totalResults: number
  currentPage: number
  hasNextPage: boolean
}

interface NCMECCase {
  id: string
  caseNumber: string
  ncmecNumber?: string
  childInformation: {
    firstName: string
    lastName: string
    middleName?: string
    nickname?: string
    ageAtTimeOfDisappearance: number
    currentAge?: number
    dateOfBirth: string
    sex: string
    race: string[]
    ethnicity?: string
    height?: string
    weight?: string
    hairColor?: string
    eyeColor?: string
  }
  disappearanceInformation: {
    dateMissing: string
    city: string
    state: string
    county?: string
    country: string
    circumstances?: string
    possibleDestination?: string
  }
  caseDetails: {
    caseType: string
    reportingAgency?: string
    investigatingAgency?: string
    reportedToNCMEC: string
    lastUpdated: string
    status: string
  }
  photos?: Array<{
    url: string
    description: string
    isPrimary: boolean
    dateAdded: string
  }>
  possibleAbductor?: {
    name?: string
    relationship?: string
    description?: string
  }
  contactInformation?: {
    agencyName: string
    contactNumber: string
    caseNumber: string
  }
}

export class NCMECCollector extends BaseCollector {
  private readonly maxRecordsPerBatch = 50
  private readonly maxTotalRecords = 500 // NCMEC has smaller dataset focused on children

  async collect(): Promise<CollectedRecord[]> {
    console.log(`🔍 Starting NCMEC collection...`)
    
    const records: CollectedRecord[] = []
    let page = 1
    let totalCollected = 0
    let hasMore = true

    try {
      while (hasMore && totalCollected < this.maxTotalRecords) {
        const batchResults = await this.collectBatch(page, this.maxRecordsPerBatch)
        
        if (batchResults.length === 0) {
          hasMore = false
          break
        }

        records.push(...batchResults)
        totalCollected += batchResults.length
        page++

        console.log(`📊 NCMEC: Collected ${batchResults.length} records (page ${page}, total: ${totalCollected})`)

        // Be respectful with API calls - NCMEC may have stricter limits
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      console.log(`✅ NCMEC collection complete: ${records.length} records`)
      return records

    } catch (error) {
      console.error('❌ NCMEC collection failed:', error)
      throw error
    }
  }

  private async collectBatch(page: number, pageSize: number): Promise<CollectedRecord[]> {
    // NCMEC uses different API structure - this is a conceptual implementation
    // Real implementation would need to match their actual API
    const searchParams = new URLSearchParams({
      page: page.toString(),
      perPage: pageSize.toString(),
      status: 'missing', // Focus on active missing cases
      sortBy: 'lastUpdated',
      sortOrder: 'desc',
      // Recent cases or recently updated
      lastUpdatedAfter: this.getDateDaysAgo(60), // Last 60 days
      // Age ranges for missing children
      ageMin: '0',
      ageMax: '17'
    })

    // Note: This URL is conceptual - NCMEC's actual API endpoints may differ
    const url = `${this.source.baseUrl}/api/search?${searchParams}`

    try {
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          // Add any required API keys or authentication
          ...(this.source.apiKey && { 'Authorization': `Bearer ${this.source.apiKey}` })
        }
      })

      const data: NCMECSearchResponse = await response.json()
      
      if (!data.missingChildren || !Array.isArray(data.missingChildren)) {
        console.warn('⚠️ Unexpected NCMEC response format')
        return []
      }

      const records: CollectedRecord[] = []

      for (const ncmecCase of data.missingChildren) {
        try {
          const normalizedData = this.normalizeNCMECCase(ncmecCase)
          
          const record = this.createCollectedRecord(
            ncmecCase.id,
            'missing_person',
            normalizedData
          )

          records.push(record)
        } catch (error) {
          console.warn(`⚠️ Error processing NCMEC case ${ncmecCase.id}:`, error)
        }
      }

      return records

    } catch (error) {
      // If API fails, try RSS/web scraping fallback
      console.warn('⚠️ NCMEC API failed, attempting RSS fallback:', error)
      return await this.collectFromRSS()
    }
  }

  private async collectFromRSS(): Promise<CollectedRecord[]> {
    // Fallback to RSS feeds or web scraping
    // Many missing persons organizations provide RSS feeds
    try {
      const rssUrl = `${this.source.baseUrl}/rss/missing-children.xml`
      const response = await this.makeRequest(rssUrl)
      const xmlText = await response.text()

      // Parse XML/RSS (simplified - would need proper XML parser)
      const records: CollectedRecord[] = []
      
      // This is a simplified approach - real implementation would use xml2js or similar
      const itemRegex = /<item>([\s\S]*?)<\/item>/g
      const caseMatches = Array.from(xmlText.matchAll(itemRegex))
      
      for (const match of caseMatches) {
        try {
          const itemXml = match[1]
          const caseData = this.parseRSSItem(itemXml)
          
          if (caseData) {
            const record = this.createCollectedRecord(
              caseData.id,
              'missing_person',
              caseData
            )
            records.push(record)
          }
        } catch (error) {
          console.warn('⚠️ Error parsing RSS item:', error)
        }
      }

      console.log(`📄 NCMEC RSS: Collected ${records.length} records`)
      return records

    } catch (error) {
      console.warn('⚠️ NCMEC RSS fallback also failed:', error)
      return []
    }
  }

  private parseRSSItem(itemXml: string): any | null {
    try {
      // Extract data from RSS item XML
      const extractField = (fieldName: string) => {
        const match = itemXml.match(new RegExp(`<${fieldName}[^>]*>(.*?)<\/${fieldName}>`, 's'))
        return match ? match[1].trim() : ''
      }

      return {
        id: extractField('guid') || extractField('id') || `rss_${Date.now()}`,
        caseNumber: extractField('caseNumber'),
        firstName: extractField('firstName'),
        lastName: extractField('lastName'),
        age: parseInt(extractField('age')) || null,
        sex: extractField('sex'),
        race: extractField('race'),
        city: extractField('city'),
        state: extractField('state'),
        dateMissing: extractField('dateMissing'),
        description: extractField('description'),
        sourceUrl: extractField('link'),
        source: 'NCMEC-RSS'
      }
    } catch (error) {
      console.warn('Error parsing RSS item:', error)
      return null
    }
  }

  private normalizeNCMECCase(ncmecCase: NCMECCase): any {
    const rawData = {
      id: ncmecCase.id,
      caseNumber: ncmecCase.caseNumber,
      ncmecNumber: ncmecCase.ncmecNumber,
      
      // Child information
      firstName: ncmecCase.childInformation.firstName,
      lastName: ncmecCase.childInformation.lastName,
      middleName: ncmecCase.childInformation.middleName,
      nickname: ncmecCase.childInformation.nickname,
      age: ncmecCase.childInformation.ageAtTimeOfDisappearance,
      currentAge: ncmecCase.childInformation.currentAge,
      dateOfBirth: ncmecCase.childInformation.dateOfBirth,
      sex: ncmecCase.childInformation.sex,
      race: ncmecCase.childInformation.race,
      ethnicity: ncmecCase.childInformation.ethnicity,
      
      // Physical description
      height: ncmecCase.childInformation.height,
      weight: ncmecCase.childInformation.weight,
      hairColor: ncmecCase.childInformation.hairColor,
      eyeColor: ncmecCase.childInformation.eyeColor,
      
      // Disappearance information
      dateMissing: ncmecCase.disappearanceInformation.dateMissing,
      city: ncmecCase.disappearanceInformation.city,
      state: ncmecCase.disappearanceInformation.state,
      county: ncmecCase.disappearanceInformation.county,
      country: ncmecCase.disappearanceInformation.country,
      circumstances: ncmecCase.disappearanceInformation.circumstances,
      possibleDestination: ncmecCase.disappearanceInformation.possibleDestination,
      
      // Case details
      caseType: ncmecCase.caseDetails.caseType,
      reportingAgency: ncmecCase.caseDetails.reportingAgency,
      investigatingAgency: ncmecCase.caseDetails.investigatingAgency,
      dateReported: ncmecCase.caseDetails.reportedToNCMEC,
      dateModified: ncmecCase.caseDetails.lastUpdated,
      status: ncmecCase.caseDetails.status,
      
      // Photos
      images: ncmecCase.photos || [],
      
      // Possible abductor information (if available)
      possibleAbductor: ncmecCase.possibleAbductor,
      
      // Contact information
      contactInformation: ncmecCase.contactInformation,
      
      // Source information
      sourceUrl: `https://www.missingkids.org/poster/NCMC/${ncmecCase.id}`,
      source: 'NCMEC'
    }

    // Use the base class normalization but with NCMEC-specific handling
    const normalized = this.normalizePersonData(rawData)
    
    // Override category to ensure it's always "Missing Children" for NCMEC
    normalized.category = 'Missing Children'
    
    // Add NCMEC-specific metadata
    normalized.ncmecSpecific = {
      caseType: rawData.caseType,
      currentAge: rawData.currentAge,
      possibleDestination: rawData.possibleDestination,
      reportingAgency: rawData.reportingAgency,
      investigatingAgency: rawData.investigatingAgency
    }

    return normalized
  }

  private getDateDaysAgo(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
  }

  // Method to get high-priority cases (recent disappearances)
  async collectRecentCases(): Promise<CollectedRecord[]> {
    console.log(`🚨 Collecting recent NCMEC cases (last 7 days)...`)
    
    try {
      const searchParams = new URLSearchParams({
        perPage: '100',
        status: 'missing',
        sortBy: 'dateMissing',
        sortOrder: 'desc',
        dateMissingAfter: this.getDateDaysAgo(7), // Last 7 days only
        ageMax: '17' // Children only
      })

      const url = `${this.source.baseUrl}/api/search?${searchParams}`
      const response = await this.makeRequest(url)
      const data = await response.json()

      const records: CollectedRecord[] = []

      if (data.missingChildren && Array.isArray(data.missingChildren)) {
        for (const ncmecCase of data.missingChildren) {
          try {
            const normalizedData = this.normalizeNCMECCase(ncmecCase)
            const record = this.createCollectedRecord(
              ncmecCase.id,
              'missing_person',
              normalizedData
            )
            records.push(record)
          } catch (error) {
            console.warn(`⚠️ Error processing recent NCMEC case ${ncmecCase.id}:`, error)
          }
        }
      }

      console.log(`✅ NCMEC recent cases: Collected ${records.length} records`)
      return records

    } catch (error) {
      console.error('❌ Failed to collect recent NCMEC cases:', error)
      return []
    }
  }

  // Method to search for specific case by NCMEC number
  async getCaseByNCMECNumber(ncmecNumber: string): Promise<CollectedRecord | null> {
    try {
      const url = `${this.source.baseUrl}/api/case/${ncmecNumber}`
      const response = await this.makeRequest(url)
      const caseData = await response.json()

      if (caseData) {
        const normalizedData = this.normalizeNCMECCase(caseData)
        return this.createCollectedRecord(
          caseData.id,
          'missing_person',
          normalizedData
        )
      }

      return null
    } catch (error) {
      console.warn(`⚠️ Error getting NCMEC case ${ncmecNumber}:`, error)
      return null
    }
  }
}