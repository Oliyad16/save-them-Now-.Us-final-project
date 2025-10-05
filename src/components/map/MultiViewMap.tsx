'use client'

import React, { useState, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MissingPerson } from '@/types/missing-person'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface MultiViewMapProps {
  persons: MissingPerson[]
  onPersonSelect?: (person: MissingPerson) => void
  className?: string
}

type MapView = 'standard' | 'heatmap' | 'cluster'

interface ClusterZone {
  lat: number
  lng: number
  count: number
  radius: number
  color: string
  opacity: number
  gradient: string
  persons: MissingPerson[]
}

export default function MultiViewMap({
  persons,
  onPersonSelect,
  className = ''
}: MultiViewMapProps) {
  const [activeView, setActiveView] = useState<MapView>('standard')

  // Filter persons with valid coordinates
  const personsWithCoords = useMemo(() => {
    return persons.filter(p =>
      p.latitude &&
      p.longitude &&
      !isNaN(p.latitude) &&
      !isNaN(p.longitude) &&
      p.latitude >= -90 &&
      p.latitude <= 90 &&
      p.longitude >= -180 &&
      p.longitude <= 180
    )
  }, [persons])

  // Calculate map center
  const mapCenter = useMemo((): [number, number] => {
    if (personsWithCoords.length === 0) {
      return [39.8283, -98.5795] // Center of USA
    }

    const avgLat = personsWithCoords.reduce((sum, p) => sum + (p.latitude || 0), 0) / personsWithCoords.length
    const avgLng = personsWithCoords.reduce((sum, p) => sum + (p.longitude || 0), 0) / personsWithCoords.length

    return [avgLat, avgLng]
  }, [personsWithCoords])

  // Calculate beautiful cluster zones
  const clusterZones = useMemo((): ClusterZone[] => {
    if (personsWithCoords.length === 0) return []

    const gridSize = 0.7 // degrees (about 50 miles) for better clustering
    const zones = new Map<string, ClusterZone>()

    personsWithCoords.forEach(person => {
      const gridLat = Math.floor(person.latitude! / gridSize) * gridSize
      const gridLng = Math.floor(person.longitude! / gridSize) * gridSize
      const key = `${gridLat},${gridLng}`

      if (zones.has(key)) {
        const zone = zones.get(key)!
        zone.count++
        zone.persons.push(person)
      } else {
        zones.set(key, {
          lat: gridLat + gridSize / 2,
          lng: gridLng + gridSize / 2,
          count: 1,
          radius: 25000,
          color: '#3b82f6',
          opacity: 0.4,
          gradient: 'blue-purple',
          persons: [person]
        })
      }
    })

    // Create beautiful gradient clusters
    const counts = Array.from(zones.values()).map(z => z.count)
    const maxCount = Math.max(...counts)

    return Array.from(zones.values())
      .filter(zone => zone.count >= 1) // Show all clusters
      .map(zone => {
        const intensity = zone.count / maxCount

        // Beautiful color gradients based on size
        let color = '#3b82f6' // blue
        let gradient = 'blue-purple'

        if (zone.count >= 100) {
          color = '#ec4899' // pink
          gradient = 'pink-purple'
        } else if (zone.count >= 50) {
          color = '#8b5cf6' // purple
          gradient = 'purple-indigo'
        } else if (zone.count >= 25) {
          color = '#6366f1' // indigo
          gradient = 'indigo-blue'
        } else if (zone.count >= 10) {
          color = '#3b82f6' // blue
          gradient = 'blue-cyan'
        } else {
          color = '#06b6d4' // cyan
          gradient = 'cyan-teal'
        }

        return {
          ...zone,
          color,
          gradient,
          opacity: 0.2 + (intensity * 0.3), // 0.2 to 0.5 opacity - more transparent
          radius: 8000 + (Math.log(zone.count + 1) * 4000) // Much smaller: 8km to ~25km max
        }
      })
      .sort((a, b) => a.count - b.count) // Show smallest on top (better visibility)
  }, [personsWithCoords])

  // Get color based on category
  const getMarkerColor = (category: string): string => {
    if (category?.includes('Children')) return '#ef4444' // Red for children
    if (category?.includes('Veterans')) return '#f59e0b' // Orange for veterans
    return '#3b82f6' // Blue for adults
  }

  const markerRadius = 6

  return (
    <div className={`relative ${className}`}>
      {/* View Toggle Buttons */}
      <div className="absolute top-4 left-4 z-[500] flex gap-2">
        <button
          onClick={() => setActiveView('standard')}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 backdrop-blur-sm ${
            activeView === 'standard'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-black/60 text-gray-300 hover:bg-black/80'
          }`}
        >
          📍 Standard View
        </button>
        <button
          onClick={() => setActiveView('heatmap')}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 backdrop-blur-sm ${
            activeView === 'heatmap'
              ? 'bg-orange-600 text-white shadow-lg'
              : 'bg-black/60 text-gray-300 hover:bg-black/80'
          }`}
        >
          🔥 Heat Map
        </button>
        <button
          onClick={() => setActiveView('cluster')}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 backdrop-blur-sm ${
            activeView === 'cluster'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-black/60 text-gray-300 hover:bg-black/80'
          }`}
        >
          🔮 Cluster View
        </button>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={5}
        style={{
          height: '600px',
          width: '100%',
          borderRadius: '12px',
          zIndex: 1
        }}
        scrollWheelZoom={true}
        className="missing-persons-map"
      >
        {/* Dark theme map tiles - using CartoDB Dark Matter (free, no auth) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={20}
        />

        {/* STANDARD VIEW - Individual markers */}
        {activeView === 'standard' && personsWithCoords.map((person) => (
          <CircleMarker
            key={`marker-${person.id}`}
            center={[person.latitude!, person.longitude!]}
            radius={markerRadius}
            pathOptions={{
              fillColor: getMarkerColor(person.category),
              fillOpacity: 0.9,
              color: '#000000',
              weight: 1.5,
              opacity: 0.8
            }}
            eventHandlers={{
              click: () => onPersonSelect?.(person),
              mouseover: (e) => {
                const marker = e.target
                marker.setStyle({
                  fillOpacity: 1,
                  weight: 2,
                  color: '#ffffff',
                  radius: markerRadius + 2
                })
              },
              mouseout: (e) => {
                const marker = e.target
                marker.setStyle({
                  fillOpacity: 0.9,
                  weight: 1.5,
                  color: '#000000',
                  radius: markerRadius
                })
              }
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -10]}
              opacity={0.95}
              className="custom-tooltip"
            >
              <div className="text-sm">
                <div className="font-bold text-white mb-1">{person.name}</div>
                {person.age && (
                  <div className="text-gray-200 text-xs">Age: {person.age}</div>
                )}
                <div className="text-gray-200 text-xs">{person.location}</div>
                <div className="text-gray-300 text-xs mt-1">
                  {person.reportedMissing || person.date}
                </div>
                <div className="text-blue-300 text-xs mt-1 font-medium">
                  Click for details →
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* HEATMAP VIEW - Smaller dots with intensity */}
        {activeView === 'heatmap' && personsWithCoords.map((person) => (
          <CircleMarker
            key={`heat-${person.id}`}
            center={[person.latitude!, person.longitude!]}
            radius={4}
            pathOptions={{
              fillColor: '#ef4444',
              fillOpacity: 0.6,
              color: '#7f1d1d',
              weight: 1,
              opacity: 0.8
            }}
            eventHandlers={{
              click: () => onPersonSelect?.(person)
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -5]}
              opacity={0.95}
            >
              <div className="text-xs">
                <div className="font-bold text-white">{person.name}</div>
                <div className="text-gray-200">{person.location}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* CLUSTER VIEW - Beautiful gradient bubbles */}
        {activeView === 'cluster' && (
          <>
            {clusterZones.map((zone, index) => {
              const getSizeLabel = (count: number) => {
                if (count >= 100) return 'Very Large'
                if (count >= 50) return 'Large'
                if (count >= 25) return 'Medium'
                if (count >= 10) return 'Small'
                return 'Minimal'
              }

              return (
                <React.Fragment key={`cluster-${index}`}>
                  {/* Outer soft glow - much smaller */}
                  <Circle
                    center={[zone.lat, zone.lng]}
                    radius={zone.radius * 1.2}
                    pathOptions={{
                      fillColor: zone.color,
                      fillOpacity: 0.05,
                      color: 'transparent',
                      weight: 0
                    }}
                    className="cluster-glow"
                  />
                  {/* Main cluster bubble - reduced size */}
                  <Circle
                    center={[zone.lat, zone.lng]}
                    radius={zone.radius}
                    pathOptions={{
                      fillColor: zone.color,
                      fillOpacity: zone.opacity,
                      color: '#ffffff',
                      weight: 1.5,
                      opacity: 0.8
                    }}
                    eventHandlers={{
                      mouseover: (e) => {
                        e.target.setStyle({
                          fillOpacity: zone.opacity + 0.2,
                          weight: 3
                        })
                      },
                      mouseout: (e) => {
                        e.target.setStyle({
                          fillOpacity: zone.opacity,
                          weight: 2
                        })
                      }
                    }}
                  >
                    <Tooltip permanent direction="center" className="cluster-tooltip-small">
                      <div className="text-center">
                        <div className="font-bold text-base" style={{ color: zone.color, filter: 'brightness(1.5)' }}>
                          {zone.count}
                        </div>
                      </div>
                    </Tooltip>
                  </Circle>
                </React.Fragment>
              )
            })}
          </>
        )}
      </MapContainer>

      {/* Stats overlay */}
      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg z-[400] border border-gray-700">
        <div className="text-sm font-semibold">
          {personsWithCoords.length.toLocaleString()} cases displayed
        </div>
        {personsWithCoords.length !== persons.length && (
          <div className="text-xs text-gray-400 mt-1">
            {persons.length - personsWithCoords.length} cases without coordinates
          </div>
        )}
        <div className="text-xs text-gray-500 mt-1">
          View: {activeView === 'standard' ? 'Standard' : activeView === 'heatmap' ? 'Heat Map' : 'Cluster'}
        </div>
      </div>

      {/* Legend - changes based on view */}
      {activeView === 'standard' && (
        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white px-4 py-3 rounded-lg z-[400] border border-gray-700">
          <div className="text-xs font-bold mb-2">Legend</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ef4444] border border-black"></div>
              <span>Children</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#f59e0b] border border-black"></div>
              <span>Veterans</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#3b82f6] border border-black"></div>
              <span>Adults</span>
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
            Hover over markers for details
          </div>
        </div>
      )}

      {activeView === 'heatmap' && (
        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white px-4 py-3 rounded-lg z-[400] border border-gray-700">
          <div className="text-xs font-bold mb-2">Heat Map</div>
          <div className="text-xs text-gray-300 leading-relaxed">
            Shows concentration of missing persons cases. Brighter areas indicate higher case density.
          </div>
        </div>
      )}

      {activeView === 'cluster' && (
        <div className="absolute top-4 right-4 bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-md text-white px-4 py-3 rounded-xl z-[400] border border-purple-500/30 shadow-2xl">
          <div className="text-sm font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            🔮 Cluster Sizes
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 border-2 border-white/50 shadow-lg"></div>
              <span className="font-medium">Very Large (100+ cases)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 border-2 border-white/50"></div>
              <span className="font-medium">Large (50-99 cases)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-blue-600 border-2 border-white/50"></div>
              <span>Medium (25-49 cases)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600 border-2 border-white/50"></div>
              <span>Small (10-24 cases)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-teal-600 border-2 border-white/50"></div>
              <span>Minimal (&lt;10 cases)</span>
            </div>
          </div>
          <div className="text-[10px] text-purple-200/80 mt-3 pt-2 border-t border-purple-500/30">
            Bubble size represents case concentration
          </div>
        </div>
      )}

      {/* Loading overlay if no data */}
      {persons.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg z-[500]">
          <div className="text-white text-center">
            <div className="text-lg font-semibold mb-2">Loading map data...</div>
            <div className="text-sm text-gray-400">Please wait while we fetch missing persons data</div>
          </div>
        </div>
      )}

      {/* No coordinates warning */}
      {persons.length > 0 && personsWithCoords.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg z-[500]">
          <div className="text-white text-center max-w-md">
            <div className="text-4xl mb-4">📍</div>
            <div className="text-lg font-semibold mb-2">No Location Data Available</div>
            <div className="text-sm text-gray-400">
              The {persons.length} cases loaded do not have geographic coordinates.
              This may be a data issue.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
