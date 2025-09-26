import { DataSource, CollectedRecord } from '../types'
import crypto from 'crypto'

export abstract class BaseCollector {
  protected source: DataSource
  protected rateLimiter: Map<string, number[]> = new Map()

  constructor(source: DataSource) {
    this.source = source
  }

  abstract collect(): Promise<CollectedRecord[]>

  protected async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    // Apply rate limiting
    await this.enforceRateLimit()

    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'SaveThemNow.Jesus/2.0 (+https://savethemnow.jesus/about)',
        'Accept': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`)
    }

    return response
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const windowMs = 60 * 1000 // 1 minute window
    
    let requests = this.rateLimiter.get(this.source.id) || []
    
    // Remove requests older than window
    requests = requests.filter(time => now - time < windowMs)
    
    // Check if we can make another request
    if (requests.length >= this.source.rateLimit.requestsPerMinute) {
      const oldestRequest = Math.min(...requests)
      const waitTime = windowMs - (now - oldestRequest)
      
      if (waitTime > 0) {
        console.log(`⏳ Rate limit reached for ${this.source.name}, waiting ${waitTime}ms`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
    
    // Add current request
    requests.push(now)
    this.rateLimiter.set(this.source.id, requests)
  }

  protected createCollectedRecord(
    sourceRecordId: string,
    recordType: CollectedRecord['recordType'],
    data: any
  ): CollectedRecord {
    // Create deterministic hash for duplicate detection
    const hashData = JSON.stringify({
      sourceId: this.source.id,
      sourceRecordId,
      recordType,
      // Include key fields that indicate uniqueness
      name: data.name,
      caseNumber: data.caseNumber,
      location: data.location,
      dateMissing: data.dateMissing
    })
    
    const hash = crypto.createHash('sha256').update(hashData).digest('hex')

    return {
      sourceId: this.source.id,
      sourceRecordId,
      recordType,
      data,
      collectedAt: new Date(),
      hash
    }
  }

  protected normalizePersonData(rawData: any): any {
    // Common normalization across all collectors
    return {
      // Core identification
      caseNumber: this.extractCaseNumber(rawData),
      sourceRecordId: String(rawData.id || rawData.caseId || rawData.recordId || ''),
      
      // Personal information
      name: this.extractName(rawData),
      age: this.extractAge(rawData),
      gender: this.normalizeGender(rawData.gender || rawData.sex || rawData.biologicalSex),
      ethnicity: this.normalizeEthnicity(rawData.ethnicity || rawData.race || rawData.raceEthnicity),
      
      // Location information
      city: this.extractCity(rawData),
      county: this.extractCounty(rawData),
      state: this.extractState(rawData),
      location: this.buildLocationString(rawData),
      
      // Temporal information
      dateMissing: this.extractDate(rawData.dateMissing || rawData.dateLastSeen || rawData.missingDate),
      dateReported: this.extractDate(rawData.dateReported || rawData.reportedDate),
      dateModified: this.extractDate(rawData.dateModified || rawData.lastUpdated),
      
      // Status and classification
      status: this.normalizeStatus(rawData.status),
      category: this.determineCategory(rawData),
      
      // Additional information
      description: rawData.description || rawData.circumstances || '',
      circumstances: rawData.circumstances || rawData.additionalInfo || '',
      
      // Source metadata
      sourceUrl: rawData.sourceUrl || rawData.url || '',
      lastUpdated: new Date(),
      
      // Raw data for reference
      rawData: rawData
    }
  }

  private extractCaseNumber(data: any): string {
    return data.caseNumber || 
           data.case_number || 
           data.ncicNumber || 
           data.id || 
           data.caseId || 
           `${this.source.id}_${data.id || Date.now()}`
  }

  private extractName(data: any): string {
    if (data.name) return data.name
    
    const firstName = data.firstName || data.first_name || data.legalFirstName || ''
    const lastName = data.lastName || data.last_name || data.legalLastName || ''
    const middleName = data.middleName || data.middle_name || ''
    
    return [firstName, middleName, lastName].filter(Boolean).join(' ').trim() || 'Unknown'
  }

  private extractAge(data: any): number | null {
    if (data.age && !isNaN(data.age)) return parseInt(data.age)
    
    const ageText = data.ageText || data.age_text || data.missingAge || ''
    const ageMatch = ageText.match(/(\d+)/)
    
    return ageMatch ? parseInt(ageMatch[1]) : null
  }

  private extractCity(data: any): string {
    return data.city || data.lastSeenCity || data.location?.city || ''
  }

  private extractCounty(data: any): string {
    return data.county || data.location?.county || ''
  }

  private extractState(data: any): string {
    return data.state || data.stateAbbr || data.location?.state || ''
  }

  private buildLocationString(data: any): string {
    const parts = [
      this.extractCity(data),
      this.extractCounty(data),
      this.extractState(data),
      'USA'
    ].filter(Boolean)
    
    return parts.join(', ')
  }

  private extractDate(dateValue: any): string | null {
    if (!dateValue) return null
    
    try {
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) return null
      
      return date.toISOString().split('T')[0] // YYYY-MM-DD format
    } catch {
      return null
    }
  }

  private normalizeGender(gender: string): string {
    if (!gender) return 'Unknown'
    
    const normalized = gender.toLowerCase()
    if (normalized.includes('male') && !normalized.includes('female')) return 'Male'
    if (normalized.includes('female')) return 'Female'
    if (normalized.includes('m')) return 'Male'
    if (normalized.includes('f')) return 'Female'
    
    return gender
  }

  private normalizeEthnicity(ethnicity: string): string {
    if (!ethnicity) return 'Unknown'
    
    // Common normalizations
    const mapping: Record<string, string> = {
      'hispanic': 'Hispanic / Latino',
      'latino': 'Hispanic / Latino', 
      'caucasian': 'White / Caucasian',
      'white': 'White / Caucasian',
      'african american': 'Black / African American',
      'black': 'Black / African American',
      'native american': 'American Indian / Alaska Native',
      'american indian': 'American Indian / Alaska Native',
      'asian': 'Asian',
      'pacific islander': 'Native Hawaiian / Pacific Islander'
    }
    
    const normalized = ethnicity.toLowerCase()
    return mapping[normalized] || ethnicity
  }

  private normalizeStatus(status: string): string {
    if (!status) return 'Active'
    
    const normalized = status.toLowerCase()
    if (normalized.includes('active') || normalized.includes('missing')) return 'Active'
    if (normalized.includes('found') || normalized.includes('located')) return 'Found'
    if (normalized.includes('deceased')) return 'Deceased'
    if (normalized.includes('closed')) return 'Closed'
    
    return status
  }

  private determineCategory(data: any): string {
    const age = this.extractAge(data)
    
    if (age !== null && age < 18) {
      return 'Missing Children'
    }
    
    return 'Missing Adults'
  }
}