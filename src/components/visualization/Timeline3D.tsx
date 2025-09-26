'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { MissingPerson } from '@/types/missing-person'

interface Timeline3DProps {
  persons: MissingPerson[]
  onPersonSelect?: (person: MissingPerson) => void
  className?: string
  height?: number
  perspective?: number
}

interface TimelineEvent {
  id: string
  date: Date
  person: MissingPerson
  x: number
  y: number
  z: number
  category: 'children' | 'adults' | 'veterans'
}

/**
 * 3D Timeline Visualization Component
 * Creates an immersive timeline of missing persons cases
 * Zero cost solution using CSS 3D transforms and animations
 */
export default function Timeline3D({
  persons,
  onPersonSelect,
  className = '',
  height = 600,
  perspective = 1000
}: Timeline3DProps) {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)
  const [currentTimeRange, setCurrentTimeRange] = useState({ start: 0, end: 12 })
  const [rotationX, setRotationX] = useState(15)
  const [rotationY, setRotationY] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [isAnimating, setIsAnimating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  // Process data into timeline events
  const timelineEvents = useMemo(() => {
    const now = new Date()
    const events: TimelineEvent[] = []

    persons.forEach((person) => {
      const dateString = person.reportedMissing || person.date
      const date = new Date(dateString)
      
      if (isNaN(date.getTime())) return

      // Calculate position based on date
      const monthsAgo = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30)
      
      // Limit to recent cases (last 5 years)
      if (monthsAgo > 60) return

      // Position in 3D space
      const x = (monthsAgo % 12) * 100 - 550 // Spread across x-axis by month
      const z = Math.floor(monthsAgo / 12) * -200 // Depth by year
      const y = person.category === 'Missing Children' ? -100 : 
                person.category === 'Missing Veterans' ? 0 : 100

      const category = person.category === 'Missing Children' ? 'children' :
                      person.category === 'Missing Veterans' ? 'veterans' : 'adults'

      events.push({
        id: person.id.toString(),
        date,
        person,
        x,
        y,
        z,
        category
      })
    })

    return events.sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [persons])

  // Mouse interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return

    const deltaX = e.clientX - lastMouse.current.x
    const deltaY = e.clientY - lastMouse.current.y

    setRotationY(prev => prev + deltaX * 0.5)
    setRotationX(prev => Math.max(-60, Math.min(60, prev - deltaY * 0.5)))

    lastMouse.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)))
  }

  const handleEventClick = (event: TimelineEvent) => {
    setSelectedEvent(event)
    onPersonSelect?.(event.person)
    
    // Animate to focus on selected event
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 1000)
  }

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'children': return '#ef4444'
      case 'veterans': return '#f59e0b'
      default: return '#3b82f6'
    }
  }

  const getEventSize = (event: TimelineEvent): number => {
    const monthsAgo = (new Date().getTime() - event.date.getTime()) / (1000 * 60 * 60 * 24 * 30)
    return Math.max(8, 20 - monthsAgo) // Smaller for older events
  }

  return (
    <div className={`relative overflow-hidden bg-black rounded-xl ${className}`} style={{ height }}>
      {/* 3D Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ perspective: `${perspective}px` }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* 3D Scene */}
        <div
          className={`relative w-full h-full transition-transform duration-100 ${
            isAnimating ? 'transition-transform duration-1000 ease-out' : ''
          }`}
          style={{
            transform: `
              translateZ(${zoom * 100}px) 
              rotateX(${rotationX}deg) 
              rotateY(${rotationY}deg)
              translateX(50%) 
              translateY(50%)
            `,
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Grid Lines */}
          <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
            {/* Year lines (depth) */}
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={`year-${i}`}
                className="absolute border-gray-700"
                style={{
                  width: '1200px',
                  height: '1px',
                  backgroundColor: '#374151',
                  transform: `translate3d(-600px, 0px, ${-i * 200}px)`,
                  opacity: 0.3
                }}
              />
            ))}
            
            {/* Month lines (width) */}
            {Array.from({ length: 13 }, (_, i) => (
              <div
                key={`month-${i}`}
                className="absolute border-gray-700"
                style={{
                  width: '1px',
                  height: '400px',
                  backgroundColor: '#374151',
                  transform: `translate3d(${i * 100 - 600}px, -200px, 0px)`,
                  opacity: 0.2
                }}
              />
            ))}
          </div>

          {/* Category Planes */}
          <div className="absolute" style={{ transformStyle: 'preserve-3d' }}>
            {/* Children plane */}
            <div
              className="absolute bg-red-500/5 border border-red-500/20"
              style={{
                width: '1200px',
                height: '1000px',
                transform: 'translate3d(-600px, -150px, -600px) rotateX(90deg)',
              }}
            />
            
            {/* Adults plane */}
            <div
              className="absolute bg-blue-500/5 border border-blue-500/20"
              style={{
                width: '1200px',
                height: '1000px',
                transform: 'translate3d(-600px, 50px, -600px) rotateX(90deg)',
              }}
            />
            
            {/* Veterans plane */}
            <div
              className="absolute bg-yellow-500/5 border border-yellow-500/20"
              style={{
                width: '1200px',
                height: '1000px',
                transform: 'translate3d(-600px, -50px, -600px) rotateX(90deg)',
              }}
            />
          </div>

          {/* Timeline Events */}
          {timelineEvents.map((event) => {
            const isSelected = selectedEvent?.id === event.id
            const size = getEventSize(event)
            const color = getCategoryColor(event.category)

            return (
              <div
                key={event.id}
                className={`
                  absolute cursor-pointer transition-all duration-300 hover:scale-125
                  ${isSelected ? 'scale-150 z-20' : 'z-10'}
                `}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  transform: `translate3d(${event.x}px, ${event.y}px, ${event.z}px)`,
                  transformStyle: 'preserve-3d'
                }}
                onClick={() => handleEventClick(event)}
              >
                {/* Event Sphere */}
                <div
                  className="w-full h-full rounded-full shadow-lg transition-all duration-300"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${color}, ${color}aa)`,
                    boxShadow: `0 0 ${size/2}px ${color}66, inset -2px -2px 4px rgba(0,0,0,0.3)`,
                    border: isSelected ? `2px solid white` : `1px solid ${color}`,
                  }}
                />

                {/* Event Glow */}
                <div
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    background: `radial-gradient(circle, ${color}33, transparent)`,
                    transform: 'scale(2)',
                    opacity: isSelected ? 0.6 : 0.3,
                  }}
                />

                {/* Event Label */}
                {(isSelected || size > 15) && (
                  <div
                    className="absolute whitespace-nowrap text-white text-xs font-medium px-2 py-1 bg-black/80 rounded pointer-events-none"
                    style={{
                      transform: 'translate3d(0, -40px, 20px)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {event.person.name}
                    <div className="text-xs text-gray-300">
                      {event.date.toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Axis Labels */}
          <div className="absolute text-white text-sm font-medium pointer-events-none">
            {/* Time axis */}
            <div
              style={{
                transform: 'translate3d(-650px, 150px, 50px)',
                transformStyle: 'preserve-3d'
              }}
            >
              Time →
            </div>
            
            {/* Category axis */}
            <div
              style={{
                transform: 'translate3d(-700px, -200px, 0px) rotateZ(90deg)',
                transformStyle: 'preserve-3d'
              }}
            >
              Categories
            </div>
            
            {/* Depth axis */}
            <div
              style={{
                transform: 'translate3d(-650px, 150px, -100px) rotateY(-45deg)',
                transformStyle: 'preserve-3d'
              }}
            >
              Years
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-4 left-4 space-y-2">
        <div className="bg-black/80 rounded-lg p-3 text-white">
          <h3 className="text-sm font-semibold mb-2">Timeline Controls</h3>
          <div className="space-y-2 text-xs">
            <div>🖱️ Drag to rotate • 🖱️ Scroll to zoom</div>
            <div>📅 {timelineEvents.length} cases displayed</div>
          </div>
        </div>

        {/* Reset View */}
        <button
          onClick={() => {
            setRotationX(15)
            setRotationY(0)
            setZoom(1)
            setSelectedEvent(null)
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded transition-colors"
        >
          Reset View
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-black/80 rounded-lg p-3 text-white">
        <h3 className="text-sm font-semibold mb-2">Categories</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            <span>Missing Children</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
            <span>Missing Adults</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
            <span>Missing Veterans</span>
          </div>
        </div>
      </div>

      {/* Selected Event Details */}
      {selectedEvent && (
        <div className="absolute bottom-4 left-4 right-4 bg-black/90 rounded-lg p-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{selectedEvent.person.name}</h3>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                <div>
                  <span className="text-gray-400">Location:</span>
                  <div>{selectedEvent.person.location}</div>
                </div>
                <div>
                  <span className="text-gray-400">Date Missing:</span>
                  <div>{selectedEvent.date.toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="text-gray-400">Age:</span>
                  <div>{selectedEvent.person.age || 'Unknown'}</div>
                </div>
                <div>
                  <span className="text-gray-400">Category:</span>
                  <div>{selectedEvent.person.category}</div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-gray-400 hover:text-white ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Performance Info (Dev Mode) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 right-4 bg-black/80 rounded px-2 py-1 text-xs text-gray-300">
          Events: {timelineEvents.length} • Zoom: {zoom.toFixed(1)}x
        </div>
      )}
    </div>
  )
}