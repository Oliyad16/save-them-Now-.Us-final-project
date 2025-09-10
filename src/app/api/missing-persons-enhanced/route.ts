import { NextRequest, NextResponse } from 'next/server'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import { MissingPerson } from '@/types/missing-person'

// Enhanced API endpoint that uses the pipeline-enhanced database
export async function GET(request: NextRequest) {
  try {
    // Open database connection
    const dbPath = path.join(process.cwd(), 'database', 'app.db')
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const source = searchParams.get('source') // Filter by data source
    const state = searchParams.get('state') // Filter by state
    const category = searchParams.get('category') // Filter by category

    // Build query with filters
    let query = `
      SELECT 
        id,
        case_number,
        name,
        age,
        gender,
        ethnicity,
        city,
        county,
        state,
        country,
        latitude,
        longitude,
        date_missing,
        date_reported,
        status,
        category,
        description,
        circumstances,
        source_name,
        data_quality_score,
        geocoding_source,
        last_verified
      FROM missing_persons_enhanced 
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (source) {
      query += ` AND source_name = ?`
      params.push(source)
    }
    
    if (state) {
      query += ` AND state = ?`
      params.push(state.toUpperCase())
    }
    
    if (category) {
      query += ` AND category = ?`
      params.push(category)
    }

    // Add ordering and pagination
    query += ` ORDER BY last_verified DESC, date_missing DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    // Execute query
    const rows = await db.all(query, params)

    // Get total count for metadata
    let countQuery = `SELECT COUNT(*) as total FROM missing_persons_enhanced WHERE 1=1`
    const countParams: any[] = []
    
    if (source) {
      countQuery += ` AND source_name = ?`
      countParams.push(source)
    }
    if (state) {
      countQuery += ` AND state = ?`
      countParams.push(state.toUpperCase())
    }
    if (category) {
      countQuery += ` AND category = ?`
      countParams.push(category)
    }

    const totalResult = await db.get(countQuery, countParams)
    const total = totalResult?.total || 0

    // Transform to MissingPerson format
    const missingPersons: MissingPerson[] = rows.map((row: any, index: number) => ({
      id: row.id,
      name: row.name || 'Unknown',
      date: row.date_missing || row.date_reported || '',
      status: row.status || 'Active',
      category: row.category || 'Missing Adults',
      reportedMissing: row.date_missing ? `Reported Missing ${row.date_missing}` : 'Date Unknown',
      location: [row.city, row.county, row.state, row.country].filter(Boolean).join(', '),
      latitude: row.latitude,
      longitude: row.longitude,
      age: row.age,
      gender: row.gender,
      ethnicity: row.ethnicity,
      description: row.description || row.circumstances,
      caseNumber: row.case_number,
      
      // Enhanced fields from pipeline
      dataSource: row.source_name,
      qualityScore: row.data_quality_score,
      geocodingSource: row.geocoding_source,
      lastVerified: row.last_verified
    }))

    // Get source statistics for metadata
    const sourceStats = await db.all(`
      SELECT source_name, COUNT(*) as count 
      FROM missing_persons_enhanced 
      GROUP BY source_name
    `)

    await db.close()

    return NextResponse.json({
      data: missingPersons,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
        sources: sourceStats.reduce((acc: any, stat: any) => {
          acc[stat.source_name] = stat.count
          return acc
        }, {}),
        enhanced: true,
        dataFreshness: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Enhanced API Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch enhanced missing persons data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}