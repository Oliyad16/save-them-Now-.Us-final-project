'use client'

import { ReactNode, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, Button } from '@/components/ui'
import { UserTier } from './TierGuard'
import { UpgradePrompt } from './UpgradePrompt'
import { cn } from '@/lib/utils'

interface FeatureTeaserProps {
  children: ReactNode
  feature: string
  description: string
  currentTier: UserTier
  requiredTier: UserTier
  benefits: string[]
  className?: string
  style?: 'blur' | 'overlay' | 'grid' | 'peek'
  interactionCount?: number
  maxInteractions?: number
  onUpgrade?: () => void
}

export function FeatureTeaser({
  children,
  feature,
  description,
  currentTier,
  requiredTier,
  benefits,
  className,
  style = 'blur',
  interactionCount = 0,
  maxInteractions = 1,
  onUpgrade
}: FeatureTeaserProps) {
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  const canInteract = interactionCount < maxInteractions
  
  const handleInteraction = () => {
    if (!hasInteracted && canInteract) {
      setHasInteracted(true)
      // Show a brief preview before showing upgrade prompt
      setTimeout(() => setShowUpgrade(true), 2000)
    } else {
      setShowUpgrade(true)
    }
  }

  if (style === 'blur') {
    return (
      <div className={cn('relative overflow-hidden rounded-lg', className)}>
        {/* Blurred Content */}
        <motion.div
          className={cn(
            'transition-all duration-500',
            hasInteracted && canInteract ? 'blur-0' : 'blur-md grayscale'
          )}
        >
          {children}
        </motion.div>

        {/* Interaction Overlay */}
        {(!hasInteracted || !canInteract) && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 flex items-center justify-center cursor-pointer"
            onClick={handleInteraction}
            whileHover={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          >
            <Card variant="tier" tier={requiredTier as any} className="max-w-sm mx-4">
              <CardContent className="p-6 text-center">
                <motion.div
                  className={`w-12 h-12 mx-auto mb-4 rounded-full bg-tier-${requiredTier}/20 flex items-center justify-center`}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <svg className={`w-6 h-6 text-tier-${requiredTier}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </motion.div>
                
                <h3 className="text-lg font-bold text-white mb-2">{feature}</h3>
                <p className="text-sm text-mission-gray-400 mb-4">{description}</p>
                
                {canInteract && !hasInteracted ? (
                  <Button variant="ghost" size="sm">
                    👁️ Preview ({maxInteractions - interactionCount} left)
                  </Button>
                ) : (
                  <Button tier={requiredTier as any} variant="tier" size="sm" glow>
                    Unlock Now
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Upgrade Modal */}
        {showUpgrade && (
          <UpgradePrompt
            currentTier={currentTier}
            suggestedTier={requiredTier}
            context={`Unlock ${feature}`}
            benefits={benefits}
            onUpgrade={onUpgrade}
            onDismiss={() => setShowUpgrade(false)}
            style="modal"
          />
        )}
      </div>
    )
  }

  if (style === 'overlay') {
    return (
      <div className={cn('relative', className)}>
        {children}
        
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Card variant="tier" tier={requiredTier as any} glow>
            <CardContent className="p-8 text-center max-w-md">
              <motion.div
                className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-badge flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <span className="text-2xl">🔓</span>
              </motion.div>
              
              <h3 className="text-xl font-bold text-white mb-3">{feature}</h3>
              <p className="text-mission-gray-400 mb-6">{description}</p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => setShowUpgrade(true)}
                  tier={requiredTier as any}
                  variant="tier"
                  size="lg"
                  glow
                  className="w-full"
                >
                  Unlock Feature
                </Button>
                
                <Button
                  onClick={handleInteraction}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  disabled={!canInteract}
                >
                  {canInteract ? `Preview (${maxInteractions - interactionCount} left)` : 'Preview Used'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {showUpgrade && (
          <UpgradePrompt
            currentTier={currentTier}
            suggestedTier={requiredTier}
            context={`Unlock ${feature}`}
            benefits={benefits}
            onUpgrade={onUpgrade}
            onDismiss={() => setShowUpgrade(false)}
            style="modal"
          />
        )}
      </div>
    )
  }

  if (style === 'grid') {
    return (
      <div className={cn('relative overflow-hidden rounded-lg border-2 border-dashed border-mission-gray-700', className)}>
        <div className="blur-sm grayscale opacity-50">
          {children}
        </div>
        
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-mission-gray-900/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-center p-6">
            <div className={`w-12 h-12 mx-auto mb-4 rounded-full bg-tier-${requiredTier}/20 flex items-center justify-center`}>
              <svg className={`w-6 h-6 text-tier-${requiredTier}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            <h4 className="font-semibold text-white mb-2">{feature}</h4>
            <p className="text-sm text-mission-gray-400 mb-4">{description}</p>
            
            <Button
              onClick={() => setShowUpgrade(true)}
              tier={requiredTier as any}
              variant="tier"
              size="sm"
            >
              Unlock
            </Button>
          </div>
        </motion.div>

        {showUpgrade && (
          <UpgradePrompt
            currentTier={currentTier}
            suggestedTier={requiredTier}
            context={`Unlock ${feature}`}
            benefits={benefits}
            onUpgrade={onUpgrade}
            onDismiss={() => setShowUpgrade(false)}
            style="modal"
          />
        )}
      </div>
    )
  }

  if (style === 'peek') {
    return (
      <div className={cn('relative overflow-hidden rounded-lg', className)}>
        <div className="relative">
          {/* Partial content visible */}
          <div className="h-32 overflow-hidden">
            {children}
          </div>
          
          {/* Fade overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-mission-gray-900 to-transparent" />
        </div>
        
        {/* Unlock section */}
        <div className="p-4 bg-mission-gray-800/50 border-t border-mission-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white text-sm">{feature}</h4>
              <p className="text-xs text-mission-gray-400">{description}</p>
            </div>
            
            <Button
              onClick={() => setShowUpgrade(true)}
              tier={requiredTier as any}
              variant="tier"
              size="sm"
            >
              View All
            </Button>
          </div>
        </div>

        {showUpgrade && (
          <UpgradePrompt
            currentTier={currentTier}
            suggestedTier={requiredTier}
            context={`Unlock ${feature}`}
            benefits={benefits}
            onUpgrade={onUpgrade}
            onDismiss={() => setShowUpgrade(false)}
            style="modal"
          />
        )}
      </div>
    )
  }

  return <>{children}</>
}