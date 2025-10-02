'use client'

import React from 'react'
import Link from 'next/link'
import { UnifiedHeader } from '@/components/navigation/UnifiedHeader'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { motion } from 'framer-motion'

export default function About() {
  return (
    <div className="min-h-screen bg-black text-white">
      <UnifiedHeader />
      
      <div className="container mx-auto px-4 py-4">
        <Breadcrumbs />
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <motion.section 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.h1 
              className="text-4xl md:text-6xl font-bold mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <span className="text-white">About</span>{' '}
              <span className="text-mission-secondary">SaveThemNow.Jesus</span>
            </motion.h1>
            <motion.p 
              className="text-xl md:text-2xl text-mission-gray-300 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              A platform dedicated to raising awareness about missing persons across the United States
              and helping bring them home.
            </motion.p>
          </motion.section>

          {/* Mission Section */}
          <motion.section 
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Card className="p-8">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  🎯 Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg text-mission-gray-300 leading-relaxed">
                  Every person who goes missing leaves behind a family searching for answers, a community 
                  that has lost someone precious. SaveThemNow.Jesus exists to ensure that no missing person 
                  is forgotten and that their stories continue to be told until they are found.
                </p>
                <p className="text-lg text-mission-gray-300 leading-relaxed">
                  Through technology, data visualization, and community awareness, we aim to keep missing 
                  persons cases in the public eye and provide resources for families who are searching 
                  for their loved ones.
                </p>
              </CardContent>
            </Card>
          </motion.section>

          {/* What We Do Section */}
          <motion.section 
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <h2 className="text-3xl font-bold text-white mb-8 text-center">What We Do</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: '📊',
                  title: 'Data Visualization',
                  description: 'We present missing persons data in an interactive, accessible format that helps people understand the scope and geographic distribution of missing persons cases.'
                },
                {
                  icon: '🗺️',
                  title: 'Interactive Mapping',
                  description: 'Our interactive map displays missing persons cases across the United States, making it easier to see patterns and stay informed about cases in your area.'
                },
                {
                  icon: '📢',
                  title: 'Awareness Campaigns',
                  description: 'We raise awareness about the ongoing crisis of missing persons and provide educational resources about prevention and response.'
                },
                {
                  icon: '🤝',
                  title: 'Community Support',
                  description: 'We provide a platform for communities to stay informed and engaged with missing persons cases, fostering collective action and support.'
                }
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 1 + index * 0.1 }}
                >
                  <Card className="p-6 h-full hover:-translate-y-0.5 transition-transform">
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <h3 className="text-xl font-semibold text-mission-secondary">{item.title}</h3>
                      </div>
                      <p className="text-mission-gray-300 leading-relaxed">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Statistics Section */}
          <motion.section 
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
          >
            <Card className="bg-gradient-to-r from-mission-secondary/10 to-mission-gray-900 border-mission-secondary/30 p-8">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-white mb-6 flex items-center justify-center gap-3">
                  📊 The Reality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-8 text-center">
                  {[
                    { number: '600,000+', description: 'Missing persons reports filed annually in the US' },
                    { number: '4,400+', description: 'Unidentified remains discovered each year' },
                    { number: '1,000+', description: 'Children go missing every day' }
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.number}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: 1.6 + index * 0.2 }}
                      className="space-y-2"
                    >
                      <motion.div 
                        className="text-3xl md:text-4xl font-bold text-mission-secondary mb-2"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {stat.number}
                      </motion.div>
                      <p className="text-mission-gray-300 text-sm leading-relaxed">{stat.description}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* How You Can Help Section */}
          <motion.section 
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 2.2 }}
          >
            <h2 className="text-3xl font-bold text-white mb-8 text-center">How You Can Help</h2>
            <Card className="p-8">
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 2.4 }}
                    className="space-y-6"
                  >
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                        🔍 Stay Informed
                      </h3>
                      <p className="text-mission-gray-300 leading-relaxed">
                        Regularly check our map and stay aware of missing persons cases in your area.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                        📱 Share Information
                      </h3>
                      <p className="text-mission-gray-300 leading-relaxed">
                        Share missing persons alerts on social media to expand the search network.
                      </p>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 2.6 }}
                    className="space-y-6"
                  >
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                        👀 Be Vigilant
                      </h3>
                      <p className="text-mission-gray-300 leading-relaxed">
                        If you see something suspicious or have information about a missing person, 
                        contact local authorities immediately.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                        ❤️ Support Families
                      </h3>
                      <p className="text-mission-gray-300 leading-relaxed">
                        Consider volunteering with or donating to organizations that support 
                        families of missing persons.
                      </p>
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Get Involved Section */}
          <motion.section 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 2.8 }}
          >
            <Card className="p-8 bg-gradient-to-br from-mission-primary/10 to-mission-gray-900">
              <CardContent className="space-y-6">
                <motion.h2 
                  className="text-3xl font-bold text-white mb-6 flex items-center justify-center gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 3 }}
                >
                  🤝 Get Involved
                </motion.h2>
                
                <motion.p 
                  className="text-lg text-mission-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 3.2 }}
                >
                  Together, we can make a difference. Every person who goes missing matters, 
                  and every person who helps search brings hope to families in need.
                </motion.p>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 3.4 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                  <Link 
                    href="/"
                    className="inline-flex items-center justify-center bg-mission-secondary hover:bg-red-600 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    🗺️ View Missing Persons Map
                  </Link>
                  
                  <Link 
                    href="/dashboard"
                    className="inline-flex items-center justify-center bg-mission-primary hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    📊 Join Our Platform
                  </Link>
                </motion.div>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </main>

      <footer className="bg-mission-gray-900 border-t border-mission-gray-800 py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <motion.p 
            className="text-mission-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 3.6 }}
          >
            © 2025 SaveThemNow.Jesus - Dedicated to bringing missing persons home
          </motion.p>
        </div>
      </footer>
    </div>
  )
}