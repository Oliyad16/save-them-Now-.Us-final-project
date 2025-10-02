'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MissingPerson } from '@/types/missing-person'
import { MobileNavigation } from '@/components/mobile/MobileNavigation'
import { UnifiedHeader } from '@/components/navigation/UnifiedHeader'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { EnhancedSearch } from '@/components/search/EnhancedSearch'
import { LoadingState, CardSkeleton } from '@/components/ui/LoadingState'
import { ErrorBoundary, NetworkError } from '@/components/ui/ErrorBoundary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { useApiCache } from '@/hooks/useCache'
import CaseDetailModal from '@/components/case/CaseDetailModal'

// Dynamically import counter component with better loading
const KidnappingCounter = dynamic(() => import('@/components/KidnappingCounter'), {
  ssr: false,
  loading: () => <div className="h-32 bg-gradient-to-b from-black to-gray-900 animate-pulse rounded-lg flex items-center justify-center">
    <div className="text-white text-lg">Loading...</div>
  </div>
})

// Dynamically import components to avoid SSR issues
const MultiViewMap = dynamic(() => import('@/components/map/MultiViewMap'), {
  ssr: false,
  loading: () => <LoadingState type="map" message="Loading map..." />
})

const VoiceSearch = dynamic(() => import('@/components/search/VoiceSearch'), {
  ssr: false,
  loading: () => <div className="h-16 bg-gray-800 rounded-lg animate-pulse" />
})

const FacialSearchComponent = dynamic(() => import('@/components/ai/FacialSearchComponent'), {
  ssr: false,
  loading: () => <LoadingState type="ai" message="Loading AI search..." />
})

const Timeline3D = dynamic(() => import('@/components/visualization/Timeline3D'), {
  ssr: false,
  loading: () => <LoadingState type="visualization" message="Loading 3D timeline..." />
})

const HeatMapCanvas = dynamic(() => import('@/components/visualization/HeatMapCanvas'), {
  ssr: false,
  loading: () => <LoadingState type="visualization" message="Loading heat map..." />
})

const SocialShareOptimizer = dynamic(() => import('@/components/social/SocialShareOptimizer'), {
  ssr: false,
  loading: () => <div className="h-32 bg-gray-800 rounded-lg animate-pulse" />
})

export default function Home() {
  const { data: session } = useSession()
  const [filteredPersons, setFilteredPersons] = useState<MissingPerson[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  // Removed activeView state - only showing map view now
  const [selectedPerson, setSelectedPerson] = useState<MissingPerson | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showAllCases, setShowAllCases] = useState(false)

  // Use advanced caching for API calls
  const { data: missingPersons, loading, error } = useApiCache<{data: MissingPerson[]}>('/api/missing-persons', {
    limit: 1500 // Load 1500 cases for comprehensive visualization
  }, {
    ttl: 1000 * 60 * 10, // 10 minutes cache
    background: true
  })

  const personsData = useMemo(() => missingPersons?.data || [], [missingPersons?.data])

  const filterPersons = useCallback(() => {
    let filtered = personsData

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
  }, [personsData, searchQuery, categoryFilter, statusFilter])

  useEffect(() => {
    filterPersons()
  }, [filterPersons])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    // Save to recent searches if it's a meaningful search
    if (value.length > 2 && !recentSearches.includes(value)) {
      setRecentSearches(prev => [value, ...prev].slice(0, 5))
    }
  }

  // Voice search handler
  const handleVoiceSearch = (query: string) => {
    setSearchQuery(query)
    if (!recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev].slice(0, 5))
    }
  }

  // Person selection handler
  const handlePersonSelect = (person: MissingPerson) => {
    setSelectedPerson(person)
  }

  // Case detail handlers
  const handleViewDetails = (person: MissingPerson) => {
    setSelectedPerson(person)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    // Don't clear selectedPerson immediately to allow for smooth animation
    setTimeout(() => setSelectedPerson(null), 300)
  }

  const handleReportInformation = (person: MissingPerson) => {
    // Open reporting modal or navigate to report page
    // For now, set modal state to show reporting info
    setSelectedPerson(person)
    setIsModalOpen(true)
    // TODO: Create dedicated reporting form/modal
    console.log(`Reporting information for ${person.name}`)
  }

  const handleViewAllCases = () => {
    setShowAllCases(true)
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

          {/* Interactive Map Section - MOVED UP */}
          <Card className="mb-8 p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-gray-700/50 shadow-2xl">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-3 bg-blue-600/20 rounded-xl">
                  🗺️
                </div>
                <span className="bg-gradient-to-r from-blue-300 to-white bg-clip-text text-transparent">
                  Interactive Missing Persons Map
                </span>
              </CardTitle>
              <p className="text-gray-400 mt-3">
                Explore missing persons cases across the United States
                <span className="ml-2 px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                  {filteredPersons.length} cases displayed
                </span>
              </p>
              {/* View Selector - Temporarily hiding non-functional views */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white cursor-default"
                >
                  🗺️ Interactive Map
                </button>
                {/* Heatmap and Timeline views disabled until fully functional
                <button
                  onClick={() => setActiveView('heatmap')}
                  className="px-4 py-2 rounded-lg font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  🔥 Heat Map (Coming Soon)
                </button>
                <button
                  onClick={() => setActiveView('timeline')}
                  className="px-4 py-2 rounded-lg font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  📅 3D Timeline (Coming Soon)
                </button>
                */}
              </div>
            </CardHeader>
            
            {/* Error State */}
            {error && (
              <CardContent>
                <div className="p-8 border-red-500/30 bg-gradient-to-br from-red-900/20 via-red-800/10 to-red-900/20 backdrop-blur-sm rounded-lg">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      ⚠️
                    </div>
                    <h3 className="text-xl font-bold text-red-300 mb-3">Connection Issue</h3>
                    <p className="text-red-200/80 text-sm mb-6 max-w-md mx-auto">
                      We&apos;re having trouble loading the missing persons data. This could be a temporary network issue.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
                      >
                        🔄 Retry Loading
                      </button>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}

            {/* Main Visualization Area */}
            {!error && (
              <CardContent className="p-4">
                {loading && (
                  <div className="py-16 text-center">
                    <div className="inline-flex flex-col items-center justify-center">
                      <div className="relative w-16 h-16 mb-6">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-pulse" />
                        <div className="absolute inset-2 bg-blue-500/40 rounded-full animate-pulse" style={{animationDelay: '0.5s'}} />
                        <div className="absolute inset-4 bg-blue-500/60 rounded-full animate-pulse" style={{animationDelay: '1s'}} />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Loading Visualization</h3>
                      <p className="text-gray-400 text-sm">Preparing advanced missing persons data...</p>
                    </div>
                  </div>
                )}
                
                {!loading && (
                  <MultiViewMap
                    persons={filteredPersons}
                    onPersonSelect={handleViewDetails}
                    className="w-full"
                  />
                )}
              </CardContent>
            )}
          </Card>

          {/* AI Facial Search - MOVED UP */}
          <Card className="mb-8 bg-gradient-to-br from-purple-900/20 via-gray-800 to-purple-900/20 border-purple-500/30 shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-purple-600/20 rounded-lg">
                  🤖
                </div>
                <span className="bg-gradient-to-r from-purple-300 to-white bg-clip-text text-transparent">
                  AI Facial Recognition Search
                </span>
                <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                  Premium Feature
                </span>
              </CardTitle>
              <p className="text-gray-400 text-sm mt-2">
                Upload a photo to search for similar faces in our missing persons database using advanced AI technology
              </p>
            </CardHeader>
            <CardContent>
              <FacialSearchComponent 
                missingPersons={personsData}
                onResultsFound={(results) => {
                  // Handle facial search results
                  console.log('Facial search results:', results)
                }}
              />
            </CardContent>
          </Card>

          {/* Enhanced Search Section - STREAMLINED */}
          <Card className="mb-8 p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-gray-700/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-green-600/20 rounded-lg">
                  🔍
                </div>
                <span className="bg-gradient-to-r from-green-300 to-white bg-clip-text text-transparent">
                  Search & Filter Cases
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Text Search */}
              <EnhancedSearch
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search by name, location, or keywords..."
                recentSearches={recentSearches}
              />

              {/* Voice Search - Compact */}
              <VoiceSearch
                onSearchQuery={handleVoiceSearch}
                placeholder="Try voice search: 'Find missing children in California'"
              />
              
              {/* Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <select
                  className="px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">All Categories</option>
                  <option value="Missing Adults">Missing Adults</option>
                  <option value="Missing Children">Missing Children</option>
                  <option value="Missing Veterans">Missing Veterans</option>
                </select>
                
                <select
                  className="px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Cold Case">Cold Case</option>
                </select>
                
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg">
                  <span className="text-sm text-gray-300">
                    {filteredPersons.length} of {personsData.length}
                  </span>
                  {(searchQuery || categoryFilter || statusFilter) && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setCategoryFilter('')
                        setStatusFilter('')
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Sharing */}
          {selectedPerson && (
            <Card className="mb-8">
              <SocialShareOptimizer
                person={selectedPerson}
                onShare={(platform, success) => {
                  console.log(`Shared ${selectedPerson.name} on ${platform}:`, success)
                }}
              />
            </Card>
          )}


        {/* Recent Cases Section */}
        {!loading && !error && filteredPersons.length > 0 && (
          <Card className="p-6">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  📋
                </div>
                <span className="bg-gradient-to-r from-orange-300 to-white bg-clip-text text-transparent">
                  Recent Cases
                </span>
              </CardTitle>
              <p className="text-gray-400 mt-3">
                Latest missing persons cases matching your search criteria
                <span className="ml-2 px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full">
                  {filteredPersons.length} found
                </span>
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPersons.slice(0, 6).map((person) => (
                  <Card
                    key={person.id}
                    className="p-4 hover:border-mission-gray-600 transition-all duration-200 cursor-pointer group hover:-translate-y-0.5"
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
                        <button 
                          onClick={() => handleViewDetails(person)}
                          className="px-3 py-1 text-sm bg-mission-primary hover:bg-blue-600 text-white rounded transition-colors font-medium"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              {/* Expandable Additional Cases */}
              {filteredPersons.length > 6 && (
                <>
                  <motion.div
                    initial={false}
                    animate={{
                      height: showAllCases ? "auto" : 0,
                      opacity: showAllCases ? 1 : 0
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      {filteredPersons.slice(6).map((person) => (
                        <Card
                          key={person.id}
                          className="p-4 hover:border-mission-gray-600 transition-all duration-200 cursor-pointer group hover:-translate-y-0.5"
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
                              <button 
                                onClick={() => handleViewDetails(person)}
                                className="px-3 py-1 text-sm bg-mission-primary hover:bg-blue-600 text-white rounded transition-colors font-medium"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </motion.div>
                  
                  <div className="text-center mt-6">
                    <button 
                      onClick={() => setShowAllCases(!showAllCases)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors font-medium"
                    >
                      {showAllCases ? 'Show Less' : `View All ${filteredPersons.length} Cases`}
                    </button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && filteredPersons.length === 0 && personsData.length > 0 && (
          <Card className="p-12 text-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-gray-700/50">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-blue-500/10 rounded-full" />
              <div className="absolute inset-3 bg-blue-500/20 rounded-full" />
              <div className="flex items-center justify-center w-full h-full text-4xl">
                🔍
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No Matches Found</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
              We couldn’t find any missing persons matching your search criteria. Try adjusting your filters or search terms.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setSearchQuery('')
                  setCategoryFilter('')
                  setStatusFilter('')
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
              >
                🔄 Clear All Filters
              </button>
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                🎯 Reset Search
              </button>
            </div>
          </Card>
        )}

      </main>

      {/* Case Detail Modal */}
      <CaseDetailModal
        person={selectedPerson}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onShare={(platform) => {
          console.log(`Shared ${selectedPerson?.name} on ${platform}`)
          // Could implement analytics tracking here
        }}
        onReport={handleReportInformation}
      />
    </div>
  )
}