import { CollectedRecord } from '../data-sources/types'
import { adminDb } from '@/lib/firebase/admin'
import { missingPersonsService, MissingPersonData } from '@/lib/firestore/services'
import { criticalCaseAlertService } from '../alerts/CriticalCaseAlertService'
import crypto from 'crypto'

export interface ChangeEvent {
  id: string
  type: 'new_case' | 'status_update' | 'info_update' | 'resolution' | 'amber_alert'
  sourceId: string
  recordId: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  changes: {
    field: string
    oldValue: any
    newValue: any
    significance: 'major' | 'minor'
  }[]
  record: any
  detectedAt: Date
  processed: boolean
}

export interface ValidationResult {
  isValid: boolean
  confidence: number // 0-1
  issues: ValidationIssue[]
  normalizedData: any
}

export interface ValidationIssue {
  field: string
  severity: 'error' | 'warning' | 'info'
  message: string
  suggestion?: string
}

export class ChangeDetectionService {
  private duplicateThreshold = 0.85 // Similarity threshold for duplicate detection
  
  async processCollectedRecords(): Promise<ChangeEvent[]> {
    console.log('🔍 Processing collected records for changes...')
    
    const changes: ChangeEvent[] = []
    
    try {
      // Get unprocessed collected records
      const unprocessedRecords = await this.getUnprocessedRecords()
      console.log(`📊 Found ${unprocessedRecords.length} unprocessed records`)
      
      for (const record of unprocessedRecords) {
        try {
          const validationResult = await this.validateRecord(record)
          
          if (validationResult.isValid) {
            const changeEvents = await this.detectChanges(record, validationResult.normalizedData)
            changes.push(...changeEvents)
            
            // Process critical case alerts for each change event
            for (const changeEvent of changeEvents) {
              try {
                await criticalCaseAlertService.processChangeEvent(changeEvent)
              } catch (error) {
                console.error('Failed to process critical case alert:', error)
              }
            }
            
            // Mark record as processed
            await this.markRecordProcessed(record.id, true)
          } else {
            console.warn(`⚠️ Record validation failed:`, validationResult.issues)
            await this.markRecordProcessed(record.id, false, validationResult.issues)
          }
        } catch (error) {
          console.error(`❌ Error processing record ${record.id}:`, error)
          await this.markRecordProcessed(record.id, false, [
            { field: 'processing', severity: 'error', message: String(error) }
          ])
        }
      }
      
      console.log(`✅ Change detection complete: ${changes.length} changes detected`)
      return changes
      
    } catch (error) {
      console.error('❌ Change detection process failed:', error)
      throw error
    }
  }

  private async getUnprocessedRecords(): Promise<any[]> {
    if (!adminDb) return []
    
    try {
      const snapshot = await adminDb.collection('collected_records')
        .where('status', '==', 'pending')
        .orderBy('collectedAt', 'desc')
        .limit(500) // Process in batches
        .get()
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error getting unprocessed records:', error)
      return []
    }
  }

  async validateRecord(record: CollectedRecord): Promise<ValidationResult> {
    const issues: ValidationIssue[] = []
    let confidence = 1.0
    
    const data = record.data
    
    // Required field validation
    if (!data.name || data.name.trim() === '') {
      issues.push({
        field: 'name',
        severity: 'error',
        message: 'Name is required',
        suggestion: 'Check if name can be extracted from other fields'
      })
      confidence -= 0.3
    }
    
    if (!data.caseNumber || data.caseNumber.trim() === '') {
      issues.push({
        field: 'caseNumber',
        severity: 'warning',
        message: 'Case number is missing',
        suggestion: 'Generate a unique case number if not provided'
      })
      confidence -= 0.1
    }
    
    // Location validation
    if (!data.city && !data.state && !data.location) {
      issues.push({
        field: 'location',
        severity: 'error',
        message: 'Location information is insufficient',
        suggestion: 'At least city or state must be provided'
      })
      confidence -= 0.2
    }
    
    // Date validation
    if (data.dateMissing) {
      const missingDate = new Date(data.dateMissing)
      const now = new Date()
      
      if (isNaN(missingDate.getTime())) {
        issues.push({
          field: 'dateMissing',
          severity: 'warning',
          message: 'Invalid date format for dateMissing'
        })
        confidence -= 0.1
      } else if (missingDate > now) {
        issues.push({
          field: 'dateMissing',
          severity: 'error',
          message: 'Missing date cannot be in the future'
        })
        confidence -= 0.2
      } else if (missingDate < new Date('1900-01-01')) {
        issues.push({
          field: 'dateMissing',
          severity: 'warning',
          message: 'Missing date seems unusually old'
        })
        confidence -= 0.1
      }
    }
    
    // Age validation
    if (data.age !== null && data.age !== undefined) {
      if (data.age < 0 || data.age > 120) {
        issues.push({
          field: 'age',
          severity: 'error',
          message: 'Age is outside valid range (0-120)',
          suggestion: 'Check age calculation or data source'
        })
        confidence -= 0.2
      }
    }
    
    // Data quality checks
    if (data.name && data.name.length < 2) {
      issues.push({
        field: 'name',
        severity: 'warning',
        message: 'Name appears to be too short',
        suggestion: 'Verify name completeness'
      })
      confidence -= 0.1
    }
    
    // Geographic consistency
    if (data.state && data.city) {
      const isValidCombination = await this.validateCityStateCombo(data.city, data.state)
      if (!isValidCombination) {
        issues.push({
          field: 'location',
          severity: 'warning',
          message: 'City/state combination may be invalid',
          suggestion: 'Verify geographic data'
        })
        confidence -= 0.1
      }
    }
    
    // Check for potential duplicates
    const duplicateCheck = await this.checkForDuplicates(record)
    if (duplicateCheck.hasDuplicates) {
      issues.push({
        field: 'duplicate',
        severity: duplicateCheck.confidence > 0.9 ? 'error' : 'warning',
        message: `Potential duplicate found (${Math.round(duplicateCheck.confidence * 100)}% similarity)`,
        suggestion: 'Review for duplicate entry'
      })
      confidence -= duplicateCheck.confidence * 0.3
    }
    
    // Normalize and clean data
    const normalizedData = this.normalizeValidatedData(data, issues)
    
    const isValid = !issues.some(issue => issue.severity === 'error') && confidence > 0.5
    
    return {
      isValid,
      confidence: Math.max(0, confidence),
      issues,
      normalizedData
    }
  }

  private async validateCityStateCombo(city: string, state: string): Promise<boolean> {
    // Simple validation - in a real implementation, you'd use a geographic database
    // For now, just check if state is a valid US state
    const validStates = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ]
    
    return validStates.includes(state.toUpperCase()) || state.length > 2
  }

  private async checkForDuplicates(record: CollectedRecord): Promise<{hasDuplicates: boolean, confidence: number, matches: any[]}> {
    try {
      const data = record.data
      
      // Search for potential duplicates based on name and key details
      const searchTerms = [
        data.name,
        data.caseNumber,
        `${data.firstName} ${data.lastName}`.trim()
      ].filter(Boolean)
      
      const matches = []
      
      for (const term of searchTerms) {
        if (term && term.length > 2) {
          try {
            const searchResults = await missingPersonsService.search(term, { limit: 10 })
            matches.push(...searchResults)
          } catch (error) {
            console.warn('Error searching for duplicates:', error)
          }
        }
      }
      
      // Calculate similarity for each match
      let maxSimilarity = 0
      const significantMatches = []
      
      for (const match of matches) {
        const similarity = this.calculateSimilarity(data, match)
        if (similarity > this.duplicateThreshold) {
          significantMatches.push({ match, similarity })
          maxSimilarity = Math.max(maxSimilarity, similarity)
        }
      }
      
      return {
        hasDuplicates: significantMatches.length > 0,
        confidence: maxSimilarity,
        matches: significantMatches
      }
    } catch (error) {
      console.warn('Error checking for duplicates:', error)
      return { hasDuplicates: false, confidence: 0, matches: [] }
    }
  }

  private calculateSimilarity(record1: any, record2: any): number {
    let score = 0
    let factors = 0
    
    // Name similarity
    if (record1.name && record2.name) {
      factors++
      const nameSimilarity = this.stringSimilarity(
        record1.name.toLowerCase(),
        record2.name.toLowerCase()
      )
      score += nameSimilarity * 0.4 // Name is weighted heavily
    }
    
    // Case number exact match
    if (record1.caseNumber && record2.caseNumber) {
      factors++
      if (record1.caseNumber === record2.caseNumber) {
        score += 0.3
      }
    }
    
    // Location similarity
    if (record1.city && record2.city && record1.state && record2.state) {
      factors++
      const citySimilarity = this.stringSimilarity(
        record1.city.toLowerCase(),
        record2.city.toLowerCase()
      )
      const stateSimilarity = record1.state.toLowerCase() === record2.state.toLowerCase() ? 1 : 0
      score += (citySimilarity * 0.15 + stateSimilarity * 0.15)
    }
    
    // Age similarity
    if (record1.age && record2.age) {
      factors++
      const ageDiff = Math.abs(record1.age - record2.age)
      const ageSimilarity = Math.max(0, 1 - ageDiff / 10) // 10 year tolerance
      score += ageSimilarity * 0.1
    }
    
    // Date similarity
    if (record1.dateMissing && record2.dateMissing) {
      factors++
      const date1 = new Date(record1.dateMissing)
      const date2 = new Date(record2.dateMissing)
      if (!isNaN(date1.getTime()) && !isNaN(date2.getTime())) {
        const daysDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24)
        const dateSimilarity = Math.max(0, 1 - daysDiff / 365) // 1 year tolerance
        score += dateSimilarity * 0.1
      }
    }
    
    return factors > 0 ? score / factors : 0
  }

  private stringSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const distance = this.levenshteinDistance(longer, shorter)
    return (longer.length - distance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  private normalizeValidatedData(data: any, issues: ValidationIssue[]): any {
    const normalized = { ...data }
    
    // Apply fixes based on validation issues
    for (const issue of issues) {
      if (issue.suggestion && issue.severity !== 'error') {
        switch (issue.field) {
          case 'caseNumber':
            if (!normalized.caseNumber) {
              normalized.caseNumber = `${normalized.sourceId}_${normalized.sourceRecordId || Date.now()}`
            }
            break
          case 'name':
            if (!normalized.name && normalized.firstName && normalized.lastName) {
              normalized.name = `${normalized.firstName} ${normalized.lastName}`.trim()
            }
            break
        }
      }
    }
    
    // Add validation metadata
    normalized.validationMetadata = {
      validatedAt: new Date(),
      confidence: issues.length === 0 ? 1.0 : Math.max(0.5, 1.0 - issues.length * 0.1),
      issues: issues.filter(i => i.severity === 'warning' || i.severity === 'info')
    }
    
    return normalized
  }

  private async detectChanges(record: CollectedRecord, normalizedData: any): Promise<ChangeEvent[]> {
    const changes: ChangeEvent[] = []
    
    try {
      // Check if this is a new record or an update to existing
      const existingRecord = await this.findExistingRecord(record)
      
      if (!existingRecord) {
        // New case detected
        changes.push({
          id: crypto.randomUUID(),
          type: record.recordType === 'amber_alert' ? 'amber_alert' : 'new_case',
          sourceId: record.sourceId,
          recordId: record.sourceRecordId,
          priority: record.recordType === 'amber_alert' ? 'critical' : 'high',
          changes: [],
          record: normalizedData,
          detectedAt: new Date(),
          processed: false
        })
      } else {
        // Check for updates
        const fieldChanges = this.compareRecords(existingRecord, normalizedData)
        
        if (fieldChanges.length > 0) {
          const priority = this.determinePriority(fieldChanges)
          const changeType = this.determineChangeType(fieldChanges)
          
          changes.push({
            id: crypto.randomUUID(),
            type: changeType,
            sourceId: record.sourceId,
            recordId: record.sourceRecordId,
            priority,
            changes: fieldChanges,
            record: normalizedData,
            detectedAt: new Date(),
            processed: false
          })
        }
      }
    } catch (error) {
      console.error('Error detecting changes:', error)
    }
    
    return changes
  }

  private async findExistingRecord(record: CollectedRecord): Promise<any | null> {
    try {
      // Try to find by case number first
      if (record.data.caseNumber) {
        const results = await missingPersonsService.search(record.data.caseNumber, { limit: 1 })
        if (results.length > 0) {
          return results[0]
        }
      }
      
      // Try to find by name and location
      if (record.data.name) {
        const results = await missingPersonsService.search(record.data.name, { limit: 5 })
        for (const result of results) {
          const similarity = this.calculateSimilarity(record.data, result)
          if (similarity > 0.8) {
            return result
          }
        }
      }
      
      return null
    } catch (error) {
      console.warn('Error finding existing record:', error)
      return null
    }
  }

  private compareRecords(existing: any, updated: any): any[] {
    const changes = []
    const fieldsToCheck = [
      'status', 'location', 'description', 'circumstances', 
      'dateModified', 'age', 'height', 'weight'
    ]
    
    for (const field of fieldsToCheck) {
      const oldValue = existing[field]
      const newValue = updated[field]
      
      if (oldValue !== newValue && newValue !== undefined && newValue !== null) {
        const significance = this.getFieldSignificance(field, oldValue, newValue)
        changes.push({
          field,
          oldValue,
          newValue,
          significance
        })
      }
    }
    
    return changes
  }

  private getFieldSignificance(field: string, oldValue: any, newValue: any): 'major' | 'minor' {
    // Define which field changes are considered major vs minor
    const majorFields = ['status', 'location']
    
    if (majorFields.includes(field)) {
      return 'major'
    }
    
    // Special case for status changes
    if (field === 'status') {
      if (oldValue === 'Active' && newValue === 'Found') {
        return 'major'
      }
    }
    
    return 'minor'
  }

  private determinePriority(changes: any[]): 'critical' | 'high' | 'medium' | 'low' {
    const hasMajorChanges = changes.some(c => c.significance === 'major')
    const hasStatusChange = changes.some(c => c.field === 'status')
    
    if (hasStatusChange && changes.find(c => c.field === 'status')?.newValue === 'Found') {
      return 'critical' // Person found - highest priority
    }
    
    if (hasMajorChanges) {
      return 'high'
    }
    
    return changes.length > 3 ? 'medium' : 'low'
  }

  private determineChangeType(changes: any[]): ChangeEvent['type'] {
    const statusChange = changes.find(c => c.field === 'status')
    
    if (statusChange) {
      if (statusChange.newValue === 'Found' || statusChange.newValue === 'Located') {
        return 'resolution'
      }
      return 'status_update'
    }
    
    return 'info_update'
  }

  private async markRecordProcessed(recordId: string, success: boolean, issues?: ValidationIssue[]): Promise<void> {
    if (!adminDb) return
    
    try {
      await adminDb.collection('collected_records').doc(recordId).update({
        status: success ? 'processed' : 'failed',
        processedAt: new Date(),
        validationIssues: issues || []
      })
    } catch (error) {
      console.warn(`Warning updating record status for ${recordId}:`, error)
    }
  }

  // Public methods for manual operations
  async reprocessFailedRecords(): Promise<ChangeEvent[]> {
    console.log('🔄 Reprocessing failed records...')
    
    if (!adminDb) return []
    
    try {
      // Reset failed records to pending
      await adminDb.collection('collected_records')
        .where('status', '==', 'failed')
        .get()
        .then(snapshot => {
          const batch = adminDb!.batch()
          snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { status: 'pending' })
          })
          return batch.commit()
        })
      
      // Process them again
      return await this.processCollectedRecords()
    } catch (error) {
      console.error('Error reprocessing failed records:', error)
      return []
    }
  }

  async getProcessingStats(): Promise<any> {
    if (!adminDb) return null
    
    try {
      const snapshot = await adminDb.collection('collected_records').get()
      const stats = {
        total: 0,
        pending: 0,
        processed: 0,
        failed: 0
      }
      
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        stats.total++
        stats[data.status as keyof typeof stats]++
      })
      
      return stats
    } catch (error) {
      console.error('Error getting processing stats:', error)
      return null
    }
  }
}

export const changeDetectionService = new ChangeDetectionService()