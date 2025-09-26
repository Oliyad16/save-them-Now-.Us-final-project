/**
 * Advanced Client-Side Cache Manager using IndexedDB
 * Provides intelligent caching for API responses, search results, and static data
 * Zero cost solution for dramatic performance improvements
 */

interface CacheEntry<T = any> {
  key: string
  data: T
  timestamp: number
  expiresAt: number
  version: string
  size: number
}

interface CacheConfig {
  dbName: string
  version: number
  stores: string[]
  defaultTTL: number // Time to live in milliseconds
  maxSize: number // Maximum cache size in bytes
}

class IndexedDBCache {
  private db: IDBDatabase | null = null
  private config: CacheConfig
  private isInitialized = false
  private currentSize = 0

  constructor(config: CacheConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version)

      request.onerror = () => reject(new Error('Failed to open IndexedDB'))
      
      request.onsuccess = () => {
        this.db = request.result
        this.isInitialized = true
        this.calculateCurrentSize()
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        this.config.stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'key' })
            store.createIndex('timestamp', 'timestamp', { unique: false })
            store.createIndex('expiresAt', 'expiresAt', { unique: false })
          }
        })
      }
    })
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)

      request.onsuccess = () => {
        const entry: CacheEntry<T> = request.result

        if (!entry) {
          resolve(null)
          return
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
          this.delete(storeName, key) // Clean up expired entry
          resolve(null)
          return
        }

        resolve(entry.data)
      }

      request.onerror = () => reject(new Error('Failed to get from cache'))
    })
  }

  async set<T>(storeName: string, key: string, data: T, ttl?: number): Promise<void> {
    if (!this.db) await this.initialize()

    const timestamp = Date.now()
    const expiresAt = timestamp + (ttl || this.config.defaultTTL)
    const dataSize = this.estimateSize(data)

    // Check if we need to clean up space
    if (this.currentSize + dataSize > this.config.maxSize) {
      await this.cleanup(storeName)
    }

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp,
      expiresAt,
      version: '1.0',
      size: dataSize
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(entry)

      request.onsuccess = () => {
        this.currentSize += dataSize
        resolve()
      }

      request.onerror = () => reject(new Error('Failed to set cache'))
    })
  }

  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to delete from cache'))
    })
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.initialize()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => {
        this.currentSize = 0
        resolve()
      }
      request.onerror = () => reject(new Error('Failed to clear cache'))
    })
  }

  private async cleanup(storeName: string): Promise<void> {
    // Remove expired entries first
    await this.removeExpired(storeName)

    // If still over limit, remove oldest entries
    if (this.currentSize > this.config.maxSize * 0.8) {
      await this.removeLRU(storeName, Math.floor(this.config.maxSize * 0.3))
    }
  }

  private async removeExpired(storeName: string): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const index = store.index('expiresAt')
    const range = IDBKeyRange.upperBound(Date.now())

    const request = index.openCursor(range)
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        const entry: CacheEntry = cursor.value
        this.currentSize -= entry.size
        cursor.delete()
        cursor.continue()
      }
    }
  }

  private async removeLRU(storeName: string, targetSize: number): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const index = store.index('timestamp')

    let removedSize = 0
    const request = index.openCursor()

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor && removedSize < targetSize) {
        const entry: CacheEntry = cursor.value
        removedSize += entry.size
        this.currentSize -= entry.size
        cursor.delete()
        cursor.continue()
      }
    }
  }

  private estimateSize(data: any): number {
    return JSON.stringify(data).length * 2 // Rough estimate in bytes
  }

  private async calculateCurrentSize(): Promise<void> {
    this.currentSize = 0
    
    for (const storeName of this.config.stores) {
      await this.calculateStoreSize(storeName)
    }
  }

  private async calculateStoreSize(storeName: string): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => {
      const entries: CacheEntry[] = request.result
      entries.forEach(entry => {
        this.currentSize += entry.size || this.estimateSize(entry.data)
      })
    }
  }

  async getStats(): Promise<{
    size: number
    maxSize: number
    entries: number
    hitRate: number
  }> {
    // Implementation for cache statistics
    return {
      size: this.currentSize,
      maxSize: this.config.maxSize,
      entries: 0,
      hitRate: 0
    }
  }
}

// Cache Manager with intelligent caching strategies
export class CacheManager {
  private cache: IndexedDBCache
  private hits = 0
  private misses = 0

  constructor() {
    this.cache = new IndexedDBCache({
      dbName: 'SaveThemNowCache',
      version: 1,
      stores: ['api_responses', 'search_results', 'static_data', 'user_data'],
      defaultTTL: 1000 * 60 * 30, // 30 minutes
      maxSize: 50 * 1024 * 1024 // 50MB
    })
  }

  async initialize(): Promise<void> {
    await this.cache.initialize()
  }

  // API Response Caching
  async getCachedApiResponse<T>(endpoint: string, params: any = {}): Promise<T | null> {
    const key = this.generateKey(endpoint, params)
    const result = await this.cache.get<T>('api_responses', key)
    
    if (result) {
      this.hits++
      console.log('🎯 Cache hit:', key)
    } else {
      this.misses++
    }
    
    return result
  }

  async setCachedApiResponse<T>(endpoint: string, params: any, data: T, ttl?: number): Promise<void> {
    const key = this.generateKey(endpoint, params)
    await this.cache.set('api_responses', key, data, ttl)
    console.log('💾 Cached API response:', key)
  }

  // Search Results Caching
  async getCachedSearchResults(query: string, filters: any = {}): Promise<any | null> {
    const key = this.generateSearchKey(query, filters)
    return this.cache.get('search_results', key)
  }

  async setCachedSearchResults(query: string, filters: any, results: any): Promise<void> {
    const key = this.generateSearchKey(query, filters)
    // Search results have shorter TTL (5 minutes)
    await this.cache.set('search_results', key, results, 1000 * 60 * 5)
  }

  // Static Data Caching (long-term)
  async getCachedStaticData<T>(key: string): Promise<T | null> {
    return this.cache.get<T>('static_data', key)
  }

  async setCachedStaticData<T>(key: string, data: T): Promise<void> {
    // Static data cached for 24 hours
    await this.cache.set('static_data', key, data, 1000 * 60 * 60 * 24)
  }

  // User-specific data
  async getCachedUserData<T>(userId: string, dataType: string): Promise<T | null> {
    const key = `${userId}:${dataType}`
    return this.cache.get<T>('user_data', key)
  }

  async setCachedUserData<T>(userId: string, dataType: string, data: T): Promise<void> {
    const key = `${userId}:${dataType}`
    await this.cache.set('user_data', key, data, 1000 * 60 * 60) // 1 hour
  }

  // Intelligent cache invalidation
  async invalidatePattern(pattern: string): Promise<void> {
    // TODO: Implement pattern-based cache invalidation
    console.log(`🧹 Invalidating cache pattern: ${pattern}`)
  }

  async preloadCriticalData(): Promise<void> {
    // Preload frequently accessed data
    console.log('🚀 Preloading critical data...')
    
    try {
      // Preload recent missing persons data
      const response = await fetch('/api/missing-persons?limit=100')
      if (response.ok) {
        const data = await response.json()
        await this.setCachedApiResponse('/api/missing-persons', { limit: 100 }, data)
      }
    } catch (error) {
      console.warn('Failed to preload critical data:', error)
    }
  }

  private generateKey(endpoint: string, params: any): string {
    const paramStr = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&')
    return `${endpoint}?${paramStr}`
  }

  private generateSearchKey(query: string, filters: any): string {
    return `search:${query}:${JSON.stringify(filters)}`
  }

  async getHitRate(): Promise<number> {
    const total = this.hits + this.misses
    return total > 0 ? this.hits / total : 0
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.cache.clear('api_responses'),
      this.cache.clear('search_results'),
      this.cache.clear('static_data'),
      this.cache.clear('user_data')
    ])
    console.log('🧹 Cache cleared')
  }
}

// Singleton instance
export const cacheManager = new CacheManager()

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  cacheManager.initialize().catch(console.error)
}