'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { MobileNavigation } from './MobileNavigation'
import { UserTier } from '@/components/access'
import { cn } from '@/lib/utils'

interface MobileLayoutProps {
  children: ReactNode
  currentTier: UserTier
  isAuthenticated: boolean
  userName?: string
  showBottomNav?: boolean
  fullscreen?: boolean
  className?: string
  onUpgrade?: () => void
  onSignOut?: () => void
}

export function MobileLayout({
  children,
  currentTier,
  isAuthenticated,
  userName,
  showBottomNav = true,
  fullscreen = false,
  className,
  onUpgrade,
  onSignOut
}: MobileLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-black', className)}>
      {/* Mobile Navigation */}
      <MobileNavigation
        currentTier={currentTier}
        isAuthenticated={isAuthenticated}
        userName={userName}
        onUpgrade={onUpgrade}
        onSignOut={onSignOut}
      />

      {/* Main Content */}
      <motion.main
        className={cn(
          'w-full',
          fullscreen ? 'h-screen' : 'min-h-screen',
          // Add padding for mobile navigation unless fullscreen
          !fullscreen && 'pt-16', // Top padding for header
          !fullscreen && showBottomNav && 'pb-16' // Bottom padding for nav
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.main>

      {/* Mobile-specific overlays can go here */}
    </div>
  )
}

// Responsive container component
interface ResponsiveContainerProps {
  children: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: boolean
}

export function ResponsiveContainer({ 
  children, 
  className,
  maxWidth = 'lg',
  padding = true
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  }

  return (
    <div className={cn(
      'mx-auto w-full',
      maxWidthClasses[maxWidth],
      padding && 'px-4 md:px-6',
      className
    )}>
      {children}
    </div>
  )
}

// Mobile-friendly section component
interface MobileSectionProps {
  children: ReactNode
  title?: string
  subtitle?: string
  action?: ReactNode
  className?: string
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}

export function MobileSection({
  children,
  title,
  subtitle,
  action,
  className,
  spacing = 'md'
}: MobileSectionProps) {
  const spacingClasses = {
    none: '',
    sm: 'py-4',
    md: 'py-6',
    lg: 'py-8'
  }

  return (
    <section className={cn(
      'w-full',
      spacingClasses[spacing],
      className
    )}>
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {title && (
              <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm md:text-base text-mission-gray-400">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="ml-4 flex-shrink-0">
              {action}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

// Touch-friendly button grid
interface TouchButtonGridProps {
  children: ReactNode
  columns?: 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

export function TouchButtonGrid({
  children,
  columns = 2,
  gap = 'md',
  className
}: TouchButtonGridProps) {
  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-3', 
    4: 'grid-cols-2 md:grid-cols-4'
  }

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  }

  return (
    <div className={cn(
      'grid w-full',
      columnClasses[columns],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  )
}

// Swipeable card container
interface SwipeableCardContainerProps {
  children: ReactNode
  className?: string
  spacing?: boolean
}

export function SwipeableCardContainer({
  children,
  className,
  spacing = true
}: SwipeableCardContainerProps) {
  return (
    <div className={cn(
      'flex overflow-x-auto scrollbar-hide snap-x snap-mandatory',
      spacing && 'gap-4 px-4',
      className
    )}>
      {children}
    </div>
  )
}

// Mobile-optimized input wrapper
interface MobileInputWrapperProps {
  children: ReactNode
  label?: string
  error?: string
  helper?: string
  required?: boolean
  className?: string
}

export function MobileInputWrapper({
  children,
  label,
  error,
  helper,
  required = false,
  className
}: MobileInputWrapperProps) {
  return (
    <div className={cn('w-full space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-mission-gray-300">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      {helper && !error && (
        <p className="text-sm text-mission-gray-500">{helper}</p>
      )}
    </div>
  )
}