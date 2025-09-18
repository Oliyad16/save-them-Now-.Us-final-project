import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { MissingPerson } from '@/types/missing-person'
import { loadGeocache } from '@/lib/geocoding'

// Cache for geocoded locations
let geocacheData: Record<string, { lat: number; lon: number; timestamp?: number }> = {}

function parseAgeToInt(ageText: string): number | undefined {
  if (!ageText) return undefined
  const digits = ageText.replace(/\D/g, '')
  try {
    return digits ? parseInt(digits) : undefined
  } catch {
    return undefined
  }
}

function mapRowToMissingPerson(row: any, index: number): MissingPerson {
  const caseNumber = (row['Case Number'] || '').toString().trim().replace(/"/g, '')
  const dlc = (row['DLC'] || '').toString().trim()
  const firstName = (row['Legal First Name'] || '').toString().trim()
  const lastName = (row['Legal Last Name'] || '').toString().trim()
  const city = (row['City'] || '').toString().trim()
  const state = (row['State'] || '').toString().trim()
  const county = (row['County'] || '').toString().trim()
  const ageText = (row['Missing Age'] || '').toString().trim()
  const sex = (row['Biological Sex'] || '').toString().trim()
  const ethnicity = (row['Race / Ethnicity'] || '').toString().trim()

  const age = parseAgeToInt(ageText)
  const category = age !== undefined && age < 18 ? 'Missing Children' : 'Missing Adults'

  // Check geocache for coordinates
  const cacheKey = `${city},${state}`.toLowerCase()
  let latitude: number | undefined
  let longitude: number | undefined

  if (geocacheData[cacheKey]) {
    latitude = geocacheData[cacheKey].lat
    longitude = geocacheData[cacheKey].lon
  }

  const location = [city, county, state, 'USA'].filter(Boolean).join(', ')
  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  return {
    id: index + 1,
    name: fullName,
    date: dlc,
    status: 'Active',
    category,
    reportedMissing: `Reported Missing ${dlc}`,
    location,
    latitude,
    longitude,
    age,
    gender: sex,
    ethnicity,
    caseNumber,
    description: `Case #${caseNumber} - ${ageText} ${sex} from ${city}, ${state}`,
    // Additional Firestore-compatible fields
    city,
    state,
    county,
    legalFirstName: firstName,
    legalLastName: lastName,
    biologicalSex: sex,
    raceEthnicity: ethnicity,
    missingAge: ageText,
    dateModified: row['Date Modified'] || '',
    dateMissing: dlc
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('Using CSV fallback endpoint')
    
    // Load geocache if not already loaded
    if (Object.keys(geocacheData).length === 0) {
      geocacheData = await loadGeocache()
    }

    const csvPath = path.join(process.cwd(), 'missing-persons.csv')
    
    // Check if file exists
    try {
      await fs.access(csvPath)
    } catch {
      return NextResponse.json({ error: 'CSV file not found' }, { status: 404 })
    }

    // Read and parse CSV
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

    // Transform records to MissingPerson objects
    const missingPersons: MissingPerson[] = records.map((record: any, index: number) => 
      mapRowToMissingPerson(record, index)
    )

    // Apply pagination if requested
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '1000') // Smaller default for fallback
    const offset = parseInt(searchParams.get('offset') || '0')

    const paginatedResults = missingPersons.slice(offset, offset + limit)

    // Add metadata about the full dataset
    return NextResponse.json({
      data: paginatedResults,
      meta: {
        total: missingPersons.length,
        limit,
        offset,
        hasMore: offset + limit < missingPersons.length,
        source: 'csv-fallback'
      }
    })
  } catch (error) {
    console.error('Error processing CSV fallback:', error)
    return NextResponse.json({ error: 'Failed to process CSV data' }, { status: 500 })
  }
}