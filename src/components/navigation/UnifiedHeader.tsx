'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface UnifiedHeaderProps {
  className?: string
  showMobileMenu?: boolean
}

const navigationItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/about', label: 'About', icon: 'ℹ️' },
  { href: '/analysis', label: 'AI Analysis', icon: '🤖' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊', authRequired: true },
  { href: '/profile', label: 'Profile', icon: '👤', authRequired: true },
]

export function UnifiedHeader({ className, showMobileMenu = true }: UnifiedHeaderProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const getPageTitle = () => {
    const currentPage = navigationItems.find(item => item.href === pathname)
    if (currentPage) return currentPage.label
    if (pathname.startsWith('/auth')) return 'Authentication'
    return 'SaveThemNow.Jesus'
  }

  return (
    <motion.header 
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        isScrolled 
          ? 'bg-mission-gray-900/95 backdrop-blur-md border-b border-mission-gray-800 shadow-lg' 
          : 'bg-mission-gray-900 border-b border-mission-gray-800',
        className
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title Section */}
          <div className="flex items-center space-x-4">
            <Link 
              href="/" 
              className="flex items-center space-x-3 group"
            >
              <motion.div 
                className="text-2xl"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                🔍
              </motion.div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-white group-hover:text-mission-primary transition-colors">
                  SaveThemNow.Jesus
                </h1>
                <p className="text-xs text-mission-gray-400 -mt-1">
                  Missing Persons Awareness
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href
              const canAccess = !item.authRequired || session
              
              if (item.authRequired && !session && status !== 'loading') {
                return null
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    'hover:bg-mission-gray-800 hover:text-white',
                    'focus:outline-none focus:ring-2 focus:ring-mission-primary focus:ring-offset-2 focus:ring-offset-mission-gray-900',
                    isActive 
                      ? 'text-mission-primary bg-mission-gray-800' 
                      : 'text-mission-gray-300',
                    !canAccess && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className="flex items-center space-x-2">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  {isActive && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-mission-primary rounded-full"
                      layoutId="activeTab"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            {status === 'loading' ? (
              <motion.div 
                className="w-8 h-8 bg-mission-gray-800 rounded-full"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            ) : session ? (
              <motion.div 
                className="flex items-center space-x-3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {/* User Avatar */}
                <div className="hidden sm:flex items-center space-x-2">
                  <motion.div 
                    className="w-8 h-8 bg-gradient-mission rounded-full flex items-center justify-center shadow-lg"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <span className="text-white font-semibold text-sm">
                      {session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || '👤'}
                    </span>
                  </motion.div>
                  <span className="text-sm text-mission-gray-300 hidden md:block">
                    {session.user?.name || 'User'}
                  </span>
                </div>
                
                {/* Sign Out Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:flex"
                  onClick={() => window.location.href = '/api/auth/signout'}
                >
                  Sign Out
                </Button>
              </motion.div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:flex"
                  onClick={() => window.location.href = '/auth/signin'}
                >
                  Sign In
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.location.href = '/auth/signup'}
                >
                  Get Started
                </Button>
              </div>
            )}

            {/* Emergency Report Button */}
            <Button
              variant="danger"
              size="sm"
              className="whitespace-nowrap"
              onClick={() => {
                // TODO: Implement emergency report modal
                alert('Emergency reporting feature coming soon')
              }}
            >
              <span className="hidden sm:inline">🚨 Report</span>
              <span className="sm:hidden">🚨</span>
            </Button>
          </div>
        </div>

        {/* Page Context Bar (for mobile) */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div 
              className="lg:hidden border-t border-mission-gray-800 py-2"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {getPageTitle()}
                </h2>
                <div className="flex items-center space-x-2">
                  {/* Quick action buttons for mobile */}
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => window.location.href = '/'}
                  >
                    Home
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}