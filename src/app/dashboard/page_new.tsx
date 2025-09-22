'use client'

import React, { useState, useEffect } from 'react'
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

export default function Dashboard() {
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
      setError('Failed to load dashboard data')
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const userStats = {
    totalDonationAmount: donationSummary.totalDonated,
    donationCount: donationSummary.totalDonations,
    engagementDays: 120,
    aiInteractions: 45,
    casesShared: 45,
    referrals: 8,
    specialActions: ['first_donation', 'share_milestone'] as any[],
    joinDate: new Date('2024-01-01'),
    lastActiveDate: new Date(),
    streakDays: 30
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 py-6">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-300 mt-2">Welcome back, {session.user?.name || session.user?.email}</p>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white transition-colors">
              About
            </Link>
            <Link href="/dashboard" className="text-white font-semibold">
              Dashboard
            </Link>
            <Link href="/profile" className="text-gray-300 hover:text-white transition-colors">
              Profile
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

        {/* Badge Showcase */}
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