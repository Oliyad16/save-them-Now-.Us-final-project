import { NextRequest, NextResponse } from 'next/server'
import { missingPersonsService } from '@/lib/firestore/services'
import { promises as fs } from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { MissingPerson } from '@/types/missing-person'
import { loadGeocache } from '@/lib/geocoding'

// Cache for geocoded locations (fallback to CSV if Firestore is empty)
let geocacheData: Record<string, { lat: number; lon: number; timestamp?: number }> = {}

// Flag to track if we should fall back to CSV
let useFirestore = true

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
    description: `Case #${caseNumber} - ${ageText} ${sex} from ${city}, ${state}`
  }
}

async function getFromFirestore(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    let result

    if (search) {
      // Search functionality
      const data = await missingPersonsService.search(search, { limit, offset })
      result = {
        data: data.map((item: any) => ({
          id: item.id,
          name: item.name,
          date: item.dateMissing || item.dateReported,
          status: item.status,
          category: item.category,
          reportedMissing: `Reported Missing ${item.dateMissing || item.dateReported}`,
          location: item.location,
          latitude: item.latitude,
          longitude: item.longitude,
          age: item.age,
          gender: item.gender,
          ethnicity: item.ethnicity,
          caseNumber: item.caseNumber,
          description: item.description
        })),
        meta: {
          total: data.length,
          limit,
          offset,
          hasMore: data.length === limit,
          source: 'firestore'
        }
      }
    } else if (category) {
      // Category filtering
      const data = await missingPersonsService.getByCategory(category, { limit, offset })
      result = {
        data: data.map((item: any) => ({
          id: item.id,
          name: item.name,
          date: item.dateMissing || item.dateReported,
          status: item.status,
          category: item.category,
          reportedMissing: `Reported Missing ${item.dateMissing || item.dateReported}`,
          location: item.location,
          latitude: item.latitude,
          longitude: item.longitude,
          age: item.age,
          gender: item.gender,
          ethnicity: item.ethnicity,
          caseNumber: item.caseNumber,
          description: item.description
        })),
        meta: {
          total: data.length,
          limit,
          offset,
          hasMore: data.length === limit,
          source: 'firestore'
        }
      }
    } else {
      // Get all with pagination
      const firestoreResult = await missingPersonsService.getAll({ limit, offset })
      
      // Transform Firestore data to match expected MissingPerson interface
      result = {
        data: firestoreResult.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          date: item.dateMissing || item.dateReported,
          status: item.status,
          category: item.category,
          reportedMissing: `Reported Missing ${item.dateMissing || item.dateReported}`,
          location: item.location,
          latitude: item.latitude,
          longitude: item.longitude,
          age: item.age,
          gender: item.gender,
          ethnicity: item.ethnicity,
          caseNumber: item.caseNumber,
          description: item.description
        })),
        meta: {
          ...firestoreResult.meta,
          source: 'firestore'
        }
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Firestore error:', error)
    // Don't throw - let the main function handle fallback
    throw new Error(`Firestore failed: ${error.message}`)
  }
}

async function getFromCSV(request: NextRequest) {
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
  const limit = parseInt(searchParams.get('limit') || '100')
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
      source: 'csv_fallback'
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    // Try Firestore first if enabled
    if (useFirestore) {
      try {
        console.log('Attempting to fetch from Firestore...')
        return await getFromFirestore(request)
      } catch (error: any) {
        console.warn('Firestore failed, falling back to CSV:', error.message)
        // Disable Firestore for this session if it fails
        useFirestore = false
      }
    }

    // Fallback to CSV
    console.log('Using CSV fallback...')
    return await getFromCSV(request)

  } catch (error: any) {
    console.error('Error processing missing persons request:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch missing persons data',
      details: error.message 
    }, { status: 500 })
  }
}

// POST method for creating new missing person records (admin only)
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check here
    const body = await request.json()
    
    if (!useFirestore) {
      return NextResponse.json(
        { error: 'POST functionality requires Firestore to be available' },
        { status: 503 }
      )
    }
    
    const result = await missingPersonsService.create({
      caseNumber: body.caseNumber,
      name: body.name,
      age: body.age,
      gender: body.gender,
      ethnicity: body.ethnicity,
      city: body.city,
      county: body.county,
      state: body.state,
      location: body.location,
      latitude: body.latitude,
      longitude: body.longitude,
      dateMissing: body.dateMissing,
      dateReported: body.dateReported || body.dateMissing,
      status: body.status || 'Active',
      category: body.category || (body.age && body.age < 18 ? 'Missing Children' : 'Missing Adults'),
      description: body.description,
      source: 'api_create'
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Error creating missing person:', error)
    return NextResponse.json(
      { error: 'Failed to create missing person', details: error.message },
      { status: 500 }
    )
  }
}