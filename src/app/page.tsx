'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { MissingPerson } from '@/types/missing-person'
import { MobileNavigation } from '@/components/mobile/MobileNavigation'

// Dynamically import counter component
const KidnappingCounter = dynamic(() => import('@/components/KidnappingCounter'), {
  ssr: false
})

// Dynamically import the enhanced map component to avoid SSR issues with leaflet
const EnhancedMissingPersonsMap = dynamic(() => import('@/components/map/EnhancedMissingPersonsMap'), {
  ssr: false,
  loading: () => <div className="w-full h-96 bg-gray-100 animate-pulse rounded-lg"></div>
})

export default function Home() {
  const { data: session } = useSession()
  const [missingPersons, setMissingPersons] = useState<MissingPerson[]>([])
  const [filteredPersons, setFilteredPersons] = useState<MissingPerson[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMissingPersons()
  }, [])

  useEffect(() => {
    filterPersons()
  }, [missingPersons, searchQuery, categoryFilter, statusFilter])

  const loadMissingPersons = async () => {
    try {
      const response = await fetch('/api/missing-persons?limit=9000')
      const result = await response.json()
      
      // Handle new API response format
      const data = result.data || result
      setMissingPersons(data)
      setLoading(false)
    } catch (error) {
      console.error('Error loading missing persons data:', error)
      setLoading(false)
    }
  }

  const filterPersons = () => {
    let filtered = missingPersons

    if (searchQuery) {
      filtered = filtered.filter(person => 
        person.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.location?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (categoryFilter) {
      filtered = filtered.filter(person => person.category === categoryFilter)
    }

    if (statusFilter) {
      filtered = filtered.filter(person => person.status === statusFilter)
    }

    setFilteredPersons(filtered)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <MobileNavigation 
        currentTier="free"
        isAuthenticated={!!session}
        userName={session?.user?.name || session?.user?.email || undefined}
        onUpgrade={() => window.open('/pricing', '_blank')}
        onSignOut={() => window.location.href = '/api/auth/signout'}
      />
      <header className="bg-gray-900 border-b border-gray-800 py-6">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Missing Persons Awareness</h1>
            <p className="text-gray-300 mt-2">Helping locate missing persons across the United States</p>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-white font-semibold">
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
            <Link href="/profile" className="text-gray-300 hover:text-white transition-colors">
              Profile
            </Link>
            <Link href="/auth/signin" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Dramatic kidnapping counter */}
      <section className="py-16 bg-gradient-to-b from-black to-gray-900">
        <KidnappingCounter />
      </section>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search by location or name..."
              className="px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Missing Adults">Missing Adults</option>
              <option value="Missing Children">Missing Children</option>
              <option value="Missing Veterans">Missing Veterans</option>
            </select>
            <select
              className="px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Cold Case">Cold Case</option>
            </select>
            <div className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg flex items-center">
              <span className="text-sm text-gray-300">
                Showing: {filteredPersons.length} of {missingPersons.length}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-300">Loading missing persons data...</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-lg p-4">
            <EnhancedMissingPersonsMap 
              persons={filteredPersons} 
              currentTier='champion'
              onUpgrade={() => window.open('/pricing', '_blank')}
            />
          </div>
        )}


        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Cases</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPersons.slice(0, 6).map((person) => (
              <div key={person.id} className="border border-gray-700 bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                <h3 className="font-semibold text-lg text-white">{person.name}</h3>
                <p className="text-gray-300 text-sm">{person.reportedMissing}</p>
                <p className="text-gray-300 text-sm">{person.location}</p>
                <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                  person.category === 'Missing Children' 
                    ? 'bg-red-900 text-red-200 border border-red-700' 
                    : person.category === 'Missing Veterans'
                    ? 'bg-green-900 text-green-200 border border-green-700'
                    : 'bg-blue-900 text-blue-200 border border-blue-700'
                }`}>
                  {person.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}