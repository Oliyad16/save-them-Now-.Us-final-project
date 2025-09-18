import { BadgeData } from '@/components/ui/Badge'

export interface BadgeRequirement {
  type: 'donation_amount' | 'donation_count' | 'engagement_days' | 'ai_interactions' | 'cases_shared' | 'referrals' | 'special_action' | 'crisis_response_hours'
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
    name: 'Crisis Responder',
    description: 'Made your first donation to fight the kidnapping crisis',
    icon: '🚨',
    category: 'donation',
    tier: 1,
    requirement: '$5+ donation',
    color: 'badge-guardian',
    requirements: [
      { type: 'donation_amount', value: 5, timeframe: 'all_time' }
    ],
    story: 'Every crisis fighter starts with a single action. Your first donation shows you\'re ready to use technology to battle child kidnapping and save lives.',
    benefits: ['Crisis Responder status', 'Impact tracking dashboard', 'Crisis alerts'],
    rarity: 'common',
    points: 10
  },
  {
    id: 'hope_bringer',
    name: 'Search Coordinator',
    description: 'Funded $25+ worth of AI-powered search technology',
    icon: '🔍',
    category: 'donation',
    tier: 2,
    requirement: '$25+ donation',
    color: 'badge-hope',
    requirements: [
      { type: 'donation_amount', value: 25, timeframe: 'all_time' }
    ],
    story: 'Technology saves lives. Your $25+ contribution powers AI searches that detect patterns human investigators miss, directly helping locate missing children.',
    benefits: ['Search Coordinator status', 'AI search reports', 'Priority case alerts'],
    rarity: 'common',
    points: 25
  },
  {
    id: 'life_saver',
    name: 'Technology Warrior',
    description: 'Powered $100+ in crisis-fighting technology systems',
    icon: '⚔️',
    category: 'donation',
    tier: 3,
    requirement: '$100+ donation',
    color: 'badge-lifesaver',
    requirements: [
      { type: 'donation_amount', value: 100, timeframe: 'all_time' }
    ],
    story: 'You are fighting with the most powerful weapon: technology. Your $100+ funds AI systems, rapid response networks, and detection algorithms that save children\'s lives.',
    benefits: ['Technology Warrior status', 'Advanced system access', 'Crisis response coordination'],
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
    name: 'Crisis Analyst',
    description: 'Used AI systems 10+ times to analyze kidnapping patterns',
    icon: '🤖',
    category: 'engagement',
    tier: 1,
    requirement: '10 AI interactions',
    color: 'badge-detective',
    requirements: [
      { type: 'ai_interactions', value: 10, timeframe: 'all_time' }
    ],
    story: 'Data reveals truth. Your 10+ AI interactions show you\'re actively using technology to uncover kidnapping patterns and help law enforcement respond faster.',
    benefits: ['Crisis Analyst status', 'AI pattern reports', 'Prediction algorithms access'],
    rarity: 'common',
    points: 15
  },
  {
    id: 'community_voice',
    name: 'Crisis Mobilizer',
    description: 'Shared 5+ urgent cases to mobilize community response',
    icon: '📡',
    category: 'engagement',
    tier: 1,
    requirement: '5 cases shared',
    color: 'badge-voice',
    requirements: [
      { type: 'cases_shared', value: 5, timeframe: 'all_time' }
    ],
    story: 'Community coordination saves children. By sharing 5+ urgent cases, you\'re mobilizing rapid response networks and expanding the search radius exponentially.',
    benefits: ['Crisis Mobilizer status', 'Community network access', 'Rapid alert system'],
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

// Crisis Fighter Badges - New category for crisis-specific achievements
export const crisisFighterBadges: BadgeDefinition[] = [
  {
    id: 'rapid_responder',
    name: 'Rapid Responder',
    description: 'Responded to 5+ crisis alerts within 1 hour',
    icon: '⚡',
    category: 'special',
    tier: 1,
    requirement: '5+ rapid responses',
    color: 'badge-responder',
    requirements: [
      { type: 'special_action', value: 'rapid_crisis_response_5' }
    ],
    story: 'Speed saves lives in crisis situations. Your rapid response to 5+ alerts shows you understand that the first hours are critical in missing child cases.',
    benefits: ['Rapid Responder status', 'Priority alert notifications', 'Emergency response team access'],
    rarity: 'rare',
    points: 75
  },
  {
    id: 'crisis_commander',
    name: 'Crisis Commander',
    description: 'Coordinated community response for 3+ critical cases',
    icon: '🎖️',
    category: 'special',
    tier: 2,
    requirement: 'Community coordination',
    color: 'badge-hero',
    requirements: [
      { type: 'special_action', value: 'crisis_coordination_3' }
    ],
    story: 'Leadership in crisis defines heroes. Your coordination of community response for 3+ critical cases shows exceptional commitment to fighting child kidnapping.',
    benefits: ['Crisis Commander status', 'Community leadership tools', 'Direct law enforcement contact'],
    rarity: 'epic',
    points: 200
  },
  {
    id: 'ai_pioneer',
    name: 'AI Pioneer',
    description: 'First to use new AI detection algorithms for pattern analysis',
    icon: '🧠',
    category: 'special',
    tier: 1,
    requirement: 'Beta AI access',
    color: 'badge-detective',
    requirements: [
      { type: 'special_action', value: 'ai_beta_pioneer' }
    ],
    story: 'Innovation drives progress. As an AI Pioneer, you helped test cutting-edge algorithms that detect kidnapping patterns and predict high-risk scenarios.',
    benefits: ['AI Pioneer status', 'Beta feature access', 'Algorithm development input'],
    rarity: 'legendary',
    points: 150
  }
]

// Combine all badges
export const allBadges: BadgeDefinition[] = [
  ...donationBadges,
  ...engagementBadges,
  ...specialBadges,
  ...seasonalBadges,
  ...crisisFighterBadges
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