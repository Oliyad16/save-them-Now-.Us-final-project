'use client'

import { forwardRef, useEffect } from 'react'
import { motion, AnimatePresence, MotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ModalProps extends Omit<React.HTMLAttributes<HTMLDivElement>, keyof MotionProps> {
  isOpen: boolean
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  variant?: 'default' | 'tier' | 'achievement'
  tier?: 'free' | 'basic' | 'premium' | 'hero' | 'champion'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
}

const Modal = forwardRef<HTMLDivElement, ModalProps & MotionProps>(
  ({ 
    isOpen,
    onClose,
    size = 'md',
    variant = 'default',
    tier,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    showCloseButton = true,
    className,
    children,
    ...props 
  }, ref) => {
    const sizes = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      full: 'max-w-full mx-4'
    }

    const variants = {
      default: 'bg-mission-gray-900 border border-mission-gray-800',
      tier: tier ? `bg-gradient-to-br from-tier-${tier}/20 to-mission-gray-900 border border-tier-${tier}/50` : 'bg-mission-gray-900 border border-mission-gray-800',
      achievement: 'bg-gradient-to-br from-badge-guardian/20 to-mission-gray-900 border border-badge-guardian/50'
    }

    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (closeOnEscape && e.key === 'Escape') {
          onClose()
        }
      }

      if (isOpen) {
        document.addEventListener('keydown', handleEscape)
        document.body.style.overflow = 'hidden'
      }

      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = 'unset'
      }
    }, [isOpen, closeOnEscape, onClose])

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose()
      }
    }

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleOverlayClick}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal Content */}
            <motion.div
              ref={ref}
              className={cn(
                'relative w-full rounded-lg shadow-2xl',
                sizes[size],
                variants[variant],
                className
              )}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30 
              }}
              {...props}
            >
              {/* Close Button */}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-mission-gray-800 hover:bg-mission-gray-700 text-mission-gray-400 hover:text-white transition-colors"
                >
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M6 18L18 6M6 6l12 12" 
                    />
                  </svg>
                </button>
              )}

              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }
)

const ModalHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
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

const ModalTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-2xl font-bold text-white mb-2', className)}
      {...props}
    >
      {children}
    </h2>
  )
)

const ModalDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
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

const ModalContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
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

const ModalFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-6 pt-0 flex items-center justify-end gap-3', className)}
      {...props}
    >
      {children}
    </div>
  )
)

Modal.displayName = 'Modal'
ModalHeader.displayName = 'ModalHeader'
ModalTitle.displayName = 'ModalTitle'
ModalDescription.displayName = 'ModalDescription'
ModalContent.displayName = 'ModalContent'
ModalFooter.displayName = 'ModalFooter'

export { Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent, ModalFooter }
export type { ModalProps }