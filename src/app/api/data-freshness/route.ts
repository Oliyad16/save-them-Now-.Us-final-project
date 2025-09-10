import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'missing-persons.csv')
    const dbPath = path.join(process.cwd(), 'database', 'app.db')
    
    const now = new Date()
    let csvStatus = { exists: false, age_hours: Infinity, status: 'missing' }
    let dbStatus = { exists: false, age_hours: Infinity, status: 'missing' }
    
    // Check CSV file
    try {
      const csvStats = await fs.stat(csvPath)
      const csvAge = (now.getTime() - csvStats.mtime.getTime()) / (1000 * 60 * 60)
      csvStatus = {
        exists: true,
        age_hours: csvAge,
        last_modified: csvStats.mtime.toISOString(),
        size_bytes: csvStats.size,
        status: csvAge < 24 ? 'fresh' : csvAge < 48 ? 'stale' : 'very_stale'
      }
    } catch (error) {
      // CSV doesn't exist or can't be accessed
    }
    
    // Check database file
    try {
      const dbStats = await fs.stat(dbPath)
      const dbAge = (now.getTime() - dbStats.mtime.getTime()) / (1000 * 60 * 60)
      dbStatus = {
        exists: true,
        age_hours: dbAge,
        last_modified: dbStats.mtime.toISOString(),
        size_bytes: dbStats.size,
        status: dbAge < 30 ? 'fresh' : dbAge < 54 ? 'stale' : 'very_stale'
      }
    } catch (error) {
      // Database doesn't exist or can't be accessed
    }
    
    // Determine overall status
    const overallStatus = (() => {
      if (!csvStatus.exists || !dbStatus.exists) return 'critical'
      if (csvStatus.status === 'very_stale' || dbStatus.status === 'very_stale') return 'critical'
      if (csvStatus.status === 'stale' || dbStatus.status === 'stale') return 'warning'
      return 'ok'
    })()
    
    // Determine if update is needed
    const updateNeeded = csvStatus.age_hours > 24 || !csvStatus.exists
    
    return NextResponse.json({
      overall_status: overallStatus,
      update_needed: updateNeeded,
      csv: csvStatus,
      database: dbStatus,
      checked_at: now.toISOString(),
      thresholds: {
        csv_warning_hours: 24,
        csv_critical_hours: 48,
        db_warning_hours: 30,
        db_critical_hours: 54
      }
    })
    
  } catch (error) {
    console.error('Error checking data freshness:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      overall_status: 'error'
    }, { status: 500 })
  }
}