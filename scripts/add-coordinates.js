#!/usr/bin/env node
/**
 * Script to add latitude/longitude coordinates to missing persons data
 * Uses a simple coordinate mapping for common cities
 */

const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

// Simple coordinate database for common US cities
const cityCoordinates = {
  // Major Cities
  'New York, NY': [40.7128, -74.0060],
  'Los Angeles, CA': [34.0522, -118.2437],
  'Chicago, IL': [41.8781, -87.6298],
  'Houston, TX': [29.7604, -95.3698],
  'Phoenix, AZ': [33.4484, -112.0740],
  'Philadelphia, PA': [39.9526, -75.1652],
  'San Antonio, TX': [29.4241, -98.4936],
  'San Diego, CA': [32.7157, -117.1611],
  'Dallas, TX': [32.7767, -96.7970],
  'San Jose, CA': [37.3382, -121.8863],
  'Austin, TX': [30.2672, -97.7431],
  'Jacksonville, FL': [30.3322, -81.6557],
  'Fort Worth, TX': [32.7555, -97.3308],
  'Columbus, OH': [39.9612, -82.9988],
  'Charlotte, NC': [35.2271, -80.8431],
  'San Francisco, CA': [37.7749, -122.4194],
  'Indianapolis, IN': [39.7684, -86.1581],
  'Seattle, WA': [47.6062, -122.3321],
  'Denver, CO': [39.7392, -104.9903],
  'Washington, DC': [38.9072, -77.0369],
  'Boston, MA': [42.3601, -71.0589],
  'El Paso, TX': [31.7619, -106.4850],
  'Nashville, TN': [36.1627, -86.7816],
  'Detroit, MI': [42.3314, -83.0458],
  'Oklahoma City, OK': [35.4676, -97.5164],
  'Portland, OR': [45.5152, -122.6784],
  'Las Vegas, NV': [36.1699, -115.1398],
  'Memphis, TN': [35.1495, -90.0490],
  'Louisville, KY': [38.2527, -85.7585],
  'Baltimore, MD': [39.2904, -76.6122],
  'Milwaukee, WI': [43.0389, -87.9065],
  'Albuquerque, NM': [35.0844, -106.6504],
  'Tucson, AZ': [32.2226, -110.9747],
  'Fresno, CA': [36.7378, -119.7871],
  'Mesa, AZ': [33.4152, -111.8315],
  'Sacramento, CA': [38.5816, -121.4944],
  'Atlanta, GA': [33.7490, -84.3880],
  'Kansas City, MO': [39.0997, -94.5786],
  'Colorado Springs, CO': [38.8339, -104.8214],
  'Omaha, NE': [41.2565, -95.9345],
  'Raleigh, NC': [35.7796, -78.6382],
  'Miami, FL': [25.7617, -80.1918],
  'Long Beach, CA': [33.7701, -118.1937],
  'Virginia Beach, VA': [36.8529, -75.9780],
  'Oakland, CA': [37.8044, -122.2711],
  'Minneapolis, MN': [44.9778, -93.2650],
  'Tulsa, OK': [36.1540, -95.9928],
  'Arlington, TX': [32.7357, -97.1081],
  'Tampa, FL': [27.9506, -82.4572],
  'New Orleans, LA': [29.9511, -90.0715],
  'Wichita, KS': [37.6872, -97.3301],
  'Cleveland, OH': [41.4993, -81.6944],
  'Bakersfield, CA': [35.3733, -119.0187],
  'Aurora, CO': [39.7294, -104.8319],
  'Anaheim, CA': [33.8366, -117.9143],
  'Honolulu, HI': [21.3099, -157.8581],
  'Santa Ana, CA': [33.7455, -117.8677],
  'Corpus Christi, TX': [27.8006, -97.3964],
  'Riverside, CA': [33.9533, -117.3962],
  'Lexington, KY': [38.0406, -84.5037],
  'Stockton, CA': [37.9577, -121.2908],
  'Henderson, NV': [36.0395, -114.9817],
  'Saint Paul, MN': [44.9537, -93.0900],
  'St. Louis, MO': [38.6270, -90.1994],
  'Cincinnati, OH': [39.1031, -84.5120],
  'Pittsburgh, PA': [40.4406, -79.9959],
  'Greensboro, NC': [36.0726, -79.7920],
  'Anchorage, AK': [61.2181, -149.9003],
  'Plano, TX': [33.0198, -96.6989],
  'Lincoln, NE': [40.8136, -96.7026],
  'Orlando, FL': [28.5383, -81.3792],
  'Irvine, CA': [33.6846, -117.8265],
  'Newark, NJ': [40.7357, -74.1724],
  'Durham, NC': [35.9940, -78.8986],
  'Chula Vista, CA': [32.6401, -117.0842],
  'Toledo, OH': [41.6528, -83.5379],
  'Fort Wayne, IN': [41.0793, -85.1394],
  'St. Petersburg, FL': [27.7676, -82.6403],
  'Laredo, TX': [27.5036, -99.5075],
  'Jersey City, NJ': [40.7178, -74.0431],
  'Chandler, AZ': [33.3062, -111.8413],
  'Madison, WI': [43.0731, -89.4012],
  'Lubbock, TX': [33.5779, -101.8552],
  'Norfolk, VA': [36.8468, -76.2852],
  'Baton Rouge, LA': [30.4515, -91.1871],
  'Buffalo, NY': [42.8864, -78.8784],
  'North Las Vegas, NV': [36.1989, -115.1175],
  'Gilbert, AZ': [33.3528, -111.7890],
  'Garland, TX': [32.9126, -96.6389],
  'Fremont, CA': [37.5483, -121.9886],
  'Richmond, VA': [37.5407, -77.4360],
  'Boise, ID': [43.6150, -116.2023],
  'Reno, NV': [39.5296, -119.8138],
  'Spokane, WA': [47.6587, -117.4260],
  'Des Moines, IA': [41.5868, -93.6250],
  'Tacoma, WA': [47.2529, -122.4443],
  'San Bernardino, CA': [34.1083, -117.2898],
  'Modesto, CA': [37.6391, -120.9969],
  'Fontana, CA': [34.0922, -117.4350],
  
  // States (center coordinates)
  'Alabama': [32.3617, -86.2792],
  'Alaska': [64.0685, -152.2782],
  'Arizona': [34.2744, -111.2847],
  'Arkansas': [34.7519, -92.1313],
  'California': [36.7378, -119.7871],
  'Colorado': [39.0646, -105.3272],
  'Connecticut': [41.6219, -72.7273],
  'Delaware': [38.9896, -75.5050],
  'Florida': [27.7663, -81.6868],
  'Georgia': [32.9866, -83.6487],
  'Hawaii': [21.1098, -157.5311],
  'Idaho': [44.2394, -114.5103],
  'Illinois': [40.3363, -89.0022],
  'Indiana': [39.8647, -86.2604],
  'Iowa': [42.0046, -93.2140],
  'Kansas': [38.5266, -96.7265],
  'Kentucky': [37.6690, -84.6514],
  'Louisiana': [31.1801, -91.8749],
  'Maine': [44.6074, -69.3977],
  'Maryland': [39.0639, -76.8021],
  'Massachusetts': [42.2373, -71.5314],
  'Michigan': [43.3266, -84.5361],
  'Minnesota': [45.7326, -93.9196],
  'Mississippi': [32.7673, -89.6812],
  'Missouri': [38.4623, -92.3020],
  'Montana': [47.0527, -110.2148],
  'Nebraska': [41.2524, -99.2506],
  'Nevada': [38.4199, -117.1219],
  'New Hampshire': [43.4525, -71.5639],
  'New Jersey': [40.3140, -74.5089],
  'New Mexico': [34.8405, -106.2485],
  'New York': [42.9538, -75.5268],
  'North Carolina': [35.5557, -79.3877],
  'North Dakota': [47.5362, -99.7930],
  'Ohio': [40.3888, -82.7649],
  'Oklahoma': [35.5889, -97.5348],
  'Oregon': [44.5672, -122.1269],
  'Pennsylvania': [40.5773, -77.2640],
  'Rhode Island': [41.6809, -71.5118],
  'South Carolina': [33.8191, -80.9066],
  'South Dakota': [44.2853, -99.4632],
  'Tennessee': [35.7449, -86.7489],
  'Texas': [31.0545, -97.5635],
  'Utah': [40.1135, -111.8535],
  'Vermont': [44.0407, -72.7093],
  'Virginia': [37.7693, -78.2057],
  'Washington': [47.3826, -121.0187],
  'West Virginia': [38.4680, -80.9696],
  'Wisconsin': [44.2619, -89.6179],
  'Wyoming': [42.7475, -107.2085],
  
  // Common variations and abbreviations
  'TX': [31.0545, -97.5635],
  'CA': [36.7378, -119.7871],
  'FL': [27.7663, -81.6868],
  'NY': [42.9538, -75.5268],
  'PA': [40.5773, -77.2640],
  'IL': [40.3363, -89.0022],
  'OH': [40.3888, -82.7649],
  'GA': [32.9866, -83.6487],
  'NC': [35.5557, -79.3877],
  'MI': [43.3266, -84.5361],
  'NJ': [40.3140, -74.5089],
  'VA': [37.7693, -78.2057],
  'WA': [47.3826, -121.0187],
  'MA': [42.2373, -71.5314],
  'AZ': [34.2744, -111.2847],
  'IN': [39.8647, -86.2604],
  'TN': [35.7449, -86.7489],
  'MO': [38.4623, -92.3020],
  'MD': [39.0639, -76.8021],
  'WI': [44.2619, -89.6179],
  'CO': [39.0646, -105.3272],
  'MN': [45.7326, -93.9196],
  'SC': [33.8191, -80.9066],
  'AL': [32.3617, -86.2792],
  'LA': [31.1801, -91.8749],
  'KY': [37.6690, -84.6514],
  'OR': [44.5672, -122.1269],
  'OK': [35.5889, -97.5348],
  'CT': [41.6219, -72.7273],
  'IA': [42.0046, -93.2140],
  'MS': [32.7673, -89.6812],
  'AR': [34.7519, -92.1313],
  'UT': [40.1135, -111.8535],
  'KS': [38.5266, -96.7265],
  'NV': [38.4199, -117.1219],
  'NM': [34.8405, -106.2485],
  'NE': [41.2524, -99.2506],
  'WV': [38.4680, -80.9696],
  'ID': [44.2394, -114.5103],
  'HI': [21.1098, -157.5311],
  'NH': [43.4525, -71.5639],
  'ME': [44.6074, -69.3977],
  'RI': [41.6809, -71.5118],
  'MT': [47.0527, -110.2148],
  'DE': [38.9896, -75.5050],
  'SD': [44.2853, -99.4632],
  'ND': [47.5362, -99.7930],
  'AK': [64.0685, -152.2782],
  'VT': [44.0407, -72.7093],
  'WY': [42.7475, -107.2085],
  
  // High-frequency cities from dataset analysis
  'Knoxville, TN': [35.9606, -83.9207],
  'McAllen, TX': [26.2034, -98.2300],
  'Spring, TX': [30.0799, -95.4171],
  'Naples, FL': [26.1420, -81.7948],
  'Anchorage, AK': [61.2181, -149.9003],
  
  // Generic fallback
  'USA': [39.8283, -98.5795], // Center of USA
  'United States': [39.8283, -98.5795]
}

class CoordinateUpdater {
  constructor() {
    this.firestore = null
    this.stats = { total: 0, updated: 0, errors: 0, skipped: 0 }
  }

  async initialize() {
    console.log('🔥 Initializing Firebase...')
    
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    
    if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
      throw new Error('Firebase credentials not configured.')
    }

    const app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      })
    })

    this.firestore = getFirestore(app)
    console.log('✅ Firebase initialized')
  }

  parseLocation(location) {
    if (!location || location === 'USA' || location === 'United States') {
      return null
    }

    // Try to extract city, state from description or location
    const cleanLocation = location.replace(/Missing person from /, '').trim()
    
    // Look for patterns like "City, State" or "City, ST"
    const cityStateMatch = cleanLocation.match(/([^,]+),\s*([A-Z]{2}|[A-Za-z\s]+)/)
    if (cityStateMatch) {
      const city = cityStateMatch[1].trim()
      const state = cityStateMatch[2].trim()
      
      // Try full city, state combination
      const fullLocation = `${city}, ${state}`
      if (cityCoordinates[fullLocation]) {
        return { coordinates: cityCoordinates[fullLocation], match: fullLocation }
      }
      
      // Try just the state
      if (cityCoordinates[state]) {
        return { coordinates: cityCoordinates[state], match: state }
      }
    }
    
    // Try the full location string
    if (cityCoordinates[cleanLocation]) {
      return { coordinates: cityCoordinates[cleanLocation], match: cleanLocation }
    }
    
    // Try just the last part (usually state)
    const parts = cleanLocation.split(/[,\s]+/)
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i].trim()
      if (cityCoordinates[part]) {
        return { coordinates: cityCoordinates[part], match: part }
      }
    }
    
    return null
  }

  async updateCoordinates() {
    console.log('📍 Starting coordinate update process for 4000 most recent cases...')
    
    // Get the first 4000 records (already ordered by date desc in Firestore)
    // and filter for those without coordinates
    const allSnapshot = await this.firestore.collection('missing_persons')
      .orderBy('date', 'desc')
      .limit(4000)
      .get()
    
    // Filter to only those without coordinates
    const docsWithoutCoords = allSnapshot.docs.filter(doc => {
      const data = doc.data()
      return !data.latitude || data.latitude === null
    })
    
    this.stats.total = docsWithoutCoords.length
    console.log(`Found ${docsWithoutCoords.length} records without coordinates in the 4000 most recent cases`)
    
    // Create a new snapshot-like object with filtered docs
    const snapshot = { docs: docsWithoutCoords }
    
    const batch = this.firestore.batch()
    let batchCount = 0
    
    for (const doc of snapshot.docs) {
      const data = doc.data()
      
      // Try to get coordinates from location or description
      let locationResult = null
      
      if (data.city && data.state) {
        // Try city, state combination first
        const cityState = `${data.city}, ${data.state}`
        locationResult = this.parseLocation(cityState)
      }
      
      if (!locationResult && data.location) {
        locationResult = this.parseLocation(data.location)
      }
      
      if (!locationResult && data.description) {
        locationResult = this.parseLocation(data.description)
      }
      
      if (locationResult) {
        const [latitude, longitude] = locationResult.coordinates
        
        batch.update(doc.ref, {
          latitude,
          longitude,
          coordinateSource: `Geocoded from: ${locationResult.match}`,
          coordinateUpdatedAt: new Date()
        })
        
        batchCount++
        this.stats.updated++
        
        console.log(`📍 ${data.name}: ${locationResult.match} -> [${latitude}, ${longitude}]`)
        
        // Commit batch every 50 records (quota-friendly)
        if (batchCount >= 50) {
          try {
            await batch.commit()
            console.log(`✅ Committed batch of ${batchCount} updates`)
            batch = this.firestore.batch() // Create new batch
            batchCount = 0
            
            // Small delay to avoid quota issues
            await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (error) {
            if (error.message.includes('RESOURCE_EXHAUSTED')) {
              console.log('⏸️  Hit quota limit, stopping for now...')
              console.log(`✅ Successfully updated ${this.stats.updated} records before quota limit`)
              return
            }
            throw error
          }
        }
      } else {
        this.stats.skipped++
        console.log(`⚠️  ${data.name}: No coordinates found for "${data.location || data.description || 'N/A'}"`)
      }
    }
    
    // Commit remaining updates
    if (batchCount > 0) {
      try {
        await batch.commit()
        console.log(`✅ Committed final batch of ${batchCount} updates`)
      } catch (error) {
        if (error.message.includes('RESOURCE_EXHAUSTED')) {
          console.log('⏸️  Hit quota limit on final batch')
          console.log(`✅ Successfully updated ${this.stats.updated} records before quota limit`)
        } else {
          throw error
        }
      }
    }
  }

  async run() {
    try {
      await this.initialize()
      await this.updateCoordinates()
      
      console.log('\n🎉 Coordinate Update Complete!')
      console.log('================================')
      console.log(`Total records: ${this.stats.total}`)
      console.log(`Successfully updated: ${this.stats.updated}`)
      console.log(`Skipped (no match): ${this.stats.skipped}`)
      console.log(`Errors: ${this.stats.errors}`)
      console.log(`Success rate: ${Math.round((this.stats.updated / this.stats.total) * 100)}%`)
      
    } catch (error) {
      console.error('❌ Update failed:', error.message)
      process.exit(1)
    }
  }
}

// Run the coordinate updater
if (require.main === module) {
  const updater = new CoordinateUpdater()
  updater.run().catch(console.error)
}

module.exports = { CoordinateUpdater }