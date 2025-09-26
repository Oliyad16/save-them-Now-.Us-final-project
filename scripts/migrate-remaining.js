#!/usr/bin/env node
/**
 * Efficient migration script to handle remaining data
 */

const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const fs = require('fs')
const path = require('path')
const { parse } = require('csv-parse/sync')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

class EfficientMigration {
  constructor() {
    this.firestore = null
    this.batchSize = 400 // Smaller batch size for reliability
    this.stats = { total: 0, migrated: 0, errors: 0, skipped: 0 }
  }

  async initialize() {
    console.log('🔥 Initializing Firebase...')
    
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    
    if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
      throw new Error('Firebase credentials not configured.')
    }

    const app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      })
    })

    this.firestore = getFirestore(app)
    console.log('✅ Firebase initialized')
  }

  async getExistingCaseNumbers() {
    console.log('📊 Checking existing records...')
    const existingCases = new Set()
    
    try {
      const snapshot = await this.firestore.collection('missing_persons').get()
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.caseNumber) {
          existingCases.add(data.caseNumber)
        }
      })
      console.log(`Found ${existingCases.size} existing records`)
    } catch (error) {
      console.log('No existing records found or error checking:', error.message)
    }
    
    return existingCases
  }

  parseAge(ageText) {
    if (!ageText) return null
    const digits = ageText.toString().replace(/\D/g, '')
    return digits ? parseInt(digits) : null
  }

  buildLocation(record) {
    const parts = [record.city, record.county, record.state, 'USA'].filter(Boolean)
    return parts.join(', ')
  }

  async migrateInBatches(records, existingCases) {
    console.log(`🚀 Starting migration of ${records.length} records...`)
    
    // Split records into chunks
    const chunks = []
    for (let i = 0; i < records.length; i += this.batchSize) {
      chunks.push(records.slice(i, i + this.batchSize))
    }

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex]
      console.log(`\n📦 Processing batch ${chunkIndex + 1}/${chunks.length} (${chunk.length} records)`)
      
      const batch = this.firestore.batch()
      let batchCount = 0

      for (const record of chunk) {
        try {
          const caseNumber = record['Case Number'] || `MIGRATED_${record.id || Date.now()}_${Math.random()}`
          
          // Skip if already exists
          if (existingCases.has(caseNumber)) {
            this.stats.skipped++
            continue
          }

          const firstName = (record['Legal First Name'] || '').toString().trim()
          const lastName = (record['Legal Last Name'] || '').toString().trim()
          const name = [firstName, lastName].filter(Boolean).join(' ')
          const age = this.parseAge(record['Missing Age'])

          const docData = {
            caseNumber,
            name: name || 'Unknown',
            age: age || null,
            gender: record['Biological Sex'] || null,
            ethnicity: record['Race / Ethnicity'] || null,
            city: record['City'] || null,
            county: record['County'] || null,
            state: record['State'] || null,
            location: this.buildLocation(record),
            latitude: null, // Will be geocoded separately if needed
            longitude: null,
            dateMissing: record['DLC'] || null,
            dateReported: record['DLC'] || null,
            status: 'Active',
            category: age && age < 18 ? 'Missing Children' : 'Missing Adults',
            description: `Missing person from ${record['City'] || 'Unknown'}, ${record['State'] || 'Unknown'}`,
            source: 'csv_migration',
            migratedFrom: 'csv',
            migratedAt: new Date(),
            searchable: {
              name: (name || '').toLowerCase(),
              city: (record['City'] || '').toLowerCase(),
              state: (record['State'] || '').toLowerCase(),
              caseNumber: caseNumber.toLowerCase()
            }
          }

          // Clean undefined values
          Object.keys(docData).forEach(key => {
            if (docData[key] === undefined) {
              delete docData[key]
            }
          })

          const docRef = this.firestore.collection('missing_persons').doc()
          batch.set(docRef, docData)
          batchCount++

        } catch (error) {
          console.error(`    Error preparing record:`, error.message)
          this.stats.errors++
        }
      }

      // Commit the batch if it has data
      if (batchCount > 0) {
        try {
          await batch.commit()
          this.stats.migrated += batchCount
          console.log(`    ✅ Batch committed: ${batchCount} records`)
          console.log(`    📊 Progress: ${this.stats.migrated} migrated, ${this.stats.skipped} skipped, ${this.stats.errors} errors`)
          
          // Small delay to avoid overwhelming Firestore
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error(`    ❌ Batch commit failed:`, error.message)
          this.stats.errors += batchCount
        }
      } else {
        console.log('    ⏭️ Batch skipped (no new records)')
      }
    }
  }

  async run() {
    try {
      await this.initialize()
      
      // Load CSV data
      const csvPath = path.join(__dirname, '../missing-persons.csv')
      console.log('📄 Loading CSV data...')
      
      const csvContent = fs.readFileSync(csvPath, 'utf-8')
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      })

      this.stats.total = records.length
      console.log(`Found ${records.length} records in CSV`)

      // Get existing records to avoid duplicates
      const existingCases = await this.getExistingCaseNumbers()
      
      // Migrate in batches
      await this.migrateInBatches(records, existingCases)
      
      // Final summary
      console.log('\n🎉 Migration Complete!')
      console.log('=====================')
      console.log(`Total records: ${this.stats.total}`)
      console.log(`Successfully migrated: ${this.stats.migrated}`)
      console.log(`Skipped (duplicates): ${this.stats.skipped}`)
      console.log(`Errors: ${this.stats.errors}`)
      console.log(`Success rate: ${Math.round((this.stats.migrated / (this.stats.total - this.stats.skipped)) * 100)}%`)
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message)
      process.exit(1)
    }
  }
}

// Run migration
if (require.main === module) {
  const migration = new EfficientMigration()
  migration.run().catch(console.error)
}

module.exports = { EfficientMigration }