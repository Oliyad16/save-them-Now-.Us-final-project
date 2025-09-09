import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { getCachedOrGeocodeLocation, loadGeocache, saveGeocache } from '@/lib/geocoding'

export async function POST(request: NextRequest) {
  try {
    const { batchSize = 50 } = await request.json()
    
    const csvPath = path.join(process.cwd(), 'missing-persons.csv')
    let csvContent = await fs.readFile(csvPath, 'utf-8')
    
    // Remove BOM if present
    if (csvContent.startsWith('\ufeff')) {
      csvContent = csvContent.slice(1)
    }

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    const cache = await loadGeocache()
    
    // Find unique city/state pairs that haven't been geocoded
    const uniqueLocations = new Map<string, { city: string; state: string }>()
    
    for (const record of records) {
      const city = (record['City'] || '').toString().trim()
      const state = (record['State'] || '').toString().trim()
      
      if (city && state) {
        const key = `${city},${state}`.toLowerCase()
        if (!cache[key] && !uniqueLocations.has(key)) {
          uniqueLocations.set(key, { city, state })
        }
      }
    }

    const toGeocode = Array.from(uniqueLocations.values()).slice(0, batchSize)
    const results = []
    
    for (const { city, state } of toGeocode) {
      const coords = await getCachedOrGeocodeLocation(city, state)
      results.push({
        city,
        state,
        coordinates: coords
      })
      
      // Be respectful to the geocoding service
      if (toGeocode.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return NextResponse.json({
      message: `Geocoded ${results.length} locations`,
      results,
      remaining: uniqueLocations.size - batchSize
    })
    
  } catch (error) {
    console.error('Geocoding batch error:', error)
    return NextResponse.json({ error: 'Failed to geocode locations' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const cache = await loadGeocache()
    const stats = {
      totalCached: Object.keys(cache).length,
      lastUpdated: Math.max(...Object.values(cache).map(entry => entry.timestamp || 0))
    }
    
    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get geocache stats' }, { status: 500 })
  }
}