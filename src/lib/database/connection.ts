import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'database.sqlite')
const schemaPath = path.join(process.cwd(), 'src/lib/database/schema.sql')

let db: Database.Database | null = null

export function getDatabase() {
  if (!db) {
    // Create database file if it doesn't exist
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    // Initialize database connection
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')

    // Initialize schema if database is empty
    initializeSchema()
  }
  
  return db
}

function initializeSchema() {
  if (!db) return

  // Check if users table exists
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  ).get()

  if (!tables) {
    console.log('Initializing database schema...')
    
    // Read and execute schema file
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8')
      
      // Split by semicolon and execute each statement
      const statements = schema.split(';').filter(stmt => stmt.trim())
      
      statements.forEach((statement) => {
        try {
          db!.exec(statement)
        } catch (error) {
          console.error('Error executing schema statement:', error)
        }
      })
      
      console.log('Database schema initialized successfully')
    } else {
      console.error('Schema file not found at:', schemaPath)
    }
  }
}

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}

// Graceful shutdown
process.on('SIGINT', closeDatabase)
process.on('SIGTERM', closeDatabase)