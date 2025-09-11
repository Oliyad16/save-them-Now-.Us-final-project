'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, Button } from '@/components/ui'
import { UserTier } from '@/components/access'
import { cn } from '@/lib/utils'

export interface Notification {
  id: string
  type: 'case_update' | 'new_case' | 'resolved_case' | 'amber_alert' | 'system' | 'achievement'
  title: string
  message: string
  timestamp: Date
  priority: 'low' | 'medium' | 'high' | 'critical'
  actionLabel?: string
  actionUrl?: string
  caseId?: string
  location?: string
  read: boolean
  persistent?: boolean
}

interface NotificationSystemProps {
  currentTier: UserTier
  onNotificationClick?: (notification: Notification) => void
  className?: string
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'amber_alert',
    title: 'AMBER Alert Issued',
    message: 'Missing child alert issued for Sarah Johnson, age 8, last seen in downtown Phoenix',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    priority: 'critical',
    actionLabel: 'View Details',
    caseId: 'AMB-2025-001',
    location: 'Phoenix, AZ',
    read: false,
    persistent: true
  },
  {
    id: '2',
    type: 'case_update',
    title: 'Case Status Update',
    message: 'Michael Rodriguez case has been updated with new information',
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    priority: 'high',
    actionLabel: 'View Case',
    caseId: 'MP-2025-047',
    location: 'Los Angeles, CA',
    read: false
  },
  {
    id: '3',
    type: 'resolved_case',
    title: 'Case Resolved',
    message: 'Emma Thompson has been found safe and reunited with family',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    priority: 'medium',
    actionLabel: 'Read More',
    caseId: 'MP-2025-032',
    location: 'Seattle, WA',
    read: false
  },
  {
    id: '4',
    type: 'achievement',
    title: 'Badge Unlocked!',
    message: 'You\'ve earned the "Hope Bringer" badge for your $25 donation',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    priority: 'low',
    read: true
  }
]

export function NotificationSystem({ 
  currentTier, 
  onNotificationClick,
  className 
}: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all')

  // Simulate real-time notifications
  useEffect(() => {
    // Load initial notifications
    setNotifications(mockNotifications)

    // Only hero and champion tiers get real-time updates
    if (!['hero', 'champion'].includes(currentTier)) return

    // Simulate periodic new notifications
    const interval = setInterval(() => {
      if (Math.random() > 0.8) { // 20% chance every 30 seconds
        const newNotification: Notification = {
          id: `realtime-${Date.now()}`,
          type: Math.random() > 0.7 ? 'amber_alert' : 'case_update',
          title: Math.random() > 0.7 ? 'AMBER Alert' : 'Case Update',
          message: 'Real-time update: New information available',
          timestamp: new Date(),
          priority: Math.random() > 0.8 ? 'critical' : 'high',
          read: false,
          location: 'Live Update'
        }
        
        setNotifications(prev => [newNotification, ...prev.slice(0, 49)]) // Keep last 50
      }
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [currentTier])

  const unreadCount = notifications.filter(n => !n.read).length
  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read
      case 'critical':
        return notification.priority === 'critical'
      default:
        return true
    }
  })

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const handleNotificationClick = useCallback((notification: Notification) => {
    markAsRead(notification.id)
    onNotificationClick?.(notification)
  }, [markAsRead, onNotificationClick])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-950/20'
      case 'high': return 'border-orange-500 bg-orange-950/20'
      case 'medium': return 'border-blue-500 bg-blue-950/20'
      default: return 'border-mission-gray-700 bg-mission-gray-900/20'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'amber_alert': return '🚨'
      case 'case_update': return '📝'
      case 'new_case': return '🆕'
      case 'resolved_case': return '✅'
      case 'achievement': return '🏆'
      default: return '📢'
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  // Don't show notifications for anonymous users
  if (currentTier === 'anonymous') return null

  return (
    <div className={cn('relative', className)}>
      {/* Notification Bell */}
      <motion.button
        className="relative p-2 rounded-lg bg-mission-gray-800 hover:bg-mission-gray-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg className="w-6 h-6 text-mission-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5V4.01L9 2v6H4l6 6.01z" />
        </svg>
        
        {/* Notification badge */}
        {unreadCount > 0 && (
          <motion.div
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            key={unreadCount}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}

        {/* Live indicator for real-time tiers */}
        {['hero', 'champion'].includes(currentTier) && (
          <motion.div
            className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-12 right-0 z-50 w-96 max-h-96 bg-mission-gray-900 border border-mission-gray-800 rounded-lg shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-mission-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="xs" onClick={markAllAsRead}>
                    Mark all read
                  </Button>
                )}
              </div>
              
              {/* Filter tabs */}
              <div className="flex gap-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'unread', label: `Unread (${unreadCount})` },
                  { key: 'critical', label: 'Critical' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    className={cn(
                      'px-3 py-1 text-xs rounded transition-colors',
                      filter === key 
                        ? 'bg-mission-primary text-white' 
                        : 'text-mission-gray-400 hover:text-white hover:bg-mission-gray-800'
                    )}
                    onClick={() => setFilter(key as any)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-80 overflow-y-auto">
              {filteredNotifications.length > 0 ? (
                <div className="divide-y divide-mission-gray-800">
                  {filteredNotifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      className={cn(
                        'p-4 cursor-pointer transition-colors border-l-4',
                        getPriorityColor(notification.priority),
                        !notification.read && 'bg-mission-gray-800/30',
                        'hover:bg-mission-gray-800/50'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                      whileHover={{ x: 2 }}
                      layout
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg flex-shrink-0 mt-0.5">
                          {getTypeIcon(notification.type)}
                        </span>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={cn(
                              'font-medium text-sm',
                              !notification.read ? 'text-white' : 'text-mission-gray-300'
                            )}>
                              {notification.title}
                            </h4>
                            <span className="text-xs text-mission-gray-500 flex-shrink-0">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                          </div>
                          
                          <p className="text-xs text-mission-gray-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          {notification.location && (
                            <p className="text-xs text-mission-gray-500 mt-1">
                              📍 {notification.location}
                            </p>
                          )}
                          
                          {notification.actionLabel && (
                            <Button
                              variant="ghost"
                              size="xs"
                              className="mt-2 text-mission-primary hover:text-mission-primary"
                            >
                              {notification.actionLabel} →
                            </Button>
                          )}
                        </div>
                        
                        {!notification.read && (
                          <div className="w-2 h-2 bg-mission-primary rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-mission-gray-500">
                  <div className="text-4xl mb-2">🔔</div>
                  <p>No notifications</p>
                </div>
              )}
            </div>

            {/* Footer for premium features */}
            {!['hero', 'champion'].includes(currentTier) && (
              <div className="p-3 border-t border-mission-gray-800 bg-mission-gray-800/50">
                <p className="text-xs text-mission-gray-400 text-center">
                  Upgrade to Hero or Champion for real-time alerts
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast notifications for critical alerts */}
      <AnimatePresence>
        {notifications
          .filter(n => !n.read && n.priority === 'critical' && n.persistent)
          .slice(0, 1) // Show only one toast at a time
          .map((notification) => (
            <motion.div
              key={`toast-${notification.id}`}
              className="fixed top-4 right-4 z-50 max-w-sm"
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Card className="border-red-500 bg-red-950/20 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🚨</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-sm mb-1">
                        {notification.title}
                      </h4>
                      <p className="text-xs text-red-200 mb-3">
                        {notification.message}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="xs"
                          variant="danger"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  )
}