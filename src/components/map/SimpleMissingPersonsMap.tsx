'use client'

import React, { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
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

interface SimpleMissingPersonsMapProps {
  persons: MissingPerson[]
  onPersonSelect?: (person: MissingPerson) => void
  className?: string
}

export default function SimpleMissingPersonsMap({
  persons,
  onPersonSelect,
  className = ''
}: SimpleMissingPersonsMapProps) {

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

  // Get color based on category
  const getMarkerColor = (category: string): string => {
    if (category?.includes('Children')) return '#ef4444' // Red for children
    if (category?.includes('Veterans')) return '#f59e0b' // Orange for veterans
    return '#3b82f6' // Blue for adults
  }

  // Get radius based on zoom (we'll use a fixed size for now)
  const markerRadius = 6

  return (
    <div className={`relative ${className}`}>
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
        {/* Dark theme map - CartoDB Dark Matter (free, no auth) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={20}
        />

        {/* Render markers for all persons with coordinates */}
        {personsWithCoords.map((person) => (
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
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white px-4 py-3 rounded-lg z-[400] border border-gray-700">
        <div className="text-xs font-bold mb-2">Legend</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
            <span>Children</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
            <span>Veterans</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div>
            <span>Adults</span>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
          Hover over markers for details
        </div>
      </div>

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
