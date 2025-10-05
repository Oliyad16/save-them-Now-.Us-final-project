'use client'

import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface RiskArea {
  id: number
  state: string
  city: string
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  childrenAtRisk: number
  womenAtRisk: number
  totalCases: number
  riskFactors: string[]
  latitude: number
  longitude: number
}

interface Props {
  riskAreas: RiskArea[]
}

// Custom risk level icons
const createRiskIcon = (level: string, size: number = 20) => {
  const colors = {
    HIGH: '#ef4444',
    MEDIUM: '#f59e0b', 
    LOW: '#22c55e'
  }
  
  const color = colors[level as keyof typeof colors] || '#6b7280'
  
  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid #1a1a1a;
        box-shadow: 0 0 10px ${color}50;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 10px;
      ">
        ${level[0]}
      </div>
    `,
    className: 'risk-marker',
    iconSize: [size + 6, size + 6],
    iconAnchor: [(size + 6) / 2, (size + 6) / 2]
  })
}

export default function RiskAnalysisMap({ riskAreas }: Props) {
  // Calculate circle radius based on total cases
  const getCircleRadius = (totalCases: number) => {
    return Math.max(15000, totalCases * 300) // Minimum 15km, scales with cases
  }
  
  // Get circle color and opacity based on risk level
  const getCircleStyle = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH':
        return { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, opacity: 0.6 }
      case 'MEDIUM':
        return { color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.08, opacity: 0.5 }
      case 'LOW':
        return { color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.06, opacity: 0.4 }
      default:
        return { color: '#6b7280', fillColor: '#6b7280', fillOpacity: 0.05, opacity: 0.3 }
    }
  }

  const riskAreasWithCoords = useMemo(() => 
    riskAreas.filter(area => area.latitude && area.longitude), 
    [riskAreas]
  )

  return (
    <div className="h-96 w-full">
      <MapContainer
        key="risk-analysis-map"
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
        
        {riskAreasWithCoords.map((area) => {
          const circleStyle = getCircleStyle(area.riskLevel)
          
          return (
            <div key={area.id}>
              {/* Risk area circle */}
              <Circle
                center={[area.latitude, area.longitude]}
                radius={getCircleRadius(area.totalCases)}
                {...circleStyle}
              />
              
              {/* Risk marker */}
              <Marker
                position={[area.latitude, area.longitude]}
                icon={createRiskIcon(area.riskLevel, area.riskLevel === 'HIGH' ? 24 : 20)}
              >
                <Tooltip direction="top" offset={[0, -15]} opacity={0.95}>
                  <div className="bg-gray-900 text-white p-4 rounded-lg border border-gray-600 min-w-72">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-white">{area.city}, {area.state}</h3>
                      <span className={`px-2 py-1 text-xs font-bold rounded ${
                        area.riskLevel === 'HIGH' ? 'bg-red-900 text-red-200' :
                        area.riskLevel === 'MEDIUM' ? 'bg-yellow-900 text-yellow-200' :
                        'bg-green-900 text-green-200'
                      }`}>
                        {area.riskLevel} RISK
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-300">
                          <strong className="text-pink-400">Women at Risk:</strong> {area.womenAtRisk}
                        </p>
                        <p className="text-sm text-gray-300">
                          <strong className="text-blue-400">Children at Risk:</strong> {area.childrenAtRisk}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{area.totalCases}</div>
                        <div className="text-xs text-gray-400">Total Cases</div>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold text-gray-200 mb-2">Key Risk Factors:</p>
                      <div className="flex flex-wrap gap-1">
                        {area.riskFactors.slice(0, 3).map((factor, index) => (
                          <span
                            key={index}
                            className="bg-gray-800 text-gray-300 px-2 py-1 text-xs rounded"
                          >
                            {factor}
                          </span>
                        ))}
                        {area.riskFactors.length > 3 && (
                          <span className="bg-gray-800 text-gray-300 px-2 py-1 text-xs rounded">
                            +{area.riskFactors.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Tooltip>
              </Marker>
            </div>
          )
        })}
      </MapContainer>
      
      {/* Map Legend */}
      <div className="mt-4 flex flex-wrap gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full border border-gray-600"></div>
          <span className="text-gray-200">High Risk Areas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded-full border border-gray-600"></div>
          <span className="text-gray-200">Medium Risk Areas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full border border-gray-600"></div>
          <span className="text-gray-200">Lower Risk Areas</span>
        </div>
        <div className="ml-auto text-gray-400">
          AI Analysis: {riskAreasWithCoords.length} risk zones identified
        </div>
      </div>
    </div>
  )
}