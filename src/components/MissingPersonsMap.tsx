'use client'

import { useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MissingPerson } from '@/types/missing-person'

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom dot icons for different categories - more subtle for dark map
const createDotIcon = (color: string, opacity: number = 0.8) => {
  return L.divIcon({
    html: `<div style="
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: ${color};
      opacity: ${opacity};
      box-shadow: 0 0 4px rgba(255,255,255,0.3);
      transition: all 0.2s ease;
      cursor: pointer;
    " class="hover-dot"></div>`,
    className: 'custom-dot-marker',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  })
}

const adultIcon = createDotIcon('#60a5fa') // Lighter blue
const childIcon = createDotIcon('#f87171') // Lighter red  
const veteranIcon = createDotIcon('#4ade80') // Lighter green

interface Props {
  persons: MissingPerson[]
}

export default function MissingPersonsMap({ persons }: Props) {
  const getIcon = (category: string) => {
    switch (category) {
      case 'Missing Children':
        return childIcon
      case 'Missing Veterans':
        return veteranIcon
      default:
        return adultIcon
    }
  }

  // Filter persons that have coordinates
  const personsWithCoords = useMemo(() => 
    persons.filter(p => p.latitude && p.longitude), 
    [persons]
  )

  return (
    <div className="h-96 w-full">
      <MapContainer
        key="missing-persons-map"
        center={[39.8283, -98.5795]} // Center of USA
        zoom={4}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={20}
        />
        
        {personsWithCoords.map((person) => (
          <Marker
            key={person.id}
            position={[person.latitude!, person.longitude!]}
            icon={getIcon(person.category)}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.9} permanent={false}>
              <div className="bg-gray-900 text-white p-3 rounded-lg border border-gray-600 min-w-64">
                <h3 className="font-semibold text-lg mb-2 text-white">{person.name}</h3>
                <p className="text-sm text-gray-300 mb-1">
                  <strong className="text-white">Case:</strong> {person.caseNumber}
                </p>
                <p className="text-sm text-gray-300 mb-1">
                  <strong className="text-white">Age:</strong> {person.age} years
                </p>
                <p className="text-sm text-gray-300 mb-1">
                  <strong className="text-white">Gender:</strong> {person.gender}
                </p>
                <p className="text-sm text-gray-300 mb-1">
                  <strong className="text-white">Location:</strong> {person.location}
                </p>
                <p className="text-sm text-gray-300 mb-2">
                  <strong className="text-white">Reported:</strong> {person.reportedMissing}
                </p>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                  person.category === 'Missing Children' 
                    ? 'bg-red-900 text-red-200 border border-red-700' 
                    : person.category === 'Missing Veterans'
                    ? 'bg-green-900 text-green-200 border border-green-700'
                    : 'bg-blue-900 text-blue-200 border border-blue-700'
                }`}>
                  {person.category}
                </span>
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
      
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full border border-gray-600"></div>
          <span className="text-gray-200">Missing Adults</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full border border-gray-600"></div>
          <span className="text-gray-200">Missing Children</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full border border-gray-600"></div>
          <span className="text-gray-200">Missing Veterans</span>
        </div>
        <div className="ml-auto text-gray-400">
          {personsWithCoords.length} of {persons.length} cases with location data
        </div>
      </div>
    </div>
  )
}