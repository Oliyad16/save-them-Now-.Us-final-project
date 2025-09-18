const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { readFileSync } = require('fs');

// Test configuration
const PROJECT_ID = 'save-them-now-test';
const RULES_FILE = './firestore.rules.test';

// Load the Firestore rules
const rules = readFileSync(RULES_FILE, 'utf8');

let testEnv;

/**
 * Initialize test environment
 */
async function initializeTestEnv() {
  if (!testEnv) {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules
      }
    });
  }
  return testEnv;
}

/**
 * Create a Firebase app with auth context
 */
async function getAuthedFirestore(auth) {
  const env = await initializeTestEnv();
  return env.authenticatedContext(auth.uid).firestore();
}

/**
 * Create a Firebase app without auth (anonymous)
 */
async function getUnauthenticatedFirestore() {
  const env = await initializeTestEnv();
  return env.unauthenticatedContext().firestore();
}

/**
 * Test suite for missing persons collection
 */
async function testMissingPersonsRules() {
  console.log('\n🧪 Testing Missing Persons Rules...');
  
  const db = await getUnauthenticatedFirestore();
  const authDb = await getAuthedFirestore({ uid: 'test-user' });
  
  try {
    // Test 1: Public read access (should work)
    console.log('✓ Testing public read access...');
    await assertSucceeds(
      db.collection('missing_persons').doc('test-person').get()
    );
    
    // Test 2: Anonymous write (should fail)
    console.log('✓ Testing anonymous write (should fail)...');
    await assertFails(
      db.collection('missing_persons').doc('test-person').set({
        name: 'Test Person',
        status: 'Active',
        category: 'Missing Adults'
      })
    );
    
    // Test 3: Authenticated write (should work)
    console.log('✓ Testing authenticated write...');
    await assertSucceeds(
      authDb.collection('missing_persons').doc('test-person').set({
        name: 'Test Person',
        status: 'Active',
        category: 'Missing Adults'
      })
    );
    
    console.log('✅ Missing Persons rules: PASSED');
    
  } catch (error) {
    console.log('❌ Missing Persons rules: FAILED');
    console.error(error.message);
  }
}

/**
 * Test suite for users collection
 */
async function testUsersRules() {
  console.log('\n🧪 Testing Users Rules...');
  
  const db = await getUnauthenticatedFirestore();
  const authDb = await getAuthedFirestore({ uid: 'test-user' });
  const otherUserDb = await getAuthedFirestore({ uid: 'other-user' });
  
  try {
    // Test 1: Anonymous access (should fail)
    console.log('✓ Testing anonymous user access (should fail)...');
    await assertFails(
      db.collection('users').doc('test-user').get()
    );
    
    // Test 2: Own user data access (should work)
    console.log('✓ Testing own user data access...');
    await assertSucceeds(
      authDb.collection('users').doc('test-user').set({
        name: 'Test User',
        email: 'test@example.com'
      })
    );
    
    // Test 3: Other user data access (should fail)
    console.log('✓ Testing other user data access (should fail)...');
    await assertFails(
      otherUserDb.collection('users').doc('test-user').get()
    );
    
    console.log('✅ Users rules: PASSED');
    
  } catch (error) {
    console.log('❌ Users rules: FAILED');
    console.error(error.message);
  }
}

/**
 * Test suite for reports collection
 */
async function testReportsRules() {
  console.log('\n🧪 Testing Reports Rules...');
  
  const db = await getUnauthenticatedFirestore();
  const authDb = await getAuthedFirestore({ uid: 'test-user' });
  
  try {
    // Test 1: Anonymous tip submission (should work)
    console.log('✓ Testing anonymous tip submission...');
    await assertSucceeds(
      db.collection('reports').add({
        tip: 'I saw this person at the mall',
        personId: 'test-person',
        submittedBy: 'anonymous'
      })
    );
    
    // Test 2: Anonymous read (should fail)
    console.log('✓ Testing anonymous read access (should fail)...');
    await assertFails(
      db.collection('reports').doc('test-report').get()
    );
    
    // Test 3: Authenticated read (should work)
    console.log('✓ Testing authenticated read access...');
    await assertSucceeds(
      authDb.collection('reports').doc('test-report').get()
    );
    
    console.log('✅ Reports rules: PASSED');
    
  } catch (error) {
    console.log('❌ Reports rules: FAILED');
    console.error(error.message);
  }
}

/**
 * Test suite for statistics collection
 */
async function testStatisticsRules() {
  console.log('\n🧪 Testing Statistics Rules...');
  
  const db = await getUnauthenticatedFirestore();
  const authDb = await getAuthedFirestore({ uid: 'test-user' });
  
  try {
    // Test 1: Public read access (should work)
    console.log('✓ Testing public statistics read...');
    await assertSucceeds(
      db.collection('statistics').doc('daily-stats').get()
    );
    
    // Test 2: Anonymous write (should fail)
    console.log('✓ Testing anonymous statistics write (should fail)...');
    await assertFails(
      db.collection('statistics').doc('daily-stats').set({
        totalMissing: 1000,
        date: new Date()
      })
    );
    
    // Test 3: Authenticated write (should work)
    console.log('✓ Testing authenticated statistics write...');
    await assertSucceeds(
      authDb.collection('statistics').doc('daily-stats').set({
        totalMissing: 1000,
        date: new Date()
      })
    );
    
    console.log('✅ Statistics rules: PASSED');
    
  } catch (error) {
    console.log('❌ Statistics rules: FAILED');
    console.error(error.message);
  }
}

/**
 * Test suite for default deny rules
 */
async function testDefaultDenyRules() {
  console.log('\n🧪 Testing Default Deny Rules...');
  
  const db = await getUnauthenticatedFirestore();
  const authDb = await getAuthedFirestore({ uid: 'test-user' });
  
  try {
    // Test 1: Anonymous access to unknown collection (should fail)
    console.log('✓ Testing access to unknown collection (should fail)...');
    await assertFails(
      db.collection('unknown_collection').doc('test').get()
    );
    
    // Test 2: Authenticated access to unknown collection (should fail)
    console.log('✓ Testing authenticated access to unknown collection (should fail)...');
    await assertFails(
      authDb.collection('unknown_collection').doc('test').set({ data: 'test' })
    );
    
    console.log('✅ Default deny rules: PASSED');
    
  } catch (error) {
    console.log('❌ Default deny rules: FAILED');
    console.error(error.message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Firestore Rules Testing Suite');
  console.log('==========================================');
  
  try {
    await testMissingPersonsRules();
    await testUsersRules();
    await testReportsRules();
    await testStatisticsRules();
    await testDefaultDenyRules();
    
    console.log('\n🎉 All tests completed!');
    console.log('Check results above for any failures.');
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
  } finally {
    // Clean up
    if (testEnv) {
      await testEnv.cleanup();
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(() => process.exit(0));
}

module.exports = {
  runAllTests,
  testMissingPersonsRules,
  testUsersRules,
  testReportsRules,
  testStatisticsRules,
  testDefaultDenyRules
};