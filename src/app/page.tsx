'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { MissingPerson } from '@/types/missing-person'
import { MobileNavigation } from '@/components/mobile/MobileNavigation'
import { UnifiedHeader } from '@/components/navigation/UnifiedHeader'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { EnhancedSearch } from '@/components/search/EnhancedSearch'
import { LoadingState, CardSkeleton } from '@/components/ui/LoadingState'
import { ErrorBoundary, NetworkError } from '@/components/ui/ErrorBoundary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'

// Dynamically import counter component
const KidnappingCounter = dynamic(() => import('@/components/KidnappingCounter'), {
  ssr: false
})

// Dynamically import the enhanced map component to avoid SSR issues with leaflet
const EnhancedMissingPersonsMap = dynamic(() => import('@/components/map/EnhancedMissingPersonsMap'), {
  ssr: false,
  loading: () => <LoadingState type="map" message="Loading missing persons map..." />
})

export default function Home() {
  const { data: session } = useSession()
  const [missingPersons, setMissingPersons] = useState<MissingPerson[]>([])
  const [filteredPersons, setFilteredPersons] = useState<MissingPerson[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    loadMissingPersons()
  }, [])

  useEffect(() => {
    filterPersons()
  }, [missingPersons, searchQuery, categoryFilter, statusFilter])

  const loadMissingPersons = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/missing-persons?limit=9000')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      // Handle new API response format
      const data = result.data || result
      setMissingPersons(data)
    } catch (error) {
      console.error('Error loading missing persons data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const filterPersons = () => {
    let filtered = missingPersons

    if (searchQuery) {
      filtered = filtered.filter(person => 
        person.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.location?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (categoryFilter) {
      filtered = filtered.filter(person => person.category === categoryFilter)
    }

    if (statusFilter) {
      filtered = filtered.filter(person => person.status === statusFilter)
    }

    setFilteredPersons(filtered)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    // Save to recent searches if it's a meaningful search
    if (value.length > 2 && !recentSearches.includes(value)) {
      setRecentSearches(prev => [value, ...prev].slice(0, 5))
    }
  }

  const handleRetry = () => {
    loadMissingPersons()
  }

  return (
    <div className="min-h-screen bg-black text-white">
        <MobileNavigation 
          currentTier="free"
          isAuthenticated={!!session}
          userName={session?.user?.name || session?.user?.email || undefined}
          onUpgrade={() => window.open('/pricing', '_blank')}
          onSignOut={() => window.location.href = '/api/auth/signout'}
        />
        
        <UnifiedHeader className="hidden md:block" />
        
        <div className="container mx-auto px-4 py-4">
          <Breadcrumbs className="mb-4" />
        </div>

        {/* Dramatic kidnapping counter */}
        <section className="py-16 bg-gradient-to-b from-black to-mission-gray-900">
          <KidnappingCounter />
        </section>

        <main className="container mx-auto px-4 py-8">
          {/* Enhanced Search Section */}
          <Card className="mb-8 p-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                🔍 Search Missing Persons
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Main Search */}
              <EnhancedSearch
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search by name, location, or keywords..."
                recentSearches={recentSearches}
                className="mb-4"
              />
              
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <select
                  className="px-4 py-3 bg-mission-gray-800 border border-mission-gray-700 text-white rounded-lg focus:ring-2 focus:ring-mission-primary focus:border-mission-primary transition-colors"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">All Categories</option>
                  <option value="Missing Adults">Missing Adults</option>
                  <option value="Missing Children">Missing Children</option>
                  <option value="Missing Veterans">Missing Veterans</option>
                </select>
                
                <select
                  className="px-4 py-3 bg-mission-gray-800 border border-mission-gray-700 text-white rounded-lg focus:ring-2 focus:ring-mission-primary focus:border-mission-primary transition-colors"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Cold Case">Cold Case</option>
                </select>
                
                <div className="px-4 py-3 bg-mission-gray-800 border border-mission-gray-700 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-mission-gray-300">
                    Showing: <span className="font-semibold text-white">{filteredPersons.length}</span> of {missingPersons.length}
                  </span>
                  {(searchQuery || categoryFilter || statusFilter) && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setCategoryFilter('')
                        setStatusFilter('')
                      }}
                      className="text-xs text-mission-primary hover:text-blue-400 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Error State */}
        {error && (
          <NetworkError onRetry={handleRetry} />
        )}

        {/* Loading State */}
        {loading && !error ? (
          <LoadingState 
            type="map" 
            message="Loading missing persons data..." 
            size="lg"
            className="py-12"
          />
        ) : !error && (
          <Card className="p-4 mb-8">
            <EnhancedMissingPersonsMap 
              persons={filteredPersons} 
              currentTier='champion'
              onUpgrade={() => window.open('/pricing', '_blank')}
            />
          </Card>
        )}


        {/* Recent Cases Section */}
        {!loading && !error && filteredPersons.length > 0 && (
          <Card className="p-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                📋 Recent Cases
              </CardTitle>
              <p className="text-mission-gray-400 text-sm mt-1">
                Latest missing persons cases matching your search criteria
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPersons.slice(0, 6).map((person) => (
                  <Card 
                    key={person.id} 
                    className="p-4 hover:border-mission-gray-600 transition-all duration-200 cursor-pointer group"
                    hoverable
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-lg text-white group-hover:text-mission-primary transition-colors">
                          {person.name}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                          person.category === 'Missing Children' 
                            ? 'bg-mission-secondary/20 text-mission-secondary border border-mission-secondary/30' 
                            : person.category === 'Missing Veterans'
                            ? 'bg-mission-accent/20 text-mission-accent border border-mission-accent/30'
                            : 'bg-mission-primary/20 text-mission-primary border border-mission-primary/30'
                        }`}>
                          {person.category?.replace('Missing ', '')}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <p className="text-mission-gray-300 flex items-center gap-2">
                          📅 <span>{person.reportedMissing}</span>
                        </p>
                        <p className="text-mission-gray-300 flex items-center gap-2">
                          📍 <span>{person.location}</span>
                        </p>
                      </div>
                      
                      <div className="pt-2 border-t border-mission-gray-700">
                        <button className="text-xs text-mission-primary hover:text-blue-400 transition-colors font-medium">
                          View Details →
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              {filteredPersons.length > 6 && (
                <div className="text-center mt-6">
                  <button className="text-mission-primary hover:text-blue-400 transition-colors font-medium">
                    View All {filteredPersons.length} Cases →
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && filteredPersons.length === 0 && missingPersons.length > 0 && (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-white mb-2">No Results Found</h3>
            <p className="text-mission-gray-400 mb-4">
              No missing persons match your current search criteria.
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setCategoryFilter('')
                setStatusFilter('')
              }}
              className="text-mission-primary hover:text-blue-400 transition-colors font-medium"
            >
              Clear All Filters
            </button>
          </Card>
        )}
      </main>
    </div>
  )
}