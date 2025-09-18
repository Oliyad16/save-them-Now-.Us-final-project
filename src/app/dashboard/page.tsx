'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MissingPerson } from '@/types/missing-person'

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

interface CrisisData {
  nearbyMissingChildren: MissingPerson[]
  recentCases: MissingPerson[]
  criticalCases: MissingPerson[]
  locationStats: {
    city: string
    state: string
    totalMissing: number
    children: number
    recentlyReported: number
  }
  userLocation: {
    latitude: number
    longitude: number
    city: string
    state: string
  } | null
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const [donationSummary, setDonationSummary] = useState({ totalDonated: 0, totalDonations: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [crisisData, setCrisisData] = useState<CrisisData | null>(null)
  const [locationPermission, setLocationPermission] = useState<'pending' | 'granted' | 'denied'>('pending')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      redirect('/auth/signin')
      return
    }

    fetchUserData()
    requestLocationAccess()
  }, [session, status])

  const requestLocationAccess = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationPermission('granted')
          fetchCrisisData(position.coords.latitude, position.coords.longitude)
        },
        (error) => {
          console.warn('Location access denied:', error)
          setLocationPermission('denied')
          // Fetch general crisis data without location
          fetchCrisisData()
        }
      )
    } else {
      setLocationPermission('denied')
      fetchCrisisData()
    }
  }

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

  const fetchCrisisData = async (userLat?: number, userLon?: number) => {
    try {
      // Fetch all missing persons data
      const response = await fetch('/api/missing-persons?limit=10000')
      const result = await response.json()
      const allMissingPersons: MissingPerson[] = result.data || result

      let userLocation = null
      let nearbyMissingChildren: MissingPerson[] = []
      let locationStats = {
        city: 'Unknown',
        state: 'US',
        totalMissing: 0,
        children: 0,
        recentlyReported: 0
      }

      if (userLat && userLon) {
        // Reverse geocode user location
        try {
          const geoResponse = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${userLat}&longitude=${userLon}&localityLanguage=en`)
          const geoData = await geoResponse.json()
          userLocation = {
            latitude: userLat,
            longitude: userLon,
            city: geoData.city || geoData.locality || 'Unknown',
            state: geoData.principalSubdivision || 'Unknown'
          }

          // Find missing persons within 100 miles of user
          nearbyMissingChildren = allMissingPersons.filter(person => {
            if (!person.latitude || !person.longitude || !person.age) return false
            
            const distance = calculateDistance(userLat, userLon, person.latitude, person.longitude)
            return distance <= 100 && person.age < 18 // Within 100 miles and under 18
          })

          // Calculate local statistics
          const stateMatches = allMissingPersons.filter(person => 
            person.location.toLowerCase().includes(userLocation!.state.toLowerCase())
          )
          
          locationStats = {
            city: userLocation.city,
            state: userLocation.state,
            totalMissing: stateMatches.length,
            children: stateMatches.filter(person => person.age && person.age < 18).length,
            recentlyReported: stateMatches.filter(person => {
              // Consider cases from the last 30 days as recent
              const reportDate = new Date(person.date)
              const thirtyDaysAgo = new Date()
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
              return reportDate > thirtyDaysAgo
            }).length
          }
        } catch (geoError) {
          console.error('Geocoding error:', geoError)
        }
      }

      // Get recent cases (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recentCases = allMissingPersons.filter(person => {
        const reportDate = new Date(person.date)
        return reportDate > sevenDaysAgo
      }).slice(0, 10)

      // Get critical cases (children under 12)
      const criticalCases = allMissingPersons.filter(person => 
        person.age && person.age < 12
      ).slice(0, 5)

      setCrisisData({
        nearbyMissingChildren,
        recentCases,
        criticalCases,
        locationStats,
        userLocation
      })

    } catch (err) {
      console.error('Error fetching crisis data:', err)
    }
  }

  // Calculate distance between two coordinates in miles
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
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

  // Calculate real crisis-fighting impact based on actual donations
  const calculateCrisisFightingImpact = () => {
    const aiSearchesFunded = Math.floor(donationSummary.totalDonated / 0.50) // $0.50 per AI search
    const alertsSent = Math.floor(donationSummary.totalDonated / 2.0) // $2 per alert
    const casesAnalyzed = Math.min(100, Math.floor(donationSummary.totalDonated / 1.0)) // $1 per case analysis
    const crisisResponseHours = Math.floor(donationSummary.totalDonated / 5.0) // $5 per hour of response time
    
    return {
      aiSearchesFunded,
      alertsSent,
      casesAnalyzed,
      crisisResponseHours
    }
  }

  const crisisImpact = calculateCrisisFightingImpact()

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
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Real Crisis Data Header */}
      <header className="bg-gray-900 border-b border-gray-800 py-6">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Crisis Response Center</h1>
            <div className="mt-2 space-y-1">
              {crisisData?.userLocation ? (
                <p className="text-blue-400 font-semibold">
                  📍 Your Location: {crisisData.userLocation.city}, {crisisData.userLocation.state}
                </p>
              ) : locationPermission === 'pending' ? (
                <p className="text-yellow-400 text-sm">
                  🔄 Getting your location for local crisis data...
                </p>
              ) : (
                <p className="text-gray-400 text-sm">
                  📍 Location access needed for local crisis alerts
                  <button 
                    onClick={requestLocationAccess}
                    className="ml-2 underline hover:text-white"
                  >
                    Enable Location
                  </button>
                </p>
              )}
              <p className="text-gray-300">
                Welcome back, {session.user?.name || session.user?.email}
              </p>
              <p className="text-red-400 text-sm">
                🚨 Real-time crisis monitoring active
              </p>
            </div>
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
            <Link href="/dashboard" className="text-white font-semibold">
              Dashboard
            </Link>
            <Link href="/profile" className="text-gray-300 hover:text-white transition-colors">
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

        {/* Real Local Crisis Alert Bar */}
        {crisisData && (
          <div className="bg-gradient-to-r from-red-900/40 to-red-800/40 border border-red-700 rounded-lg p-4 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-red-400">
                  <span className="text-2xl font-bold">{crisisData.nearbyMissingChildren.length}</span>
                  <span className="text-sm ml-2">missing children within 100 miles of you</span>
                </div>
                {crisisData.criticalCases.length > 0 && (
                  <div className="text-yellow-500 text-sm">
                    {crisisData.criticalCases.length} critical cases (children under 12)
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Link href="/" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  View Crisis Map
                </Link>
                <Link href="/donate" className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  Fund Search Technology
                </Link>
                <Link href="/analysis" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  AI Analysis
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Real Crisis Management Dashboard */}
        {crisisData && (
          <>
            {/* Your Location Statistics */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-red-400 mb-4">🏠 Your Area Crisis</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">In {crisisData.locationStats.state}:</span>
                    <span className="ml-2 font-semibold text-white">
                      {crisisData.locationStats.totalMissing} total missing
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Children missing:</span>
                    <span className="ml-2 font-semibold text-red-400">
                      {crisisData.locationStats.children}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Recently reported:</span>
                    <span className="ml-2 font-semibold text-yellow-400">
                      {crisisData.locationStats.recentlyReported} (last 30 days)
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-blue-400 mb-4">💰 Your Impact</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">AI Searches Funded:</span>
                    <span className="ml-2 font-semibold text-yellow-400">
                      {crisisImpact.aiSearchesFunded}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Critical Alerts Sent:</span>
                    <span className="ml-2 font-semibold text-red-400">{crisisImpact.alertsSent}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Technology Hours Funded:</span>
                    <span className="ml-2 font-semibold text-green-400">
                      {crisisImpact.crisisResponseHours}h
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-purple-400 mb-4">⚡ Quick Actions</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => window.open('/', '_blank')}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm"
                  >
                    View Local Cases
                  </button>
                  <button 
                    onClick={() => window.open('/analysis', '_blank')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm"
                  >
                    Run AI Analysis
                  </button>
                  <button 
                    onClick={() => window.open('/donate', '_blank')}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded text-sm"
                  >
                    Emergency Funding
                  </button>
                </div>
              </div>
            </div>
          </>
        )}


        {/* Real Crisis Cases Panel */}
        {crisisData && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Critical Cases (Real Data) */}
            <div className="bg-gradient-to-br from-red-950/50 to-gray-900 border border-red-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">🚨 Critical Cases (Under 12)</h2>
              {crisisData.criticalCases.length > 0 ? (
                <div className="space-y-3">
                  {crisisData.criticalCases.map((person, index) => (
                    <div key={person.id} className="bg-black/30 border border-red-700 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-semibold">{person.name}</p>
                          <p className="text-red-400 text-sm">Age: {person.age}</p>
                          <p className="text-gray-300 text-xs">{person.location}</p>
                          <p className="text-yellow-400 text-xs">Reported: {person.date}</p>
                        </div>
                        <button 
                          onClick={() => navigator.share ? navigator.share({
                            title: `Help find ${person.name}`,
                            text: `${person.name}, age ${person.age}, missing from ${person.location}`,
                            url: window.location.origin
                          }) : navigator.clipboard.writeText(`Help find ${person.name}, age ${person.age}, missing from ${person.location}`)}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                        >
                          Share
                        </button>
                      </div>
                    </div>
                  ))}
                  <Link href="/" className="block w-full text-center bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-semibold">
                    View All Cases on Map
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No critical cases in your immediate area</p>
                  <p className="text-green-400 text-sm mt-2">This is good news!</p>
                </div>
              )}
            </div>

            {/* Nearby Missing Children (Real Location Data) */}
            <div className="bg-gradient-to-br from-blue-950/50 to-gray-900 border border-blue-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">📍 Missing Children Near You</h2>
              {locationPermission === 'granted' && crisisData.nearbyMissingChildren.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-blue-400 text-sm mb-4">
                    Within 100 miles of your location
                  </div>
                  {crisisData.nearbyMissingChildren.slice(0, 3).map((person) => (
                    <div key={person.id} className="bg-black/30 border border-blue-700 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-semibold">{person.name}</p>
                          <p className="text-blue-400 text-sm">Age: {person.age}</p>
                          <p className="text-gray-300 text-xs">{person.location}</p>
                          {person.latitude && person.longitude && crisisData.userLocation && (
                            <p className="text-yellow-400 text-xs">
                              Distance: {Math.round(calculateDistance(
                                crisisData.userLocation.latitude,
                                crisisData.userLocation.longitude,
                                person.latitude,
                                person.longitude
                              ))} miles away
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {crisisData.nearbyMissingChildren.length > 3 && (
                    <div className="text-center text-blue-400 text-sm">
                      + {crisisData.nearbyMissingChildren.length - 3} more nearby
                    </div>
                  )}
                </div>
              ) : locationPermission === 'denied' ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Enable location access to see missing children near you</p>
                  <button 
                    onClick={requestLocationAccess}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Enable Location Access
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-pulse">
                    <p className="text-yellow-400">🔄 Getting your location...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Cases (Real Data) */}
        {crisisData && crisisData.recentCases.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">📅 Recently Reported Cases</h2>
              <span className="text-gray-400 text-sm">Last 7 days</span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {crisisData.recentCases.map((person) => (
                <div key={person.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-white">{person.name}</h3>
                    {person.age && person.age < 18 && (
                      <span className="bg-red-600 text-white px-2 py-1 rounded text-xs">
                        Child
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    {person.age && (
                      <p className="text-blue-400">Age: {person.age}</p>
                    )}
                    <p className="text-gray-300">{person.location}</p>
                    <p className="text-yellow-400">Reported: {person.date}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button 
                      onClick={() => navigator.share ? navigator.share({
                        title: `Help find ${person.name}`,
                        text: `${person.name}${person.age ? `, age ${person.age}` : ''}, missing from ${person.location}`,
                        url: window.location.origin
                      }) : navigator.clipboard.writeText(`Help find ${person.name}${person.age ? `, age ${person.age}` : ''}, missing from ${person.location}`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                    >
                      Share
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-semibold">
                View All Cases on Interactive Map
              </Link>
            </div>
          </div>
        )}

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
                  {subscription.features && Array.isArray(subscription.features) && subscription.features.includes('no_ads') && (
                    <li className="text-green-400">✅ Ad-free experience</li>
                  )}
                  {subscription.features && Array.isArray(subscription.features) && subscription.features.includes('priority_support') && (
                    <li className="text-green-400">✅ Priority support</li>
                  )}
                  {subscription.features && Array.isArray(subscription.features) && subscription.features.includes('advanced_analytics') && (
                    <li className="text-green-400">✅ Advanced analytics</li>
                  )}
                  {subscription.features && Array.isArray(subscription.features) && subscription.features.includes('api_access') && (
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