'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, Button } from '@/components/ui'
import { cn } from '@/lib/utils'

export type UserTier = 'anonymous' | 'free' | 'basic' | 'premium' | 'hero' | 'champion'

interface TierGuardProps {
  children: ReactNode
  currentTier: UserTier
  requiredTier: UserTier
  feature: string
  description?: string
  upgradeAction?: () => void
  className?: string
  showPreview?: boolean
  previewContent?: ReactNode
}

const tierHierarchy: Record<UserTier, number> = {
  anonymous: 0,
  free: 1,
  basic: 2,
  premium: 3,
  hero: 4,
  champion: 5
}

const tierColors: Record<UserTier, string> = {
  anonymous: 'gray',
  free: 'gray',
  basic: 'blue',
  premium: 'purple',
  hero: 'amber',
  champion: 'red'
}

const tierNames: Record<UserTier, string> = {
  anonymous: 'Guest',
  free: 'Free Account',
  basic: 'Basic Plan',
  premium: 'Premium Plan',
  hero: 'Hero Plan',
  champion: 'Champion Plan'
}

export function TierGuard({
  children,
  currentTier,
  requiredTier,
  feature,
  description,
  upgradeAction,
  className,
  showPreview = false,
  previewContent
}: TierGuardProps) {
  const hasAccess = tierHierarchy[currentTier] >= tierHierarchy[requiredTier]
  const requiredTierColor = tierColors[requiredTier]
  const requiredTierName = tierNames[requiredTier]

  if (hasAccess) {
    return <>{children}</>
  }

  return (
    <motion.div
      className={cn('relative', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Preview Content (blurred background) */}
      {showPreview && (
        <div className="relative overflow-hidden rounded-lg">
          <div className="blur-sm grayscale pointer-events-none">
            {previewContent || children}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>
      )}

      {/* Upgrade Overlay */}
      <motion.div
        className={cn(
          'relative z-10',
          showPreview ? 'absolute inset-0 flex items-center justify-center' : ''
        )}
      >
        <Card 
          variant="tier" 
          tier={requiredTier}
          className={cn(
            'text-center',
            showPreview ? 'max-w-sm mx-auto' : 'w-full'
          )}
        >
          <CardContent className="p-6">
            {/* Lock Icon */}
            <motion.div
              className={`w-16 h-16 mx-auto mb-4 rounded-full bg-tier-${requiredTier}/20 flex items-center justify-center`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <svg 
                className={`w-8 h-8 text-tier-${requiredTier}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                />
              </svg>
            </motion.div>

            {/* Tier Badge */}
            <motion.div
              className={`inline-flex items-center px-3 py-1 rounded-full bg-tier-${requiredTier}/20 border border-tier-${requiredTier}/50 mb-4`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className={`w-2 h-2 rounded-full bg-tier-${requiredTier} mr-2`} />
              <span className="text-sm font-medium text-white">
                {requiredTierName} Required
              </span>
            </motion.div>

            {/* Feature Name */}
            <motion.h3
              className="text-xl font-bold text-white mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {feature}
            </motion.h3>

            {/* Description */}
            {description && (
              <motion.p
                className="text-mission-gray-400 mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {description}
              </motion.p>
            )}

            {/* Upgrade Button */}
            {upgradeAction && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  onClick={upgradeAction}
                  tier={requiredTier}
                  variant="tier"
                  size="lg"
                  glow
                  className="w-full"
                >
                  Upgrade to {requiredTierName}
                </Button>
              </motion.div>
            )}

            {/* Anonymous user special message */}
            {currentTier === 'anonymous' && (
              <motion.p
                className="text-xs text-mission-gray-500 mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Create a free account to unlock basic features
              </motion.p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

// Helper component for usage-based restrictions
interface UsageLimitProps {
  current: number
  limit: number
  feature: string
  resetPeriod?: string
  upgradeAction?: () => void
  currentTier: UserTier
}

export function UsageLimit({
  current,
  limit,
  feature,
  resetPeriod = 'daily',
  upgradeAction,
  currentTier
}: UsageLimitProps) {
  const percentage = Math.min((current / limit) * 100, 100)
  const isAtLimit = current >= limit

  if (!isAtLimit) {
    return (
      <motion.div
        className="bg-mission-gray-800/50 rounded-lg p-3 mb-4"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
      >
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-mission-gray-300">{feature} usage</span>
          <span className="text-white font-medium">
            {current}/{limit === -1 ? '∞' : limit}
          </span>
        </div>
        
        {limit !== -1 && (
          <div className="w-full bg-mission-gray-700 rounded-full h-2">
            <motion.div
              className={cn(
                'h-2 rounded-full',
                percentage < 80 ? 'bg-mission-accent' : 
                percentage < 95 ? 'bg-mission-warning' : 'bg-mission-secondary'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <TierGuard
      currentTier={currentTier}
      requiredTier="basic"
      feature={`${feature} Limit Reached`}
      description={`You've used all ${limit} ${feature.toLowerCase()} for this ${resetPeriod}. Upgrade for unlimited access.`}
      upgradeAction={upgradeAction}
    >
      <div />
    </TierGuard>
  )
}