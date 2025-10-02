'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { UnifiedHeader } from '@/components/navigation/UnifiedHeader'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { LoadingState, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { motion } from 'framer-motion'

// Dynamically import components to avoid SSR issues
const RiskAnalysisMap = dynamic(() => import('@/components/RiskAnalysisMap'), {
  ssr: false,
  loading: () => <LoadingState type="map" message="Loading risk analysis map..." />
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
      <UnifiedHeader />
      
      <div className="container mx-auto px-4 py-4">
        <Breadcrumbs />
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <motion.section 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.h1 
              className="text-4xl md:text-5xl font-bold mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <span className="text-white">AI Risk Analysis</span>{' '}
              <span className="text-mission-secondary">& Safety Insights</span>
            </motion.h1>
            <motion.p 
              className="text-xl text-mission-gray-300 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Advanced analysis of high-risk areas and safety patterns to protect vulnerable populations,
              with special focus on women and children safety.
            </motion.p>
            
          </motion.section>

          {/* Risk Filter */}
          <motion.section 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <div className="flex flex-wrap gap-4 justify-center">
              {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((risk, index) => (
                <motion.button
                  key={risk}
                  onClick={() => setSelectedRisk(risk as any)}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    selectedRisk === risk
                      ? 'bg-mission-secondary text-white scale-105'
                      : 'bg-mission-gray-800 text-mission-gray-300 hover:bg-mission-gray-700 hover:scale-105'
                  }`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 1 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {risk} RISK
                </motion.button>
              ))}
            </div>
          </motion.section>

          {/* Risk Analysis Map */}
          <motion.section 
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
          >
            <Card className="p-6">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-white mb-4">
                  🗺️ Geographic Risk Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingState 
                    type="map" 
                    message="Analyzing risk patterns..." 
                    className="py-12"
                  />
                ) : (
                  <RiskAnalysisMap riskAreas={filteredAreas} />
                )}
              </CardContent>
            </Card>
          </motion.section>

          {/* Risk Areas List */}
          <motion.section 
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.6 }}
          >
            <motion.h2 
              className="text-2xl font-semibold mb-6 text-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 1.8 }}
            >
              📊 High-Risk Areas Analysis
            </motion.h2>
            <div className="grid gap-6">
              {loading ? (
                <LoadingState 
                  type="skeleton" 
                  message="Processing safety analysis..." 
                  className="py-8"
                />
              ) : (
                filteredAreas.map((area, index) => (
                  <motion.div 
                    key={area.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 2 + index * 0.1 }}
                  >
                    <Card className={`p-6 ${getRiskBg(area.riskLevel)} hover:-translate-y-0.5 transition-transform`}>
                      <CardContent>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-white">{area.city}, {area.state}</h3>
                            <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full mt-2 ${
                              area.riskLevel === 'HIGH' ? 'bg-mission-secondary/20 text-mission-secondary border border-mission-secondary/30' :
                              area.riskLevel === 'MEDIUM' ? 'bg-yellow-900/20 text-yellow-200 border border-yellow-700/30' :
                              'bg-green-900/20 text-green-200 border border-green-700/30'
                            }`}>
                              {area.riskLevel} RISK
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-white">{area.totalCases}</div>
                            <div className="text-sm text-mission-gray-400">Total Cases</div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Demographics at Risk */}
                          <div>
                            <h4 className="font-semibold text-white mb-3">👥 Vulnerable Populations</h4>
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
                            <h4 className="font-semibold text-white mb-3">🤖 AI-Identified Risk Factors</h4>
                            <div className="flex flex-wrap gap-2">
                              {area.riskFactors.map((factor, index) => (
                                <span
                                  key={index}
                                  className="bg-mission-gray-800 text-mission-gray-300 px-2 py-1 text-sm rounded border border-mission-gray-700"
                                >
                                  {factor}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </motion.section>

          {/* Safety Recommendations */}
          <motion.section 
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 2.4 }}
          >
            <Card className="bg-gradient-to-r from-mission-primary/10 to-purple-900/20 border-mission-primary/30 p-8">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
                  🛡️ AI-Generated Safety Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 2.6 }}
                  >
                    <h3 className="text-lg font-semibold text-mission-primary mb-4">👩‍🦰 For Women&apos;s Safety</h3>
                    <ul className="space-y-2 text-mission-gray-300">
                      <li>• Avoid isolated areas, especially during late hours</li>
                      <li>• Share location with trusted contacts when traveling</li>
                      <li>• Stay aware of surroundings in crowded tourist areas</li>
                      <li>• Use well-lit, populated transportation hubs</li>
                      <li>• Trust instincts and report suspicious behavior</li>
                    </ul>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 2.8 }}
                  >
                    <h3 className="text-lg font-semibold text-pink-400 mb-4">👶 For Children&apos;s Safety</h3>
                    <ul className="space-y-2 text-mission-gray-300">
                      <li>• Maintain constant supervision in high-risk areas</li>
                      <li>• Teach children about stranger danger</li>
                      <li>• Establish meeting points in crowded locations</li>
                      <li>• Monitor children&apos;s online activities and location</li>
                      <li>• Ensure children know their full address and phone number</li>
                    </ul>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* AI Methodology */}
          <motion.section 
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 3 }}
          >
            <Card className="p-8">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
                  🔬 AI Analysis Methodology
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-8">
                  {[
                    {
                      icon: '📊',
                      title: 'Data Sources',
                      description: 'Missing persons databases, crime statistics, demographic data, geographic factors, and social patterns.',
                      color: 'text-green-400'
                    },
                    {
                      icon: '🤖',
                      title: 'AI Processing',
                      description: 'Machine learning algorithms analyze patterns, correlations, and risk factors to identify high-vulnerability areas.',
                      color: 'text-mission-primary'
                    },
                    {
                      icon: '⚡',
                      title: 'Real-time Updates',
                      description: 'Continuous analysis of new data to provide updated risk assessments and safety recommendations.',
                      color: 'text-purple-400'
                    }
                  ].map((item, index) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 3.2 + index * 0.2 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item.icon}</span>
                        <h3 className={`text-lg font-semibold ${item.color}`}>{item.title}</h3>
                      </div>
                      <p className="text-mission-gray-300 text-sm leading-relaxed">
                        {item.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Emergency Contact */}
          <motion.section 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 3.8 }}
          >
            <Card className="bg-mission-secondary/10 border-mission-secondary/30 p-8">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-mission-secondary mb-4 flex items-center justify-center gap-3">
                  🚨 Emergency Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <motion.p 
                  className="text-lg text-mission-gray-300 leading-relaxed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 4 }}
                >
                  If you or someone you know is in immediate danger or has information 
                  about a missing person, contact authorities immediately.
                </motion.p>
                <motion.div 
                  className="flex flex-wrap justify-center gap-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 4.2 }}
                >
                  {[
                    { text: 'Emergency: 911', color: 'text-mission-secondary' },
                    { text: 'Missing Child: 1-800-THE-LOST', color: 'text-mission-primary' },
                    { text: 'FBI Tip Line: 1-800-CALL-FBI', color: 'text-purple-400' }
                  ].map((contact, index) => (
                    <motion.div
                      key={contact.text}
                      className="bg-mission-gray-900 border border-mission-gray-700 rounded-lg px-4 py-2"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 4.4 + index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <span className={`${contact.color} font-semibold`}>{contact.text}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </main>

      <footer className="bg-mission-gray-900 border-t border-mission-gray-800 py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <motion.p 
            className="text-mission-gray-400 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 4.8 }}
          >
            © 2025 SaveThemNow.Jesus - AI-powered safety analysis for community protection
          </motion.p>
          <motion.p 
            className="text-mission-gray-500 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 5 }}
          >
            Risk analysis is based on available data and statistical patterns. Always exercise personal judgment and follow local safety guidelines.
          </motion.p>
        </div>
      </footer>
    </div>
  )
}