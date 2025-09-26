import { useState, useEffect, useCallback } from 'react'
import { cacheManager } from '@/lib/cache/CacheManager'

interface CacheOptions {
  ttl?: number
  forceRefresh?: boolean
  background?: boolean // Fetch in background and return cached data immediately
}

interface CacheState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  isFromCache: boolean
  refresh: () => Promise<void>
}

/**
 * Advanced caching hook that provides intelligent data fetching with IndexedDB caching
 * Zero cost solution for dramatically improved performance
 */
export function useCache<T = any>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): CacheState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setError(null)
      
      if (!forceRefresh) {
        // Try to get from cache first
        const cachedData = await cacheManager.getCachedApiResponse<T>(key)
        if (cachedData) {
          setData(cachedData)
          setIsFromCache(true)
          setLoading(false)
          
          // If background option is enabled, still fetch fresh data
          if (!options.background) {
            return
          }
        }
      }

      // Fetch fresh data
      if (!options.background) {
        setLoading(true)
      }
      
      const freshData = await fetcher()
      setData(freshData)
      setIsFromCache(false)
      setLoading(false)

      // Cache the fresh data
      await cacheManager.setCachedApiResponse(key, {}, freshData, options.ttl)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setLoading(false)
    }
  }, [key, fetcher, options.ttl, options.background])

  const refresh = useCallback(() => fetchData(true), [fetchData])

  useEffect(() => {
    fetchData(options.forceRefresh)
  }, [fetchData, options.forceRefresh])

  return {
    data,
    loading,
    error,
    isFromCache,
    refresh
  }
}

/**
 * Hook for caching API responses with automatic query parameter handling
 */
export function useApiCache<T = any>(
  endpoint: string,
  params: Record<string, any> = {},
  options: CacheOptions = {}
): CacheState<T> {
  const key = `${endpoint}?${new URLSearchParams(params).toString()}`
  
  const fetcher = useCallback(async (): Promise<T> => {
    const url = new URL(endpoint, window.location.origin)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
    
    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return response.json()
  }, [endpoint, params])

  return useCache<T>(key, fetcher, options)
}

/**
 * Hook for caching search results with debouncing
 */
export function useSearchCache(
  query: string,
  filters: Record<string, any> = {},
  debounceMs = 300
): CacheState<any> {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  return useApiCache('/api/missing-persons', {
    search: debouncedQuery,
    ...filters,
    limit: 100
  }, {
    ttl: 1000 * 60 * 5, // 5 minutes for search results
    background: true // Always show cached results immediately
  })
}

/**
 * Hook for managing user-specific cached data
 */
export function useUserCache<T = any>(
  userId: string,
  dataType: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): CacheState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setError(null)
      
      if (!forceRefresh) {
        const cachedData = await cacheManager.getCachedUserData<T>(userId, dataType)
        if (cachedData) {
          setData(cachedData)
          setIsFromCache(true)
          setLoading(false)
          return
        }
      }

      setLoading(true)
      const freshData = await fetcher()
      setData(freshData)
      setIsFromCache(false)
      setLoading(false)

      await cacheManager.setCachedUserData(userId, dataType, freshData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setLoading(false)
    }
  }, [userId, dataType, fetcher])

  const refresh = useCallback(() => fetchData(true), [fetchData])

  useEffect(() => {
    if (userId) {
      fetchData(options.forceRefresh)
    }
  }, [fetchData, userId, options.forceRefresh])

  return {
    data,
    loading,
    error,
    isFromCache,
    refresh
  }
}

/**
 * Hook for cache statistics and management
 */
export function useCacheStats() {
  const [stats, setStats] = useState({
    hitRate: 0,
    size: 0,
    maxSize: 0,
    entries: 0
  })

  const refreshStats = useCallback(async () => {
    try {
      const hitRate = await cacheManager.getHitRate()
      // TODO: Get more detailed stats when implemented
      setStats({
        hitRate,
        size: 0,
        maxSize: 0,
        entries: 0
      })
    } catch (error) {
      console.error('Failed to get cache stats:', error)
    }
  }, [])

  const clearCache = useCallback(async () => {
    try {
      await cacheManager.clearAll()
      await refreshStats()
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }, [refreshStats])

  const preloadCriticalData = useCallback(async () => {
    try {
      await cacheManager.preloadCriticalData()
      await refreshStats()
    } catch (error) {
      console.error('Failed to preload critical data:', error)
    }
  }, [refreshStats])

  useEffect(() => {
    refreshStats()
  }, [refreshStats])

  return {
    stats,
    refreshStats,
    clearCache,
    preloadCriticalData
  }
}