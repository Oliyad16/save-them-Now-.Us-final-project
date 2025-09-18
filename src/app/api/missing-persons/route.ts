import { NextRequest, NextResponse } from 'next/server'
import { FirestoreService } from '@/lib/firestore'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { MissingPerson } from '@/types/missing-person'

async function getCSVData(searchParams: URLSearchParams) {
  try {
    const csvPath = path.join(process.cwd(), 'missing-persons.csv')
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const records = parse(csvContent, { 
      columns: true, 
      skip_empty_lines: true,
      bom: true 
    })

    // Convert CSV records to MissingPerson format
    let missingPersons: MissingPerson[] = records.map((row: any, index: number) => {
      const caseNumber = row['Case Number']?.trim().replace(/"/g, '') || ''
      const dlc = row['DLC']?.trim() || ''
      const firstName = row['Legal First Name']?.trim() || ''
      const lastName = row['Legal Last Name']?.trim() || ''
      const city = row['City']?.trim() || ''
      const state = row['State']?.trim() || ''
      const county = row['County']?.trim() || ''
      const ageText = row['Missing Age']?.trim() || ''
      const sex = row['Biological Sex']?.trim() || ''
      const ethnicity = row['Race / Ethnicity']?.trim() || ''
      
      const digits = ageText.match(/\d+/)
      const age = digits ? parseInt(digits[0]) : 0
      const category = age < 18 ? 'Missing Children' : 'Missing Adults'
      const location = [city, county, state, 'USA'].filter(Boolean).join(', ')
      const fullName = [firstName, lastName].filter(Boolean).join(' ')
      
      return {
        id: index + 1,
        name: fullName || 'Unknown',
        date: dlc,
        status: 'Active',
        category,
        reportedMissing: dlc ? `Reported Missing ${dlc}` : '',
        location,
        latitude: 0, // Would need geocoding
        longitude: 0,
        age,
        gender: sex,
        ethnicity,
        caseNumber,
        description: `Case #${caseNumber} - ${ageText} ${sex} from ${city}, ${state}`,
        city,
        state,
        county,
        legalFirstName: firstName,
        legalLastName: lastName,
        biologicalSex: sex,
        raceEthnicity: ethnicity,
        missingAge: ageText,
        dateMissing: dlc,
        dateModified: dlc
      }
    })

    // Apply filters
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const state_filter = searchParams.get('state')
    const city_filter = searchParams.get('city')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (category) {
      missingPersons = missingPersons.filter(person => person.category === category)
    }
    if (status) {
      missingPersons = missingPersons.filter(person => person.status === status)
    }
    if (state_filter) {
      missingPersons = missingPersons.filter(person => person.state === state_filter)
    }
    if (city_filter) {
      missingPersons = missingPersons.filter(person => person.city === city_filter)
    }
    if (search) {
      const searchLower = search.toLowerCase()
      missingPersons = missingPersons.filter(person => 
        person.name?.toLowerCase().includes(searchLower) ||
        person.location?.toLowerCase().includes(searchLower) ||
        person.caseNumber?.toLowerCase().includes(searchLower)
      )
    }

    const total = missingPersons.length
    const paginatedData = missingPersons.slice(offset, offset + limit)
    const hasMore = offset + limit < total

    return {
      data: paginatedData,
      meta: {
        total: paginatedData.length,
        totalAvailable: total,
        limit,
        offset,
        hasMore,
        source: 'csv'
      }
    }
  } catch (error) {
    console.error('Error reading CSV:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Try Firestore first, fall back to CSV
    try {
      const options = {
        category: searchParams.get('category') || undefined,
        status: searchParams.get('status') || undefined,
        state: searchParams.get('state') || undefined,
        city: searchParams.get('city') || undefined,
        searchTerm: searchParams.get('search') || undefined,
        limitCount: parseInt(searchParams.get('limit') || '100')
      };

      const result = await FirestoreService.getMissingPersons(options);

      // If we have data from Firestore, use it
      if (result.data.length > 0) {
        return NextResponse.json({
          data: result.data,
          meta: {
            total: result.data.length,
            limit: options.limitCount,
            hasMore: result.hasMore,
            lastDoc: result.lastDoc,
            source: 'firestore'
          }
        });
      }
    } catch (firestoreError) {
      console.log('Firestore unavailable, using CSV fallback:', firestoreError instanceof Error ? firestoreError.message : 'Unknown error');
    }

    // Use CSV as fallback (or primary if Firestore is empty)
    const csvResult = await getCSVData(searchParams);
    return NextResponse.json(csvResult);

  } catch (error) {
    console.error('Error fetching missing persons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch missing persons data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const id = await FirestoreService.addMissingPerson(body);

    return NextResponse.json({
      id,
      message: 'Missing person added successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding missing person:', error);
    return NextResponse.json(
      { error: 'Failed to add missing person' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing person ID is required' },
        { status: 400 }
      );
    }

    await FirestoreService.updateMissingPerson(id, updates);

    return NextResponse.json({
      message: 'Missing person updated successfully'
    });

  } catch (error) {
    console.error('Error updating missing person:', error);
    return NextResponse.json(
      { error: 'Failed to update missing person' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing person ID is required' },
        { status: 400 }
      );
    }

    await FirestoreService.deleteMissingPerson(id);

    return NextResponse.json({
      message: 'Missing person deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting missing person:', error);
    return NextResponse.json(
      { error: 'Failed to delete missing person' },
      { status: 500 }
    );
  }
}