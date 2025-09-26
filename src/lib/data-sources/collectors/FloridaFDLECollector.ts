import { BaseCollector } from './BaseCollector'
import { DataSource, CollectedRecord } from '../types'

export class FloridaFDLECollector extends BaseCollector {
  constructor(source: DataSource) {
    super(source)
  }

  async collect(): Promise<CollectedRecord[]> {
    console.log('🔍 Collecting data from Florida FDLE...')
    
    const records: CollectedRecord[] = []
    
    try {
      // Florida FDLE Missing Persons Database
      const baseUrl = 'https://www.fdle.state.fl.us'
      const searchUrl = `${baseUrl}/FSAC/Missing-Persons/Search`
      
      // Get the search page first to understand the structure
      const searchPageResponse = await this.makeRequest(searchUrl)
      const searchPageContent = await searchPageResponse.text()
      
      // Parse search page for available cases or API endpoints
      const caseUrls = this.extractCaseUrls(searchPageContent, baseUrl)
      
      console.log(`📊 Found ${caseUrls.length} cases to process from Florida FDLE`)
      
      // Process each case (limit for initial implementation)
      for (const caseUrl of caseUrls.slice(0, 50)) {
        try {
          const caseData = await this.fetchCaseDetails(caseUrl)
          if (caseData) {
            const normalizedData = this.normalizePersonData(caseData)
            const record = this.createCollectedRecord(
              normalizedData.sourceRecordId,
              'missing_person',
              normalizedData
            )
            records.push(record)
          }
        } catch (error) {
          console.warn(`⚠️ Failed to process case ${caseUrl}:`, error)
          continue
        }
      }
      
      console.log(`✅ Successfully collected ${records.length} records from Florida FDLE`)
      return records
      
    } catch (error) {
      console.error('❌ Florida FDLE collection failed:', error)
      throw error
    }
  }

  private extractCaseUrls(html: string, baseUrl: string): string[] {
    const urls: string[] = []
    
    try {
      // Look for common patterns in Florida FDLE structure
      const caseIdPattern = /case[_-]?id[=:]\s*["']?(\d+)["']?/gi
      const linkPattern = /href\s*=\s*["']([^"']*(?:case|missing|person)[^"']*)["']/gi
      
      let match
      
      // Extract case IDs
      while ((match = caseIdPattern.exec(html)) !== null) {
        const caseId = match[1]
        urls.push(`${baseUrl}/FSAC/Missing-Persons/Case/${caseId}`)
      }
      
      // Extract direct links
      while ((match = linkPattern.exec(html)) !== null) {
        let url = match[1]
        if (!url.startsWith('http')) {
          url = baseUrl + (url.startsWith('/') ? '' : '/') + url
        }
        if (url.includes('case') || url.includes('missing') || url.includes('person')) {
          urls.push(url)
        }
      }
      
      // Remove duplicates
      return [...new Set(urls)]
    } catch (error) {
      console.warn('Error extracting case URLs:', error)
      return []
    }
  }

  private async fetchCaseDetails(caseUrl: string): Promise<any> {
    try {
      const response = await this.makeRequest(caseUrl)
      const html = await response.text()
      
      return this.parseHtmlCaseData(html, caseUrl)
    } catch (error) {
      console.warn(`Failed to fetch case details from ${caseUrl}:`, error)
      return null
    }
  }

  private parseHtmlCaseData(html: string, sourceUrl: string): any {
    const caseData: any = {
      sourceUrl,
      sourceId: 'florida_fdle',
      collectedAt: new Date()
    }
    
    try {
      // Extract case number from URL or HTML
      const caseNumberMatch = sourceUrl.match(/case[\/=](\d+)/i) || 
                             html.match(/case\s*(?:number|id)\s*:?\s*([A-Z0-9-]+)/i)
      if (caseNumberMatch) {
        caseData.caseNumber = caseNumberMatch[1]
        caseData.sourceRecordId = caseNumberMatch[1]
      }
      
      // Extract basic information using common HTML patterns
      caseData.name = this.extractTextByPattern(html, [
        /name\s*:?\s*<[^>]*>([^<]+)</i,
        /missing\s+person\s*:?\s*<[^>]*>([^<]+)</i,
        /<h[1-6][^>]*>([^<]*(?:missing|person)[^<]*)</i
      ])
      
      caseData.age = this.extractTextByPattern(html, [
        /age\s*:?\s*<[^>]*>([^<]+)</i,
        /age\s*:?\s*([0-9]+)/i
      ])
      
      caseData.gender = this.extractTextByPattern(html, [
        /(?:sex|gender)\s*:?\s*<[^>]*>([^<]+)</i,
        /(?:sex|gender)\s*:?\s*(male|female|m|f)/i
      ])
      
      caseData.ethnicity = this.extractTextByPattern(html, [
        /(?:race|ethnicity)\s*:?\s*<[^>]*>([^<]+)</i,
        /race\s*:?\s*([^<\n\r]+)/i
      ])
      
      caseData.city = this.extractTextByPattern(html, [
        /city\s*:?\s*<[^>]*>([^<]+)</i,
        /last\s+seen\s+in\s*:?\s*([^,\n\r]+)/i
      ])
      
      caseData.state = this.extractTextByPattern(html, [
        /state\s*:?\s*<[^>]*>([^<]+)</i,
        /florida|fl/i
      ]) || 'FL'
      
      caseData.county = this.extractTextByPattern(html, [
        /county\s*:?\s*<[^>]*>([^<]+)</i
      ])
      
      caseData.dateMissing = this.extractTextByPattern(html, [
        /(?:date\s+)?(?:missing|disappeared|last\s+seen)\s*:?\s*<[^>]*>([^<]+)</i,
        /(?:missing|disappeared|last\s+seen)\s+(?:on\s+)?([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i
      ])
      
      caseData.description = this.extractTextByPattern(html, [
        /(?:description|circumstances|details)\s*:?\s*<[^>]*>([^<]+)</i,
        /<p[^>]*>([^<]*(?:missing|circumstances)[^<]*)</i
      ])
      
      // Extract height and weight
      caseData.height = this.extractTextByPattern(html, [
        /height\s*:?\s*<[^>]*>([^<]+)</i,
        /height\s*:?\s*([0-9]+['"]?\s*[0-9]*["']?)/i
      ])
      
      caseData.weight = this.extractTextByPattern(html, [
        /weight\s*:?\s*<[^>]*>([^<]+)</i,
        /weight\s*:?\s*([0-9]+\s*lbs?)/i
      ])
      
      // Extract hair and eye color
      caseData.hairColor = this.extractTextByPattern(html, [
        /hair\s+color\s*:?\s*<[^>]*>([^<]+)</i,
        /hair\s*:?\s*([^,\n\r<]+)/i
      ])
      
      caseData.eyeColor = this.extractTextByPattern(html, [
        /eye\s+color\s*:?\s*<[^>]*>([^<]+)</i,
        /eyes\s*:?\s*([^,\n\r<]+)/i
      ])
      
      return caseData
      
    } catch (error) {
      console.warn('Error parsing HTML case data:', error)
      return caseData
    }
  }

  private extractTextByPattern(html: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        return match[1].trim().replace(/\s+/g, ' ')
      }
    }
    return null
  }
}