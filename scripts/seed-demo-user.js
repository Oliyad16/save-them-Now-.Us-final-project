import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

// Connect to database
const db = new Database('./database.sqlite')

// First, let's add the password_hash column if it doesn't exist
try {
  db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT')
  console.log('Added password_hash column to users table')
} catch (error) {
  // Column might already exist, that's fine
  console.log('password_hash column already exists or error:', error.message)
}

// Add tier column if it doesn't exist
try {
  db.exec('ALTER TABLE users ADD COLUMN tier TEXT DEFAULT "free"')
  console.log('Added tier column to users table')
} catch (error) {
  console.log('tier column already exists or error:', error.message)
}

// Add email_verified column if it doesn't exist
try {
  db.exec('ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE')
  console.log('Added email_verified column to users table')
} catch (error) {
  console.log('email_verified column already exists or error:', error.message)
}

// Add last_login column if it doesn't exist
try {
  db.exec('ALTER TABLE users ADD COLUMN last_login DATETIME')
  console.log('Added last_login column to users table')
} catch (error) {
  console.log('last_login column already exists or error:', error.message)
}

// Create demo users
const demoUsers = [
  {
    id: uuidv4(),
    name: 'Demo User',
    email: 'demo@savethemnow.jesus',
    password: 'demo123',
    tier: 'free'
  },
  {
    id: uuidv4(), 
    name: 'Test Admin',
    email: 'admin@savethemnow.jesus',
    password: 'admin123',
    tier: 'hero'
  },
  {
    id: uuidv4(),
    name: 'Guardian Angel',
    email: 'guardian@savethemnow.jesus', 
    password: 'guardian123',
    tier: 'guardian'
  }
]

const insertUser = db.prepare(`
  INSERT OR REPLACE INTO users (
    id, name, email, password_hash, tier, email_verified, 
    createdAt, updatedAt
  ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`)

console.log('Creating demo users...')

for (const user of demoUsers) {
  const passwordHash = bcrypt.hashSync(user.password, 12)
  
  try {
    insertUser.run(
      user.id,
      user.name, 
      user.email,
      passwordHash,
      user.tier,
      1 // boolean as integer
    )
    
    console.log(`✅ Created user: ${user.email} (password: ${user.password})`)
  } catch (error) {
    console.error(`❌ Error creating user ${user.email}:`, error.message)
  }
}

// Create user profiles for the demo users
const insertProfile = db.prepare(`
  INSERT OR REPLACE INTO user_profiles (
    user_id, onboarding_completed, created_at, updated_at
  ) VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`)

for (const user of demoUsers) {
  try {
    insertProfile.run(user.id)
    console.log(`✅ Created profile for: ${user.email}`)
  } catch (error) {
    console.error(`❌ Error creating profile for ${user.email}:`, error.message)
  }
}

db.close()

console.log('\n🎉 Demo users created successfully!')
console.log('\nLogin credentials:')
console.log('1. Free User:')
console.log('   Email: demo@savethemnow.jesus')
console.log('   Password: demo123')
console.log('\n2. Admin User:')  
console.log('   Email: admin@savethemnow.jesus')
console.log('   Password: admin123')
console.log('\n3. Guardian User:')
console.log('   Email: guardian@savethemnow.jesus') 
console.log('   Password: guardian123')