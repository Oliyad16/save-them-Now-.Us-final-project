'use client'

import { forwardRef } from 'react'
import { motion, MotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, keyof MotionProps> {
  variant?: 'default' | 'elevated' | 'bordered' | 'glass' | 'tier'
  tier?: 'free' | 'basic' | 'premium' | 'hero' | 'champion'
  glow?: boolean
  hoverable?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps & MotionProps>(
  ({ 
    className, 
    variant = 'default',
    tier,
    glow = false,
    hoverable = false,
    children,
    ...props 
  }, ref) => {
    const variants = {
      default: 'bg-mission-gray-900 border border-mission-gray-800',
      elevated: 'bg-mission-gray-900 border border-mission-gray-800 shadow-xl',
      bordered: 'bg-transparent border-2 border-mission-gray-700',
      glass: 'bg-mission-gray-900/80 backdrop-blur-sm border border-mission-gray-700/50',
      tier: tier ? `bg-gradient-to-br from-tier-${tier}/10 to-mission-gray-900 border border-tier-${tier}/30` : 'bg-mission-gray-900 border border-mission-gray-800'
    }

    const tierGlow = tier && glow ? {
      free: '',
      basic: 'shadow-glow-blue',
      premium: 'shadow-[0_0_20px_rgba(139,92,246,0.5)]',
      hero: 'shadow-[0_0_20px_rgba(245,158,11,0.5)]',
      champion: 'shadow-glow-red'
    }[tier] : ''

    return (
      <motion.div
        ref={ref}
        className={cn(
          'rounded-lg overflow-hidden',
          variants[variant],
          tierGlow,
          hoverable && 'transition-all duration-200 hover:shadow-lg hover:border-mission-gray-700',
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={hoverable ? { y: -2 } : {}}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-6 pb-0', className)}
      {...props}
    >
      {children}
    </div>
  )
)

const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-xl font-semibold text-white mb-2', className)}
      {...props}
    >
      {children}
    </h3>
  )
)

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-mission-gray-400', className)}
      {...props}
    >
      {children}
    </p>
  )
)

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-6', className)}
      {...props}
    >
      {children}
    </div>
  )
)

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-6 pt-0 flex items-center justify-between', className)}
      {...props}
    >
      {children}
    </div>
  )
)

Card.displayName = 'Card'
CardHeader.displayName = 'CardHeader'
CardTitle.displayName = 'CardTitle'
CardDescription.displayName = 'CardDescription'
CardContent.displayName = 'CardContent'
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
export type { CardProps }