'use client'

import { createContext, useContext, ReactNode, useEffect } from 'react'
import { useBadgeProgress, useBadgeNotifications, BadgeProgressState, BadgeProgressActions } from '@/hooks/useBadgeProgress'
import { BadgeUnlockCelebration } from '@/components/badges'
import { UserTier } from '@/components/access'
import { BadgeData } from '@/components/ui/Badge'

interface BadgeProgressContextType {
  state: BadgeProgressState
  actions: BadgeProgressActions
  notifications: {
    notifications: Array<{
      id: string
      badge: BadgeData
      timestamp: Date
    }>
    addNotification: (badge: BadgeData) => void
    removeNotification: (id: string) => void
    clearAllNotifications: () => void
  }
}

const BadgeProgressContext = createContext<BadgeProgressContextType | null>(null)

interface BadgeProgressProviderProps {
  children: ReactNode
  userId: string | null
  currentTier: UserTier
  enableCelebrations?: boolean
  onBadgeUnlock?: (badge: BadgeData) => void
  onShare?: (badge: BadgeData) => void
  onViewBadges?: () => void
}

export function BadgeProgressProvider({
  children,
  userId,
  currentTier,
  enableCelebrations = true,
  onBadgeUnlock,
  onShare,
  onViewBadges
}: BadgeProgressProviderProps) {
  const [state, actions] = useBadgeProgress(userId, currentTier)
  const notifications = useBadgeNotifications()

  // Handle newly unlocked badges
  useEffect(() => {
    if (state.newlyUnlockedBadges.length > 0) {
      // Add notifications for each new badge
      state.newlyUnlockedBadges.forEach(badge => {
        notifications.addNotification(badge)
        onBadgeUnlock?.(badge)
      })
    }
  }, [state.newlyUnlockedBadges, notifications, onBadgeUnlock])

  // Auto-engagement tracking
  useEffect(() => {
    if (!userId) return

    // Track daily engagement
    const trackEngagement = () => {
      const today = new Date().toDateString()
      const lastTracked = localStorage.getItem(`last_engagement_${userId}`)
      
      if (lastTracked !== today) {
        actions.updateStats({ type: 'engagement' })
        localStorage.setItem(`last_engagement_${userId}`, today)
      }
    }

    // Track immediately and then every hour
    trackEngagement()
    const interval = setInterval(trackEngagement, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [userId, actions])

  const contextValue: BadgeProgressContextType = {
    state,
    actions,
    notifications
  }

  return (
    <BadgeProgressContext.Provider value={contextValue}>
      {children}
      
      {/* Badge unlock celebrations */}
      {enableCelebrations && state.newlyUnlockedBadges.map((badge, index) => (
        <BadgeUnlockCelebration
          key={`${badge.id}-${index}`}
          badge={badge}
          isVisible={true}
          onClose={() => actions.markBadgeAsSeen(badge.id)}
          onShare={() => onShare?.(badge)}
          onViewBadges={onViewBadges}
        />
      ))}
    </BadgeProgressContext.Provider>
  )
}

export function useBadgeProgressContext() {
  const context = useContext(BadgeProgressContext)
  if (!context) {
    throw new Error('useBadgeProgressContext must be used within a BadgeProgressProvider')
  }
  return context
}

// Convenience hooks for specific badge actions
export function useBadgeActions() {
  const { actions } = useBadgeProgressContext()
  
  return {
    // Quick action helpers
    recordDonation: (amount: number) => actions.updateStats({ type: 'donation', value: amount }),
    recordAIInteraction: () => actions.updateStats({ type: 'ai_interaction' }),
    recordCaseShare: () => actions.updateStats({ type: 'case_share' }),
    recordReferral: () => actions.updateStats({ type: 'referral' }),
    recordSpecialAction: (action: string) => actions.updateStats({ type: 'special_action', specialAction: action }),
    
    // Batch actions
    recordMultipleActions: async (actions: Array<{
      type: 'donation' | 'ai_interaction' | 'case_share' | 'referral' | 'special_action'
      value?: number
      specialAction?: string
    }>) => {
      for (const action of actions) {
        await actions.updateStats(action)
      }
    }
  }
}

// Hook for badge statistics and insights
export function useBadgeInsights() {
  const { state } = useBadgeProgressContext()
  
  const insights = {
    // Progress overview
    totalBadges: state.unlockedBadges.length,
    totalPoints: state.userLevel.totalPoints,
    currentLevel: state.userLevel.level,
    nextLevelProgress: state.userLevel.pointsToNext,
    
    // Category breakdown
    donationBadges: state.unlockedBadges.filter(b => b.category === 'donation').length,
    engagementBadges: state.unlockedBadges.filter(b => b.category === 'engagement').length,
    specialBadges: state.unlockedBadges.filter(b => b.category === 'special').length,
    
    // Rarity breakdown
    commonBadges: state.unlockedBadges.filter(b => {
      // Would need to check badge definition for rarity
      return true // Placeholder
    }).length,
    
    // Recent activity
    recentUnlocks: state.unlockedBadges
      .filter(b => b.unlockedAt && Date.now() - b.unlockedAt.getTime() < 7 * 24 * 60 * 60 * 1000)
      .length,
    
    // Goals and recommendations
    topRecommendations: state.recommendations.slice(0, 3),
    nearestGoal: state.badgesInProgress
      .sort((a, b) => (b.progress || 0) - (a.progress || 0))[0],
    
    // Achievements rate
    achievementRate: state.unlockedBadges.length / Math.max(state.userStats.engagementDays, 1),
    
    // Streak information
    currentStreak: state.userStats.streakDays,
    longestStreak: state.userStats.streakDays, // Would track this separately in real app
    
    // Contribution metrics
    totalContribution: state.userStats.totalDonationAmount,
    communityImpact: state.userStats.casesShared + state.userStats.referrals,
    platformEngagement: state.userStats.aiInteractions + state.userStats.engagementDays
  }
  
  return insights
}

// Hook for badge sharing functionality
export function useBadgeSharing() {
  const generateShareText = (badge: BadgeData) => {
    return `I just unlocked the "${badge.name}" badge on SaveThemNow.Jesus! 🏆 ${badge.description} Join me in helping bring missing persons home safely. #SaveThemNow #MissingPersons #CommunitySupport`
  }
  
  const generateShareUrl = (badge: BadgeData) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/badges/${badge.id}?share=true`
  }
  
  const shareToTwitter = (badge: BadgeData) => {
    const text = encodeURIComponent(generateShareText(badge))
    const url = encodeURIComponent(generateShareUrl(badge))
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  }
  
  const shareToFacebook = (badge: BadgeData) => {
    const url = encodeURIComponent(generateShareUrl(badge))
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
  }
  
  const shareToLinkedIn = (badge: BadgeData) => {
    const url = encodeURIComponent(generateShareUrl(badge))
    const title = encodeURIComponent(`Badge Unlocked: ${badge.name}`)
    const summary = encodeURIComponent(badge.description)
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${summary}`, '_blank')
  }
  
  const copyToClipboard = async (badge: BadgeData) => {
    try {
      await navigator.clipboard.writeText(`${generateShareText(badge)} ${generateShareUrl(badge)}`)
      return true
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      return false
    }
  }
  
  return {
    generateShareText,
    generateShareUrl,
    shareToTwitter,
    shareToFacebook,
    shareToLinkedIn,
    copyToClipboard
  }
}