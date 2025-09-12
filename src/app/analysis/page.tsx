'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dynamically import components to avoid SSR issues
const RiskAnalysisMap = dynamic(() => import('@/components/RiskAnalysisMap'), {
  ssr: false,
  loading: () => <div className="w-full h-96 bg-gray-100 animate-pulse rounded-lg"></div>
})

interface RiskArea {
  id: number
  state: string
  city: string
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  childrenAtRisk: number
  womenAtRisk: number
  totalCases: number
  riskFactors: string[]
  latitude: number
  longitude: number
}

export default function Analysis() {
  const [riskAreas, setRiskAreas] = useState<RiskArea[]>([])
  const [selectedRisk, setSelectedRisk] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate AI analysis data - in real implementation, this would come from an AI service
    generateRiskAnalysis()
  }, [])

  const generateRiskAnalysis = async () => {
    // Simulate loading time for AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock risk analysis data based on missing persons patterns
    const mockRiskAreas: RiskArea[] = [
      {
        id: 1,
        state: 'California',
        city: 'Los Angeles',
        riskLevel: 'HIGH',
        childrenAtRisk: 89,
        womenAtRisk: 156,
        totalCases: 245,
        riskFactors: ['High population density', 'Major transit hubs', 'Economic disparities', 'Gang activity'],
        latitude: 34.0522,
        longitude: -118.2437
      },
      {
        id: 2,
        state: 'Florida',
        city: 'Miami',
        riskLevel: 'HIGH',
        childrenAtRisk: 67,
        womenAtRisk: 123,
        totalCases: 190,
        riskFactors: ['Tourist destination', 'International borders', 'Nightlife districts', 'Transient population'],
        latitude: 25.7617,
        longitude: -80.1918
      },
      {
        id: 3,
        state: 'Texas',
        city: 'Houston',
        riskLevel: 'HIGH',
        childrenAtRisk: 78,
        womenAtRisk: 134,
        totalCases: 212,
        riskFactors: ['Border proximity', 'Major highways', 'Industrial areas', 'Large urban sprawl'],
        latitude: 29.7604,
        longitude: -95.3698
      },
      {
        id: 4,
        state: 'Nevada',
        city: 'Las Vegas',
        riskLevel: 'MEDIUM',
        childrenAtRisk: 34,
        womenAtRisk: 78,
        totalCases: 112,
        riskFactors: ['Entertainment industry', 'Tourist areas', 'Late-night venues', 'Transient workforce'],
        latitude: 36.1699,
        longitude: -115.1398
      },
      {
        id: 5,
        state: 'New York',
        city: 'New York City',
        riskLevel: 'MEDIUM',
        childrenAtRisk: 45,
        womenAtRisk: 89,
        totalCases: 134,
        riskFactors: ['Dense population', 'Multiple transit systems', 'Tourist attractions', 'Economic inequality'],
        latitude: 40.7128,
        longitude: -74.0060
      }
    ]

    setRiskAreas(mockRiskAreas)
    setLoading(false)
  }

  const filteredAreas = selectedRisk === 'ALL' 
    ? riskAreas 
    : riskAreas.filter(area => area.riskLevel === selectedRisk)

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'text-red-500'
      case 'MEDIUM': return 'text-yellow-500'
      case 'LOW': return 'text-green-500'
      default: return 'text-gray-500'
    }
  }

  const getRiskBg = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-red-900/20 border-red-700'
      case 'MEDIUM': return 'bg-yellow-900/20 border-yellow-700'
      case 'LOW': return 'bg-green-900/20 border-green-700'
      default: return 'bg-gray-900/20 border-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-gray-900 border-b border-gray-800 py-6">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white hover:text-gray-300 transition-colors">
            Missing Persons Awareness
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white transition-colors">
              About
            </Link>
            <Link href="/analysis" className="text-white font-semibold">
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

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <section className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-white">AI Risk Analysis</span>{' '}
              <span className="text-red-500">& Safety Insights</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Advanced analysis of high-risk areas and safety patterns to protect vulnerable populations,
              with special focus on women and children safety.
            </p>
            
            {/* AI Status Indicator */}
            <div className="flex justify-center items-center mt-6">
              <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-400 font-mono text-sm">AI ANALYSIS ACTIVE</span>
              </div>
            </div>
          </section>

          {/* Risk Filter */}
          <section className="mb-8">
            <div className="flex flex-wrap gap-4 justify-center">
              {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((risk) => (
                <button
                  key={risk}
                  onClick={() => setSelectedRisk(risk as any)}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    selectedRisk === risk
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {risk} RISK
                </button>
              ))}
            </div>
          </section>

          {/* Risk Analysis Map */}
          <section className="mb-12">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Geographic Risk Distribution</h2>
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="mt-2 text-gray-300">Analyzing risk patterns...</p>
                </div>
              ) : (
                <RiskAnalysisMap riskAreas={filteredAreas} />
              )}
            </div>
          </section>

          {/* Risk Areas List */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">High-Risk Areas Analysis</h2>
            <div className="grid gap-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
                  <p className="mt-2 text-gray-400">Processing safety analysis...</p>
                </div>
              ) : (
                filteredAreas.map((area) => (
                  <div key={area.id} className={`border rounded-lg p-6 ${getRiskBg(area.riskLevel)}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">{area.city}, {area.state}</h3>
                        <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full mt-2 ${
                          area.riskLevel === 'HIGH' ? 'bg-red-900 text-red-200' :
                          area.riskLevel === 'MEDIUM' ? 'bg-yellow-900 text-yellow-200' :
                          'bg-green-900 text-green-200'
                        }`}>
                          {area.riskLevel} RISK
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{area.totalCases}</div>
                        <div className="text-sm text-gray-400">Total Cases</div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Demographics at Risk */}
                      <div>
                        <h4 className="font-semibold text-white mb-3">Vulnerable Populations</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-pink-400">Women at Risk:</span>
                            <span className="font-semibold text-white">{area.womenAtRisk}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-400">Children at Risk:</span>
                            <span className="font-semibold text-white">{area.childrenAtRisk}</span>
                          </div>
                        </div>
                      </div>

                      {/* Risk Factors */}
                      <div>
                        <h4 className="font-semibold text-white mb-3">AI-Identified Risk Factors</h4>
                        <div className="flex flex-wrap gap-2">
                          {area.riskFactors.map((factor, index) => (
                            <span
                              key={index}
                              className="bg-gray-800 text-gray-300 px-2 py-1 text-sm rounded"
                            >
                              {factor}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Safety Recommendations */}
          <section className="mb-12">
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/30 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-white mb-6">AI-Generated Safety Recommendations</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-blue-400 mb-4">👩‍🦰 For Women's Safety</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Avoid isolated areas, especially during late hours</li>
                    <li>• Share location with trusted contacts when traveling</li>
                    <li>• Stay aware of surroundings in crowded tourist areas</li>
                    <li>• Use well-lit, populated transportation hubs</li>
                    <li>• Trust instincts and report suspicious behavior</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-pink-400 mb-4">👶 For Children's Safety</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li>• Maintain constant supervision in high-risk areas</li>
                    <li>• Teach children about stranger danger</li>
                    <li>• Establish meeting points in crowded locations</li>
                    <li>• Monitor children's online activities and location</li>
                    <li>• Ensure children know their full address and phone number</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* AI Methodology */}
          <section className="mb-12">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-white mb-6">AI Analysis Methodology</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-green-400 mb-3">📊 Data Sources</h3>
                  <p className="text-gray-300 text-sm">
                    Missing persons databases, crime statistics, demographic data, 
                    geographic factors, and social patterns.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-400 mb-3">🤖 AI Processing</h3>
                  <p className="text-gray-300 text-sm">
                    Machine learning algorithms analyze patterns, correlations, 
                    and risk factors to identify high-vulnerability areas.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-purple-400 mb-3">⚡ Real-time Updates</h3>
                  <p className="text-gray-300 text-sm">
                    Continuous analysis of new data to provide updated risk 
                    assessments and safety recommendations.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Emergency Contact */}
          <section className="text-center">
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Emergency Information</h2>
              <p className="text-lg text-gray-300 mb-6">
                If you or someone you know is in immediate danger or has information 
                about a missing person, contact authorities immediately.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                  <span className="text-red-400 font-semibold">Emergency: 911</span>
                </div>
                <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                  <span className="text-blue-400 font-semibold">Missing Child: 1-800-THE-LOST</span>
                </div>
                <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                  <span className="text-purple-400 font-semibold">FBI Tip Line: 1-800-CALL-FBI</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-gray-900 border-t border-gray-800 py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400 mb-2">
            © 2025 SaveThemNow.Jesus - AI-powered safety analysis for community protection
          </p>
          <p className="text-gray-500 text-sm">
            Risk analysis is based on available data and statistical patterns. Always exercise personal judgment and follow local safety guidelines.
          </p>
        </div>
      </footer>
    </div>
  )
}