import { promises as fs } from 'fs'
import path from 'path'

export interface GeocodingResult {
  lat: number
  lon: number
  source: string
  confidence: number
  formatted_address?: string
}

export interface GeocodingProvider {
  name: string
  priority: number
  rateLimit: number // requests per second
  geocode(city: string, state: string, country?: string): Promise<GeocodingResult | null>
}

class NominatimProvider implements GeocodingProvider {
  name = 'nominatim'
  priority = 2 // Lower priority (backup)
  rateLimit = 1 // 1 request per second

  private lastRequestTime = 0

  async geocode(city: string, state: string, country = 'USA'): Promise<GeocodingResult | null> {
    // Rate limiting
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < 1000) {
      await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest))
    }
    this.lastRequestTime = Date.now()

    try {
      const query = encodeURIComponent(`${city}, ${state}, ${country}`)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&addressdetails=1`
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SaveThemNow.Jesus/2.0 Missing Persons Platform'
        }
      })

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data && data.length > 0) {
        const result = data[0]
        return {
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
          source: 'nominatim',
          confidence: 0.8, // Good confidence for Nominatim
          formatted_address: result.display_name
        }
      }

      return null
    } catch (error) {
      console.warn('Nominatim geocoding failed:', error)
      return null
    }
  }
}

class GoogleMapsProvider implements GeocodingProvider {
  name = 'google_maps'
  priority = 1 // Higher priority (primary)
  rateLimit = 50 // 50 requests per second

  private apiKey: string | null = null

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || null
  }

  async geocode(city: string, state: string, country = 'USA'): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      console.warn('Google Maps API key not configured')
      return null
    }

    try {
      const address = encodeURIComponent(`${city}, ${state}, ${country}`)
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${this.apiKey}`
      
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0]
        const location = result.geometry.location
        
        // Calculate confidence based on result type
        let confidence = 0.95 // High confidence for Google Maps
        if (result.types.includes('administrative_area_level_2')) {
          confidence = 0.9 // County level
        } else if (result.types.includes('administrative_area_level_1')) {
          confidence = 0.8 // State level
        }

        return {
          lat: location.lat,
          lon: location.lng,
          source: 'google_maps',
          confidence,
          formatted_address: result.formatted_address
        }
      }

      if (data.status === 'ZERO_RESULTS') {
        return null
      }

      if (data.status === 'OVER_QUERY_LIMIT') {
        throw new Error('Google Maps API quota exceeded')
      }

      throw new Error(`Google Maps API error: ${data.status}`)
    } catch (error) {
      console.warn('Google Maps geocoding failed:', error)
      return null
    }
  }
}

class MapboxProvider implements GeocodingProvider {
  name = 'mapbox'
  priority = 3 // Fallback priority
  rateLimit = 600 // High rate limit

  private accessToken: string | null = null

  constructor() {
    this.accessToken = process.env.MAPBOX_ACCESS_TOKEN || null
  }

  async geocode(city: string, state: string, country = 'USA'): Promise<GeocodingResult | null> {
    if (!this.accessToken) {
      console.warn('Mapbox access token not configured')
      return null
    }

    try {
      const query = encodeURIComponent(`${city}, ${state}, ${country}`)
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${this.accessToken}&limit=1&types=place`
      
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        const coordinates = feature.geometry.coordinates
        
        return {
          lat: coordinates[1],
          lon: coordinates[0],
          source: 'mapbox',
          confidence: 0.85,
          formatted_address: feature.place_name
        }
      }

      return null
    } catch (error) {
      console.warn('Mapbox geocoding failed:', error)
      return null
    }
  }
}

export class EnhancedGeocodingService {
  private providers: GeocodingProvider[]
  private cache: Map<string, GeocodingResult> = new Map()
  private cacheFile: string
  private stats = {
    total_requests: 0,
    cache_hits: 0,
    provider_usage: {} as Record<string, number>
  }

  constructor(cacheFilePath?: string) {
    this.cacheFile = cacheFilePath || path.join(process.cwd(), 'geocache.json')
    
    // Initialize providers in priority order
    this.providers = [
      new GoogleMapsProvider(),
      new NominatimProvider(),
      new MapboxProvider()
    ].sort((a, b) => a.priority - b.priority)

    this.loadCache()
  }

  private async loadCache(): Promise<void> {
    try {
      const cacheData = await fs.readFile(this.cacheFile, 'utf-8')
      const cache = JSON.parse(cacheData)
      
      for (const [key, value] of Object.entries(cache)) {
        if (this.isValidCacheEntry(value)) {
          this.cache.set(key, value as GeocodingResult)
        }
      }
      
      console.log(`📍 Loaded ${this.cache.size} geocoding entries from cache`)
    } catch (error) {
      console.log('📍 No existing geocache found, starting fresh')
    }
  }

  private async saveCache(): Promise<void> {
    try {
      const cacheData = Object.fromEntries(this.cache.entries())
      await fs.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2))
    } catch (error) {
      console.warn('Failed to save geocache:', error)
    }
  }

  private isValidCacheEntry(entry: any): boolean {
    return entry && 
           typeof entry.lat === 'number' && 
           typeof entry.lon === 'number' && 
           typeof entry.source === 'string' &&
           typeof entry.confidence === 'number'
  }

  private getCacheKey(city: string, state: string, country: string): string {
    return `${city.toLowerCase()},${state.toLowerCase()},${country.toLowerCase()}`
  }

  async geocode(city: string, state: string, country = 'USA'): Promise<GeocodingResult | null> {
    if (!city || !state) {
      return null
    }

    this.stats.total_requests++
    
    // Check cache first
    const cacheKey = this.getCacheKey(city, state, country)
    const cached = this.cache.get(cacheKey)
    
    if (cached) {
      this.stats.cache_hits++
      return cached
    }

    // Try each provider in priority order
    for (const provider of this.providers) {
      try {
        const result = await provider.geocode(city, state, country)
        
        if (result) {
          // Cache the result
          this.cache.set(cacheKey, result)
          
          // Update stats
          this.stats.provider_usage[provider.name] = (this.stats.provider_usage[provider.name] || 0) + 1
          
          // Save cache periodically
          if (this.stats.total_requests % 10 === 0) {
            await this.saveCache()
          }
          
          console.log(`📍 Geocoded "${city}, ${state}" using ${provider.name} (confidence: ${result.confidence})`)
          return result
        }
      } catch (error) {
        console.warn(`Provider ${provider.name} failed for "${city}, ${state}":`, error)
        continue
      }
    }

    console.warn(`📍 Failed to geocode "${city}, ${state}" with all providers`)
    return null
  }

  async batchGeocode(
    locations: Array<{city: string, state: string, country?: string}>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<(GeocodingResult | null)[]> {
    const results: (GeocodingResult | null)[] = []
    
    for (let i = 0; i < locations.length; i++) {
      const location = locations[i]
      const result = await this.geocode(location.city, location.state, location.country)
      results.push(result)
      
      if (onProgress) {
        onProgress(i + 1, locations.length)
      }
      
      // Small delay to be respectful to APIs
      if (i < locations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    // Save cache after batch operation
    await this.saveCache()
    
    return results
  }

  getStatistics() {
    return {
      ...this.stats,
      cache_size: this.cache.size,
      cache_hit_rate: this.stats.total_requests > 0 ? 
        (this.stats.cache_hits / this.stats.total_requests * 100).toFixed(2) + '%' : '0%',
      active_providers: this.providers.filter(p => {
        // Check if provider is properly configured
        if (p.name === 'google_maps') return !!process.env.GOOGLE_MAPS_API_KEY
        if (p.name === 'mapbox') return !!process.env.MAPBOX_ACCESS_TOKEN
        return true // nominatim doesn't need API key
      }).map(p => p.name)
    }
  }

  async clearCache(): Promise<void> {
    this.cache.clear()
    try {
      await fs.unlink(this.cacheFile)
    } catch (error) {
      // File might not exist, that's ok
    }
  }

  async preloadUSCities(): Promise<void> {
    // Preload common US city/state combinations
    const commonCities = [
      { city: 'New York', state: 'NY' },
      { city: 'Los Angeles', state: 'CA' },
      { city: 'Chicago', state: 'IL' },
      { city: 'Houston', state: 'TX' },
      { city: 'Phoenix', state: 'AZ' },
      { city: 'Philadelphia', state: 'PA' },
      { city: 'San Antonio', state: 'TX' },
      { city: 'San Diego', state: 'CA' },
      { city: 'Dallas', state: 'TX' },
      { city: 'San Jose', state: 'CA' },
      // Add more as needed
    ]

    console.log('📍 Preloading common US cities...')
    await this.batchGeocode(commonCities, (processed, total) => {
      if (processed % 5 === 0) {
        console.log(`📍 Preloaded ${processed}/${total} cities`)
      }
    })
  }
}

// Singleton instance
export const enhancedGeocodingService = new EnhancedGeocodingService()

// Load geocache function for backward compatibility
export async function loadGeocache(): Promise<Record<string, { lat: number; lon: number; timestamp?: number }>> {
  try {
    const cacheFile = path.join(process.cwd(), 'geocache.json')
    const cacheData = await fs.readFile(cacheFile, 'utf-8')
    const cache = JSON.parse(cacheData)
    
    // Convert enhanced format to legacy format
    const legacyCache: Record<string, { lat: number; lon: number; timestamp?: number }> = {}
    
    for (const [key, value] of Object.entries(cache)) {
      if (typeof value === 'object' && value !== null && 'lat' in value && 'lon' in value) {
        const geocodingResult = value as GeocodingResult
        legacyCache[key] = {
          lat: geocodingResult.lat,
          lon: geocodingResult.lon,
          timestamp: Date.now()
        }
      }
    }
    
    return legacyCache
  } catch (error) {
    console.warn('Failed to load geocache:', error)
    return {}
  }
}