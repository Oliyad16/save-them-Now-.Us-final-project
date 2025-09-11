'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import { UserTier } from '@/components/access'
import { BadgeData } from '@/components/ui/Badge'
import { BadgeDefinition, getBadgesByCategory, getBadgesByRarity } from '@/lib/badges/badgeDefinitions'
import { BadgeSystem, UserStats } from '@/lib/badges/badgeSystem'
import { cn } from '@/lib/utils'

interface BadgeShowcaseProps {
  userStats: UserStats
  currentTier: UserTier
  onBadgeClick?: (badge: BadgeData) => void
  onUpgrade?: () => void
  className?: string
}

type ViewMode = 'all' | 'unlocked' | 'progress' | 'category'
type CategoryFilter = 'all' | 'donation' | 'engagement' | 'special'
type RarityFilter = 'all' | 'common' | 'rare' | 'epic' | 'legendary'

export function BadgeShowcase({ 
  userStats, 
  currentTier, 
  onBadgeClick,
  onUpgrade,
  className 
}: BadgeShowcaseProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all')
  const [selectedBadge, setSelectedBadge] = useState<BadgeData | null>(null)
  const [showStats, setShowStats] = useState(false)

  // Calculate badge data
  const unlockedBadges = useMemo(() => 
    BadgeSystem.getUnlockedBadges(userStats), [userStats]
  )
  
  const badgesInProgress = useMemo(() => 
    BadgeSystem.getBadgesInProgress(userStats), [userStats]
  )
  
  const allBadgeProgress = useMemo(() => 
    BadgeSystem.calculateAllBadgeProgress(userStats), [userStats]
  )

  const userLevel = useMemo(() => 
    BadgeSystem.getUserBadgeLevel(userStats), [userStats]
  )

  const recommendations = useMemo(() => 
    BadgeSystem.getBadgeRecommendations(userStats), [userStats]
  )

  // Filter badges based on current view
  const displayedBadges = useMemo(() => {
    let badges: BadgeData[] = []

    switch (viewMode) {
      case 'unlocked':
        badges = unlockedBadges
        break
      case 'progress':
        badges = badgesInProgress
        break
      case 'all':
      default:
        badges = allBadgeProgress.map(progress => {
          const definition = getBadgesByCategory('all').find(b => b.id === progress.badgeId)!
          return {
            ...definition,
            unlocked: progress.unlocked,
            progress: progress.progress,
            unlockedAt: progress.unlockedAt
          }
        })
        break
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      badges = badges.filter(badge => badge.category === categoryFilter)
    }

    // Apply rarity filter
    if (rarityFilter !== 'all') {
      const rarityBadges = getBadgesByRarity(rarityFilter)
      badges = badges.filter(badge => rarityBadges.some(rb => rb.id === badge.id))
    }

    return badges
  }, [viewMode, categoryFilter, rarityFilter, unlockedBadges, badgesInProgress, allBadgeProgress])

  const handleBadgeClick = (badge: BadgeData) => {
    setSelectedBadge(badge)
    onBadgeClick?.(badge)
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400'
      case 'rare': return 'text-blue-400'
      case 'epic': return 'text-purple-400'
      case 'legendary': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'shadow-yellow-500/50'
      case 'epic': return 'shadow-purple-500/50'
      case 'rare': return 'shadow-blue-500/50'
      default: return ''
    }
  }

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* User Level & Stats */}
      <Card variant="tier" tier={currentTier} glow>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-badge flex items-center justify-center text-2xl">
                {userLevel.level >= 10 ? '👑' : userLevel.level >= 7 ? '🏆' : userLevel.level >= 4 ? '⭐' : '🌟'}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Level {userLevel.level}</h2>
                <p className="text-lg text-mission-gray-300">{userLevel.title}</p>
              </div>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats(!showStats)}
            >
              📊 Stats
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Progress to next level */}
            {userLevel.pointsToNext > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-mission-gray-400">Progress to Level {userLevel.level + 1}</span>
                  <span className="text-white">{userLevel.pointsToNext} points needed</span>
                </div>
                <div className="w-full bg-mission-gray-700 rounded-full h-2">
                  <motion.div
                    className="h-2 bg-gradient-badge rounded-full"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${100 - (userLevel.pointsToNext / (userLevel.totalPoints + userLevel.pointsToNext)) * 100}%` 
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{unlockedBadges.length}</div>
                <div className="text-sm text-mission-gray-400">Badges Earned</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-mission-primary">{userLevel.totalPoints}</div>
                <div className="text-sm text-mission-gray-400">Total Points</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-mission-accent">{badgesInProgress.length}</div>
                <div className="text-sm text-mission-gray-400">In Progress</div>
              </div>
            </div>

            {/* Detailed stats toggle */}
            <AnimatePresence>
              {showStats && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 border-t border-mission-gray-700">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-mission-gray-400">Total Donations:</span>
                        <span className="ml-2 text-white">${userStats.totalDonationAmount}</span>
                      </div>
                      <div>
                        <span className="text-mission-gray-400">AI Interactions:</span>
                        <span className="ml-2 text-white">{userStats.aiInteractions}</span>
                      </div>
                      <div>
                        <span className="text-mission-gray-400">Cases Shared:</span>
                        <span className="ml-2 text-white">{userStats.casesShared}</span>
                      </div>
                      <div>
                        <span className="text-mission-gray-400">Referrals:</span>
                        <span className="ml-2 text-white">{userStats.referrals}</span>
                      </div>
                      <div>
                        <span className="text-mission-gray-400">Active Days:</span>
                        <span className="ml-2 text-white">{userStats.engagementDays}</span>
                      </div>
                      <div>
                        <span className="text-mission-gray-400">Current Streak:</span>
                        <span className="ml-2 text-white">{userStats.streakDays} days</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 Recommended Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.slice(0, 3).map((rec, index) => (
                <motion.div
                  key={rec.badge.id}
                  className="flex items-center gap-3 p-3 bg-mission-gray-800 rounded-lg hover:bg-mission-gray-750 transition-colors cursor-pointer"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleBadgeClick(rec.badge)}
                >
                  <Badge
                    badge={rec.badge}
                    size="sm"
                    showProgress
                    interactive
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{rec.suggestion}</p>
                    <p className="text-mission-gray-400 text-xs">{rec.action}</p>
                  </div>
                  <Button variant="ghost" size="xs">→</Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {/* View mode buttons */}
            {[
              { key: 'all', label: 'All Badges' },
              { key: 'unlocked', label: `Unlocked (${unlockedBadges.length})` },
              { key: 'progress', label: `In Progress (${badgesInProgress.length})` }
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={viewMode === key ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(key as ViewMode)}
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="px-3 py-1 bg-mission-gray-800 border border-mission-gray-700 text-white rounded text-sm"
            >
              <option value="all">All Categories</option>
              <option value="donation">💝 Donation</option>
              <option value="engagement">🎯 Engagement</option>
              <option value="special">⭐ Special</option>
            </select>

            {/* Rarity filter */}
            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value as RarityFilter)}
              className="px-3 py-1 bg-mission-gray-800 border border-mission-gray-700 text-white rounded text-sm"
            >
              <option value="all">All Rarities</option>
              <option value="common">⚪ Common</option>
              <option value="rare">🔵 Rare</option>
              <option value="epic">🟣 Epic</option>
              <option value="legendary">🟡 Legendary</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Badge Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <AnimatePresence mode="popLayout">
          {displayedBadges.map((badge, index) => {
            const definition = getBadgesByCategory('all').find(b => b.id === badge.id)
            const rarity = definition?.rarity || 'common'
            
            return (
              <motion.div
                key={badge.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ 
                  duration: 0.3,
                  delay: index * 0.05
                }}
                className={cn(
                  'relative',
                  getRarityGlow(rarity)
                )}
              >
                <Card 
                  hoverable 
                  className={cn(
                    'cursor-pointer transition-all duration-200 hover:scale-105',
                    badge.unlocked ? 'border-mission-primary/50' : 'border-mission-gray-700'
                  )}
                  onClick={() => handleBadgeClick(badge)}
                >
                  <CardContent className="p-4 text-center">
                    <Badge
                      badge={badge}
                      size="lg"
                      showProgress={!badge.unlocked}
                      showAnimation={badge.unlocked}
                      interactive
                    />
                    
                    <h3 className="font-semibold text-white mt-3 text-sm">
                      {badge.name}
                    </h3>
                    
                    <p className="text-xs text-mission-gray-400 mt-1 line-clamp-2">
                      {badge.description}
                    </p>

                    {/* Rarity indicator */}
                    <div className="mt-2">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        getRarityColor(rarity),
                        'bg-mission-gray-800'
                      )}>
                        {rarity}
                      </span>
                    </div>

                    {/* Progress indicator */}
                    {!badge.unlocked && badge.progress !== undefined && badge.progress > 0 && (
                      <div className="mt-2">
                        <div className="w-full bg-mission-gray-700 rounded-full h-1">
                          <motion.div
                            className="h-1 bg-mission-primary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${badge.progress}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                          />
                        </div>
                        <span className="text-xs text-mission-gray-400 mt-1">
                          {Math.round(badge.progress)}%
                        </span>
                      </div>
                    )}

                    {/* Points */}
                    {definition && (
                      <div className="mt-2 text-xs text-mission-warning">
                        {definition.points} pts
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* New badge indicator */}
                {badge.unlocked && badge.unlockedAt && 
                 Date.now() - badge.unlockedAt.getTime() < 24 * 60 * 60 * 1000 && (
                  <motion.div
                    className="absolute -top-2 -right-2 bg-mission-secondary text-white text-xs px-2 py-1 rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.3 }}
                  >
                    NEW!
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {displayedBadges.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-lg font-semibold text-white mb-2">No badges found</h3>
            <p className="text-mission-gray-400 mb-4">
              Try adjusting your filters or start earning badges!
            </p>
            <Button variant="primary" onClick={onUpgrade}>
              Learn How to Earn Badges
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}