import { BaseCollector } from './BaseCollector'
import { DataSource, CollectedRecord } from '../types'

export class TexasDPSCollector extends BaseCollector {
  constructor(source: DataSource) {
    super(source)
  }

  async collect(): Promise<CollectedRecord[]> {
    console.log('🔍 Collecting data from Texas DPS...')
    
    const records: CollectedRecord[] = []
    
    try {
      // Texas Department of Public Safety Missing Persons Database
      const baseUrl = 'https://www.dps.texas.gov'
      const missingPersonsEndpoints = [
        `${baseUrl}/section/crime-records/missing-persons`,
        `${baseUrl}/criminalinvestigations/missingPersons.htm`,
        `${baseUrl}/texas-missing-persons`,
        `${baseUrl}/internetdata/texas_statewide_missing_persons.cfm`
      ]
      
      let activeEndpoint = null
      
      // Find an active endpoint
      for (const endpoint of missingPersonsEndpoints) {
        try {
          const response = await this.makeRequest(endpoint)
          if (response.ok) {
            activeEndpoint = endpoint
            break
          }
        } catch (error) {
          console.warn(`Texas DPS endpoint ${endpoint} not accessible:`, error)
        }
      }
      
      if (!activeEndpoint) {
        console.warn('No accessible Texas DPS endpoints found')
        return records
      }
      
      const mainPageResponse = await this.makeRequest(activeEndpoint)
      const mainPageContent = await mainPageResponse.text()
      
      // Extract case links or data sources
      const dataUrls = this.extractTexasDataUrls(mainPageContent, baseUrl)
      
      console.log(`📊 Found ${dataUrls.length} data sources from Texas DPS`)
      
      // Process each data source
      for (const dataUrl of dataUrls) {
        try {
          const urlRecords = await this.processTexasDataUrl(dataUrl)
          records.push(...urlRecords)
        } catch (error) {
          console.warn(`Failed to process Texas DPS URL ${dataUrl}:`, error)
        }
      }
      
      // If no structured data found, try to parse the main page directly
      if (records.length === 0) {
        const directRecords = await this.parseTexasMainPage(mainPageContent, activeEndpoint)
        records.push(...directRecords)
      }
      
      console.log(`✅ Successfully collected ${records.length} records from Texas DPS`)
      return records
      
    } catch (error) {
      console.error('❌ Texas DPS collection failed:', error)
      throw error
    }
  }

  private extractTexasDataUrls(html: string, baseUrl: string): string[] {
    const urls: string[] = []
    
    try {
      // Look for data files and case links specific to Texas DPS
      const patterns = [
        /href\s*=\s*["']([^"']*(?:missing|person|case)[^"']*\.(?:json|csv|xml))["']/gi,
        /href\s*=\s*["']([^"']*(?:data|api|search)[^"']*)["']/gi,
        /href\s*=\s*["']([^"']*case[^"']*)["']/gi,
        /href\s*=\s*["']([^"']*missing[^"']*)["']/gi
      ]
      
      for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(html)) !== null) {
          let url = match[1]
          if (!url.startsWith('http')) {
            if (url.startsWith('/')) {
              url = baseUrl + url
            } else if (url.startsWith('./')) {
              url = baseUrl + '/' + url.substring(2)
            } else {
              url = baseUrl + '/' + url
            }
          }
          urls.push(url)
        }
      }
      
      // Look for form actions that might lead to data
      const formPattern = /<form[^>]*action\s*=\s*["']([^"']*)["'][^>]*>/gi
      let formMatch
      while ((formMatch = formPattern.exec(html)) !== null) {
        let url = formMatch[1]
        if (!url.startsWith('http') && url.includes('search')) {
          url = baseUrl + (url.startsWith('/') ? '' : '/') + url
          urls.push(url)
        }
      }
      
      return [...new Set(urls)]
    } catch (error) {
      console.warn('Error extracting Texas data URLs:', error)
      return []
    }
  }

  private async processTexasDataUrl(dataUrl: string): Promise<CollectedRecord[]> {
    const records: CollectedRecord[] = []
    
    try {
      const response = await this.makeRequest(dataUrl)
      const contentType = response.headers.get('content-type') || ''
      
      if (contentType.includes('json') || dataUrl.includes('.json')) {
        const jsonData = await response.json()
        const jsonRecords = this.parseTexasJsonData(jsonData)
        records.push(...jsonRecords)
      } else if (contentType.includes('csv') || dataUrl.includes('.csv')) {
        const csvText = await response.text()
        const csvRecords = this.parseTexasCsvData(csvText)
        records.push(...csvRecords)
      } else if (contentType.includes('xml') || dataUrl.includes('.xml')) {
        const xmlText = await response.text()
        const xmlRecords = this.parseTexasXmlData(xmlText)
        records.push(...xmlRecords)
      } else {
        // Parse as HTML
        const htmlText = await response.text()
        const htmlRecords = await this.parseTexasHtmlData(htmlText, dataUrl)
        records.push(...htmlRecords)
      }
    } catch (error) {
      console.warn(`Failed to process Texas data URL ${dataUrl}:`, error)
    }
    
    return records
  }

  private parseTexasJsonData(data: any): CollectedRecord[] {
    const records: CollectedRecord[] = []
    
    try {
      let items: any[] = []
      
      // Handle various JSON structures
      if (Array.isArray(data)) {
        items = data
      } else if (data.data && Array.isArray(data.data)) {
        items = data.data
      } else if (data.results && Array.isArray(data.results)) {
        items = data.results
      } else if (data.missingPersons && Array.isArray(data.missingPersons)) {
        items = data.missingPersons
      }
      
      for (const item of items) {
        const normalizedData = this.normalizeTexasRecord(item)
        if (normalizedData.name || normalizedData.caseNumber) {
          const record = this.createCollectedRecord(
            normalizedData.sourceRecordId,
            'missing_person',
            normalizedData
          )
          records.push(record)
        }
      }
    } catch (error) {
      console.warn('Error parsing Texas JSON data:', error)
    }
    
    return records
  }

  private parseTexasCsvData(csvText: string): CollectedRecord[] {
    const records: CollectedRecord[] = []
    
    try {
      const lines = csvText.split('\n').filter(line => line.trim())
      if (lines.length < 2) return records
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCsvLine(lines[i])
        const item: any = {}
        
        headers.forEach((header, index) => {
          if (values[index]) {
            item[header] = values[index]
          }
        })
        
        const normalizedData = this.normalizeTexasRecord(item)
        if (normalizedData.name || normalizedData.caseNumber) {
          const record = this.createCollectedRecord(
            normalizedData.sourceRecordId,
            'missing_person',
            normalizedData
          )
          records.push(record)
        }
      }
    } catch (error) {
      console.warn('Error parsing Texas CSV data:', error)
    }
    
    return records
  }

  private parseTexasXmlData(xmlText: string): CollectedRecord[] {
    const records: CollectedRecord[] = []
    
    try {
      // Parse XML structure for Texas DPS format
      const recordPattern = /<(?:record|person|case|entry)[^>]*>([\s\S]*?)<\/(?:record|person|case|entry)>/gi
      let match
      
      while ((match = recordPattern.exec(xmlText)) !== null) {
        const recordXml = match[1]
        const item: any = {}
        
        // Extract fields from XML
        const fieldMappings = {
          name: /<(?:name|fullname|full_name)[^>]*>(.*?)<\/(?:name|fullname|full_name)>/i,
          caseNumber: /<(?:case_number|casenumber|id|case_id)[^>]*>(.*?)<\/(?:case_number|casenumber|id|case_id)>/i,
          age: /<age[^>]*>(.*?)<\/age>/i,
          gender: /<(?:gender|sex)[^>]*>(.*?)<\/(?:gender|sex)>/i,
          ethnicity: /<(?:race|ethnicity)[^>]*>(.*?)<\/(?:race|ethnicity)>/i,
          city: /<(?:city|location_city)[^>]*>(.*?)<\/(?:city|location_city)>/i,
          county: /<county[^>]*>(.*?)<\/county>/i,
          state: /<state[^>]*>(.*?)<\/state>/i,
          dateMissing: /<(?:date_missing|missing_date|last_seen)[^>]*>(.*?)<\/(?:date_missing|missing_date|last_seen)>/i,
          description: /<(?:description|circumstances)[^>]*>(.*?)<\/(?:description|circumstances)>/i
        }
        
        for (const [field, pattern] of Object.entries(fieldMappings)) {
          const fieldMatch = recordXml.match(pattern)
          if (fieldMatch) {
            item[field] = fieldMatch[1].trim()
          }
        }
        
        if (item.name || item.caseNumber) {
          const normalizedData = this.normalizeTexasRecord(item)
          const record = this.createCollectedRecord(
            normalizedData.sourceRecordId,
            'missing_person',
            normalizedData
          )
          records.push(record)
        }
      }
    } catch (error) {
      console.warn('Error parsing Texas XML data:', error)
    }
    
    return records
  }

  private async parseTexasHtmlData(html: string, sourceUrl: string): Promise<CollectedRecord[]> {
    const records: CollectedRecord[] = []
    
    try {
      // Look for tables with missing persons data
      const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi
      let tableMatch
      
      while ((tableMatch = tablePattern.exec(html)) !== null) {
        const tableHtml = tableMatch[1]
        const tableRecords = this.parseTexasTable(tableHtml, sourceUrl)
        records.push(...tableRecords)
      }
      
      // Look for individual case divs or sections
      const casePattern = /<div[^>]*(?:class|id)[^>]*(?:case|person|missing)[^>]*>([\s\S]*?)<\/div>/gi
      let caseMatch
      
      while ((caseMatch = casePattern.exec(html)) !== null) {
        const caseHtml = caseMatch[1]
        const caseData = this.parseTexasCaseDiv(caseHtml, sourceUrl)
        if (caseData && (caseData.name || caseData.caseNumber)) {
          const normalizedData = this.normalizeTexasRecord(caseData)
          const record = this.createCollectedRecord(
            normalizedData.sourceRecordId,
            'missing_person',
            normalizedData
          )
          records.push(record)
        }
      }
    } catch (error) {
      console.warn('Error parsing Texas HTML data:', error)
    }
    
    return records
  }

  private parseTexasTable(tableHtml: string, sourceUrl: string): CollectedRecord[] {
    const records: CollectedRecord[] = []
    
    try {
      const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
      const rows: string[] = []
      let rowMatch
      
      while ((rowMatch = rowPattern.exec(tableHtml)) !== null) {
        rows.push(rowMatch[1])
      }
      
      if (rows.length < 2) return records
      
      // Parse header row
      const headerCells = this.parseTableRow(rows[0])
      
      // Parse data rows
      for (let i = 1; i < rows.length; i++) {
        const dataCells = this.parseTableRow(rows[i])
        if (dataCells.length >= headerCells.length) {
          const item: any = { sourceUrl }
          
          headerCells.forEach((header, index) => {
            if (dataCells[index]) {
              item[header.toLowerCase().replace(/\s+/g, '_')] = dataCells[index]
            }
          })
          
          if (item.name || item.case_number || item.missing_person) {
            const normalizedData = this.normalizeTexasRecord(item)
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
      console.warn('Error parsing Texas table:', error)
    }
    
    return records
  }

  private parseTableRow(rowHtml: string): string[] {
    const cells: string[] = []
    const cellPattern = /<t[dh][^>]*>(.*?)<\/t[dh]>/gi
    let cellMatch
    
    while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
      const cellContent = cellMatch[1].replace(/<[^>]*>/g, '').trim()
      cells.push(cellContent)
    }
    
    return cells
  }

  private parseTexasCaseDiv(caseHtml: string, sourceUrl: string): any {
    const caseData: any = { sourceUrl }
    
    try {
      // Extract information from the case div
      const patterns = {
        name: /(?:name|person)\s*:?\s*([^<\n\r]+)/i,
        caseNumber: /(?:case\s*(?:number|#)|id)\s*:?\s*([A-Z0-9-]+)/i,
        age: /age\s*:?\s*(\d+)/i,
        gender: /(?:gender|sex)\s*:?\s*(male|female|m|f)/i,
        city: /(?:city|location)\s*:?\s*([^,<\n\r]+)/i,
        county: /county\s*:?\s*([^,<\n\r]+)/i,
        dateMissing: /(?:missing\s+since|last\s+seen|date)\s*:?\s*([0-9\/\-]+)/i
      }
      
      for (const [field, pattern] of Object.entries(patterns)) {
        const match = caseHtml.match(pattern)
        if (match) {
          caseData[field] = match[1].trim()
        }
      }
    } catch (error) {
      console.warn('Error parsing Texas case div:', error)
    }
    
    return caseData
  }

  private async parseTexasMainPage(html: string, sourceUrl: string): Promise<CollectedRecord[]> {
    const records: CollectedRecord[] = []
    
    try {
      // Try to find any structured missing persons data on the main page
      const mainPageRecords = await this.parseTexasHtmlData(html, sourceUrl)
      records.push(...mainPageRecords)
    } catch (error) {
      console.warn('Error parsing Texas main page:', error)
    }
    
    return records
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  private normalizeTexasRecord(rawData: any): any {
    const normalized = this.normalizePersonData(rawData)
    
    // Texas-specific normalization
    normalized.sourceId = 'texas_dps'
    normalized.state = normalized.state || 'TX'
    
    // Handle Texas-specific field mappings
    if (rawData.dps_case_number) {
      normalized.caseNumber = rawData.dps_case_number
    }
    
    if (rawData.missing_from || rawData.last_seen_location) {
      normalized.city = rawData.missing_from || rawData.last_seen_location
    }
    
    if (rawData.date_last_seen) {
      normalized.dateMissing = rawData.date_last_seen
    }
    
    return normalized
  }
}