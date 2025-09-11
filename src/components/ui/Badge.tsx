'use client'

import { forwardRef } from 'react'
import { motion, MotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface BadgeData {
  id: string
  name: string
  description: string
  icon: string
  category: 'donation' | 'engagement' | 'special'
  tier: number
  requirement: number | string
  color: string
  unlocked?: boolean
  progress?: number
  unlockedAt?: Date
}

interface BadgeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, keyof MotionProps> {
  badge: BadgeData
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showProgress?: boolean
  showAnimation?: boolean
  interactive?: boolean
}

const Badge = forwardRef<HTMLDivElement, BadgeProps & MotionProps>(
  ({ 
    badge,
    size = 'md',
    showProgress = false,
    showAnimation = true,
    interactive = false,
    className,
    ...props 
  }, ref) => {
    const sizes = {
      xs: 'w-8 h-8 text-xs',
      sm: 'w-12 h-12 text-sm',
      md: 'w-16 h-16 text-base',
      lg: 'w-20 h-20 text-lg',
      xl: 'w-24 h-24 text-xl'
    }

    const progressPercentage = badge.progress || 0

    return (
      <div className="relative">
        <motion.div
          ref={ref}
          className={cn(
            'relative rounded-full flex items-center justify-center border-2 overflow-hidden',
            sizes[size],
            badge.unlocked 
              ? `border-${badge.color} bg-gradient-to-br from-${badge.color}/20 to-${badge.color}/40 shadow-badge`
              : 'border-mission-gray-600 bg-mission-gray-800 grayscale',
            interactive && 'cursor-pointer hover:scale-105',
            className
          )}
          initial={showAnimation ? { scale: 0, rotate: -180 } : false}
          animate={showAnimation && badge.unlocked ? { scale: 1, rotate: 0 } : { scale: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 20,
            delay: showAnimation ? 0.2 : 0
          }}
          whileHover={interactive ? { scale: 1.1 } : {}}
          whileTap={interactive ? { scale: 0.95 } : {}}
          {...props}
        >
          {/* Badge Icon */}
          <div className="relative z-10">
            <span 
              className={cn(
                'block text-center',
                badge.unlocked ? 'text-white' : 'text-mission-gray-500'
              )}
            >
              {badge.icon}
            </span>
          </div>

          {/* Glow Effect for Unlocked Badges */}
          {badge.unlocked && (
            <motion.div
              className={cn(
                'absolute inset-0 rounded-full',
                `bg-gradient-to-br from-${badge.color}/30 to-transparent`
              )}
              animate={{ 
                opacity: [0.5, 0.8, 0.5],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            />
          )}

          {/* Progress Ring */}
          {showProgress && !badge.unlocked && progressPercentage > 0 && (
            <svg 
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-mission-gray-700"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={`var(--${badge.color})`}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={283}
                initial={{ strokeDashoffset: 283 }}
                animate={{ 
                  strokeDashoffset: 283 - (283 * progressPercentage / 100)
                }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
          )}
        </motion.div>

        {/* Tier Indicator */}
        {badge.tier > 1 && (
          <motion.div
            className="absolute -top-1 -right-1 w-5 h-5 bg-mission-warning text-black text-xs font-bold rounded-full flex items-center justify-center"
            initial={showAnimation ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            transition={{ delay: showAnimation ? 0.5 : 0 }}
          >
            {badge.tier}
          </motion.div>
        )}

        {/* Unlock Animation */}
        {showAnimation && badge.unlocked && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0]
            }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="w-full h-full rounded-full border-4 border-white/50" />
          </motion.div>
        )}
      </div>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }
export type { BadgeProps }