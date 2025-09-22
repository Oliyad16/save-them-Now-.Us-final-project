'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BadgeShowcase } from '@/components/badges'
import { UnifiedHeader } from '@/components/navigation/UnifiedHeader'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { LoadingState, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { motion } from 'framer-motion'

interface Subscription {
  tier: string
  status: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  features: Record<string, any>
  aiInteractionsPerDay: number
  mapAccessLevel: string
  priceMonthly?: number
  priceYearly?: number
}

interface Donation {
  id: number
  amount: number
  donationType: string
  createdAt: string
  anonymous: boolean
}

export default function Profile() {
  const { data: session, status } = useSession()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const [donationSummary, setDonationSummary] = useState({ totalDonated: 0, totalDonations: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      redirect('/auth/signin')
      return
    }

    fetchUserData()
  }, [session, status])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      
      // Fetch subscription data
      const subResponse = await fetch('/api/subscriptions')
      const subData = await subResponse.json()
      setSubscription(subData)

      // Fetch donation history
      const donationResponse = await fetch('/api/donations')
      const donationData = await donationResponse.json()
      setDonations(donationData.donations || [])
      setDonationSummary(donationData.summary || { totalDonated: 0, totalDonations: 0 })

    } catch (err) {
      setError('Failed to load profile data')
      console.error('Profile error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of your current billing period.')) {
      return
    }

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchUserData() // Refresh data
        alert('Subscription will be canceled at the end of the current period.')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (err) {
      alert('Failed to cancel subscription')
    }
  }

  const handleReactivateSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'reactivate' })
      })

      if (response.ok) {
        fetchUserData() // Refresh data
        alert('Subscription reactivated successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (err) {
      alert('Failed to reactivate subscription')
    }
  }

  // Generate user stats for badge system
  const userStats = {
    totalDonationAmount: donationSummary.totalDonated,
    donationCount: donationSummary.totalDonations,
    engagementDays: 120, // This would come from actual user engagement tracking
    aiInteractions: 45, // This would come from actual AI interaction tracking
    casesShared: 45, // This would come from actual sharing tracking
    referrals: 8, // This would come from actual referral tracking
    specialActions: ['first_donation', 'share_milestone'] as any[],
    joinDate: new Date('2024-01-01'), // This would come from user creation date
    lastActiveDate: new Date(),
    streakDays: 30 // This would come from actual streak tracking
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <LoadingState 
          type="spinner" 
          message="Loading profile..." 
          size="lg"
        />
      </div>
    )
  }

  if (!session) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <UnifiedHeader />
      
      <div className="container mx-auto px-4 py-4">
        <Breadcrumbs />
      </div>

      {/* Hero Section */}
      <motion.section 
        className="py-8 bg-gradient-to-b from-black to-mission-gray-900"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              👤 Profile
            </h1>
            <p className="text-mission-gray-300 text-lg">
              Welcome back, {session.user?.name || session.user?.email}
            </p>
          </motion.div>
        </div>
      </motion.section>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <Card className="bg-mission-secondary/10 border-mission-secondary/30 p-4 mb-6">
            <div className="text-mission-secondary">{error}</div>
          </Card>
        )}

        {/* Badge Showcase - Top Section */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <BadgeShowcase 
            userStats={userStats}
            currentTier={(subscription?.tier as any) || 'free'}
            onUpgrade={() => window.open('/pricing', '_blank')}
          />
        </motion.div>

        {/* Account Overview */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card className="lg:col-span-2 p-6">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                👤 Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-mission-gray-700">
                <span className="text-mission-gray-400">Email:</span>
                <span className="text-white">{session.user?.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-mission-gray-700">
                <span className="text-mission-gray-400">Name:</span>
                <span className="text-white">{session.user?.name || 'Not provided'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-mission-gray-400">Member since:</span>
                <span className="text-white">Account created</span>
              </div>
            </CardContent>
          </Card>

          <Card className="p-6">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                💎 Impact Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-mission-gray-700">
                <span className="text-mission-gray-400">Total Donated:</span>
                <span className="font-semibold text-green-400">
                  ${donationSummary.totalDonated.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-mission-gray-700">
                <span className="text-mission-gray-400">Donations Made:</span>
                <span className="text-white">{donationSummary.totalDonations}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-mission-gray-400">Current Tier:</span>
                <span className="capitalize font-semibold text-mission-primary">
                  {subscription?.tier || 'Free'}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Subscription Management */}
        {subscription && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <Card className="p-6 mb-8">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  💳 Subscription Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      📋 Current Plan
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-mission-gray-700">
                        <span className="text-mission-gray-400">Tier:</span>
                        <span className="capitalize font-semibold text-mission-primary">
                          {subscription.tier}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-mission-gray-700">
                        <span className="text-mission-gray-400">Status:</span>
                        <span className={`capitalize font-semibold ${
                          subscription.status === 'active' ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {subscription.status}
                        </span>
                      </div>
                      {subscription.currentPeriodEnd && (
                        <div className="flex justify-between items-center py-2">
                          <span className="text-mission-gray-400">Renews:</span>
                          <span className="text-white">
                            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      ⭐ Features
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="text-mission-gray-300 flex items-center gap-2">
                        🗺️ Map Access: <span className="text-white">{subscription.mapAccessLevel}</span>
                      </li>
                      <li className="text-mission-gray-300 flex items-center gap-2">
                        🤖 AI Interactions: <span className="text-white">{subscription.aiInteractionsPerDay === -1 ? 'Unlimited' : `${subscription.aiInteractionsPerDay}/day`}</span>
                      </li>
                      {subscription.features.no_ads && (
                        <li className="text-green-400 flex items-center gap-2">✅ Ad-free experience</li>
                      )}
                      {subscription.features.priority_support && (
                        <li className="text-green-400 flex items-center gap-2">✅ Priority support</li>
                      )}
                      {subscription.features.advanced_analytics && (
                        <li className="text-green-400 flex items-center gap-2">✅ Advanced analytics</li>
                      )}
                      {subscription.features.api_access && (
                        <li className="text-green-400 flex items-center gap-2">✅ API access</li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 flex gap-4">
                  {subscription.tier !== 'free' && (
                    <>
                      {subscription.cancelAtPeriodEnd ? (
                        <motion.button
                          onClick={handleReactivateSubscription}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all duration-200"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Reactivate Subscription
                        </motion.button>
                      ) : (
                        <motion.button
                          onClick={handleCancelSubscription}
                          className="bg-mission-secondary hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all duration-200"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Cancel Subscription
                        </motion.button>
                      )}
                    </>
                  )}
                  
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      href="/pricing"
                      className="bg-mission-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-all duration-200 inline-block"
                    >
                      {subscription.tier === 'free' ? 'Upgrade Plan' : 'Change Plan'}
                    </Link>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Donations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <Card className="p-6">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                💝 Recent Donations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {donations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-mission-gray-700">
                        <th className="text-left py-3 text-mission-gray-400 font-medium">Date</th>
                        <th className="text-left py-3 text-mission-gray-400 font-medium">Amount</th>
                        <th className="text-left py-3 text-mission-gray-400 font-medium">Type</th>
                        <th className="text-left py-3 text-mission-gray-400 font-medium">Anonymous</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donations.slice(0, 5).map((donation, index) => (
                        <motion.tr 
                          key={donation.id} 
                          className="border-b border-mission-gray-800 hover:bg-mission-gray-900/50 transition-colors"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 1.2 + index * 0.1 }}
                        >
                          <td className="py-3 text-white">
                            {new Date(donation.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 font-semibold text-green-400">
                            ${donation.amount.toFixed(2)}
                          </td>
                          <td className="py-3 capitalize text-mission-gray-300">
                            {donation.donationType.replace('_', ' ')}
                          </td>
                          <td className="py-3 text-mission-gray-300">
                            {donation.anonymous ? '✅ Yes' : '❌ No'}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">💝</div>
                  <h3 className="text-lg font-semibold text-white mb-2">No donations yet</h3>
                  <p className="text-mission-gray-400 mb-4">
                    Start making a difference by supporting our mission
                  </p>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      href="/donate"
                      className="inline-block bg-mission-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-all duration-200"
                    >
                      Make Your First Donation
                    </Link>
                  </motion.div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}