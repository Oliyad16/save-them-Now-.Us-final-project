import { BaseCollector } from './BaseCollector'
import { DataSource, CollectedRecord } from '../types'

export class CaliforniaDOJCollector extends BaseCollector {
  constructor(source: DataSource) {
    super(source)
  }

  async collect(): Promise<CollectedRecord[]> {
    console.log('🔍 Collecting data from California DOJ...')
    
    const records: CollectedRecord[] = []
    
    try {
      // California Department of Justice Missing Persons Database
      const baseUrl = 'https://oag.ca.gov'
      const missingPersonsUrl = `${baseUrl}/missing`
      
      // Try multiple endpoints that California DOJ might use
      const endpoints = [
        `${baseUrl}/missing-persons`,
        `${baseUrl}/missing`,
        `${baseUrl}/bureau/california-justice-information-services/missing-persons`,
        `${baseUrl}/missing-unidentified-persons`
      ]
      
      let workingEndpoint = null
      
      // Find a working endpoint
      for (const endpoint of endpoints) {
        try {
          const response = await this.makeRequest(endpoint)
          if (response.ok) {
            workingEndpoint = endpoint
            break
          }
        } catch (error) {
          console.warn(`Endpoint ${endpoint} not accessible:`, error)
          continue
        }
      }
      
      if (!workingEndpoint) {
        console.warn('No accessible California DOJ endpoints found')
        return records
      }
      
      const mainPageResponse = await this.makeRequest(workingEndpoint)
      const mainPageContent = await mainPageResponse.text()
      
      // Look for data sources or API endpoints
      const dataEndpoints = this.extractDataEndpoints(mainPageContent, baseUrl)
      
      // Process each data source
      for (const dataEndpoint of dataEndpoints) {
        try {
          const endpointRecords = await this.processDataEndpoint(dataEndpoint)
          records.push(...endpointRecords)
        } catch (error) {
          console.warn(`Failed to process endpoint ${dataEndpoint}:`, error)
        }
      }
      
      console.log(`✅ Successfully collected ${records.length} records from California DOJ`)
      return records
      
    } catch (error) {
      console.error('❌ California DOJ collection failed:', error)
      throw error
    }
  }

  private extractDataEndpoints(html: string, baseUrl: string): string[] {
    const endpoints: string[] = []
    
    try {
      // Look for JSON data, API endpoints, or data files
      const jsonPattern = /href\s*=\s*["']([^"']*\.json[^"']*)["']/gi
      const apiPattern = /href\s*=\s*["']([^"']*(?:api|data)[^"']*)["']/gi
      const csvPattern = /href\s*=\s*["']([^"']*\.csv[^"']*)["']/gi
      const xmlPattern = /href\s*=\s*["']([^"']*\.xml[^"']*)["']/gi
      
      const patterns = [jsonPattern, apiPattern, csvPattern, xmlPattern]
      
      for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(html)) !== null) {
          let url = match[1]
          if (!url.startsWith('http')) {
            url = baseUrl + (url.startsWith('/') ? '' : '/') + url
          }
          endpoints.push(url)
        }
      }
      
      // Look for specific California DOJ data patterns
      const caDataPattern = /["']([^"']*(?:missing|person|case)[^"']*\.(?:json|csv|xml))["']/gi
      let match
      while ((match = caDataPattern.exec(html)) !== null) {
        let url = match[1]
        if (!url.startsWith('http')) {
          url = baseUrl + (url.startsWith('/') ? '' : '/') + url
        }
        endpoints.push(url)
      }
      
      return [...new Set(endpoints)]
    } catch (error) {
      console.warn('Error extracting data endpoints:', error)
      return []
    }
  }

  private async processDataEndpoint(endpoint: string): Promise<CollectedRecord[]> {
    const records: CollectedRecord[] = []
    
    try {
      const response = await this.makeRequest(endpoint)
      const contentType = response.headers.get('content-type') || ''
      
      if (contentType.includes('json')) {
        const data = await response.json()
        const jsonRecords = this.parseJsonData(data)
        records.push(...jsonRecords)
      } else if (contentType.includes('csv') || endpoint.includes('.csv')) {
        const csvText = await response.text()
        const csvRecords = this.parseCsvData(csvText)
        records.push(...csvRecords)
      } else if (contentType.includes('xml')) {
        const xmlText = await response.text()
        const xmlRecords = this.parseXmlData(xmlText)
        records.push(...xmlRecords)
      } else {
        // Try to parse as HTML
        const html = await response.text()
        const htmlRecords = this.parseHtmlData(html, endpoint)
        records.push(...htmlRecords)
      }
    } catch (error) {
      console.warn(`Failed to process data endpoint ${endpoint}:`, error)
    }
    
    return records
  }

  private parseJsonData(data: any): CollectedRecord[] {
    const records: CollectedRecord[] = []
    
    try {
      let items: any[] = []
      
      // Handle different JSON structures
      if (Array.isArray(data)) {
        items = data
      } else if (data.data && Array.isArray(data.data)) {
        items = data.data
      } else if (data.records && Array.isArray(data.records)) {
        items = data.records
      } else if (data.missing_persons && Array.isArray(data.missing_persons)) {
        items = data.missing_persons
      }
      
      for (const item of items) {
        const normalizedData = this.normalizeCaliforniaRecord(item)
        const record = this.createCollectedRecord(
          normalizedData.sourceRecordId,
          'missing_person',
          normalizedData
        )
        records.push(record)
      }
    } catch (error) {
      console.warn('Error parsing JSON data:', error)
    }
    
    return records
  }

  private parseCsvData(csvText: string): CollectedRecord[] {
    const records: CollectedRecord[] = []
    
    try {
      const lines = csvText.split('\n')
      if (lines.length < 2) return records
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const item: any = {}
        
        headers.forEach((header, index) => {
          item[header] = values[index] || ''
        })
        
        const normalizedData = this.normalizeCaliforniaRecord(item)
        const record = this.createCollectedRecord(
          normalizedData.sourceRecordId,
          'missing_person',
          normalizedData
        )
        records.push(record)
      }
    } catch (error) {
      console.warn('Error parsing CSV data:', error)
    }
    
    return records
  }

  private parseXmlData(xmlText: string): CollectedRecord[] {
    const records: CollectedRecord[] = []
    
    try {
      // Simple XML parsing for missing persons data
      const itemPattern = /<(?:person|case|record)[^>]*>([\s\S]*?)<\/(?:person|case|record)>/gi
      let match
      
      while ((match = itemPattern.exec(xmlText)) !== null) {
        const itemXml = match[1]
        const item: any = {}
        
        // Extract common fields from XML
        const fieldPatterns = {
          name: /<(?:name|full_name)[^>]*>(.*?)<\/(?:name|full_name)>/i,
          caseNumber: /<(?:case_number|id)[^>]*>(.*?)<\/(?:case_number|id)>/i,
          age: /<age[^>]*>(.*?)<\/age>/i,
          gender: /<(?:gender|sex)[^>]*>(.*?)<\/(?:gender|sex)>/i,
          city: /<city[^>]*>(.*?)<\/city>/i,
          state: /<state[^>]*>(.*?)<\/state>/i,
          dateMissing: /<(?:date_missing|missing_date)[^>]*>(.*?)<\/(?:date_missing|missing_date)>/i
        }
        
        for (const [field, pattern] of Object.entries(fieldPatterns)) {
          const fieldMatch = itemXml.match(pattern)
          if (fieldMatch) {
            item[field] = fieldMatch[1].trim()
          }
        }
        
        if (item.name || item.caseNumber) {
          const normalizedData = this.normalizeCaliforniaRecord(item)
          const record = this.createCollectedRecord(
            normalizedData.sourceRecordId,
            'missing_person',
            normalizedData
          )
          records.push(record)
        }
      }
    } catch (error) {
      console.warn('Error parsing XML data:', error)
    }
    
    return records
  }

  private parseHtmlData(html: string, sourceUrl: string): CollectedRecord[] {
    const records: CollectedRecord[] = []
    
    try {
      // Look for structured data in HTML (tables, lists, etc.)
      const tableRowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
      const listItemPattern = /<li[^>]*>([^<]*(?:missing|person)[^<]*)<\/li>/gi
      
      let match
      
      // Process table rows
      while ((match = tableRowPattern.exec(html)) !== null) {
        const rowHtml = match[1]
        const cellPattern = /<t[dh][^>]*>(.*?)<\/t[dh]>/gi
        const cells: string[] = []
        
        let cellMatch
        while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
          cells.push(cellMatch[1].trim())
        }
        
        if (cells.length >= 3) {
          // Try to parse as a missing person record
          const item = this.parseTableCells(cells)
          if (item.name || item.caseNumber) {
            item.sourceUrl = sourceUrl
            const normalizedData = this.normalizeCaliforniaRecord(item)
            const record = this.createCollectedRecord(
              normalizedData.sourceRecordId,
              'missing_person',
              normalizedData
            )
            records.push(record)
          }
        }
      }
    } catch (error) {
      console.warn('Error parsing HTML data:', error)
    }
    
    return records
  }

  private parseTableCells(cells: string[]): any {
    const item: any = {}
    
    // Common table structures for missing persons data
    if (cells.length >= 3) {
      // Assume first cell is name, second is case number or date, etc.
      const possibleName = cells[0]
      if (possibleName && possibleName.length > 2 && !possibleName.match(/^\d+$/)) {
        item.name = possibleName
      }
      
      // Look for case numbers
      for (const cell of cells) {
        if (cell.match(/^[A-Z0-9-]+$/)) {
          item.caseNumber = cell
          break
        }
      }
      
      // Look for dates
      for (const cell of cells) {
        if (cell.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)) {
          item.dateMissing = cell
          break
        }
      }
      
      // Look for age
      for (const cell of cells) {
        if (cell.match(/^\d{1,2}$/) && parseInt(cell) > 0 && parseInt(cell) < 120) {
          item.age = cell
          break
        }
      }
    }
    
    return item
  }

  private normalizeCaliforniaRecord(rawData: any): any {
    const normalized = this.normalizePersonData(rawData)
    
    // California-specific normalization
    normalized.sourceId = 'california_doj'
    normalized.state = normalized.state || 'CA'
    
    // Handle California-specific field mappings
    if (rawData.ca_case_number) {
      normalized.caseNumber = rawData.ca_case_number
    }
    
    if (rawData.missing_from) {
      normalized.city = rawData.missing_from
    }
    
    if (rawData.date_of_disappearance) {
      normalized.dateMissing = rawData.date_of_disappearance
    }
    
    return normalized
  }
}