'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, LayersControl, LayerGroup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { motion, AnimatePresence } from 'framer-motion'
import { MissingPerson } from '@/types/missing-person'
import { TierGuard, FeatureTeaser, UserTier } from '@/components/access'
import { Card, CardContent, Button } from '@/components/ui'
import { MapFilters } from './MapFilters'
import type { MapFilters as MapFiltersType } from './MapFilters'
import { cn } from '@/lib/utils'

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Enhanced icons for different categories and risk levels
const createEnhancedIcon = (category: string, riskLevel?: string, size: 'sm' | 'md' | 'lg' = 'md') => {
  const sizes = { sm: 8, md: 12, lg: 16 }
  const iconSize = sizes[size]
  
  const colors = {
    'Missing Adults': '#60a5fa',
    'Missing Children': '#f87171',
    'Missing Veterans': '#4ade80'
  }
  
  const riskColors = {
    'Low': '#10b981',
    'Medium': '#f59e0b', 
    'High': '#ef4444',
    'Critical': '#dc2626'
  }
  
  const baseColor = colors[category as keyof typeof colors] || '#60a5fa'
  const ringColor = riskLevel ? riskColors[riskLevel as keyof typeof riskColors] : baseColor
  
  const html = riskLevel ? `
    <div style="
      width: ${iconSize + 4}px;
      height: ${iconSize + 4}px;
      border-radius: 50%;
      background-color: ${ringColor};
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 8px rgba(255,255,255,0.4);
      animation: ${riskLevel === 'Critical' ? 'pulse 1s infinite' : 'none'};
    ">
      <div style="
        width: ${iconSize}px;
        height: ${iconSize}px;
        border-radius: 50%;
        background-color: ${baseColor};
      "></div>
    </div>
  ` : `
    <div style="
      width: ${iconSize}px;
      height: ${iconSize}px;
      border-radius: 50%;
      background-color: ${baseColor};
      box-shadow: 0 0 4px rgba(255,255,255,0.3);
      transition: all 0.2s ease;
      cursor: pointer;
    "></div>
  `

  return L.divIcon({
    html,
    className: 'custom-enhanced-marker',
    iconSize: [iconSize + (riskLevel ? 4 : 0), iconSize + (riskLevel ? 4 : 0)],
    iconAnchor: [(iconSize + (riskLevel ? 4 : 0)) / 2, (iconSize + (riskLevel ? 4 : 0)) / 2]
  })
}

// Cluster icon for grouped markers
const createClusterIcon = (count: number, category?: string) => {
  const color = category === 'Missing Children' ? '#f87171' : 
                category === 'Missing Veterans' ? '#4ade80' : '#60a5fa'
  
  return L.divIcon({
    html: `
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${color}40, ${color}80);
        border: 2px solid ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      ">
        ${count}
      </div>
    `,
    className: 'custom-cluster-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  })
}

interface EnhancedMissingPersonsMapProps {
  persons: MissingPerson[]
  currentTier: UserTier
  onUpgrade?: () => void
  className?: string
}

interface ClusterData {
  id: string
  latitude: number
  longitude: number
  count: number
  category?: string
  persons: MissingPerson[]
}

export default function EnhancedMissingPersonsMap({ 
  persons, 
  currentTier,
  onUpgrade,
  className 
}: EnhancedMissingPersonsMapProps) {
  const [filters, setFilters] = useState<MapFiltersType>({
    category: '',
    status: '',
    ageRange: [0, 100],
    gender: '',
    dateRange: [null, null],
    location: '',
    radius: 50,
    ethnicity: '',
    circumstances: [],
    riskLevel: '',
    timeSinceMissing: ''
  })
  
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'individual' | 'clustered' | 'heatmap'>('individual')
  const [selectedCluster, setSelectedCluster] = useState<ClusterData | null>(null)

  // Filter persons based on current filters and tier access
  const filteredPersons = useMemo(() => {
    let filtered = persons.filter(p => p.latitude && p.longitude)
    
    // Basic filters (available to all)
    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category)
    }
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status)
    }
    if (filters.location) {
      filtered = filtered.filter(p => 
        p.location?.toLowerCase().includes(filters.location.toLowerCase())
      )
    }

    // Premium filters
    if (currentTier !== 'anonymous' && ['premium', 'hero', 'champion'].includes(currentTier)) {
      if (filters.gender) {
        filtered = filtered.filter(p => p.gender === filters.gender)
      }
      
      if (filters.ageRange[0] > 0 || filters.ageRange[1] < 100) {
        filtered = filtered.filter(p => {
          const age = p.age || 0
          return age >= filters.ageRange[0] && age <= filters.ageRange[1]
        })
      }
    }

    // Hero filters
    if (['hero', 'champion'].includes(currentTier)) {
      if (filters.circumstances.length > 0) {
        filtered = filtered.filter(p => 
          filters.circumstances.some(c => p.circumstances?.includes(c))
        )
      }
    }

    return filtered
  }, [persons, filters, currentTier])

  // Generate clusters for premium users
  const clusters = useMemo(() => {
    if (currentTier === 'anonymous' || viewMode !== 'clustered') return []
    
    const clusterRadius = 0.1 // degrees
    const clusterMap = new Map<string, ClusterData>()
    
    filteredPersons.forEach(person => {
      const lat = Math.round(person.latitude! / clusterRadius) * clusterRadius
      const lng = Math.round(person.longitude! / clusterRadius) * clusterRadius
      const key = `${lat}-${lng}`
      
      if (clusterMap.has(key)) {
        const cluster = clusterMap.get(key)!
        cluster.count++
        cluster.persons.push(person)
      } else {
        clusterMap.set(key, {
          id: key,
          latitude: lat,
          longitude: lng,
          count: 1,
          category: person.category,
          persons: [person]
        })
      }
    })
    
    return Array.from(clusterMap.values()).filter(cluster => cluster.count > 1)
  }, [filteredPersons, currentTier, viewMode])

  const getIcon = (person: MissingPerson) => {
    const riskLevel = ['hero', 'champion'].includes(currentTier) ? 
      (person as any).riskLevel : undefined
    return createEnhancedIcon(person.category, riskLevel)
  }

  const hasClusteringAccess = currentTier !== 'anonymous'
  const hasAdvancedAnalytics = ['premium', 'hero', 'champion'].includes(currentTier)
  const hasRealTimeUpdates = ['hero', 'champion'].includes(currentTier)

  return (
    <div className={cn('relative', className)}>
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        <Card className="p-2">
          <CardContent className="p-0">
            <div className="flex items-center gap-2">
              <Button
                variant={showFilters ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                🔍 Filters
              </Button>
              
              {hasClusteringAccess ? (
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as any)}
                  className="px-2 py-1 bg-mission-gray-800 border border-mission-gray-700 text-white rounded text-sm"
                >
                  <option value="individual">Individual</option>
                  <option value="clustered">Clustered</option>
                  {hasAdvancedAnalytics && <option value="heatmap">Heatmap</option>}
                </select>
              ) : (
                <TierGuard
                  currentTier={currentTier}
                  requiredTier="basic"
                  feature="View Modes"
                  upgradeAction={onUpgrade}
                  showPreview
                  previewContent={
                    <select className="px-2 py-1 bg-mission-gray-800 border border-mission-gray-700 text-white rounded text-sm">
                      <option>Clustered View</option>
                      <option>Heatmap View</option>
                    </select>
                  }
                >
                  <div />
                </TierGuard>
              )}
            </div>
          </CardContent>
        </Card>

        {hasRealTimeUpdates && (
          <Card className="p-2">
            <CardContent className="p-0 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-mission-gray-300">Live Updates</span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Map Stats */}
      <div className="absolute top-4 right-4 z-10">
        <Card className="p-3">
          <CardContent className="p-0">
            <div className="space-y-1">
              <div className="text-sm font-medium text-white">
                {filteredPersons.length} cases
              </div>
              {viewMode === 'clustered' && clusters.length > 0 && (
                <div className="text-xs text-mission-gray-400">
                  {clusters.length} clusters
                </div>
              )}
              <div className="text-xs text-mission-gray-400">
                {filteredPersons.filter(p => p.category === 'Missing Children').length} children
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="absolute top-16 left-4 z-20"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <MapFilters
              filters={filters}
              onFiltersChange={setFilters}
              currentTier={currentTier}
              onUpgrade={onUpgrade}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Map */}
      <div className="h-96 w-full rounded-lg overflow-hidden">
        {viewMode === 'heatmap' && !hasAdvancedAnalytics ? (
          <FeatureTeaser
            currentTier={currentTier}
            requiredTier="premium"
            feature="Heatmap View"
            description="Visualize missing person data with advanced heatmap analytics"
            benefits={[
              'Heat density visualization',
              'Risk area identification', 
              'Pattern recognition',
              'Geographic insights'
            ]}
            onUpgrade={onUpgrade}
            style="overlay"
          >
            <div className="h-96 bg-mission-gray-800 flex items-center justify-center">
              <div className="text-mission-gray-500">Heatmap Visualization</div>
            </div>
          </FeatureTeaser>
        ) : (
          <MapContainer
            center={[39.8283, -98.5795]} // Center of USA
            zoom={4}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <LayersControl position="bottomright">
              <LayersControl.BaseLayer checked name="Dark Mode">
                <TileLayer
                  url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
                />
              </LayersControl.BaseLayer>
              
              {hasAdvancedAnalytics && (
                <LayersControl.BaseLayer name="Satellite">
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  />
                </LayersControl.BaseLayer>
              )}
            </LayersControl>
            
            {/* Individual markers */}
            {viewMode === 'individual' && (
              <LayerGroup>
                {filteredPersons.map((person) => (
                  <Marker
                    key={person.id}
                    position={[person.latitude!, person.longitude!]}
                    icon={getIcon(person)}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={0.9} permanent={false}>
                      <div className="bg-mission-gray-900 text-white p-3 rounded-lg border border-mission-gray-600 min-w-64">
                        <h3 className="font-semibold text-lg mb-2 text-white">{person.name}</h3>
                        <div className="space-y-1 text-sm">
                          <p className="text-mission-gray-300">
                            <strong className="text-white">Case:</strong> {person.caseNumber}
                          </p>
                          <p className="text-mission-gray-300">
                            <strong className="text-white">Age:</strong> {person.age} years
                          </p>
                          <p className="text-mission-gray-300">
                            <strong className="text-white">Location:</strong> {person.location}
                          </p>
                          <p className="text-mission-gray-300">
                            <strong className="text-white">Reported:</strong> {person.reportedMissing}
                          </p>
                          
                          {/* Premium info */}
                          {hasAdvancedAnalytics && (
                            <>
                              <p className="text-mission-gray-300">
                                <strong className="text-white">Gender:</strong> {person.gender}
                              </p>
                              {person.ethnicity && (
                                <p className="text-mission-gray-300">
                                  <strong className="text-white">Ethnicity:</strong> {person.ethnicity}
                                </p>
                              )}
                            </>
                          )}
                          
                          {/* Hero/Champion info */}
                          {['hero', 'champion'].includes(currentTier) && (
                            <>
                              {(person as any).riskLevel && (
                                <p className="text-mission-gray-300">
                                  <strong className="text-white">Risk Level:</strong> 
                                  <span className={cn(
                                    'ml-1 px-2 py-1 rounded text-xs',
                                    (person as any).riskLevel === 'Critical' ? 'bg-red-900 text-red-200' :
                                    (person as any).riskLevel === 'High' ? 'bg-orange-900 text-orange-200' :
                                    (person as any).riskLevel === 'Medium' ? 'bg-yellow-900 text-yellow-200' :
                                    'bg-green-900 text-green-200'
                                  )}>
                                    {(person as any).riskLevel}
                                  </span>
                                </p>
                              )}
                              {person.circumstances && (
                                <p className="text-mission-gray-300">
                                  <strong className="text-white">Circumstances:</strong> {person.circumstances}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        
                        <span className={cn(
                          'inline-block px-2 py-1 text-xs rounded-full mt-2',
                          person.category === 'Missing Children' 
                            ? 'bg-red-900 text-red-200 border border-red-700' 
                            : person.category === 'Missing Veterans'
                            ? 'bg-green-900 text-green-200 border border-green-700'
                            : 'bg-blue-900 text-blue-200 border border-blue-700'
                        )}>
                          {person.category}
                        </span>
                      </div>
                    </Tooltip>
                  </Marker>
                ))}
              </LayerGroup>
            )}

            {/* Clustered markers */}
            {viewMode === 'clustered' && hasClusteringAccess && (
              <LayerGroup>
                {/* Individual markers not in clusters */}
                {filteredPersons
                  .filter(person => !clusters.some(cluster => 
                    cluster.persons.some(p => p.id === person.id)
                  ))
                  .map((person) => (
                    <Marker
                      key={person.id}
                      position={[person.latitude!, person.longitude!]}
                      icon={getIcon(person)}
                    >
                      <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                        <div className="bg-mission-gray-900 text-white p-3 rounded-lg">
                          <h3 className="font-semibold">{person.name}</h3>
                          <p className="text-sm text-mission-gray-300">{person.location}</p>
                        </div>
                      </Tooltip>
                    </Marker>
                  ))}
                
                {/* Cluster markers */}
                {clusters.map((cluster) => (
                  <Marker
                    key={cluster.id}
                    position={[cluster.latitude, cluster.longitude]}
                    icon={createClusterIcon(cluster.count, cluster.category)}
                    eventHandlers={{
                      click: () => setSelectedCluster(cluster)
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -20]} opacity={0.9}>
                      <div className="bg-mission-gray-900 text-white p-3 rounded-lg">
                        <h3 className="font-semibold">{cluster.count} Cases</h3>
                        <p className="text-sm text-mission-gray-300">
                          Click to view details
                        </p>
                      </div>
                    </Tooltip>
                  </Marker>
                ))}
              </LayerGroup>
            )}
          </MapContainer>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
          <span className="text-mission-gray-200">Missing Adults</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <span className="text-mission-gray-200">Missing Children</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span className="text-mission-gray-200">Missing Veterans</span>
        </div>
        
        {['hero', 'champion'].includes(currentTier) && (
          <>
            <div className="ml-4 flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse"></div>
              <span className="text-mission-gray-200">Critical Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <span className="text-mission-gray-200">High Risk</span>
            </div>
          </>
        )}
        
        <div className="ml-auto text-mission-gray-400">
          {filteredPersons.length} of {persons.length} cases shown
        </div>
      </div>

      {/* Cluster Detail Modal */}
      {selectedCluster && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setSelectedCluster(null)}
        >
          <motion.div
            className="bg-mission-gray-900 border border-mission-gray-800 rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">
              {selectedCluster.count} Cases in This Area
            </h3>
            
            <div className="space-y-3">
              {selectedCluster.persons.map((person) => (
                <div key={person.id} className="p-3 bg-mission-gray-800 rounded border-l-4 border-mission-primary">
                  <h4 className="font-semibold text-white">{person.name}</h4>
                  <p className="text-sm text-mission-gray-300">{person.age} years old</p>
                  <p className="text-sm text-mission-gray-400">{person.location}</p>
                  <span className={cn(
                    'inline-block px-2 py-1 text-xs rounded mt-1',
                    person.category === 'Missing Children' ? 'bg-red-900 text-red-200' :
                    person.category === 'Missing Veterans' ? 'bg-green-900 text-green-200' :
                    'bg-blue-900 text-blue-200'
                  )}>
                    {person.category}
                  </span>
                </div>
              ))}
            </div>
            
            <Button
              onClick={() => setSelectedCluster(null)}
              variant="ghost"
              className="w-full mt-4"
            >
              Close
            </Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}