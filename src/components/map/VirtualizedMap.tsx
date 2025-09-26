'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { MissingPerson } from '@/types/missing-person'

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface VirtualizedMapProps {
  persons: MissingPerson[]
  onPersonSelect?: (person: MissingPerson) => void
  className?: string
  maxMarkers?: number // Maximum markers to render at once
  clusterDistance?: number // Distance threshold for clustering
}

interface ViewBounds {
  north: number
  south: number
  east: number
  west: number
  zoom: number
}

interface MarkerCluster {
  id: string
  lat: number
  lng: number
  count: number
  persons: MissingPerson[]
}

// Custom hook for map bounds and zoom
function useMapBounds() {
  const [bounds, setBounds] = useState<ViewBounds | null>(null)
  const map = useMap()

  const updateBounds = useCallback(() => {
    const mapBounds = map.getBounds()
    const zoom = map.getZoom()
    
    setBounds({
      north: mapBounds.getNorth(),
      south: mapBounds.getSouth(),
      east: mapBounds.getEast(),
      west: mapBounds.getWest(),
      zoom
    })
  }, [map])

  useMapEvents({
    moveend: updateBounds,
    zoomend: updateBounds,
  })

  useEffect(() => {
    updateBounds()
  }, [updateBounds])

  return bounds
}

// Virtualized marker renderer
function VirtualizedMarkers({ 
  persons, 
  onPersonSelect, 
  maxMarkers = 500,
  clusterDistance = 0.01 
}: {
  persons: MissingPerson[]
  onPersonSelect?: (person: MissingPerson) => void
  maxMarkers: number
  clusterDistance: number
}) {
  const bounds = useMapBounds()
  const map = useMap()

  // Memoized calculation of visible and clustered markers
  const { visibleMarkers, clusters } = useMemo(() => {
    if (!bounds || persons.length === 0) {
      return { visibleMarkers: [], clusters: [] }
    }

    // Filter persons within current view bounds with some padding
    const padding = 0.01 // Add padding to include markers just outside view
    const visiblePersons = persons.filter(person => {
      if (!person.latitude || !person.longitude) return false
      
      return person.latitude >= bounds.south - padding &&
             person.latitude <= bounds.north + padding &&
             person.longitude >= bounds.west - padding &&
             person.longitude <= bounds.east + padding
    })

    // If we're zoomed out or have too many markers, cluster them
    const shouldCluster = bounds.zoom < 10 || visiblePersons.length > maxMarkers

    if (!shouldCluster) {
      return { 
        visibleMarkers: visiblePersons.slice(0, maxMarkers), 
        clusters: [] 
      }
    }

    // Simple clustering algorithm
    const clusters: MarkerCluster[] = []
    const processed = new Set<number>()

    visiblePersons.forEach((person, index) => {
      if (processed.has(index) || !person.latitude || !person.longitude) return

      const cluster: MarkerCluster = {
        id: `cluster-${clusters.length}`,
        lat: person.latitude,
        lng: person.longitude,
        count: 1,
        persons: [person]
      }

      // Find nearby persons to cluster
      visiblePersons.forEach((otherPerson, otherIndex) => {
        if (index === otherIndex || processed.has(otherIndex)) return
        if (!otherPerson.latitude || !otherPerson.longitude) return

        const distance = Math.sqrt(
          Math.pow(person.latitude! - otherPerson.latitude, 2) +
          Math.pow(person.longitude! - otherPerson.longitude, 2)
        )

        if (distance < clusterDistance) {
          cluster.persons.push(otherPerson)
          cluster.count++
          processed.add(otherIndex)
          
          // Update cluster center (simple average)
          cluster.lat = (cluster.lat + otherPerson.latitude) / 2
          cluster.lng = (cluster.lng + otherPerson.longitude) / 2
        }
      })

      processed.add(index)
      clusters.push(cluster)
    })

    return { 
      visibleMarkers: [], 
      clusters: clusters.slice(0, maxMarkers) 
    }
  }, [bounds, persons, maxMarkers, clusterDistance])

  // Custom cluster icon
  const createClusterIcon = useCallback((count: number) => {
    const size = Math.min(50, 20 + count * 2)
    return L.divIcon({
      html: `<div class="cluster-marker" style="
        width: ${size}px;
        height: ${size}px;
        background: rgba(220, 38, 127, 0.8);
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${Math.min(16, 10 + count)}px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      ">${count}</div>`,
      className: 'custom-cluster-icon',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    })
  }, [])

  // Custom missing person icon
  const createPersonIcon = useCallback((category: string) => {
    const color = category === 'Missing Children' ? '#ef4444' : 
                  category === 'Missing Veterans' ? '#f59e0b' : '#3b82f6'
    
    return L.divIcon({
      html: `<div class="person-marker" style="
        width: 24px;
        height: 24px;
        background: ${color};
        border: 2px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>`,
      className: 'custom-person-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })
  }, [])

  return (
    <>
      {/* Render individual markers */}
      {visibleMarkers.map((person) => (
        <Marker
          key={`person-${person.id}`}
          position={[person.latitude!, person.longitude!]}
          icon={createPersonIcon(person.category)}
          eventHandlers={{
            click: () => onPersonSelect?.(person)
          }}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <h3 className="font-semibold text-lg mb-2">{person.name}</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Age:</strong> {person.age || 'Unknown'}</p>
                <p><strong>Location:</strong> {person.location}</p>
                <p><strong>Date Missing:</strong> {person.reportedMissing}</p>
                <p><strong>Category:</strong> {person.category}</p>
              </div>
              <div className="mt-3 pt-2 border-t">
                <button 
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  onClick={() => onPersonSelect?.(person)}
                >
                  View Full Details →
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Render clusters */}
      {clusters.map((cluster) => (
        <Marker
          key={cluster.id}
          position={[cluster.lat, cluster.lng]}
          icon={createClusterIcon(cluster.count)}
          eventHandlers={{
            click: () => {
              // Zoom in to show individual markers
              const group = new (L as any).featureGroup(
                cluster.persons
                  .filter(p => p.latitude && p.longitude)
                  .map(p => (L as any).marker([p.latitude!, p.longitude!]))
              )
              map.fitBounds(group.getBounds(), { padding: [20, 20] })
            }
          }}
        >
          <Popup>
            <div className="p-3">
              <h3 className="font-semibold text-lg mb-2">
                {cluster.count} Missing Persons
              </h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {cluster.persons.slice(0, 5).map((person) => (
                  <div key={person.id} className="text-sm py-1 border-b last:border-b-0">
                    <div className="font-medium">{person.name}</div>
                    <div className="text-gray-600">{person.location}</div>
                  </div>
                ))}
                {cluster.persons.length > 5 && (
                  <div className="text-sm text-gray-500 italic">
                    ...and {cluster.persons.length - 5} more
                  </div>
                )}
              </div>
              <div className="mt-2 pt-2 border-t">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Click to zoom in and see individual cases
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  )
}

// Performance monitoring component
function MapPerformanceMonitor() {
  const [renderTime, setRenderTime] = useState<number>(0)
  const [markerCount, setMarkerCount] = useState<number>(0)
  const startTime = useRef<number>(0)

  useEffect(() => {
    startTime.current = performance.now()
    
    const observer = new MutationObserver(() => {
      const endTime = performance.now()
      setRenderTime(endTime - startTime.current)
      
      // Count visible markers
      const markers = document.querySelectorAll('.leaflet-marker-icon')
      setMarkerCount(markers.length)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    return () => observer.disconnect()
  }, [])

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="absolute top-2 right-2 z-[1000] bg-black bg-opacity-75 text-white p-2 rounded text-xs">
      <div>Render: {renderTime.toFixed(1)}ms</div>
      <div>Markers: {markerCount}</div>
    </div>
  )
}

export default function VirtualizedMap({
  persons,
  onPersonSelect,
  className = '',
  maxMarkers = 500,
  clusterDistance = 0.01
}: VirtualizedMapProps) {
  // Calculate map center based on persons with coordinates
  const mapCenter = useMemo(() => {
    const personsWithCoords = persons.filter(p => p.latitude && p.longitude)
    
    if (personsWithCoords.length === 0) {
      return [39.8283, -98.5795] // Center of US
    }

    const avgLat = personsWithCoords.reduce((sum, p) => sum + p.latitude!, 0) / personsWithCoords.length
    const avgLng = personsWithCoords.reduce((sum, p) => sum + p.longitude!, 0) / personsWithCoords.length

    return [avgLat, avgLng]
  }, [persons])

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={mapCenter as [number, number]}
        zoom={5}
        style={{ height: '600px', width: '100%' }}
        className="rounded-lg"
        maxZoom={18}
        minZoom={3}
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />
        
        <VirtualizedMarkers
          persons={persons}
          onPersonSelect={onPersonSelect}
          maxMarkers={maxMarkers}
          clusterDistance={clusterDistance}
        />

        <MapPerformanceMonitor />
      </MapContainer>

      {/* Map statistics overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-black bg-opacity-75 text-white px-3 py-2 rounded">
        <div className="text-sm">
          <span className="font-semibold">{persons.length.toLocaleString()}</span> total cases
        </div>
        <div className="text-xs text-gray-300">
          Virtualized for performance
        </div>
      </div>
    </div>
  )
}