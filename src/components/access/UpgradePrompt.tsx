'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, Button, Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui'
import { UserTier } from './TierGuard'
import { cn } from '@/lib/utils'

interface UpgradePromptProps {
  currentTier: UserTier
  suggestedTier: UserTier
  context: string
  benefits: string[]
  ctaText?: string
  onUpgrade?: () => void
  onDismiss?: () => void
  style?: 'banner' | 'card' | 'modal' | 'floating'
  position?: 'top' | 'bottom' | 'center'
  dismissible?: boolean
}

const tierPricing = {
  basic: { monthly: 5, yearly: 50 },
  premium: { monthly: 25, yearly: 250 },
  hero: { monthly: 100, yearly: 1000 },
  champion: { monthly: 500, yearly: 5000 }
}

const tierBenefits = {
  basic: [
    'Full map access',
    '3 AI interactions per day',
    'Case search & filtering',
    'Email support'
  ],
  premium: [
    'Everything in Basic',
    'Unlimited AI interactions',
    'Advanced analytics',
    'Pattern recognition insights',
    'Priority support'
  ],
  hero: [
    'Everything in Premium',
    'API access for integrations',
    'Advanced clustering algorithms',
    'Real-time notifications',
    'Dedicated support'
  ],
  champion: [
    'Everything in Hero',
    'Law enforcement partnership tools',
    'Custom reporting',
    'White-label solutions',
    'Direct line to development team'
  ]
}

export function UpgradePrompt({
  currentTier,
  suggestedTier,
  context,
  benefits,
  ctaText,
  onUpgrade,
  onDismiss,
  style = 'card',
  position = 'center',
  dismissible = true
}: UpgradePromptProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const pricing = tierPricing[suggestedTier as keyof typeof tierPricing]
  const allBenefits = tierBenefits[suggestedTier as keyof typeof tierBenefits]

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  const handleUpgrade = () => {
    onUpgrade?.()
    setIsModalOpen(false)
  }

  if (isDismissed && style !== 'modal') return null

  const UpgradeCard = ({ compact = false }) => (
    <Card 
      variant="tier" 
      tier={suggestedTier}
      glow
      className={cn(
        'relative overflow-hidden',
        !compact && 'max-w-md'
      )}
    >
      <CardContent className="p-6">
        {/* Dismiss Button */}
        {dismissible && style !== 'modal' && (
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full bg-mission-gray-800/50 hover:bg-mission-gray-700 text-mission-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Tier Badge */}
        <div className={`inline-flex items-center px-3 py-1 rounded-full bg-tier-${suggestedTier}/20 border border-tier-${suggestedTier}/50 mb-4`}>
          <span className={`w-2 h-2 rounded-full bg-tier-${suggestedTier} mr-2`} />
          <span className="text-sm font-medium text-white capitalize">
            {suggestedTier} Plan
          </span>
        </div>

        {/* Context */}
        <h3 className="text-lg font-bold text-white mb-2">
          {context}
        </h3>

        {/* Benefits */}
        <ul className="space-y-2 mb-6">
          {(compact ? benefits.slice(0, 3) : benefits).map((benefit, index) => (
            <motion.li
              key={index}
              className="flex items-center text-sm text-mission-gray-300"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <svg className={`w-4 h-4 text-tier-${suggestedTier} mr-2 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {benefit}
            </motion.li>
          ))}
          {compact && benefits.length > 3 && (
            <li className="text-sm text-mission-gray-500">
              +{benefits.length - 3} more benefits
            </li>
          )}
        </ul>

        {/* Pricing */}
        {pricing && (
          <div className="text-center mb-6">
            <div className="text-2xl font-bold text-white mb-1">
              ${pricing.monthly}<span className="text-lg text-mission-gray-400">/month</span>
            </div>
            <div className="text-sm text-mission-gray-400">
              Or ${pricing.yearly}/year (2 months free)
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Button
            onClick={style === 'modal' ? handleUpgrade : () => setIsModalOpen(true)}
            tier={suggestedTier}
            variant="tier"
            size="lg"
            glow
            className="w-full"
          >
            {ctaText || `Upgrade to ${suggestedTier}`}
          </Button>
          
          {!compact && (
            <Button
              onClick={() => setIsModalOpen(true)}
              variant="ghost"
              size="sm"
              className="w-full"
            >
              View all {allBenefits.length} benefits
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (style === 'modal') {
    return (
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
        variant="tier"
        tier={suggestedTier}
      >
        <ModalHeader>
          <ModalTitle>Upgrade to {suggestedTier} Plan</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <UpgradeCard />
        </ModalContent>
      </Modal>
    )
  }

  if (style === 'banner') {
    return (
      <AnimatePresence>
        {!isDismissed && (
          <motion.div
            className={cn(
              'fixed left-0 right-0 z-40 p-4',
              position === 'top' ? 'top-0' : 'bottom-0'
            )}
            initial={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
          >
            <div className="max-w-4xl mx-auto">
              <UpgradeCard compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  if (style === 'floating') {
    return (
      <AnimatePresence>
        {!isDismissed && (
          <motion.div
            className="fixed bottom-6 right-6 z-40 max-w-sm"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <UpgradeCard compact />
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  // Default card style
  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <UpgradeCard />
          
          {/* Full benefits modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            size="lg"
            variant="tier"
            tier={suggestedTier}
          >
            <ModalHeader>
              <ModalTitle className="capitalize">{suggestedTier} Plan Benefits</ModalTitle>
            </ModalHeader>
            <ModalContent>
              <div className="space-y-6">
                {/* All Benefits */}
                <div>
                  <h4 className="font-semibold text-white mb-4">Everything included:</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allBenefits.map((benefit, index) => (
                      <motion.li
                        key={index}
                        className="flex items-center text-sm text-mission-gray-300"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <svg className={`w-4 h-4 text-tier-${suggestedTier} mr-2 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {benefit}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Pricing */}
                {pricing && (
                  <div className="text-center p-6 bg-mission-gray-800/50 rounded-lg">
                    <div className="text-3xl font-bold text-white mb-2">
                      ${pricing.monthly}<span className="text-xl text-mission-gray-400">/month</span>
                    </div>
                    <div className="text-mission-gray-400 mb-4">
                      Or ${pricing.yearly}/year (save ${(pricing.monthly * 12) - pricing.yearly})
                    </div>
                    <Button
                      onClick={handleUpgrade}
                      tier={suggestedTier}
                      variant="tier"
                      size="lg"
                      glow
                      className="w-full max-w-xs"
                    >
                      Start {suggestedTier} Plan
                    </Button>
                  </div>
                )}
              </div>
            </ModalContent>
          </Modal>
        </motion.div>
      )}
    </AnimatePresence>
  )
}