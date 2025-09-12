'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BadgeShowcase } from '@/components/badges'

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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 py-6">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Profile</h1>
            <p className="text-gray-300 mt-2">Welcome back, {session.user?.name || session.user?.email}</p>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white transition-colors">
              About
            </Link>
            <Link href="/analysis" className="text-gray-300 hover:text-white transition-colors">
              AI Analysis
            </Link>
            <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/profile" className="text-white font-semibold">
              Profile
            </Link>
            <Link href="/auth/signin" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Badge Showcase - Top Section */}
        <div className="mb-8">
          <BadgeShowcase 
            userStats={userStats}
            currentTier={(subscription?.tier as any) || 'free'}
            onUpgrade={() => window.open('/pricing', '_blank')}
          />
        </div>

        {/* Account Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Account Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-gray-400">Email:</span>
                <span className="ml-2">{session.user?.email}</span>
              </div>
              <div>
                <span className="text-gray-400">Name:</span>
                <span className="ml-2">{session.user?.name || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-gray-400">Member since:</span>
                <span className="ml-2">Account created</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Impact Summary</h2>
            <div className="space-y-3">
              <div>
                <span className="text-gray-400">Total Donated:</span>
                <span className="ml-2 font-semibold text-green-400">
                  ${donationSummary.totalDonated.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Donations Made:</span>
                <span className="ml-2">{donationSummary.totalDonations}</span>
              </div>
              <div>
                <span className="text-gray-400">Current Tier:</span>
                <span className="ml-2 capitalize font-semibold text-blue-400">
                  {subscription?.tier || 'Free'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Management */}
        {subscription && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Subscription</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Current Plan</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-400">Tier:</span>
                    <span className="ml-2 capitalize font-semibold text-blue-400">
                      {subscription.tier}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className={`ml-2 capitalize ${
                      subscription.status === 'active' ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {subscription.status}
                    </span>
                  </div>
                  {subscription.currentPeriodEnd && (
                    <div>
                      <span className="text-gray-400">Renews:</span>
                      <span className="ml-2">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Features</h3>
                <ul className="space-y-1 text-sm">
                  <li className="text-gray-300">
                    🗺️ Map Access: {subscription.mapAccessLevel}
                  </li>
                  <li className="text-gray-300">
                    🤖 AI Interactions: {subscription.aiInteractionsPerDay === -1 ? 'Unlimited' : `${subscription.aiInteractionsPerDay}/day`}
                  </li>
                  {subscription.features.no_ads && (
                    <li className="text-green-400">✅ Ad-free experience</li>
                  )}
                  {subscription.features.priority_support && (
                    <li className="text-green-400">✅ Priority support</li>
                  )}
                  {subscription.features.advanced_analytics && (
                    <li className="text-green-400">✅ Advanced analytics</li>
                  )}
                  {subscription.features.api_access && (
                    <li className="text-green-400">✅ API access</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              {subscription.tier !== 'free' && (
                <>
                  {subscription.cancelAtPeriodEnd ? (
                    <button
                      onClick={handleReactivateSubscription}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Reactivate Subscription
                    </button>
                  ) : (
                    <button
                      onClick={handleCancelSubscription}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </>
              )}
              
              <Link
                href="/pricing"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {subscription.tier === 'free' ? 'Upgrade Plan' : 'Change Plan'}
              </Link>
            </div>
          </div>
        )}

        {/* Recent Donations */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Donations</h2>
          
          {donations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Amount</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Anonymous</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.slice(0, 5).map((donation) => (
                    <tr key={donation.id} className="border-b border-gray-800">
                      <td className="py-2">
                        {new Date(donation.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 font-semibold text-green-400">
                        ${donation.amount.toFixed(2)}
                      </td>
                      <td className="py-2 capitalize">
                        {donation.donationType.replace('_', ' ')}
                      </td>
                      <td className="py-2">
                        {donation.anonymous ? 'Yes' : 'No'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>No donations yet</p>
              <Link
                href="/donate"
                className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Make Your First Donation
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}