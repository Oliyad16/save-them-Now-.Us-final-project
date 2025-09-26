'use client'

import { useState, useEffect } from 'react'

export default function KidnappingCounter() {
  const [count, setCount] = useState(0)
  
  // FBI statistics: ~365,000 missing children reports per year + ~600,000 missing adults
  // This equals roughly 965,000 total missing persons reports annually
  // Which is about 1.85 people per minute or 1 person every 32.4 seconds
  const REPORTS_PER_SECOND = 965000 / (365 * 24 * 60 * 60) // ~0.0306
  
  useEffect(() => {
    // Start from a realistic baseline (e.g., reports so far this year)
    const startOfYear = new Date(new Date().getFullYear(), 0, 1)
    const now = new Date()
    const secondsElapsed = (now.getTime() - startOfYear.getTime()) / 1000
    const initialCount = Math.floor(secondsElapsed * REPORTS_PER_SECOND)
    
    setCount(initialCount)
    
    // Update counter every second
    const interval = setInterval(() => {
      setCount(prev => prev + REPORTS_PER_SECOND)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [REPORTS_PER_SECOND])
  
  const formatNumber = (num: number): string => {
    return Math.floor(num).toLocaleString()
  }
  
  return (
    <div className="container mx-auto px-4 text-center">
      <div className="relative">
        {/* Glowing background effect */}
        <div className="absolute inset-0 bg-red-500 opacity-10 blur-3xl rounded-full"></div>
        
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-300 mb-4 tracking-wider">
            MISSING PERSONS REPORTS IN THE US
          </h2>
          
          <div className="text-center mb-6">
            <div className="inline-block bg-black border-2 border-red-500 rounded-lg p-8 shadow-2xl">
              {/* Digital counter display */}
              <div className="relative">
                {/* Red glow effect */}
                <div className="absolute inset-0 bg-red-500 opacity-20 blur-lg rounded"></div>
                
                {/* Counter digits */}
                <div className="relative text-red-500 font-mono text-6xl md:text-8xl lg:text-9xl font-bold tracking-wider leading-none">
                  <div className="digital-display">
                    {formatNumber(count)}
                  </div>
                </div>
              </div>
              
              {/* Year label */}
              <div className="text-red-400 font-mono text-lg md:text-xl mt-4 tracking-widest">
                {new Date().getFullYear()}
              </div>
            </div>
          </div>
          
          <div className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            <p className="mb-3">
              <span className="text-red-400 font-semibold">This number increases every second.</span>
            </p>
            <p className="text-gray-500 text-base">
              Every missing person represents a family searching for answers, a community that has lost someone precious.
            </p>
          </div>
          
          {/* Pulse indicator */}
          <div className="flex justify-center items-center mt-8">
            <div className="relative">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75"></div>
            </div>
            <span className="ml-3 text-red-400 font-mono text-sm">LIVE COUNT</span>
          </div>
        </div>
      </div>
    </div>
  )
}