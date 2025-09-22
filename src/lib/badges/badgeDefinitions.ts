import { BadgeData } from '@/components/ui/Badge'

export interface BadgeRequirement {
  type: 'donation_amount' | 'donation_count' | 'engagement_days' | 'ai_interactions' | 'cases_shared' | 'referrals' | 'special_action'
  value: number | string
  timeframe?: 'all_time' | 'monthly' | 'yearly'
}

export interface BadgeDefinition extends Omit<BadgeData, 'unlocked' | 'progress' | 'unlockedAt'> {
  requirements: BadgeRequirement[]
  story: string
  benefits: string[]
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  points: number
}

// Donation Badges
export const donationBadges: BadgeDefinition[] = [
  {
    id: 'guardian_angel',
    name: 'Guardian Angel',
    description: 'Made your first donation to help save lives',
    icon: '👼',
    category: 'donation',
    tier: 1,
    requirement: '$5+ donation',
    color: 'badge-guardian',
    requirements: [
      { type: 'donation_amount', value: 5, timeframe: 'all_time' }
    ],
    story: 'Every guardian angel starts with a single act of kindness. Your first donation shows you believe in our mission to bring missing persons home safely.',
    benefits: ['Special guardian status', 'Donation history tracking', 'Thank you email'],
    rarity: 'common',
    points: 10
  },
  {
    id: 'hope_bringer',
    name: 'Hope Bringer',
    description: 'Donated $25+ to bring hope to families in need',
    icon: '🕊️',
    category: 'donation',
    tier: 2,
    requirement: '$25+ donation',
    color: 'badge-hope',
    requirements: [
      { type: 'donation_amount', value: 25, timeframe: 'all_time' }
    ],
    story: 'Hope is powerful. Your generous contribution of $25+ helps fund advanced search technologies and brings hope to families searching for their loved ones.',
    benefits: ['Hope Bringer status', 'Monthly impact reports', 'Early feature access'],
    rarity: 'common',
    points: 25
  },
  {
    id: 'life_saver',
    name: 'Life Saver',
    description: 'Contributed $100+ to life-saving search efforts',
    icon: '🛟',
    category: 'donation',
    tier: 3,
    requirement: '$100+ donation',
    color: 'badge-lifesaver',
    requirements: [
      { type: 'donation_amount', value: 100, timeframe: 'all_time' }
    ],
    story: 'You are literally saving lives. Your $100+ contribution funds critical search operations, AI analysis tools, and emergency response systems.',
    benefits: ['Life Saver recognition', 'Quarterly donor calls', 'Impact dashboard access'],
    rarity: 'rare',
    points: 100
  },
  {
    id: 'missing_hero_champion',
    name: 'Missing Hero Champion',
    description: 'Donated $500+ to champion missing persons causes',
    icon: '🦸',
    category: 'donation',
    tier: 4,
    requirement: '$500+ donation',
    color: 'badge-hero',
    requirements: [
      { type: 'donation_amount', value: 500, timeframe: 'all_time' }
    ],
    story: 'Heroes are made by their actions. Your $500+ donation makes you a true champion for missing persons, funding major search operations and technology development.',
    benefits: ['Hero Champion status', 'Personal thank you call', 'Beta feature access', 'Annual impact meeting'],
    rarity: 'epic',
    points: 500
  },
  {
    id: 'diamond_defender',
    name: 'Diamond Defender',
    description: 'Ultimate protector with $1000+ in total donations',
    icon: '💎',
    category: 'donation',
    tier: 5,
    requirement: '$1000+ total',
    color: 'badge-diamond',
    requirements: [
      { type: 'donation_amount', value: 1000, timeframe: 'all_time' }
    ],
    story: 'Diamonds are forever, and so is your impact. Your $1000+ total contribution establishes you as a Diamond Defender, supporting countless families and funding breakthrough technologies.',
    benefits: ['Diamond Defender status', 'Annual appreciation event', 'Direct line to leadership', 'Custom impact reports'],
    rarity: 'legendary',
    points: 1000
  }
]

// Engagement Badges
export const engagementBadges: BadgeDefinition[] = [
  {
    id: 'case_detective',
    name: 'Case Detective',
    description: 'Used AI analysis 10+ times to investigate cases',
    icon: '🔍',
    category: 'engagement',
    tier: 1,
    requirement: '10 AI interactions',
    color: 'badge-detective',
    requirements: [
      { type: 'ai_interactions', value: 10, timeframe: 'all_time' }
    ],
    story: 'Every great detective starts with curiosity. Your 10+ AI interactions show you\'re actively investigating cases and seeking answers for missing persons.',
    benefits: ['Detective status', 'AI interaction history', 'Advanced search tips'],
    rarity: 'common',
    points: 15
  },
  {
    id: 'community_voice',
    name: 'Community Voice',
    description: 'Shared 5+ missing person cases to spread awareness',
    icon: '📢',
    category: 'engagement',
    tier: 1,
    requirement: '5 cases shared',
    color: 'badge-voice',
    requirements: [
      { type: 'cases_shared', value: 5, timeframe: 'all_time' }
    ],
    story: 'Your voice matters in bringing people home. By sharing 5+ cases, you\'re amplifying awareness and potentially saving lives through community action.',
    benefits: ['Community Voice status', 'Sharing analytics', 'Social media templates'],
    rarity: 'common',
    points: 20
  },
  {
    id: 'safety_expert',
    name: 'Safety Expert',
    description: 'Completed safety education modules and quizzes',
    icon: '🛡️',
    category: 'engagement',
    tier: 2,
    requirement: 'Complete safety training',
    color: 'badge-expert',
    requirements: [
      { type: 'special_action', value: 'safety_training_complete' }
    ],
    story: 'Knowledge is the best protection. By completing our safety education, you\'re equipped to protect yourself and others while supporting missing persons cases.',
    benefits: ['Safety Expert certification', 'Advanced safety resources', 'Emergency contact features'],
    rarity: 'rare',
    points: 50
  },
  {
    id: 'first_responder',
    name: 'First Responder',
    description: 'Quickly reported new missing person information',
    icon: '🚑',
    category: 'engagement',
    tier: 2,
    requirement: 'Submit verified tip',
    color: 'badge-responder',
    requirements: [
      { type: 'special_action', value: 'verified_tip_submitted' }
    ],
    story: 'First responders save lives through quick action. Your verified tip submission shows you\'re actively helping locate missing persons and supporting families in crisis.',
    benefits: ['First Responder recognition', 'Priority tip handling', 'Direct law enforcement contact'],
    rarity: 'rare',
    points: 75
  },
  {
    id: 'streak_keeper',
    name: 'Streak Keeper',
    description: 'Maintained 30+ day engagement streak',
    icon: '🔥',
    category: 'engagement',
    tier: 3,
    requirement: '30-day streak',
    color: 'badge-streak',
    requirements: [
      { type: 'engagement_days', value: 30, timeframe: 'all_time' }
    ],
    story: 'Consistency creates impact. Your 30+ day engagement streak demonstrates unwavering commitment to helping missing persons and supporting families in need.',
    benefits: ['Streak Keeper status', 'Daily engagement rewards', 'Streak milestone celebrations'],
    rarity: 'epic',
    points: 150
  }
]

// Special Recognition Badges
export const specialBadges: BadgeDefinition[] = [
  {
    id: 'founding_member',
    name: 'Founding Member',
    description: 'Early supporter who joined during the founding period',
    icon: '🏛️',
    category: 'special',
    tier: 1,
    requirement: 'Joined during beta',
    color: 'badge-guardian',
    requirements: [
      { type: 'special_action', value: 'founding_member' }
    ],
    story: 'Founding members build the future. You joined SaveThemNow.Jesus during our founding period, helping establish the foundation for bringing missing persons home.',
    benefits: ['Founding Member status', 'Lifetime founder recognition', 'Special founder events'],
    rarity: 'legendary',
    points: 200
  },
  {
    id: 'emergency_hero',
    name: 'Emergency Hero',
    description: 'Responded to critical AMBER Alert within 1 hour',
    icon: '⚡',
    category: 'special',
    tier: 1,
    requirement: 'AMBER Alert response',
    color: 'badge-responder',
    requirements: [
      { type: 'special_action', value: 'amber_alert_response' }
    ],
    story: 'Heroes act when it matters most. Your rapid response to an AMBER Alert shows you\'re ready to help when children\'s lives are in immediate danger.',
    benefits: ['Emergency Hero status', 'AMBER Alert priority notifications', 'Emergency response team access'],
    rarity: 'epic',
    points: 300
  },
  {
    id: 'community_builder',
    name: 'Community Builder',
    description: 'Referred 10+ new members to join the mission',
    icon: '🏗️',
    category: 'special',
    tier: 2,
    requirement: '10+ referrals',
    color: 'badge-voice',
    requirements: [
      { type: 'referrals', value: 10, timeframe: 'all_time' }
    ],
    story: 'Communities save lives. By referring 10+ new members, you\'re building a stronger network of people committed to bringing missing persons home safely.',
    benefits: ['Community Builder status', 'Referral rewards program', 'Community leadership opportunities'],
    rarity: 'rare',
    points: 100
  },
  {
    id: 'safety_educator',
    name: 'Safety Educator',
    description: 'Shared safety resources with 25+ people',
    icon: '🎓',
    category: 'special',
    tier: 2,
    requirement: '25+ safety shares',
    color: 'badge-expert',
    requirements: [
      { type: 'special_action', value: 'safety_shares_25' }
    ],
    story: 'Education prevents tragedy. By sharing safety resources with 25+ people, you\'re proactively protecting communities and preventing missing person cases.',
    benefits: ['Safety Educator certification', 'Educational resource library', 'Community workshop access'],
    rarity: 'rare',
    points: 80
  },
  {
    id: 'hope_ambassador',
    name: 'Hope Ambassador',
    description: 'Celebrated a successful case resolution',
    icon: '🌟',
    category: 'special',
    tier: 1,
    requirement: 'Case resolution celebration',
    color: 'badge-hope',
    requirements: [
      { type: 'special_action', value: 'case_resolution_celebrated' }
    ],
    story: 'Hope realized is joy shared. Your celebration of a successful case resolution shows the power of community support in bringing families back together.',
    benefits: ['Hope Ambassador status', 'Success story sharing', 'Family reunion event invites'],
    rarity: 'rare',
    points: 60
  }
]

// Monthly/Seasonal Badges
export const seasonalBadges: BadgeDefinition[] = [
  {
    id: 'holiday_helper',
    name: 'Holiday Helper',
    description: 'Made special holiday donation to help families reunite',
    icon: '🎄',
    category: 'special',
    tier: 1,
    requirement: 'Holiday donation',
    color: 'badge-guardian',
    requirements: [
      { type: 'special_action', value: 'holiday_donation' }
    ],
    story: 'Holidays are about being together. Your special holiday donation helps ensure more families can reunite during the most important times of the year.',
    benefits: ['Holiday Helper status', 'Seasonal donation matching', 'Holiday family reunion stories'],
    rarity: 'rare',
    points: 40
  },
  {
    id: 'summer_guardian',
    name: 'Summer Guardian',
    description: 'Maintained high engagement during peak missing person season',
    icon: '☀️',
    category: 'special',
    tier: 1,
    requirement: 'Summer engagement',
    color: 'badge-guardian',
    requirements: [
      { type: 'special_action', value: 'summer_engagement' }
    ],
    story: 'Summer brings both joy and increased risk. Your dedication during peak missing person season helps protect vulnerable individuals when they need it most.',
    benefits: ['Summer Guardian status', 'Seasonal safety tips', 'Summer event access'],
    rarity: 'rare',
    points: 50
  }
]

// Combine all badges
export const allBadges: BadgeDefinition[] = [
  ...donationBadges,
  ...engagementBadges,
  ...specialBadges,
  ...seasonalBadges
]

// Badge lookup functions
export const getBadgeById = (id: string): BadgeDefinition | undefined => {
  return allBadges.find(badge => badge.id === id)
}

export const getBadgesByCategory = (category: string): BadgeDefinition[] => {
  return allBadges.filter(badge => badge.category === category)
}

export const getBadgesByRarity = (rarity: string): BadgeDefinition[] => {
  return allBadges.filter(badge => badge.rarity === rarity)
}

export const getBadgesByTier = (tier: number): BadgeDefinition[] => {
  return allBadges.filter(badge => badge.tier === tier)
}