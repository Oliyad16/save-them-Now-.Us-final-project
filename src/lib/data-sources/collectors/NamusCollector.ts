import { BaseCollector } from './BaseCollector'
import { CollectedRecord } from '../types'

interface NamusSearchResponse {
  results: NamusCase[]
  total: number
  page: number
  hasMore: boolean
}

interface NamusCase {
  id: number
  subjectIdentification: {
    caseNumber: string
    ncicNumber?: string
    firstName?: string
    lastName?: string
    middleName?: string
    nicknames?: string[]
  }
  demographics: {
    estimatedAge?: number
    ageText?: string
    sex?: string
    race?: string[]
    ethnicity?: string
  }
  caseInformation: {
    createdDate: string
    modifiedDate: string
    reportedDate?: string
    circumstances?: string
    status?: string
  }
  physicalDescription?: {
    height?: string
    weight?: string
    hairColor?: string
    eyeColor?: string
  }
  location: {
    lastSeenCity?: string
    lastSeenCounty?: string
    lastSeenState?: string
    lastSeenCountry?: string
  }
  coordinates?: {
    latitude?: number
    longitude?: number
  }
  images?: Array<{
    url: string
    type: string
    description?: string
  }>
}

export class NamusCollector extends BaseCollector {
  private readonly maxRecordsPerBatch = 100
  private readonly maxTotalRecords = 1000 // Limit to prevent overwhelming system

  async collect(): Promise<CollectedRecord[]> {
    console.log(`🔍 Starting NamUs collection...`)
    
    const records: CollectedRecord[] = []
    let page = 0
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

        console.log(`📊 NamUs: Collected ${batchResults.length} records (page ${page}, total: ${totalCollected})`)

        // Be respectful with API calls
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      console.log(`✅ NamUs collection complete: ${records.length} records`)
      return records

    } catch (error) {
      console.error('❌ NamUs collection failed:', error)
      throw error
    }
  }

  private async collectBatch(page: number, pageSize: number): Promise<CollectedRecord[]> {
    const searchParams = {
      take: pageSize,
      skip: page * pageSize,
      // Focus on recent cases and cases with recent updates
      orderBy: 'modifiedDate',
      orderDirection: 'desc',
      // Only get missing persons (not unidentified remains)
      subjectType: 'MissingPerson'
    }

    const url = new URL(this.source.baseUrl)
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.append(key, String(value))
    })

    const response = await this.makeRequest(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Search criteria for active cases
        caseStatus: ['Open', 'Active'],
        // Limit to US cases
        country: ['United States'],
        // Recent cases or recently updated
        modifiedDateFrom: this.getDateDaysAgo(30) // Last 30 days
      })
    })

    const data: NamusSearchResponse = await response.json()
    
    if (!data.results || !Array.isArray(data.results)) {
      console.warn('⚠️ Unexpected NamUs response format')
      return []
    }

    const records: CollectedRecord[] = []

    for (const namusCase of data.results) {
      try {
        const normalizedData = this.normalizeNamusCase(namusCase)
        
        const record = this.createCollectedRecord(
          String(namusCase.id),
          'missing_person',
          normalizedData
        )

        records.push(record)
      } catch (error) {
        console.warn(`⚠️ Error processing NamUs case ${namusCase.id}:`, error)
      }
    }

    return records
  }

  private normalizeNamusCase(namusCase: NamusCase): any {
    // Extract and normalize data to our standard format
    const rawData = {
      id: namusCase.id,
      caseNumber: namusCase.subjectIdentification.caseNumber,
      ncicNumber: namusCase.subjectIdentification.ncicNumber,
      
      // Name information
      firstName: namusCase.subjectIdentification.firstName,
      lastName: namusCase.subjectIdentification.lastName,
      middleName: namusCase.subjectIdentification.middleName,
      nicknames: namusCase.subjectIdentification.nicknames,
      
      // Demographics
      age: namusCase.demographics.estimatedAge,
      ageText: namusCase.demographics.ageText,
      sex: namusCase.demographics.sex,
      race: namusCase.demographics.race,
      ethnicity: namusCase.demographics.ethnicity,
      
      // Physical description
      height: namusCase.physicalDescription?.height,
      weight: namusCase.physicalDescription?.weight,
      hairColor: namusCase.physicalDescription?.hairColor,
      eyeColor: namusCase.physicalDescription?.eyeColor,
      
      // Location
      city: namusCase.location.lastSeenCity,
      county: namusCase.location.lastSeenCounty,
      state: namusCase.location.lastSeenState,
      country: namusCase.location.lastSeenCountry,
      
      // Coordinates if available
      latitude: namusCase.coordinates?.latitude,
      longitude: namusCase.coordinates?.longitude,
      
      // Dates
      dateMissing: namusCase.caseInformation.reportedDate,
      dateReported: namusCase.caseInformation.reportedDate,
      dateCreated: namusCase.caseInformation.createdDate,
      dateModified: namusCase.caseInformation.modifiedDate,
      
      // Case information
      status: namusCase.caseInformation.status,
      circumstances: namusCase.caseInformation.circumstances,
      
      // Images
      images: namusCase.images || [],
      
      // Source information
      sourceUrl: `https://www.namus.gov/MissingPersons/Case#/${namusCase.id}`,
      source: 'NamUs'
    }

    return this.normalizePersonData(rawData)
  }

  private getDateDaysAgo(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0] // YYYY-MM-DD format
  }

  // Alternative collection method for specific searches
  async collectByState(stateAbbr: string): Promise<CollectedRecord[]> {
    console.log(`🔍 Collecting NamUs records for state: ${stateAbbr}`)
    
    const searchParams = {
      take: this.maxRecordsPerBatch,
      skip: 0,
      orderBy: 'modifiedDate',
      orderDirection: 'desc'
    }

    const url = new URL(this.source.baseUrl)
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.append(key, String(value))
    })

    const response = await this.makeRequest(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        caseStatus: ['Open', 'Active'],
        state: [stateAbbr],
        modifiedDateFrom: this.getDateDaysAgo(90) // Last 90 days for state-specific
      })
    })

    const data: NamusSearchResponse = await response.json()
    const records: CollectedRecord[] = []

    if (data.results && Array.isArray(data.results)) {
      for (const namusCase of data.results) {
        try {
          const normalizedData = this.normalizeNamusCase(namusCase)
          const record = this.createCollectedRecord(
            String(namusCase.id),
            'missing_person',
            normalizedData
          )
          records.push(record)
        } catch (error) {
          console.warn(`⚠️ Error processing NamUs case ${namusCase.id}:`, error)
        }
      }
    }

    console.log(`✅ NamUs ${stateAbbr}: Collected ${records.length} records`)
    return records
  }

  // Method to get case details for specific case
  async getCaseDetails(caseId: string): Promise<CollectedRecord | null> {
    try {
      const detailUrl = `${this.source.baseUrl.replace('/Search', '')}/Cases/${caseId}`
      const response = await this.makeRequest(detailUrl)
      const caseData = await response.json()

      if (caseData) {
        const normalizedData = this.normalizeNamusCase(caseData)
        return this.createCollectedRecord(
          caseId,
          'missing_person',
          normalizedData
        )
      }

      return null
    } catch (error) {
      console.warn(`⚠️ Error getting NamUs case details for ${caseId}:`, error)
      return null
    }
  }
}