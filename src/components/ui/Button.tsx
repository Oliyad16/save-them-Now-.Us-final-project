'use client'

import { forwardRef } from 'react'
import { motion, MotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof MotionProps> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'tier'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  tier?: 'free' | 'basic' | 'premium' | 'hero' | 'champion'
  loading?: boolean
  glow?: boolean
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps & MotionProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    tier,
    loading = false,
    glow = false,
    disabled,
    children, 
    ...props 
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      primary: 'bg-mission-primary hover:bg-blue-600 text-white focus:ring-mission-primary',
      secondary: 'bg-mission-secondary hover:bg-red-600 text-white focus:ring-mission-secondary',
      success: 'bg-mission-accent hover:bg-green-600 text-white focus:ring-mission-accent',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
      warning: 'bg-mission-warning hover:bg-amber-600 text-white focus:ring-mission-warning',
      ghost: 'bg-transparent hover:bg-mission-gray-800 text-mission-gray-300 hover:text-white border border-mission-gray-700 hover:border-mission-gray-600',
      tier: tier ? `bg-tier-${tier} hover:bg-opacity-80 text-white focus:ring-tier-${tier}` : 'bg-mission-primary hover:bg-blue-600 text-white focus:ring-mission-primary'
    }
    
    const sizes = {
      xs: 'px-2 py-1 text-xs rounded',
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-sm rounded-lg',
      lg: 'px-6 py-3 text-base rounded-lg',
      xl: 'px-8 py-4 text-lg rounded-xl'
    }

    const glowClasses = glow && !disabled ? {
      primary: 'shadow-glow-blue',
      secondary: 'shadow-glow-red', 
      success: 'shadow-glow-green',
      danger: 'shadow-glow-red',
      warning: 'shadow-yellow-500/50',
      ghost: '',
      tier: 'shadow-tier'
    }[variant] : ''

    return (
      <motion.button
        ref={ref}
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          glowClasses,
          loading && 'cursor-wait',
          className
        )}
        disabled={disabled || loading}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        {...props}
      >
        {loading ? (
          <>
            <motion.div 
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            Loading...
          </>
        ) : (
          children
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
export type { ButtonProps }