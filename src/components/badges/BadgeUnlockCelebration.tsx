'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, Button, Badge } from '@/components/ui'
import { BadgeData } from '@/components/ui/Badge'
import { getBadgeById } from '@/lib/badges/badgeDefinitions'
import { cn } from '@/lib/utils'

interface BadgeUnlockCelebrationProps {
  badge: BadgeData | null
  isVisible: boolean
  onClose: () => void
  onShare?: () => void
  onViewBadges?: () => void
}

// Confetti particle component
const ConfettiParticle = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-full"
    style={{
      backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 5)]
    }}
    initial={{
      x: Math.random() * 400 - 200,
      y: -50,
      rotate: 0,
      scale: 0
    }}
    animate={{
      y: window.innerHeight + 50,
      rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
      scale: [0, 1, 0.8, 0]
    }}
    transition={{
      duration: 3 + Math.random() * 2,
      delay: delay,
      ease: "easeOut"
    }}
  />
)

// Firework effect component
const Firework = ({ x, y, color }: { x: number; y: number; color: string }) => {
  const particles = Array.from({ length: 12 }, (_, i) => i)
  
  return (
    <div className="absolute pointer-events-none" style={{ left: x, top: y }}>
      {particles.map((i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ scale: 0 }}
          animate={{
            scale: [0, 1, 0],
            x: Math.cos((i * 30) * Math.PI / 180) * (50 + Math.random() * 50),
            y: Math.sin((i * 30) * Math.PI / 180) * (50 + Math.random() * 50),
          }}
          transition={{
            duration: 1.5,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  )
}

export function BadgeUnlockCelebration({
  badge,
  isVisible,
  onClose,
  onShare,
  onViewBadges
}: BadgeUnlockCelebrationProps) {
  const [showFireworks, setShowFireworks] = useState(false)
  const [fireworks, setFireworks] = useState<Array<{ id: number; x: number; y: number; color: string }>>([])
  const [confettiCount, setConfettiCount] = useState(0)

  const definition = badge ? getBadgeById(badge.id) : null

  useEffect(() => {
    if (isVisible && badge) {
      // Start confetti
      setConfettiCount(50)
      
      // Start fireworks after a delay
      const fireworkTimer = setTimeout(() => {
        setShowFireworks(true)
        
        // Create multiple fireworks
        const newFireworks = []
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            const x = Math.random() * (window.innerWidth - 100) + 50
            const y = Math.random() * (window.innerHeight - 200) + 100
            const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']
            const color = colors[Math.floor(Math.random() * colors.length)]
            
            setFireworks(prev => [...prev, { id: Date.now() + i, x, y, color }])
          }, i * 300)
        }
        
        // Clear fireworks after animation
        setTimeout(() => {
          setFireworks([])
          setShowFireworks(false)
        }, 3000)
      }, 1000)

      return () => {
        clearTimeout(fireworkTimer)
        setFireworks([])
        setShowFireworks(false)
        setConfettiCount(0)
      }
    }
  }, [isVisible, badge])

  if (!badge || !isVisible) return null

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-yellow-600'
      case 'epic': return 'from-purple-400 to-purple-600'
      case 'rare': return 'from-blue-400 to-blue-600'
      default: return 'from-gray-400 to-gray-600'
    }
  }

  const getRarityGlow = (rarity?: string) => {
    switch (rarity) {
      case 'legendary': return 'shadow-yellow-500/50'
      case 'epic': return 'shadow-purple-500/50'
      case 'rare': return 'shadow-blue-500/50'
      default: return 'shadow-gray-500/50'
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Confetti */}
          {Array.from({ length: confettiCount }, (_, i) => (
            <ConfettiParticle key={i} delay={i * 0.05} />
          ))}

          {/* Fireworks */}
          {showFireworks && fireworks.map((firework) => (
            <Firework
              key={firework.id}
              x={firework.x}
              y={firework.y}
              color={firework.color}
            />
          ))}

          {/* Main celebration card */}
          <motion.div
            className="relative z-10 w-full max-w-md"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: 0.2
            }}
          >
            <Card 
              className={cn(
                'border-2 overflow-hidden',
                getRarityGlow(definition?.rarity),
                definition?.rarity === 'legendary' ? 'border-yellow-400' :
                definition?.rarity === 'epic' ? 'border-purple-400' :
                definition?.rarity === 'rare' ? 'border-blue-400' :
                'border-mission-primary'
              )}
            >
              {/* Animated background */}
              <div className={cn(
                'absolute inset-0 bg-gradient-to-br opacity-20',
                getRarityColor(definition?.rarity)
              )}>
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    background: [
                      'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                      'radial-gradient(circle at 100% 100%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                      'radial-gradient(circle at 0% 100%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                      'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                    ]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              </div>

              <CardContent className="relative p-8 text-center">
                {/* Achievement header */}
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mb-6"
                >
                  <div className="text-4xl mb-2">🎉</div>
                  <h1 className="text-2xl font-bold text-white mb-1">
                    Badge Unlocked!
                  </h1>
                  <p className="text-mission-gray-300">
                    You've earned a new achievement
                  </p>
                </motion.div>

                {/* Badge display */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.6
                  }}
                  className="mb-6"
                >
                  <div className="flex justify-center mb-4">
                    <Badge
                      badge={badge}
                      size="xl"
                      showAnimation
                    />
                  </div>
                  
                  <h2 className="text-xl font-bold text-white mb-2">
                    {badge.name}
                  </h2>
                  
                  <p className="text-mission-gray-300 mb-3">
                    {badge.description}
                  </p>

                  {/* Rarity and points */}
                  <div className="flex items-center justify-center gap-4 text-sm">
                    {definition?.rarity && (
                      <span className={cn(
                        'px-3 py-1 rounded-full font-medium',
                        definition.rarity === 'legendary' ? 'bg-yellow-900 text-yellow-200' :
                        definition.rarity === 'epic' ? 'bg-purple-900 text-purple-200' :
                        definition.rarity === 'rare' ? 'bg-blue-900 text-blue-200' :
                        'bg-gray-900 text-gray-200'
                      )}>
                        {definition.rarity.charAt(0).toUpperCase() + definition.rarity.slice(1)}
                      </span>
                    )}
                    
                    {definition?.points && (
                      <span className="px-3 py-1 rounded-full bg-mission-warning/20 text-mission-warning font-medium">
                        +{definition.points} pts
                      </span>
                    )}
                  </div>
                </motion.div>

                {/* Story */}
                {definition?.story && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mb-6 p-4 bg-mission-gray-800/50 rounded-lg"
                  >
                    <p className="text-sm text-mission-gray-300 italic">
                      "{definition.story}"
                    </p>
                  </motion.div>
                )}

                {/* Benefits */}
                {definition?.benefits && definition.benefits.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 }}
                    className="mb-6"
                  >
                    <h3 className="text-sm font-medium text-white mb-2">Unlocked Benefits:</h3>
                    <div className="space-y-1">
                      {definition.benefits.map((benefit, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.1 + index * 0.1 }}
                          className="flex items-center text-sm text-mission-gray-300"
                        >
                          <span className="text-mission-accent mr-2">✓</span>
                          {benefit}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Action buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="flex gap-3"
                >
                  {onShare && (
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={onShare}
                    >
                      🎉 Share Achievement
                    </Button>
                  )}
                  
                  {onViewBadges && (
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={onViewBadges}
                    >
                      🏆 View All Badges
                    </Button>
                  )}
                </motion.div>

                {/* Close button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4 }}
                  className="mt-4"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-mission-gray-400 hover:text-white"
                  >
                    Continue
                  </Button>
                </motion.div>
              </CardContent>

              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{
                  duration: 2,
                  delay: 0.5,
                  ease: "easeInOut"
                }}
              />
            </Card>
          </motion.div>

          {/* Achievement sound effect indicator */}
          <motion.div
            className="absolute top-4 right-4 text-4xl"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: [0, 1.2, 1], rotate: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            🔊
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}