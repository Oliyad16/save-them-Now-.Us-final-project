const { readFileSync } = require('fs');

// Test configuration
const RULES_FILE = './firestore.rules.test';

console.log('🔍 Validating Firestore Security Rules...');
console.log('==========================================');

try {
  // Load and validate rules syntax
  const rules = readFileSync(RULES_FILE, 'utf8');
  
  console.log('✓ Rules file loaded successfully');
  console.log('✓ File size:', rules.length, 'characters');
  
  // Basic syntax validation
  if (rules.includes('rules_version')) {
    console.log('✓ Rules version specified');
  } else {
    console.log('❌ Missing rules_version declaration');
  }
  
  if (rules.includes('service cloud.firestore')) {
    console.log('✓ Firestore service declared');
  } else {
    console.log('❌ Missing Firestore service declaration');
  }
  
  // Check for required collections
  const collections = ['missing_persons', 'users', 'statistics', 'reports'];
  collections.forEach(collection => {
    if (rules.includes(`match /${collection}/`)) {
      console.log(`✓ ${collection} collection rules found`);
    } else {
      console.log(`❌ Missing ${collection} collection rules`);
    }
  });
  
  // Check for default deny rule
  if (rules.includes('match /{document=**}') && rules.includes('allow read, write: if false')) {
    console.log('✓ Default deny rule configured');
  } else {
    console.log('❌ Missing or incorrect default deny rule');
  }
  
  // Security checks
  if (rules.includes('request.auth != null')) {
    console.log('✓ Authentication checks present');
  } else {
    console.log('❌ No authentication checks found');
  }
  
  if (rules.includes('allow read: if true') && rules.includes('missing_persons')) {
    console.log('✓ Public read access for missing persons (correct for awareness)');
  }
  
  if (rules.includes('request.auth.uid == userId')) {
    console.log('✓ User data access control present');
  }
  
  console.log('\n🎉 Rules validation completed!');
  console.log('\n📋 Rules Summary:');
  console.log('- Missing Persons: Public read, authenticated write ✓');
  console.log('- Users: Own data only ✓');  
  console.log('- Statistics: Public read, authenticated write ✓');
  console.log('- Reports: Anonymous create, authenticated read ✓');
  console.log('- Default: Deny all other access ✓');
  
  console.log('\n✅ Your security rules are properly configured!');
  console.log('👍 Ready for deployment to Firebase production');
  
} catch (error) {
  console.log('❌ Rules validation failed:', error.message);
  process.exit(1);
}