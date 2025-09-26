'use client'

import { useEffect, useState } from 'react'

interface ServiceWorkerState {
  isSupported: boolean
  isRegistered: boolean
  isOnline: boolean
  updateAvailable: boolean
  registration: ServiceWorkerRegistration | null
}

/**
 * Service Worker Provider Component
 * Handles service worker registration, updates, and offline functionality
 * Zero cost solution for enhanced app reliability
 */
export default function ServiceWorkerProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [swState, setSwState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: navigator?.onLine ?? true,
    updateAvailable: false,
    registration: null
  })

  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [showOfflineIndicator, setShowOfflineIndicator] = useState(false)

  useEffect(() => {
    // Check service worker support
    if ('serviceWorker' in navigator) {
      setSwState(prev => ({ ...prev, isSupported: true }))
      registerServiceWorker()
    }

    // Monitor online/offline status
    const handleOnline = () => {
      setSwState(prev => ({ ...prev, isOnline: true }))
      setShowOfflineIndicator(false)
    }

    const handleOffline = () => {
      setSwState(prev => ({ ...prev, isOnline: false }))
      setShowOfflineIndicator(true)
      setTimeout(() => setShowOfflineIndicator(false), 5000) // Hide after 5 seconds
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      setSwState(prev => ({ 
        ...prev, 
        isRegistered: true, 
        registration 
      }))

      console.log('✅ Service Worker registered:', registration)

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available
                setSwState(prev => ({ ...prev, updateAvailable: true }))
                setShowUpdatePrompt(true)
                console.log('🔄 Service Worker update available')
              }
            }
          })
        }
      })

      // Check for waiting service worker
      if (registration.waiting) {
        setSwState(prev => ({ ...prev, updateAvailable: true }))
        setShowUpdatePrompt(true)
      }

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error)
    }
  }

  const handleUpdate = async () => {
    if (swState.registration?.waiting) {
      // Tell the waiting service worker to skip waiting
      swState.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      
      // Refresh the page to load the new service worker
      window.location.reload()
    }
  }

  const dismissUpdate = () => {
    setShowUpdatePrompt(false)
    setSwState(prev => ({ ...prev, updateAvailable: false }))
  }

  return (
    <>
      {children}
      
      {/* Update Available Notification */}
      {showUpdatePrompt && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg 
                className="w-6 h-6 text-blue-200" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Update Available</h3>
              <p className="text-sm text-blue-100 mb-3">
                A new version of SaveThemNow is available with improvements and bug fixes.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdate}
                  className="px-3 py-1 bg-white text-blue-600 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                  Update Now
                </button>
                <button
                  onClick={dismissUpdate}
                  className="px-3 py-1 text-blue-200 text-sm hover:text-white transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {showOfflineIndicator && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-orange-500 text-white p-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">
              <svg 
                className="w-5 h-5" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
            <div className="flex-1">
              <span className="font-medium">You&apos;re offline</span>
              <span className="ml-2 text-orange-200">
                Some features may be limited. We&apos;ll sync when you&apos;re back online.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Online Status Recovery */}
      {swState.isOnline && swState.isRegistered && (
        <div className="sr-only" aria-live="polite">
          Connection restored. All features are available.
        </div>
      )}
    </>
  )
}

// Hook for using service worker state in components
export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: navigator?.onLine ?? true,
    updateAvailable: false,
    registration: null
  })

  useEffect(() => {
    const checkServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        setState(prev => ({
          ...prev,
          isSupported: true,
          isRegistered: !!registration,
          registration: registration || null
        }))
      }
    }

    checkServiceWorker()

    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const requestBackgroundSync = async (tag: string) => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready
      if ('sync' in registration) {
        await (registration as any).sync.register(tag)
        console.log('🔄 Background sync registered:', tag)
      }
    }
  }

  const showNotification = async (title: string, options?: NotificationOptions) => {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      const permission = await Notification.requestPermission()
      
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(title, options)
      }
    }
  }

  return {
    ...state,
    requestBackgroundSync,
    showNotification
  }
}

// Utility function to handle offline actions
export async function handleOfflineAction(action: any) {
  // Store action in IndexedDB for later sync
  if ('serviceWorker' in navigator) {
    // Open IndexedDB and store the action
    const request = indexedDB.open('SaveThemNowOffline', 1)
    
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('pending_actions')) {
        db.createObjectStore('pending_actions', { keyPath: 'id' })
      }
    }

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['pending_actions'], 'readwrite')
      const store = transaction.objectStore('pending_actions')
      
      store.add({
        id: Date.now(),
        action,
        timestamp: new Date().toISOString()
      })

      console.log('📤 Action queued for sync:', action.type)
    }

    // Register for background sync
    const registration = await navigator.serviceWorker.ready
    if ('sync' in registration) {
      await (registration as any).sync.register('background-sync')
    }
  }
}