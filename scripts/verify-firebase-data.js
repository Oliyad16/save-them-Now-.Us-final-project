#!/usr/bin/env node
/**
 * Firebase Data Verification Script
 * Checks if data exists in Firebase and provides detailed diagnostics
 */

const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getAuth } = require('firebase-admin/auth')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

async function verifyFirebaseConnection() {
  console.log('🔍 Firebase Data Verification Script')
  console.log('====================================\n')

  // Step 1: Check environment variables
  console.log('1️⃣ Checking Environment Variables...')
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'FIREBASE_PROJECT_ID', 
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
  ]
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:')
    missingVars.forEach(varName => console.error(`   - ${varName}`))
    console.log('\n💡 Please update your .env.local file with Firebase credentials.')
    console.log('📖 See FIREBASE_CREDENTIALS_SETUP.md for detailed instructions.\n')
    return false
  }
  
  console.log('✅ All required environment variables found')
  
  // Check if using placeholder values
  if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'placeholder-project-id') {
    console.log('⚠️  Using placeholder project ID - update with real Firebase project ID')
  }
  
  console.log(`   Project ID: ${process.env.FIREBASE_PROJECT_ID}`)
  console.log(`   Client Email: ${process.env.FIREBASE_CLIENT_EMAIL}`)
  console.log(`   Private Key: ${process.env.FIREBASE_PRIVATE_KEY ? 'Present' : 'Missing'}\n`)

  // Step 2: Initialize Firebase
  console.log('2️⃣ Initializing Firebase Admin SDK...')
  
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    
    const app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      })
    })

    const db = getFirestore(app)
    const auth = getAuth(app)
    
    console.log('✅ Firebase Admin SDK initialized successfully\n')
    
    // Step 3: Test Firestore connection
    console.log('3️⃣ Testing Firestore Connection...')
    
    try {
      // Try to read from a collection (this will create it if it doesn't exist)
      const testCollection = db.collection('_connection_test')
      const testDoc = testCollection.doc('test')
      
      await testDoc.set({ 
        timestamp: new Date(), 
        test: true,
        message: 'Connection successful'
      })
      
      const snapshot = await testDoc.get()
      if (snapshot.exists) {
        console.log('✅ Firestore read/write test successful')
        
        // Clean up test document
        await testDoc.delete()
        console.log('✅ Test cleanup completed')
      }
      
    } catch (firestoreError) {
      console.error('❌ Firestore connection failed:')
      console.error(`   Error: ${firestoreError.message}`)
      console.log('\n💡 Possible issues:')
      console.log('   - Firestore not enabled in Firebase Console')
      console.log('   - Incorrect project ID')
      console.log('   - Service account permissions not set')
      return false
    }
    
    console.log('')
    
    // Step 4: Check existing collections
    console.log('4️⃣ Checking Existing Collections...')
    
    const collections = ['missing_persons', 'users', 'donations', 'subscriptions']
    const collectionStats = {}
    
    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).limit(1).get()
        const count = await db.collection(collectionName).count().get()
        
        collectionStats[collectionName] = {
          exists: !snapshot.empty,
          count: count.data().count,
          hasData: !snapshot.empty
        }
        
        if (snapshot.empty) {
          console.log(`📭 ${collectionName}: Empty (0 documents)`)
        } else {
          console.log(`📊 ${collectionName}: ${count.data().count} documents`)
        }
        
      } catch (error) {
        console.log(`❌ ${collectionName}: Error accessing (${error.message})`)
        collectionStats[collectionName] = { exists: false, error: error.message }
      }
    }
    
    console.log('')
    
    // Step 5: Check Authentication setup
    console.log('5️⃣ Testing Firebase Authentication...')
    
    try {
      // List first few users (this tests auth permissions)
      const usersList = await auth.listUsers(1)
      console.log(`✅ Firebase Auth accessible`)
      console.log(`   Total users: ${usersList.users.length} (showing first 1)`)
      
    } catch (authError) {
      console.log(`⚠️  Firebase Auth: ${authError.message}`)
    }
    
    console.log('')
    
    // Step 6: Data Summary
    console.log('6️⃣ Data Summary')
    console.log('================')
    
    const totalDocuments = Object.values(collectionStats)
      .filter(stat => stat.count !== undefined)
      .reduce((sum, stat) => sum + stat.count, 0)
    
    if (totalDocuments === 0) {
      console.log('📭 No data found in Firestore')
      console.log('\n💡 Next steps:')
      console.log('   1. Run the migration script: npm run migrate:firebase')
      console.log('   2. Check that your SQLite database has data to migrate')
      console.log('   3. Verify Firebase project permissions\n')
    } else {
      console.log(`📊 Total documents in Firestore: ${totalDocuments}`)
      console.log('✅ Your Firebase database contains data!\n')
      
      console.log('🔍 Collection breakdown:')
      Object.entries(collectionStats).forEach(([name, stats]) => {
        if (stats.count > 0) {
          console.log(`   ${name}: ${stats.count} documents`)
        }
      })
    }
    
    // Step 7: API Testing Suggestion
    console.log('\n7️⃣ API Testing')
    console.log('================')
    console.log('Test your API endpoints to verify data access:')
    console.log('   curl http://localhost:3006/api/missing-persons')
    console.log('   curl http://localhost:3006/api/donations')
    console.log('')
    console.log('Look for "source": "firestore" in the response metadata')
    
    return true
    
  } catch (initError) {
    console.error('❌ Firebase initialization failed:')
    console.error(`   Error: ${initError.message}`)
    console.log('\n💡 Common issues:')
    console.log('   - Invalid service account credentials')
    console.log('   - Malformed private key (check newlines)')
    console.log('   - Project ID mismatch')
    console.log('   - Network connectivity issues')
    return false
  }
}

// Quick data check function
async function quickDataCheck() {
  console.log('\n🚀 Quick Data Check')
  console.log('===================')
  
  try {
    const response = await fetch('http://localhost:3006/api/missing-persons?limit=1')
    const data = await response.json()
    
    if (data.meta && data.meta.source) {
      console.log(`✅ API Response Source: ${data.meta.source}`)
      console.log(`📊 Total Records: ${data.meta.total || 'Unknown'}`)
      
      if (data.meta.source === 'firestore') {
        console.log('🎉 SUCCESS: Your app is using Firestore!')
      } else {
        console.log('⚠️  Your app is using fallback source (SQLite/CSV)')
        console.log('💡 This means Firebase connection failed')
      }
    } else {
      console.log('❌ Could not determine data source from API')
    }
    
  } catch (apiError) {
    console.log('❌ Could not connect to API endpoint')
    console.log('💡 Make sure your app is running: npm run dev')
  }
}

// Main execution
async function main() {
  const success = await verifyFirebaseConnection()
  
  if (success) {
    console.log('🎉 Firebase verification completed successfully!')
    
    // Try quick API check if server might be running
    await quickDataCheck()
  } else {
    console.log('❌ Firebase verification failed')
    console.log('📖 Please follow FIREBASE_CREDENTIALS_SETUP.md for configuration help')
  }
  
  console.log('\n' + '='.repeat(50))
}

// Run verification
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Verification script error:', error)
    process.exit(1)
  })
}

module.exports = { verifyFirebaseConnection }