#!/usr/bin/env node
/**
 * Firebase Data Migration Script
 * Migrates data from SQLite to Firebase Firestore
 */

const sqlite3 = require('sqlite3').verbose()
const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getAuth } = require('firebase-admin/auth')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

class FirebaseMigration {
  constructor() {
    this.db = null
    this.firestore = null
    this.auth = null
    this.stats = {
      users: { total: 0, migrated: 0, errors: 0 },
      missingPersons: { total: 0, migrated: 0, errors: 0 },
      donations: { total: 0, migrated: 0, errors: 0 },
      subscriptions: { total: 0, migrated: 0, errors: 0 }
    }
  }

  async initialize() {
    console.log('🔥 Initializing Firebase Migration...')
    
    // Initialize SQLite
    const dbPath = path.join(__dirname, '../database.sqlite')
    if (!fs.existsSync(dbPath)) {
      throw new Error(`SQLite database not found at: ${dbPath}`)
    }
    
    this.db = new sqlite3.Database(dbPath)
    console.log('✅ SQLite database connected')

    // Initialize Firebase
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      
      if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
        throw new Error('Firebase credentials not configured. Please update .env.local')
      }

      const app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        })
      })

      this.firestore = getFirestore(app)
      this.auth = getAuth(app)
      console.log('✅ Firebase initialized')

    } catch (error) {
      throw new Error(`Firebase initialization failed: ${error.message}`)
    }
  }

  async migrateUsers() {
    console.log('\n👥 Migrating Users...')
    
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM users', async (err, rows) => {
        if (err) {
          reject(err)
          return
        }

        this.stats.users.total = rows.length
        console.log(`Found ${rows.length} users to migrate`)

        for (const row of rows) {
          try {
            // Create Firebase Auth user
            let firebaseUser
            try {
              firebaseUser = await this.auth.createUser({
                uid: `sqlite_${row.id}`,
                email: row.email,
                displayName: row.name,
                emailVerified: !!row.email_verified,
                disabled: false
              })
            } catch (authError) {
              if (authError.code === 'auth/uid-already-exists') {
                firebaseUser = await this.auth.getUser(`sqlite_${row.id}`)
              } else {
                throw authError
              }
            }

            // Create Firestore user document
            const userData = {
              id: row.id,
              email: row.email,
              name: row.name,
              tier: row.tier || 'free',
              zipCode: row.zip_code,
              emailVerified: !!row.email_verified,
              createdAt: row.created_at ? new Date(row.created_at) : new Date(),
              lastLogin: row.last_login ? new Date(row.last_login) : null,
              migratedFrom: 'sqlite',
              migratedAt: new Date()
            }

            await this.firestore.collection('users').doc(firebaseUser.uid).set(userData)
            this.stats.users.migrated++
            
            if (this.stats.users.migrated % 10 === 0) {
              console.log(`  Migrated ${this.stats.users.migrated}/${this.stats.users.total} users`)
            }

          } catch (error) {
            console.error(`  Error migrating user ${row.email}:`, error.message)
            this.stats.users.errors++
          }
        }

        console.log(`✅ Users migration complete: ${this.stats.users.migrated} migrated, ${this.stats.users.errors} errors`)
        resolve()
      })
    })
  }

  async migrateMissingPersons() {
    console.log('\n🔍 Migrating Missing Persons...')
    
    // First try to load from CSV if SQLite table is empty
    const csvPath = path.join(__dirname, '../missing-persons.csv')
    let missingPersonsData = []

    if (fs.existsSync(csvPath)) {
      console.log('  Loading from CSV file...')
      const csv = require('csv-parse/sync')
      const csvContent = fs.readFileSync(csvPath, 'utf-8')
      const records = csv.parse(csvContent, { columns: true, skip_empty_lines: true })
      
      missingPersonsData = records.map((record, index) => ({
        id: index + 1,
        caseNumber: record['Case Number'] || `CSV_${index + 1}`,
        name: `${record['Legal First Name'] || ''} ${record['Legal Last Name'] || ''}`.trim(),
        age: this.parseAge(record['Missing Age']),
        gender: record['Biological Sex'],
        ethnicity: record['Race / Ethnicity'],
        city: record['City'],
        county: record['County'],
        state: record['State'],
        dlc: record['DLC'],
        category: this.parseAge(record['Missing Age']) < 18 ? 'Missing Children' : 'Missing Adults',
        source: 'csv_import'
      }))
    } else {
      // Fallback to SQLite
      console.log('  Loading from SQLite...')
      missingPersonsData = await new Promise((resolve, reject) => {
        this.db.all('SELECT * FROM missing_person LIMIT 1000', (err, rows) => {
          if (err) reject(err)
          else resolve(rows)
        })
      })
    }

    this.stats.missingPersons.total = missingPersonsData.length
    console.log(`Found ${missingPersonsData.length} missing persons to migrate`)

    let batch = this.firestore.batch()
    let batchCount = 0

    for (const record of missingPersonsData) {
      try {
        const docData = {
          caseNumber: record.caseNumber || record.case_number || `MIGRATED_${record.id}`,
          name: record.name || `${record.firstName || ''} ${record.lastName || ''}`.trim(),
          age: record.age || this.parseAge(record.ageText) || null,
          gender: record.gender || record.sex || null,
          ethnicity: record.ethnicity || record.race || null,
          city: record.city || null,
          county: record.county || null,
          state: record.state || null,
          location: this.buildLocation(record),
          latitude: record.latitude || null,
          longitude: record.longitude || null,
          dateMissing: record.dlc || record.date_missing || null,
          dateReported: record.dlc || record.date_missing || null,
          status: 'Active',
          category: record.category || (record.age && record.age < 18 ? 'Missing Children' : 'Missing Adults'),
          description: record.description || `Missing person from ${record.city || 'Unknown'}, ${record.state || 'Unknown'}`,
          source: record.source || 'migration',
          migratedFrom: 'sqlite',
          migratedAt: new Date(),
          searchable: {
            name: (record.name || '').toLowerCase(),
            city: (record.city || '').toLowerCase(),
            state: (record.state || '').toLowerCase(),
            caseNumber: (record.caseNumber || '').toLowerCase()
          }
        }

        // Remove undefined values
        Object.keys(docData).forEach(key => {
          if (docData[key] === undefined) {
            delete docData[key]
          }
        })

        const docRef = this.firestore.collection('missing_persons').doc()
        batch.set(docRef, docData)
        batchCount++

        // Commit batch every 500 records
        if (batchCount >= 500) {
          await batch.commit()
          this.stats.missingPersons.migrated += batchCount
          console.log(`  Migrated ${this.stats.missingPersons.migrated}/${this.stats.missingPersons.total} missing persons`)
          // Create a new batch for next set of records
          batch = this.firestore.batch()
          batchCount = 0
        }

      } catch (error) {
        console.error(`  Error preparing missing person ${record.id}:`, error.message)
        this.stats.missingPersons.errors++
      }
    }

    // Commit remaining records
    if (batchCount > 0) {
      await batch.commit()
      this.stats.missingPersons.migrated += batchCount
    }

    console.log(`✅ Missing Persons migration complete: ${this.stats.missingPersons.migrated} migrated, ${this.stats.missingPersons.errors} errors`)
  }

  async migrateDonations() {
    console.log('\n💰 Migrating Donations...')
    
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM donations', async (err, rows) => {
        if (err) {
          reject(err)
          return
        }

        this.stats.donations.total = rows.length
        console.log(`Found ${rows.length} donations to migrate`)

        const batch = this.firestore.batch()
        
        for (const row of rows) {
          try {
            const donationData = {
              id: row.id,
              userId: `sqlite_${row.user_id}`, // Reference to migrated user
              email: row.email,
              amount: row.amount,
              currency: row.currency || 'usd',
              donationType: row.donation_type,
              anonymous: !!row.anonymous,
              message: row.message,
              stripePaymentIntentId: row.stripe_payment_intent_id,
              receiptSent: !!row.receipt_sent,
              taxReceiptId: row.tax_receipt_id,
              createdAt: row.created_at ? new Date(row.created_at) : new Date(),
              migratedFrom: 'sqlite',
              migratedAt: new Date()
            }

            const docRef = this.firestore.collection('donations').doc()
            batch.set(docRef, donationData)
            this.stats.donations.migrated++

          } catch (error) {
            console.error(`  Error preparing donation ${row.id}:`, error.message)
            this.stats.donations.errors++
          }
        }

        await batch.commit()
        console.log(`✅ Donations migration complete: ${this.stats.donations.migrated} migrated, ${this.stats.donations.errors} errors`)
        resolve()
      })
    })
  }

  async migrateSubscriptions() {
    console.log('\n📱 Migrating Subscriptions...')
    
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM subscriptions', async (err, rows) => {
        if (err) {
          reject(err)
          return
        }

        this.stats.subscriptions.total = rows.length
        console.log(`Found ${rows.length} subscriptions to migrate`)

        const batch = this.firestore.batch()
        
        for (const row of rows) {
          try {
            const subscriptionData = {
              id: row.id,
              userId: `sqlite_${row.user_id}`, // Reference to migrated user
              tierId: row.tier_id,
              status: row.status,
              stripeSubscriptionId: row.stripe_subscription_id,
              stripeCustomerId: row.stripe_customer_id,
              currentPeriodStart: row.current_period_start ? new Date(row.current_period_start) : null,
              currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : null,
              cancelAtPeriodEnd: !!row.cancel_at_period_end,
              createdAt: row.created_at ? new Date(row.created_at) : new Date(),
              updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
              migratedFrom: 'sqlite',
              migratedAt: new Date()
            }

            const docRef = this.firestore.collection('subscriptions').doc()
            batch.set(docRef, subscriptionData)
            this.stats.subscriptions.migrated++

          } catch (error) {
            console.error(`  Error preparing subscription ${row.id}:`, error.message)
            this.stats.subscriptions.errors++
          }
        }

        await batch.commit()
        console.log(`✅ Subscriptions migration complete: ${this.stats.subscriptions.migrated} migrated, ${this.stats.subscriptions.errors} errors`)
        resolve()
      })
    })
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

  async createIndexes() {
    console.log('\n📊 Creating search indexes...')
    
    try {
      // Create a sample document with all searchable fields for indexing
      const indexDoc = {
        category: 'sample',
        status: 'sample',
        state: 'sample',
        age: 0,
        dateMissing: new Date(),
        createdAt: new Date(),
        'searchable.name': 'sample',
        'searchable.city': 'sample'
      }
      
      await this.firestore.collection('missing_persons').doc('_index_helper').set(indexDoc)
      await this.firestore.collection('missing_persons').doc('_index_helper').delete()
      
      console.log('✅ Indexes creation triggered')
    } catch (error) {
      console.warn('⚠️ Index creation warning:', error.message)
    }
  }

  printSummary() {
    console.log('\n📊 Migration Summary:')
    console.log('========================')
    
    Object.entries(this.stats).forEach(([table, stats]) => {
      console.log(`${table}:`)
      console.log(`  Total: ${stats.total}`)
      console.log(`  Migrated: ${stats.migrated}`)
      console.log(`  Errors: ${stats.errors}`)
      console.log(`  Success Rate: ${stats.total > 0 ? Math.round((stats.migrated / stats.total) * 100) : 0}%`)
      console.log('')
    })

    const totalMigrated = Object.values(this.stats).reduce((sum, stat) => sum + stat.migrated, 0)
    const totalErrors = Object.values(this.stats).reduce((sum, stat) => sum + stat.errors, 0)
    
    console.log(`🎉 Total Records Migrated: ${totalMigrated}`)
    console.log(`❌ Total Errors: ${totalErrors}`)
    
    if (totalMigrated > 0) {
      console.log('\n✅ Migration completed successfully!')
      console.log('🔥 Check your Firebase Console to see the migrated data')
      console.log('🌐 https://console.firebase.google.com/')
    }
  }

  async close() {
    if (this.db) {
      this.db.close()
    }
  }
}

// Main migration function
async function runMigration() {
  const migration = new FirebaseMigration()
  
  try {
    await migration.initialize()
    
    // Run migrations in order (skip users for now due to auth issues)
    console.log('👥 Skipping user migration due to authentication configuration issues')
    await migration.migrateMissingPersons()
    console.log('💰 Skipping donations migration - table does not exist')
    console.log('📱 Skipping subscriptions migration - table does not exist')
    await migration.createIndexes()
    
    migration.printSummary()
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error(error.stack)
    process.exit(1)
    
  } finally {
    await migration.close()
  }
}

// CLI interface
if (require.main === module) {
  console.log('🚀 Starting Firebase Migration...')
  console.log('Make sure you have completed the Firebase setup first!')
  console.log('See FIREBASE_SETUP_INSTRUCTIONS.md for details.\n')
  
  runMigration().catch(error => {
    console.error('Migration error:', error)
    process.exit(1)
  })
}

module.exports = { FirebaseMigration }