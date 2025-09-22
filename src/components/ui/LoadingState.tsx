'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  type?: 'spinner' | 'skeleton' | 'dots' | 'pulse' | 'map'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  message?: string
  className?: string
  fullScreen?: boolean
}

export function LoadingState({
  type = 'spinner',
  size = 'md',
  message,
  className,
  fullScreen = false
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const containerClasses = cn(
    "flex items-center justify-center",
    fullScreen && "min-h-screen bg-black",
    className
  )

  const LoadingSpinner = () => (
    <motion.div
      className={cn(
        "border-2 border-mission-gray-700 border-t-mission-primary rounded-full",
        sizeClasses[size]
      )}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  )

  const LoadingDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn(
            "bg-mission-primary rounded-full",
            size === 'sm' ? 'w-2 h-2' : 
            size === 'md' ? 'w-3 h-3' :
            size === 'lg' ? 'w-4 h-4' : 'w-5 h-5'
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  )

  const SkeletonLoader = () => (
    <div className="space-y-3 w-full max-w-md">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="h-4 bg-mission-gray-800 rounded animate-pulse"
          style={{ width: `${100 - i * 10}%` }}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  )

  const PulseLoader = () => (
    <motion.div
      className={cn(
        "bg-mission-primary rounded-full",
        sizeClasses[size]
      )}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.7, 1, 0.7]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  )

  const MapLoader = () => (
    <div className="relative">
      {/* Map placeholder */}
      <div className="w-full h-96 bg-mission-gray-800 rounded-lg overflow-hidden">
        <motion.div
          className="w-full h-full bg-gradient-to-br from-mission-gray-700 to-mission-gray-800"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%']
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
      </div>
      
      {/* Loading indicators */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="w-8 h-8 border-2 border-mission-gray-600 border-t-mission-primary rounded-full mx-auto mb-2"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-mission-gray-400 text-sm">Loading map data...</p>
        </div>
      </div>

      {/* Animated location pins */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-4 h-4 bg-mission-primary rounded-full"
          style={{
            left: `${20 + i * 15}%`,
            top: `${30 + i * 10}%`
          }}
          animate={{
            scale: [0, 1.2, 1],
            opacity: [0, 1, 0.7]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.3
          }}
        />
      ))}
    </div>
  )

  const getLoader = () => {
    switch (type) {
      case 'skeleton':
        return <SkeletonLoader />
      case 'dots':
        return <LoadingDots />
      case 'pulse':
        return <PulseLoader />
      case 'map':
        return <MapLoader />
      default:
        return <LoadingSpinner />
    }
  }

  return (
    <div className={containerClasses}>
      <div className="text-center">
        {getLoader()}
        {message && (
          <motion.p
            className="mt-4 text-mission-gray-400 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {message}
          </motion.p>
        )}
      </div>
    </div>
  )
}

// Skeleton components for specific use cases
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-mission-gray-900 border border-mission-gray-800 rounded-lg p-6", className)}>
      <div className="animate-pulse">
        <div className="h-4 bg-mission-gray-800 rounded w-3/4 mb-3"></div>
        <div className="h-3 bg-mission-gray-800 rounded w-1/2 mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-mission-gray-800 rounded"></div>
          <div className="h-3 bg-mission-gray-800 rounded w-5/6"></div>
          <div className="h-3 bg-mission-gray-800 rounded w-4/6"></div>
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex space-x-4 animate-pulse">
          <div className="h-4 bg-mission-gray-800 rounded w-1/4"></div>
          <div className="h-4 bg-mission-gray-800 rounded w-1/3"></div>
          <div className="h-4 bg-mission-gray-800 rounded w-1/4"></div>
          <div className="h-4 bg-mission-gray-800 rounded w-1/6"></div>
        </div>
      ))}
    </div>
  )
}