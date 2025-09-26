'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { MissingPerson } from '@/types/missing-person'

interface HeatMapProps {
  persons: MissingPerson[]
  onRegionSelect?: (region: { lat: number; lng: number; count: number; persons: MissingPerson[] }) => void
  className?: string
  width?: number
  height?: number
  intensity?: number
  radius?: number
  gradient?: { [key: number]: string }
}

interface HeatPoint {
  x: number
  y: number
  intensity: number
  persons: MissingPerson[]
}

/**
 * Interactive Heat Map using Canvas API
 * Visualizes missing person density across geographic regions
 * Zero cost solution with high-performance rendering
 */
export default function HeatMapCanvas({
  persons,
  onRegionSelect,
  className = '',
  width = 800,
  height = 600,
  intensity = 1,
  radius = 50,
  gradient = {
    0: 'rgba(0,0,255,0)',
    0.2: 'rgba(0,0,255,0.5)',
    0.4: 'rgba(0,255,255,0.8)',
    0.6: 'rgba(0,255,0,1)',
    0.8: 'rgba(255,255,0,1)',
    1.0: 'rgba(255,0,0,1)'
  }
}: HeatMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredRegion, setHoveredRegion] = useState<{ lat: number; lng: number; count: number; persons: MissingPerson[] } | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<'density' | 'children' | 'adults' | 'recent'>('density')
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)

  // Map bounds (covering Continental US) - wrapped in useMemo
  const mapBounds = useMemo(() => ({
    north: 49.0,
    south: 25.0,
    east: -66.0,
    west: -125.0
  }), [])

  // Convert geographic coordinates to canvas coordinates
  const geoToCanvas = useCallback((lat: number, lng: number) => {
    const x = ((lng - mapBounds.west) / (mapBounds.east - mapBounds.west)) * width
    const y = ((mapBounds.north - lat) / (mapBounds.north - mapBounds.south)) * height
    return { x, y }
  }, [width, height, mapBounds])

  // Convert canvas coordinates to geographic coordinates
  const canvasToGeo = useCallback((x: number, y: number) => {
    const lng = mapBounds.west + (x / width) * (mapBounds.east - mapBounds.west)
    const lat = mapBounds.north - (y / height) * (mapBounds.north - mapBounds.south)
    return { lat, lng }
  }, [width, height, mapBounds])

  // Process data into heat points based on selected metric
  const heatPoints = useMemo(() => {
    const personsWithCoords = persons.filter(p => p.latitude && p.longitude)
    const points: HeatPoint[] = []
    const gridSize = 50 // Grid cell size in pixels

    // Create grid-based clustering
    const grid: { [key: string]: MissingPerson[] } = {}

    personsWithCoords.forEach(person => {
      const canvasCoords = geoToCanvas(person.latitude!, person.longitude!)
      const gridX = Math.floor(canvasCoords.x / gridSize)
      const gridY = Math.floor(canvasCoords.y / gridSize)
      const gridKey = `${gridX},${gridY}`

      if (!grid[gridKey]) {
        grid[gridKey] = []
      }
      grid[gridKey].push(person)
    })

    // Convert grid to heat points
    Object.entries(grid).forEach(([gridKey, gridPersons]) => {
      const [gridX, gridY] = gridKey.split(',').map(Number)
      const centerX = gridX * gridSize + gridSize / 2
      const centerY = gridY * gridSize + gridSize / 2

      let intensity = 0

      switch (selectedMetric) {
        case 'density':
          intensity = gridPersons.length
          break
        case 'children':
          intensity = gridPersons.filter(p => p.category === 'Missing Children').length
          break
        case 'adults':
          intensity = gridPersons.filter(p => p.category === 'Missing Adults').length
          break
        case 'recent':
          const now = new Date()
          const recentThreshold = 365 * 24 * 60 * 60 * 1000 // 1 year
          intensity = gridPersons.filter(p => {
            const date = new Date(p.reportedMissing || p.date)
            return now.getTime() - date.getTime() < recentThreshold
          }).length
          break
      }

      if (intensity > 0) {
        points.push({
          x: centerX,
          y: centerY,
          intensity,
          persons: gridPersons
        })
      }
    })

    return points
  }, [persons, geoToCanvas, selectedMetric])

  // Create gradient for heat map
  const createGradient = useCallback((ctx: CanvasRenderingContext2D) => {
    const gradientCanvas = document.createElement('canvas')
    gradientCanvas.width = 256
    gradientCanvas.height = 1
    
    const gradientCtx = gradientCanvas.getContext('2d')!
    const gradientObj = gradientCtx.createLinearGradient(0, 0, 256, 0)

    Object.entries(gradient).forEach(([stop, color]) => {
      gradientObj.addColorStop(Number(stop), color)
    })

    gradientCtx.fillStyle = gradientObj
    gradientCtx.fillRect(0, 0, 256, 1)

    return gradientCanvas
  }, [gradient])

  // Simplified state boundaries drawing
  const drawStateBoundaries = useCallback((ctx: CanvasRenderingContext2D) => {
    // This would typically load actual state boundary data
    // For now, we'll draw a simple grid representing major regions
    ctx.beginPath()
    
    // Vertical lines (longitude)
    for (let lng = -120; lng <= -70; lng += 10) {
      const { x } = geoToCanvas(40, lng) // Use center latitude
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
    }
    
    // Horizontal lines (latitude)  
    for (let lat = 30; lat <= 45; lat += 5) {
      const { y } = geoToCanvas(lat, -95) // Use center longitude
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    }
    
    ctx.stroke()
  }, [geoToCanvas, height, width])

  // Render heat map
  const renderHeatMap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    const devicePixelRatio = window.devicePixelRatio || 1

    // Set canvas size accounting for device pixel ratio
    canvas.width = width * devicePixelRatio
    canvas.height = height * devicePixelRatio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(devicePixelRatio, devicePixelRatio)

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    if (heatPoints.length === 0) return

    // Create shadow canvas for intensity calculation
    const shadowCanvas = document.createElement('canvas')
    shadowCanvas.width = width
    shadowCanvas.height = height
    const shadowCtx = shadowCanvas.getContext('2d')!

    // Find max intensity for normalization
    const maxIntensity = Math.max(...heatPoints.map(p => p.intensity))

    // Draw heat points on shadow canvas
    heatPoints.forEach(point => {
      const normalizedIntensity = point.intensity / maxIntensity
      const alpha = normalizedIntensity * intensity

      shadowCtx.globalAlpha = alpha
      shadowCtx.beginPath()
      
      // Create radial gradient for each point
      const gradient = shadowCtx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, radius
      )
      gradient.addColorStop(0, 'rgba(0,0,0,1)')
      gradient.addColorStop(1, 'rgba(0,0,0,0)')
      
      shadowCtx.fillStyle = gradient
      shadowCtx.arc(point.x, point.y, radius, 0, Math.PI * 2)
      shadowCtx.fill()
    })

    // Get shadow canvas image data
    const imageData = shadowCtx.getImageData(0, 0, width, height)
    const data = imageData.data

    // Create gradient lookup
    const gradientCanvas = createGradient(ctx)
    const gradientData = gradientCanvas.getContext('2d')!.getImageData(0, 0, 256, 1).data

    // Apply gradient to heat map
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]
      if (alpha > 0) {
        const gradientIndex = Math.floor(alpha * 255 / 255) * 4
        data[i] = gradientData[gradientIndex] // R
        data[i + 1] = gradientData[gradientIndex + 1] // G
        data[i + 2] = gradientData[gradientIndex + 2] // B
        data[i + 3] = gradientData[gradientIndex + 3] // A
      }
    }

    // Draw final heat map
    ctx.putImageData(imageData, 0, 0)

    // Add US state boundaries (simplified)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    drawStateBoundaries(ctx)

  }, [width, height, heatPoints, intensity, radius, createGradient, drawStateBoundaries])

  // Handle mouse interactions
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setMousePosition({ x, y })

    // Find nearby heat points
    const nearbyPoints = heatPoints.filter(point => {
      const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2)
      return distance <= radius
    })

    if (nearbyPoints.length > 0) {
      // Combine nearby points
      const combinedPersons = nearbyPoints.reduce((acc, point) => acc.concat(point.persons), [] as MissingPerson[])
      const { lat, lng } = canvasToGeo(x, y)
      
      setHoveredRegion({
        lat,
        lng,
        count: combinedPersons.length,
        persons: combinedPersons
      })
    } else {
      setHoveredRegion(null)
    }
  }, [heatPoints, radius, canvasToGeo])

  const handleMouseLeave = useCallback(() => {
    setHoveredRegion(null)
    setMousePosition(null)
  }, [])

  const handleClick = useCallback(() => {
    if (hoveredRegion && onRegionSelect) {
      onRegionSelect(hoveredRegion)
    }
  }, [hoveredRegion, onRegionSelect])

  // Render heat map when data changes
  useEffect(() => {
    renderHeatMap()
  }, [renderHeatMap])

  return (
    <div className={`relative ${className}`}>
      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        className="cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      {/* Controls */}
      <div className="absolute top-4 left-4 bg-black/80 rounded-lg p-3 text-white">
        <h3 className="text-sm font-semibold mb-2">Heat Map Mode</h3>
        <div className="space-y-2">
          <label className="block">
            <input
              type="radio"
              name="metric"
              value="density"
              checked={selectedMetric === 'density'}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="mr-2"
            />
            <span className="text-xs">Overall Density</span>
          </label>
          <label className="block">
            <input
              type="radio"
              name="metric"
              value="children"
              checked={selectedMetric === 'children'}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="mr-2"
            />
            <span className="text-xs">Missing Children</span>
          </label>
          <label className="block">
            <input
              type="radio"
              name="metric"
              value="adults"
              checked={selectedMetric === 'adults'}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="mr-2"
            />
            <span className="text-xs">Missing Adults</span>
          </label>
          <label className="block">
            <input
              type="radio"
              name="metric"
              value="recent"
              checked={selectedMetric === 'recent'}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="mr-2"
            />
            <span className="text-xs">Recent Cases</span>
          </label>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-black/80 rounded-lg p-3 text-white">
        <h3 className="text-sm font-semibold mb-2">Intensity</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs">Low</span>
          <div 
            className="w-20 h-4 rounded"
            style={{
              background: 'linear-gradient(to right, rgba(0,0,255,0.5), rgba(0,255,255,0.8), rgba(0,255,0,1), rgba(255,255,0,1), rgba(255,0,0,1))'
            }}
          />
          <span className="text-xs">High</span>
        </div>
        <div className="text-xs text-gray-300 mt-1">
          {heatPoints.length} regions • {persons.filter(p => p.latitude && p.longitude).length} cases
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredRegion && mousePosition && (
        <div
          className="absolute bg-black/90 text-white p-3 rounded-lg shadow-lg pointer-events-none z-10 min-w-48"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
            transform: mousePosition.x > width - 200 ? 'translateX(-100%)' : undefined
          }}
        >
          <div className="text-sm font-semibold mb-1">
            {hoveredRegion.count} Missing Person{hoveredRegion.count !== 1 ? 's' : ''}
          </div>
          <div className="text-xs space-y-1">
            <div>📍 {hoveredRegion.lat.toFixed(2)}°, {hoveredRegion.lng.toFixed(2)}°</div>
            
            {/* Category breakdown */}
            <div className="pt-1 border-t border-gray-700">
              {(() => {
                const children = hoveredRegion.persons.filter(p => p.category === 'Missing Children').length
                const adults = hoveredRegion.persons.filter(p => p.category === 'Missing Adults').length
                const veterans = hoveredRegion.persons.filter(p => p.category === 'Missing Veterans').length
                
                return (
                  <>
                    {children > 0 && <div className="text-red-300">👶 {children} children</div>}
                    {adults > 0 && <div className="text-blue-300">👤 {adults} adults</div>}
                    {veterans > 0 && <div className="text-yellow-300">🎖️ {veterans} veterans</div>}
                  </>
                )
              })()}
            </div>
            
            <div className="text-gray-400 text-xs pt-1">Click to view details</div>
          </div>
        </div>
      )}

      {/* Performance indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 right-4 bg-black/80 rounded px-2 py-1 text-xs text-gray-300">
          Canvas: {width}×{height} • Points: {heatPoints.length}
        </div>
      )}
    </div>
  )
}