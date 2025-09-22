import { BadgeDefinition, BadgeRequirement, allBadges, getBadgeById } from './badgeDefinitions'
import { BadgeData } from '@/components/ui/Badge'

export interface UserBadgeProgress {
  userId: string
  badgeId: string
  progress: number
  unlocked: boolean
  unlockedAt?: Date
  currentValue: number
  metadata?: Record<string, any>
}

export interface UserStats {
  totalDonationAmount: number
  donationCount: number
  engagementDays: number
  aiInteractions: number
  casesShared: number
  referrals: number
  specialActions: string[]
  joinDate: Date
  lastActiveDate: Date
  streakDays: number
}

export class BadgeSystem {
  
  /**
   * Calculate progress for all badges for a user
   */
  static calculateAllBadgeProgress(userStats: UserStats): UserBadgeProgress[] {
    return allBadges.map(badge => this.calculateBadgeProgress(badge, userStats))
  }

  /**
   * Calculate progress for a specific badge
   */
  static calculateBadgeProgress(badge: BadgeDefinition, userStats: UserStats): UserBadgeProgress {
    let totalProgress = 0
    let currentValue = 0
    let unlocked = true

    // Check each requirement
    for (const requirement of badge.requirements) {
      const reqProgress = this.calculateRequirementProgress(requirement, userStats)
      totalProgress += reqProgress.progress
      currentValue += reqProgress.currentValue

      if (reqProgress.progress < 100) {
        unlocked = false
      }
    }

    // Average progress across all requirements
    const averageProgress = badge.requirements.length > 0 ? totalProgress / badge.requirements.length : 0

    return {
      userId: (userStats as any).userId || 'anonymous',
      badgeId: badge.id,
      progress: Math.min(averageProgress, 100),
      unlocked,
      currentValue,
      unlockedAt: unlocked ? new Date() : undefined
    }
  }

  /**
   * Calculate progress for a single requirement
   */
  private static calculateRequirementProgress(
    requirement: BadgeRequirement, 
    userStats: UserStats
  ): { progress: number; currentValue: number } {
    let currentValue = 0
    let targetValue = 0

    switch (requirement.type) {
      case 'donation_amount':
        currentValue = userStats.totalDonationAmount
        targetValue = Number(requirement.value)
        break

      case 'donation_count':
        currentValue = userStats.donationCount
        targetValue = Number(requirement.value)
        break

      case 'engagement_days':
        currentValue = userStats.engagementDays
        targetValue = Number(requirement.value)
        break

      case 'ai_interactions':
        currentValue = userStats.aiInteractions
        targetValue = Number(requirement.value)
        break

      case 'cases_shared':
        currentValue = userStats.casesShared
        targetValue = Number(requirement.value)
        break

      case 'referrals':
        currentValue = userStats.referrals
        targetValue = Number(requirement.value)
        break

      case 'special_action':
        const hasAction = userStats.specialActions.includes(String(requirement.value))
        currentValue = hasAction ? 1 : 0
        targetValue = 1
        break

      default:
        return { progress: 0, currentValue: 0 }
    }

    const progress = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0
    return { progress, currentValue }
  }

  /**
   * Get unlocked badges for a user
   */
  static getUnlockedBadges(userStats: UserStats): BadgeData[] {
    const progress = this.calculateAllBadgeProgress(userStats)
    
    return progress
      .filter(p => p.unlocked)
      .map(p => {
        const definition = getBadgeById(p.badgeId)!
        return {
          ...definition,
          unlocked: true,
          progress: 100,
          unlockedAt: p.unlockedAt
        }
      })
  }

  /**
   * Get badges in progress for a user
   */
  static getBadgesInProgress(userStats: UserStats): BadgeData[] {
    const progress = this.calculateAllBadgeProgress(userStats)
    
    return progress
      .filter(p => !p.unlocked && p.progress > 0)
      .map(p => {
        const definition = getBadgeById(p.badgeId)!
        return {
          ...definition,
          unlocked: false,
          progress: p.progress
        }
      })
      .sort((a, b) => (b.progress || 0) - (a.progress || 0)) // Sort by progress descending
  }

  /**
   * Get next achievable badges (closest to unlocking)
   */
  static getNextAchievableBadges(userStats: UserStats, limit: number = 3): BadgeData[] {
    const inProgress = this.getBadgesInProgress(userStats)
    return inProgress.slice(0, limit)
  }

  /**
   * Check for newly unlocked badges
   */
  static checkForNewBadges(
    oldUserStats: UserStats, 
    newUserStats: UserStats
  ): BadgeData[] {
    const oldUnlocked = new Set(
      this.getUnlockedBadges(oldUserStats).map(b => b.id)
    )
    const newUnlocked = this.getUnlockedBadges(newUserStats)
    
    return newUnlocked.filter(badge => !oldUnlocked.has(badge.id))
  }

  /**
   * Calculate total badge points for a user
   */
  static calculateTotalPoints(userStats: UserStats): number {
    const unlockedBadges = this.getUnlockedBadges(userStats)
    return unlockedBadges.reduce((total, badge) => {
      const definition = getBadgeById(badge.id)
      return total + (definition?.points || 0)
    }, 0)
  }

  /**
   * Get user's badge level based on total points
   */
  static getUserBadgeLevel(userStats: UserStats): {
    level: number
    title: string
    pointsToNext: number
    totalPoints: number
  } {
    const totalPoints = this.calculateTotalPoints(userStats)
    
    const levels = [
      { level: 1, title: 'Newcomer', requiredPoints: 0 },
      { level: 2, title: 'Helper', requiredPoints: 50 },
      { level: 3, title: 'Supporter', requiredPoints: 150 },
      { level: 4, title: 'Advocate', requiredPoints: 300 },
      { level: 5, title: 'Champion', requiredPoints: 600 },
      { level: 6, title: 'Hero', requiredPoints: 1000 },
      { level: 7, title: 'Legend', requiredPoints: 1500 },
      { level: 8, title: 'Guardian', requiredPoints: 2500 },
      { level: 9, title: 'Savior', requiredPoints: 5000 },
      { level: 10, title: 'Saint', requiredPoints: 10000 }
    ]

    let currentLevel = levels[0]
    let nextLevel = levels[1]

    for (let i = 0; i < levels.length; i++) {
      if (totalPoints >= levels[i].requiredPoints) {
        currentLevel = levels[i]
        nextLevel = levels[i + 1] || levels[i] // Cap at max level
      } else {
        break
      }
    }

    const pointsToNext = nextLevel ? nextLevel.requiredPoints - totalPoints : 0

    return {
      level: currentLevel.level,
      title: currentLevel.title,
      pointsToNext,
      totalPoints
    }
  }

  /**
   * Get badge recommendations based on user activity
   */
  static getBadgeRecommendations(userStats: UserStats): {
    badge: BadgeData
    suggestion: string
    action: string
  }[] {
    const inProgress = this.getBadgesInProgress(userStats)
    const recommendations: { badge: BadgeData; suggestion: string; action: string }[] = []

    // Recommend badges that are close to completion
    inProgress.slice(0, 3).forEach(badge => {
      const definition = getBadgeById(badge.id)!
      const progress = badge.progress || 0

      if (progress > 75) {
        recommendations.push({
          badge,
          suggestion: `You're ${100 - progress}% away from unlocking ${badge.name}!`,
          action: this.getActionSuggestion(definition, userStats)
        })
      } else if (progress > 25) {
        recommendations.push({
          badge,
          suggestion: `Make progress on ${badge.name} - you're ${progress}% there`,
          action: this.getActionSuggestion(definition, userStats)
        })
      }
    })

    // Recommend starter badges for new users
    if (this.getUnlockedBadges(userStats).length === 0) {
      const starterBadges = ['guardian_angel', 'case_detective', 'community_voice']
      starterBadges.forEach(badgeId => {
        const definition = getBadgeById(badgeId)
        if (definition) {
          const badgeData: BadgeData = { ...definition, unlocked: false, progress: 0 }
          recommendations.push({
            badge: badgeData,
            suggestion: `Start your journey with ${definition.name}`,
            action: this.getActionSuggestion(definition, userStats)
          })
        }
      })
    }

    return recommendations
  }

  /**
   * Get specific action suggestion for a badge
   */
  private static getActionSuggestion(badge: BadgeDefinition, userStats: UserStats): string {
    const requirement = badge.requirements[0] // Use first requirement for suggestion

    switch (requirement.type) {
      case 'donation_amount':
        const needed = Number(requirement.value) - userStats.totalDonationAmount
        return needed > 0 ? `Donate $${needed} more` : 'Complete!'

      case 'ai_interactions':
        const aiNeeded = Number(requirement.value) - userStats.aiInteractions
        return aiNeeded > 0 ? `Use AI analysis ${aiNeeded} more times` : 'Complete!'

      case 'cases_shared':
        const shareNeeded = Number(requirement.value) - userStats.casesShared
        return shareNeeded > 0 ? `Share ${shareNeeded} more cases` : 'Complete!'

      case 'engagement_days':
        const daysNeeded = Number(requirement.value) - userStats.engagementDays
        return daysNeeded > 0 ? `Stay active for ${daysNeeded} more days` : 'Complete!'

      case 'referrals':
        const refNeeded = Number(requirement.value) - userStats.referrals
        return refNeeded > 0 ? `Refer ${refNeeded} more friends` : 'Complete!'

      case 'special_action':
        return this.getSpecialActionSuggestion(String(requirement.value))

      default:
        return 'Keep participating!'
    }
  }

  /**
   * Get suggestion for special actions
   */
  private static getSpecialActionSuggestion(actionType: string): string {
    switch (actionType) {
      case 'safety_training_complete':
        return 'Complete the safety education course'
      case 'verified_tip_submitted':
        return 'Submit a verified tip for a missing person case'
      case 'amber_alert_response':
        return 'Respond quickly to the next AMBER Alert'
      case 'founding_member':
        return 'Join during our founding period'
      case 'case_resolution_celebrated':
        return 'Celebrate when a case is successfully resolved'
      default:
        return 'Complete the required action'
    }
  }

  /**
   * Update user stats after an action
   */
  static updateUserStats(
    currentStats: UserStats,
    action: {
      type: 'donation' | 'ai_interaction' | 'case_share' | 'referral' | 'special_action' | 'engagement'
      value?: number
      specialAction?: string
    }
  ): UserStats {
    const newStats = { ...currentStats }
    newStats.lastActiveDate = new Date()

    switch (action.type) {
      case 'donation':
        if (action.value) {
          newStats.totalDonationAmount += action.value
          newStats.donationCount += 1
        }
        break

      case 'ai_interaction':
        newStats.aiInteractions += 1
        break

      case 'case_share':
        newStats.casesShared += 1
        break

      case 'referral':
        newStats.referrals += 1
        break

      case 'special_action':
        if (action.specialAction && !newStats.specialActions.includes(action.specialAction)) {
          newStats.specialActions.push(action.specialAction)
        }
        break

      case 'engagement':
        // Update engagement days and streak
        const today = new Date().toDateString()
        const lastActive = newStats.lastActiveDate.toDateString()
        
        if (today !== lastActive) {
          newStats.engagementDays += 1
          
          // Check if streak continues (within 1 day)
          const daysDiff = Math.floor(
            (new Date().getTime() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24)
          )
          
          if (daysDiff === 1) {
            newStats.streakDays += 1
          } else if (daysDiff > 1) {
            newStats.streakDays = 1 // Reset streak
          }
        }
        break
    }

    return newStats
  }
}