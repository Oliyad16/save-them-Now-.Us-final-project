'use client'

import { Component, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Button } from './Button'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: { componentStack: string }
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: { componentStack: string }) => void
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    this.setState({
      error,
      errorInfo
    })
    
    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error?: Error
  onReset?: () => void
  className?: string
}

export function ErrorFallback({ error, onReset, className }: ErrorFallbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center min-h-[400px] bg-mission-gray-900 border border-mission-gray-800 rounded-lg p-8 text-center ${className}`}
    >
      {/* Error Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6"
      >
        <span className="text-3xl">⚠️</span>
      </motion.div>

      {/* Error Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-4 max-w-md"
      >
        <h2 className="text-xl font-semibold text-white">
          Something went wrong
        </h2>
        
        <p className="text-mission-gray-400 text-sm leading-relaxed">
          We encountered an unexpected error. This has been logged and our team will investigate.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="text-left bg-mission-gray-800 p-4 rounded-lg mt-4">
            <summary className="text-red-400 cursor-pointer mb-2">
              Error Details (Development)
            </summary>
            <pre className="text-xs text-mission-gray-300 overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col sm:flex-row gap-3 mt-8"
      >
        <Button
          onClick={onReset}
          variant="primary"
          size="md"
        >
          Try Again
        </Button>
        
        <Button
          onClick={() => window.location.href = '/'}
          variant="ghost"
          size="md"
        >
          Go Home
        </Button>
      </motion.div>

      {/* Contact Support */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-xs text-mission-gray-500 mt-6"
      >
        If this problem persists,{' '}
        <button
          onClick={() => {
            const subject = encodeURIComponent('Error Report - SaveThemNow.Jesus')
            const body = encodeURIComponent(`Error: ${error?.message || 'Unknown error'}\n\nURL: ${window.location.href}\n\nTime: ${new Date().toISOString()}`)
            window.location.href = `mailto:support@savethemnow.jesus?subject=${subject}&body=${body}`
          }}
          className="text-mission-primary hover:text-blue-400 underline"
        >
          contact support
        </button>
      </motion.p>
    </motion.div>
  )
}

// Specialized error components
export function NotFoundError({ 
  title = "Page Not Found",
  message = "The page you're looking for doesn't exist or has been moved.",
  showBackButton = true 
}: {
  title?: string
  message?: string
  showBackButton?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[400px] text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="text-6xl mb-6"
      >
        🔍
      </motion.div>

      <h1 className="text-2xl font-bold text-white mb-4">{title}</h1>
      <p className="text-mission-gray-400 mb-8 max-w-md">{message}</p>

      <div className="flex gap-3">
        {showBackButton && (
          <Button
            onClick={() => window.history.back()}
            variant="ghost"
            size="md"
          >
            ← Go Back
          </Button>
        )}
        
        <Button
          onClick={() => window.location.href = '/'}
          variant="primary"
          size="md"
        >
          Return Home
        </Button>
      </div>
    </motion.div>
  )
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[300px] text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="text-4xl mb-4"
      >
        📡
      </motion.div>

      <h2 className="text-xl font-semibold text-white mb-2">
        Connection Error
      </h2>
      
      <p className="text-mission-gray-400 mb-6 max-w-sm">
        Unable to connect to our servers. Please check your internet connection and try again.
      </p>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="primary"
          size="md"
        >
          Retry Connection
        </Button>
      )}
    </motion.div>
  )
}