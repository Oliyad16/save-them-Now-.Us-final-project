import { promises as fs } from 'fs'
import path from 'path'

export interface GeocacheEntry {
  lat: number
  lon: number
  timestamp?: number
}

export type Geocache = Record<string, GeocacheEntry>

const GEOCACHE_PATH = path.join(process.cwd(), 'geocache.json')

export async function loadGeocache(): Promise<Geocache> {
  try {
    const data = await fs.readFile(GEOCACHE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return {}
  }
}

export async function saveGeocache(cache: Geocache): Promise<void> {
  try {
    await fs.writeFile(GEOCACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save geocache:', error)
  }
}

export async function geocodeLocation(city: string, state: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const query = encodeURIComponent(`${city}, ${state}, USA`)
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SaveThemNow.Jesus/1.0 (missing-persons-awareness)'
      }
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      }
    }

    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

export async function getCachedOrGeocodeLocation(city: string, state: string): Promise<{ lat: number; lon: number } | null> {
  if (!city || !state) return null
  
  const cache = await loadGeocache()
  const cacheKey = `${city},${state}`.toLowerCase()
  
  // Return cached result if available
  if (cache[cacheKey]) {
    return {
      lat: cache[cacheKey].lat,
      lon: cache[cacheKey].lon
    }
  }
  
  // Geocode and cache the result
  const coords = await geocodeLocation(city, state)
  if (coords) {
    cache[cacheKey] = {
      ...coords,
      timestamp: Date.now()
    }
    await saveGeocache(cache)
  }
  
  return coords
}