import { getServerSession } from 'next-auth/next'
import { authConfig } from './auth-config'
import { getDatabase } from '@/lib/database/connection'

// Define subscription tiers with their permissions
export const SUBSCRIPTION_TIERS = {
  ANONYMOUS: {
    name: 'anonymous',
    mapAccess: 'basic',
    aiInteractionsPerDay: 1, // AI teaser only
    searchFilters: 'basic',
    features: []
  },
  FREE: {
    name: 'free',
    mapAccess: 'basic',
    aiInteractionsPerDay: 3,
    searchFilters: 'basic',
    features: ['account_dashboard']
  },
  SUPPORTER: {
    name: 'supporter',
    mapAccess: 'full',
    aiInteractionsPerDay: -1, // unlimited
    searchFilters: 'advanced',
    features: ['account_dashboard', 'no_ads', 'priority_cases']
  },
  ADVOCATE: {
    name: 'advocate',
    mapAccess: 'full',
    aiInteractionsPerDay: -1,
    searchFilters: 'advanced',
    features: ['account_dashboard', 'no_ads', 'priority_cases', 'advanced_analytics', 'early_access']
  },
  GUARDIAN: {
    name: 'guardian',
    mapAccess: 'premium',
    aiInteractionsPerDay: -1,
    searchFilters: 'premium',
    features: ['account_dashboard', 'no_ads', 'priority_cases', 'advanced_analytics', 'early_access', 'api_access', 'custom_reports']
  },
  HERO: {
    name: 'hero',
    mapAccess: 'enterprise',
    aiInteractionsPerDay: -1,
    searchFilters: 'premium',
    features: ['account_dashboard', 'no_ads', 'priority_cases', 'advanced_analytics', 'early_access', 'api_access', 'custom_reports', 'direct_communication', 'influence_roadmap']
  }
}

// Helper to get user's subscription tier
export async function getUserTier(userId?: string): Promise<keyof typeof SUBSCRIPTION_TIERS> {
  if (!userId) return 'ANONYMOUS'
  
  const db = getDatabase()
  const subscription = db.prepare(`
    SELECT st.name, s.status, s.current_period_end 
    FROM subscriptions s
    JOIN subscription_tiers st ON s.tier_id = st.id
    WHERE s.user_id = ? AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1
  `).get(userId) as any

  if (!subscription) return 'FREE'

  // Check if subscription has expired
  if (subscription.current_period_end) {
    const expiryDate = new Date(subscription.current_period_end)
    if (expiryDate < new Date()) {
      return 'FREE' // Expired subscription defaults to free
    }
  }

  const tierName = subscription.name.toUpperCase()
  return (tierName as keyof typeof SUBSCRIPTION_TIERS) || 'FREE'
}

// Check if user has specific permission
export async function hasPermission(userId: string | undefined, feature: string): Promise<boolean> {
  const tier = await getUserTier(userId)
  const tierConfig = SUBSCRIPTION_TIERS[tier]
  
  return (tierConfig.features as string[]).includes(feature)
}

// Check map access level
export async function getMapAccessLevel(userId?: string): Promise<'basic' | 'full' | 'premium' | 'enterprise'> {
  const tier = await getUserTier(userId)
  return SUBSCRIPTION_TIERS[tier].mapAccess as any
}

// Check AI interaction limits
export async function checkAIInteractionLimit(userId?: string): Promise<{ allowed: boolean, remaining: number }> {
  const tier = await getUserTier(userId)
  const dailyLimit = SUBSCRIPTION_TIERS[tier].aiInteractionsPerDay
  
  // Unlimited for paid tiers
  if (dailyLimit === -1) {
    return { allowed: true, remaining: -1 }
  }

  // Check daily usage for limited tiers
  if (userId) {
    const db = getDatabase()
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    
    const usage = db.prepare(`
      SELECT COUNT(*) as count 
      FROM user_activity 
      WHERE user_id = ? 
        AND activity_type = 'ai_interaction' 
        AND DATE(created_at) = ?
    `).get(userId, today) as any

    const used = usage?.count || 0
    const remaining = Math.max(0, dailyLimit - used)
    
    return {
      allowed: remaining > 0,
      remaining
    }
  }

  // Anonymous users get 1 teaser
  return {
    allowed: dailyLimit > 0,
    remaining: dailyLimit
  }
}

// Middleware to check user permissions
export async function requireAuth() {
  const session = await getServerSession(authConfig)
  
  if (!session?.user) {
    throw new Error('Authentication required')
  }
  
  return session
}

// Middleware to check specific tier
export async function requireTier(requiredTier: keyof typeof SUBSCRIPTION_TIERS) {
  const session = await requireAuth()
  const userTier = await getUserTier(session.user?.email || undefined)
  
  const tierHierarchy = ['ANONYMOUS', 'FREE', 'SUPPORTER', 'ADVOCATE', 'GUARDIAN', 'HERO']
  const requiredLevel = tierHierarchy.indexOf(requiredTier)
  const userLevel = tierHierarchy.indexOf(userTier)
  
  if (userLevel < requiredLevel) {
    throw new Error(`Subscription tier '${requiredTier}' required`)
  }
  
  return session
}

// Rate limiting helper
export async function checkRateLimit(
  identifier: string, // userId or IP address
  endpoint: string,
  windowMinutes: number = 60,
  maxRequests: number = 100
): Promise<{ allowed: boolean, remaining: number, resetTime: Date }> {
  const db = getDatabase()
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)
  const windowEnd = new Date(Date.now() + windowMinutes * 60 * 1000)

  // Clean up old entries
  db.prepare(`
    DELETE FROM rate_limits 
    WHERE window_end < ? 
  `).run(new Date().toISOString())

  // Check current usage
  const currentUsage = db.prepare(`
    SELECT requests_count 
    FROM rate_limits 
    WHERE (user_id = ? OR ip_address = ?) 
      AND endpoint = ? 
      AND window_end > ?
  `).get(identifier, identifier, endpoint, new Date().toISOString()) as any

  if (!currentUsage) {
    // First request in this window
    db.prepare(`
      INSERT INTO rate_limits (user_id, ip_address, endpoint, requests_count, window_start, window_end)
      VALUES (?, ?, ?, 1, ?, ?)
    `).run(
      identifier.match(/^\d+$/) ? identifier : null, // user_id if numeric
      identifier.match(/^\d+$/) ? null : identifier, // ip_address if not numeric
      endpoint,
      windowStart.toISOString(),
      windowEnd.toISOString()
    )

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: windowEnd
    }
  }

  const requestsCount = currentUsage.requests_count
  
  if (requestsCount >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: windowEnd
    }
  }

  // Increment request count
  db.prepare(`
    UPDATE rate_limits 
    SET requests_count = requests_count + 1 
    WHERE (user_id = ? OR ip_address = ?) 
      AND endpoint = ? 
      AND window_end > ?
  `).run(identifier, identifier, endpoint, new Date().toISOString())

  return {
    allowed: true,
    remaining: maxRequests - requestsCount - 1,
    resetTime: windowEnd
  }
}

// Track AI interaction
export async function trackAIInteraction(userId?: string) {
  if (!userId) return

  const db = getDatabase()
  db.prepare(`
    INSERT INTO user_activity (user_id, activity_type, activity_data) 
    VALUES (?, 'ai_interaction', '{"timestamp": "' + datetime('now') + '"}')
  `).run(userId)
}