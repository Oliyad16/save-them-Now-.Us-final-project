'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import dynamic from 'next/dynamic'
import { Card, CardContent, Button } from '@/components/ui'
import { UserTier, TierGuard } from '@/components/access'
import { MissingPerson } from '@/types/missing-person'
import { cn } from '@/lib/utils'

// Dynamically import the map to avoid SSR issues
const EnhancedMissingPersonsMap = dynamic(
  () => import('@/components/map/EnhancedMissingPersonsMap'),
  { ssr: false, loading: () => <MapSkeleton /> }
)

interface MobileMapViewProps {
  persons: MissingPerson[]
  currentTier: UserTier
  onUpgrade?: () => void
}

function MapSkeleton() {
  return (
    <div className="w-full h-full bg-mission-gray-800 animate-pulse rounded-lg flex items-center justify-center">
      <div className="text-mission-gray-500">Loading map...</div>
    </div>
  )
}

export function MobileMapView({ persons, currentTier, onUpgrade }: MobileMapViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showMobileControls, setShowMobileControls] = useState(false)
  const [dragConstraints, setDragConstraints] = useState({ top: 0, bottom: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedPerson, setSelectedPerson] = useState<MissingPerson | null>(null)

  useEffect(() => {
    const updateConstraints = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDragConstraints({
          top: -rect.height + 120, // Show at least 120px
          bottom: 0
        })
      }
    }

    updateConstraints()
    window.addEventListener('resize', updateConstraints)
    return () => window.removeEventListener('resize', updateConstraints)
  }, [])

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = -200
    if (info.offset.y < threshold) {
      setIsFullscreen(true)
    } else if (info.offset.y > 100) {
      setIsFullscreen(false)
    }
  }

  const quickStats = {
    total: persons.length,
    children: persons.filter(p => p.category === 'Missing Children').length,
    recent: persons.filter(p => {
      const days = (Date.now() - new Date(p.reportedMissing).getTime()) / (1000 * 60 * 60 * 24)
      return days <= 7
    }).length
  }

  return (
    <div className="relative h-full w-full overflow-hidden" ref={containerRef}>
      {/* Desktop View */}
      <div className="hidden md:block h-full">
        <EnhancedMissingPersonsMap
          persons={persons}
          currentTier={currentTier}
          onUpgrade={onUpgrade}
        />
      </div>

      {/* Mobile View */}
      <div className="md:hidden relative h-full">
        {/* Map Background */}
        <div className="absolute inset-0">
          <EnhancedMissingPersonsMap
            persons={persons}
            currentTier={currentTier}
            onUpgrade={onUpgrade}
          />
        </div>

        {/* Mobile Controls Overlay */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start">
          {/* Quick Stats */}
          <Card className="flex-1 mr-2">
            <CardContent className="p-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-white">{quickStats.total}</div>
                  <div className="text-xs text-mission-gray-400">Total</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-400">{quickStats.children}</div>
                  <div className="text-xs text-mission-gray-400">Children</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-mission-warning">{quickStats.recent}</div>
                  <div className="text-xs text-mission-gray-400">Recent</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controls Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMobileControls(!showMobileControls)}
            className="ml-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          </Button>
        </div>

        {/* Mobile Controls Panel */}
        <AnimatePresence>
          {showMobileControls && (
            <motion.div
              className="absolute top-20 left-4 right-4 z-20"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex flex-col items-center gap-1 h-auto py-3"
                    >
                      <span className="text-lg">🔍</span>
                      <span className="text-xs">Search</span>
                    </Button>
                    
                    {currentTier !== 'anonymous' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex flex-col items-center gap-1 h-auto py-3"
                      >
                        <span className="text-lg">📊</span>
                        <span className="text-xs">Cluster</span>
                      </Button>
                    ) : (
                      <TierGuard
                        currentTier={currentTier}
                        requiredTier="basic"
                        feature="Clustering"
                        upgradeAction={onUpgrade}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex flex-col items-center gap-1 h-auto py-3 opacity-50"
                        >
                          <span className="text-lg">📊</span>
                          <span className="text-xs">Cluster</span>
                        </Button>
                      </TierGuard>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex flex-col items-center gap-1 h-auto py-3"
                      onClick={() => setIsFullscreen(true)}
                    >
                      <span className="text-lg">⛶</span>
                      <span className="text-xs">Fullscreen</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex flex-col items-center gap-1 h-auto py-3"
                    >
                      <span className="text-lg">📍</span>
                      <span className="text-xs">My Location</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Draggable Bottom Sheet */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 z-30 bg-mission-gray-900 rounded-t-2xl shadow-2xl border-t border-mission-gray-800"
          drag="y"
          dragConstraints={dragConstraints}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          initial={{ y: isFullscreen ? dragConstraints.top : 0 }}
          animate={{ y: isFullscreen ? dragConstraints.top : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Drag Handle */}
          <div className="w-full flex justify-center py-3">
            <div className="w-12 h-1 bg-mission-gray-600 rounded-full"></div>
          </div>

          {/* Content */}
          <div className="px-4 pb-6 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Cases</h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? '⬇️' : '⬆️'}
                </Button>
              </div>
            </div>

            {/* Cases Grid */}
            <div className="space-y-3">
              {persons.slice(0, isFullscreen ? 20 : 6).map((person) => (
                <motion.div
                  key={person.id}
                  className="flex items-center gap-3 p-3 bg-mission-gray-800 rounded-lg"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPerson(person)}
                >
                  <div className={cn(
                    'w-3 h-3 rounded-full flex-shrink-0',
                    person.category === 'Missing Children' ? 'bg-red-500' :
                    person.category === 'Missing Veterans' ? 'bg-green-500' :
                    'bg-blue-500'
                  )} />
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{person.name}</h4>
                    <p className="text-sm text-mission-gray-400 truncate">
                      {person.age} years • {person.location}
                    </p>
                    <p className="text-xs text-mission-gray-500">
                      {person.reportedMissing}
                    </p>
                  </div>

                  <Button variant="ghost" size="xs">
                    →
                  </Button>
                </motion.div>
              ))}
            </div>

            {/* Show More for non-fullscreen */}
            {!isFullscreen && persons.length > 6 && (
              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={() => setIsFullscreen(true)}
              >
                Show {persons.length - 6} more cases
              </Button>
            )}
          </div>
        </motion.div>

        {/* Fullscreen Overlay */}
        <AnimatePresence>
          {isFullscreen && (
            <motion.div
              className="absolute inset-0 z-40 bg-mission-gray-900"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Fullscreen Header */}
              <div className="flex items-center justify-between p-4 border-b border-mission-gray-800">
                <h2 className="text-lg font-semibold text-white">All Cases</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(false)}
                >
                  ✕
                </Button>
              </div>

              {/* Fullscreen Content */}
              <div className="p-4 h-full overflow-y-auto pb-20">
                <div className="space-y-3">
                  {persons.map((person) => (
                    <Card key={person.id} hoverable>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'w-4 h-4 rounded-full flex-shrink-0 mt-1',
                            person.category === 'Missing Children' ? 'bg-red-500' :
                            person.category === 'Missing Veterans' ? 'bg-green-500' :
                            'bg-blue-500'
                          )} />
                          
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-1">{person.name}</h4>
                            <div className="space-y-1 text-sm text-mission-gray-400">
                              <p>{person.age} years old • {person.gender}</p>
                              <p>📍 {person.location}</p>
                              <p>📅 Reported: {person.reportedMissing}</p>
                              {person.caseNumber && (
                                <p>🔍 Case: {person.caseNumber}</p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 mt-3">
                              <span className={cn(
                                'px-2 py-1 text-xs rounded-full',
                                person.category === 'Missing Children' 
                                  ? 'bg-red-900 text-red-200' 
                                  : person.category === 'Missing Veterans'
                                  ? 'bg-green-900 text-green-200'
                                  : 'bg-blue-900 text-blue-200'
                              )}>
                                {person.category}
                              </span>
                              
                              <Button variant="ghost" size="xs">
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Person Detail Modal */}
        <AnimatePresence>
          {selectedPerson && (
            <motion.div
              className="absolute inset-0 z-50 bg-black/50 flex items-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPerson(null)}
            >
              <motion.div
                className="w-full bg-mission-gray-900 rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">{selectedPerson.name}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPerson(null)}
                  >
                    ✕
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-mission-gray-400">Age:</span>
                      <span className="ml-2 text-white">{selectedPerson.age} years</span>
                    </div>
                    <div>
                      <span className="text-mission-gray-400">Gender:</span>
                      <span className="ml-2 text-white">{selectedPerson.gender}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-mission-gray-400">Location:</span>
                      <span className="ml-2 text-white">{selectedPerson.location}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-mission-gray-400">Reported:</span>
                      <span className="ml-2 text-white">{selectedPerson.reportedMissing}</span>
                    </div>
                    {selectedPerson.caseNumber && (
                      <div className="col-span-2">
                        <span className="text-mission-gray-400">Case Number:</span>
                        <span className="ml-2 text-white">{selectedPerson.caseNumber}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="primary" className="flex-1">
                      Share Case
                    </Button>
                    <Button variant="ghost" className="flex-1">
                      Report Info
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}