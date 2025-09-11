'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Card, Button } from '@/components/ui'
import { UserTier } from '@/components/access'
import { NotificationSystem } from '@/components/notifications/NotificationSystem'
import { cn } from '@/lib/utils'

interface MobileNavigationProps {
  currentTier: UserTier
  isAuthenticated: boolean
  userName?: string
  onUpgrade?: () => void
  onSignOut?: () => void
}

const navigationItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊', authRequired: true },
  { href: '/analysis', label: 'AI Analysis', icon: '🤖' },
  { href: '/about', label: 'About', icon: 'ℹ️' },
]

const tierBadgeColors = {
  anonymous: 'bg-gray-500',
  free: 'bg-gray-600',
  basic: 'bg-blue-500',
  premium: 'bg-purple-500',
  hero: 'bg-amber-500',
  champion: 'bg-red-500'
}

export function MobileNavigation({ 
  currentTier, 
  isAuthenticated, 
  userName,
  onUpgrade,
  onSignOut 
}: MobileNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleItemClick = (href: string, authRequired?: boolean) => {
    if (authRequired && !isAuthenticated) {
      router.push('/auth/signin')
      return
    }
    router.push(href)
    setIsMenuOpen(false)
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-mission-gray-900/95 backdrop-blur-sm border-b border-mission-gray-800">
        <div className="flex items-center justify-between p-4">
          {/* Logo */}
          <Link href="/" className="text-lg font-bold text-white">
            SaveThemNow
          </Link>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            {isAuthenticated && (
              <NotificationSystem currentTier={currentTier} />
            )}

            {/* Menu Button */}
            <motion.button
              className="p-2 rounded-lg bg-mission-gray-800 text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ rotate: isMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {isMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </motion.div>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
          >
            {/* Menu Panel */}
            <motion.div
              className="absolute top-0 right-0 w-80 max-w-[90vw] h-full bg-mission-gray-900 border-l border-mission-gray-800 overflow-y-auto"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* User Section */}
              <div className="p-6 border-b border-mission-gray-800">
                {isAuthenticated ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-mission rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {userName ? userName.charAt(0).toUpperCase() : '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{userName || 'User'}</p>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'px-2 py-1 text-xs rounded-full text-white',
                            tierBadgeColors[currentTier]
                          )}>
                            {currentTier}
                          </span>
                          {currentTier !== 'champion' && (
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={onUpgrade}
                            >
                              Upgrade
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-mission-gray-400">Welcome, Guest</p>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          router.push('/auth/signin')
                          setIsMenuOpen(false)
                        }}
                      >
                        Sign In
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          router.push('/auth/signup')
                          setIsMenuOpen(false)
                        }}
                      >
                        Sign Up
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Items */}
              <div className="p-4">
                <div className="space-y-2">
                  {navigationItems.map((item) => {
                    const isActive = pathname === item.href
                    const canAccess = !item.authRequired || isAuthenticated

                    return (
                      <motion.button
                        key={item.href}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                          isActive 
                            ? 'bg-mission-primary text-white' 
                            : canAccess
                            ? 'text-mission-gray-300 hover:bg-mission-gray-800 hover:text-white'
                            : 'text-mission-gray-600'
                        )}
                        onClick={() => handleItemClick(item.href, item.authRequired)}
                        whileHover={canAccess ? { x: 4 } : {}}
                        whileTap={canAccess ? { scale: 0.98 } : {}}
                        disabled={!canAccess}
                      >
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                        {item.authRequired && !isAuthenticated && (
                          <span className="ml-auto text-xs text-mission-gray-500">Sign in required</span>
                        )}
                        {isActive && (
                          <motion.div
                            className="ml-auto w-2 h-2 bg-white rounded-full"
                            layoutId="activeIndicator"
                          />
                        )}
                      </motion.button>
                    )
                  })}
                </div>

                {/* Quick Actions */}
                <div className="mt-6 pt-6 border-t border-mission-gray-800">
                  <h4 className="text-sm font-medium text-mission-gray-400 mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button
                      variant="danger"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        // Handle emergency alert
                        setIsMenuOpen(false)
                      }}
                    >
                      🚨 Report Missing Person
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        router.push('/donate')
                        setIsMenuOpen(false)
                      }}
                    >
                      💝 Make Donation
                    </Button>
                  </div>
                </div>

                {/* Feature Showcase for Free Users */}
                {currentTier === 'free' && (
                  <div className="mt-6 pt-6 border-t border-mission-gray-800">
                    <Card variant="tier" tier="premium" className="p-4">
                      <div className="text-center">
                        <div className="text-2xl mb-2">⭐</div>
                        <h4 className="font-semibold text-white mb-2">Unlock Premium Features</h4>
                        <p className="text-xs text-mission-gray-400 mb-3">
                          Get unlimited AI interactions, advanced analytics, and more
                        </p>
                        <Button
                          variant="tier"
                          tier="premium"
                          size="sm"
                          className="w-full"
                          onClick={onUpgrade}
                        >
                          Upgrade Now
                        </Button>
                      </div>
                    </Card>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-mission-gray-800 mt-auto">
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-mission-gray-400"
                      onClick={() => {
                        router.push('/settings')
                        setIsMenuOpen(false)
                      }}
                    >
                      ⚙️ Settings
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-mission-gray-400"
                      onClick={() => {
                        onSignOut?.()
                        setIsMenuOpen(false)
                      }}
                    >
                      🚪 Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-mission-gray-500">
                      SaveThemNow.Jesus &copy; 2025
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-mission-gray-900/95 backdrop-blur-sm border-t border-mission-gray-800">
        <div className="flex items-center justify-around p-2">
          {navigationItems.slice(0, 4).map((item) => {
            const isActive = pathname === item.href
            const canAccess = !item.authRequired || isAuthenticated

            return (
              <motion.button
                key={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-0 flex-1',
                  isActive 
                    ? 'text-mission-primary' 
                    : canAccess
                    ? 'text-mission-gray-400 hover:text-white'
                    : 'text-mission-gray-600'
                )}
                onClick={() => handleItemClick(item.href, item.authRequired)}
                whileTap={canAccess ? { scale: 0.95 } : {}}
                disabled={!canAccess}
              >
                <motion.span 
                  className="text-lg"
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {item.icon}
                </motion.span>
                <span className="text-xs font-medium truncate">
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    className="w-1 h-1 bg-mission-primary rounded-full"
                    layoutId="bottomActiveIndicator"
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Spacer for fixed navigation */}
      <div className="md:hidden h-16 pt-16" />
    </>
  )
}