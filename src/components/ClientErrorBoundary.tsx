'use client'

import { ErrorBoundary as ErrorBoundaryComponent } from '@/components/ui/ErrorBoundary'
import { ReactNode } from 'react'

export function ClientErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundaryComponent
      onError={(error, errorInfo) => {
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Application Error:', error, errorInfo)
        }
        // TODO: Send to error tracking service in production
      }}
    >
      {children}
    </ErrorBoundaryComponent>
  )
}
