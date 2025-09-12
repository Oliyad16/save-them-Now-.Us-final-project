'use client'

import { useState, useEffect, useCallback } from 'react'
import { BadgeData } from '@/components/ui/Badge'
import { BadgeSystem, UserStats } from '@/lib/badges/badgeSystem'
import { UserTier } from '@/components/access'

export interface BadgeProgressState {
  userStats: UserStats
  unlockedBadges: BadgeData[]
  badgesInProgress: BadgeData[]
  userLevel: {
    level: number
    title: string
    pointsToNext: number
    totalPoints: number
  }
  recommendations: Array<{
    badge: BadgeData
    suggestion: string
    action: string
  }>
  newlyUnlockedBadges: BadgeData[]
  isLoading: boolean
  error: string | null
}

export interface BadgeProgressActions {
  updateStats: (action: {
    type: 'donation' | 'ai_interaction' | 'case_share' | 'referral' | 'special_action' | 'engagement'
    value?: number
    specialAction?: string
  }) => Promise<void>
  markBadgeAsSeen: (badgeId: string) => void
  refreshProgress: () => Promise<void>
  clearNewBadges: () => void
}

// Mock user stats for development - replace with actual API calls
const createMockUserStats = (userId: string): UserStats => ({
  totalDonationAmount: 0,
  donationCount: 0,
  engagementDays: 1,
  aiInteractions: 0,
  casesShared: 0,
  referrals: 0,
  specialActions: [],
  joinDate: new Date(),
  lastActiveDate: new Date(),
  streakDays: 1
})

export function useBadgeProgress(
  userId: string | null,
  currentTier: UserTier
): [BadgeProgressState, BadgeProgressActions] {
  const [state, setState] = useState<BadgeProgressState>({
    userStats: createMockUserStats(userId || 'anonymous'),
    unlockedBadges: [],
    badgesInProgress: [],
    userLevel: { level: 1, title: 'Newcomer', pointsToNext: 50, totalPoints: 0 },
    recommendations: [],
    newlyUnlockedBadges: [],
    isLoading: true,
    error: null
  })

  // Load initial badge progress
  const loadBadgeProgress = useCallback(async () => {
    if (!userId) {
      setState(prev => ({ ...prev, isLoading: false }))
      return
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      // In a real implementation, this would be an API call
      // For now, we'll simulate loading from localStorage and API
      const storedStats = localStorage.getItem(`badge_stats_${userId}`)
      let userStats = storedStats 
        ? JSON.parse(storedStats) 
        : createMockUserStats(userId)

      // Convert date strings back to Date objects
      userStats.joinDate = new Date(userStats.joinDate)
      userStats.lastActiveDate = new Date(userStats.lastActiveDate)

      // Calculate badge progress
      const unlockedBadges = BadgeSystem.getUnlockedBadges(userStats)
      const badgesInProgress = BadgeSystem.getBadgesInProgress(userStats)
      const userLevel = BadgeSystem.getUserBadgeLevel(userStats)
      const recommendations = BadgeSystem.getBadgeRecommendations(userStats)

      setState(prev => ({
        ...prev,
        userStats,
        unlockedBadges,
        badgesInProgress,
        userLevel,
        recommendations,
        isLoading: false
      }))

    } catch (error) {
      console.error('Failed to load badge progress:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to load badge progress',
        isLoading: false
      }))
    }
  }, [userId])

  // Update user stats after an action
  const updateStats = useCallback(async (action: {
    type: 'donation' | 'ai_interaction' | 'case_share' | 'referral' | 'special_action' | 'engagement'
    value?: number
    specialAction?: string
  }) => {
    if (!userId) return

    try {
      const oldStats = state.userStats
      const newStats = BadgeSystem.updateUserStats(oldStats, action)

      // Check for newly unlocked badges
      const newlyUnlocked = BadgeSystem.checkForNewBadges(oldStats, newStats)

      // Calculate updated progress
      const unlockedBadges = BadgeSystem.getUnlockedBadges(newStats)
      const badgesInProgress = BadgeSystem.getBadgesInProgress(newStats)
      const userLevel = BadgeSystem.getUserBadgeLevel(newStats)
      const recommendations = BadgeSystem.getBadgeRecommendations(newStats)

      // Update state
      setState(prev => ({
        ...prev,
        userStats: newStats,
        unlockedBadges,
        badgesInProgress,
        userLevel,
        recommendations,
        newlyUnlockedBadges: [...prev.newlyUnlockedBadges, ...newlyUnlocked]
      }))

      // Persist to localStorage (in real app, this would be an API call)
      localStorage.setItem(`badge_stats_${userId}`, JSON.stringify(newStats))

      // In a real implementation, also sync with backend
      await syncWithBackend(userId, newStats, action)

    } catch (error) {
      console.error('Failed to update badge progress:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to update badge progress'
      }))
    }
  }, [userId, state.userStats])

  const markBadgeAsSeen = useCallback((badgeId: string) => {
    setState(prev => ({
      ...prev,
      newlyUnlockedBadges: prev.newlyUnlockedBadges.filter(badge => badge.id !== badgeId)
    }))
  }, [])

  const refreshProgress = useCallback(async () => {
    await loadBadgeProgress()
  }, [loadBadgeProgress])

  const clearNewBadges = useCallback(() => {
    setState(prev => ({
      ...prev,
      newlyUnlockedBadges: []
    }))
  }, [])

  // Load initial data
  useEffect(() => {
    loadBadgeProgress()
  }, [loadBadgeProgress])

  // Auto-save stats periodically
  useEffect(() => {
    if (!userId) return

    const interval = setInterval(() => {
      localStorage.setItem(`badge_stats_${userId}`, JSON.stringify(state.userStats))
    }, 30000) // Save every 30 seconds

    return () => clearInterval(interval)
  }, [userId, state.userStats])

  return [
    state,
    {
      updateStats,
      markBadgeAsSeen,
      refreshProgress,
      clearNewBadges
    }
  ]
}

// Mock backend sync function
async function syncWithBackend(
  userId: string, 
  userStats: UserStats, 
  action: any
): Promise<void> {
  // In a real implementation, this would make API calls to:
  // 1. Update user stats in database
  // 2. Log badge progress events
  // 3. Trigger any backend badge processing
  // 4. Send notifications for achievements
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // For now, just log the action
    console.log('Badge progress synced:', {
      userId,
      action,
      stats: {
        totalPoints: BadgeSystem.calculateTotalPoints(userStats),
        unlockedBadges: BadgeSystem.getUnlockedBadges(userStats).length,
        level: BadgeSystem.getUserBadgeLevel(userStats).level
      }
    })
  } catch (error) {
    console.error('Failed to sync with backend:', error)
    // In production, you might want to queue failed syncs for retry
  }
}

// Helper hook for badge notifications
export function useBadgeNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string
    badge: BadgeData
    timestamp: Date
  }>>([])

  const addNotification = useCallback((badge: BadgeData) => {
    const notification = {
      id: `${badge.id}-${Date.now()}`,
      badge,
      timestamp: new Date()
    }
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]) // Keep last 5
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
    }, 10000)
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications
  }
}

// Helper hook for badge analytics
export function useBadgeAnalytics(userStats: UserStats) {
  const analytics = {
    // Completion rates
    donationCompletionRate: Math.min((userStats.totalDonationAmount / 1000) * 100, 100),
    engagementRate: Math.min((userStats.engagementDays / 30) * 100, 100),
    
    // Progress tracking
    totalProgress: BadgeSystem.calculateAllBadgeProgress(userStats)
      .reduce((sum, progress) => sum + progress.progress, 0) / 
      BadgeSystem.calculateAllBadgeProgress(userStats).length,
    
    // Insights
    strongestCategory: (() => {
      const categoryProgress = {
        donation: userStats.totalDonationAmount > 0 ? 100 : 0,
        engagement: Math.min((userStats.engagementDays / 30) * 100, 100),
        special: userStats.specialActions.length * 20
      }
      
      return Object.entries(categoryProgress)
        .sort(([,a], [,b]) => b - a)[0][0]
    })(),
    
    // Recommendations
    nextMilestone: (() => {
      const level = BadgeSystem.getUserBadgeLevel(userStats)
      if (level.pointsToNext > 0) {
        return `${level.pointsToNext} points to Level ${level.level + 1}`
      }
      return 'Max level reached!'
    })()
  }

  return analytics
}