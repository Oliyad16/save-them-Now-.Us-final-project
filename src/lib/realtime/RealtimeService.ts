import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { ChangeEvent } from '../data-processing/ChangeDetectionService'
import { adminDb } from '@/lib/firebase/admin'

export interface RealtimeSubscription {
  id: string
  userId?: string
  sessionId: string
  filters: {
    locations?: string[] // States or cities
    categories?: string[] // 'Missing Children', 'Missing Adults', 'AMBER Alert'
    priorities?: string[] // 'critical', 'high', 'medium', 'low'
    radius?: {
      latitude: number
      longitude: number
      miles: number
    }
  }
  tier: 'free' | 'supporter' | 'hero' | 'champion'
  connectedAt: Date
  lastActivity: Date
}

export interface RealtimeUpdate {
  id: string
  type: 'new_case' | 'status_update' | 'amber_alert' | 'resolution' | 'info_update'
  priority: 'critical' | 'high' | 'medium' | 'low'
  data: any
  timestamp: Date
  affectedLocations: string[]
  targetSubscriptions?: string[]
}

export class RealtimeService {
  private io: SocketIOServer | null = null
  private subscriptions: Map<string, RealtimeSubscription> = new Map()
  private rateLimiters: Map<string, number[]> = new Map()
  private isInitialized = false

  async initialize(httpServer: HTTPServer): Promise<void> {
    if (this.isInitialized) return

    console.log('🌐 Initializing Real-time Service...')

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://savethemnow.jesus'] 
          : ['http://localhost:3000', 'http://localhost:3006'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    })

    // Set up connection handling
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket)
    })

    // Start cleanup intervals
    this.startMaintenanceTasks()

    this.isInitialized = true
    console.log('✅ Real-time Service initialized')
  }

  private handleConnection(socket: Socket): void {
    console.log(`🔌 New connection: ${socket.id}`)

    socket.on('subscribe', async (subscriptionData) => {
      await this.handleSubscription(socket, subscriptionData)
    })

    socket.on('unsubscribe', () => {
      this.handleUnsubscription(socket)
    })

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() })
    })

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Disconnection: ${socket.id} - ${reason}`)
      this.handleUnsubscription(socket)
    })

    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error)
    })

    // Send initial connection acknowledgment
    socket.emit('connected', {
      sessionId: socket.id,
      serverTime: new Date(),
      features: {
        realTimeUpdates: true,
        amberAlerts: true,
        locationFiltering: true,
        tierBasedAccess: true
      }
    })
  }

  private async handleSubscription(socket: Socket, data: any): Promise<void> {
    try {
      // Rate limiting check
      if (!this.checkRateLimit(socket.id)) {
        socket.emit('error', { 
          type: 'RATE_LIMITED',
          message: 'Too many subscription requests. Please wait.'
        })
        return
      }

      // Validate subscription data
      const validationResult = this.validateSubscription(data)
      if (!validationResult.isValid) {
        socket.emit('error', {
          type: 'INVALID_SUBSCRIPTION',
          message: validationResult.message
        })
        return
      }

      // Check tier permissions
      const tierCheck = this.checkTierPermissions(data.tier, data.filters)
      if (!tierCheck.allowed) {
        socket.emit('error', {
          type: 'TIER_RESTRICTION',
          message: tierCheck.message,
          upgradeRequired: tierCheck.upgradeRequired
        })
        return
      }

      // Create subscription
      const subscription: RealtimeSubscription = {
        id: `sub_${socket.id}_${Date.now()}`,
        userId: data.userId,
        sessionId: socket.id,
        filters: data.filters || {},
        tier: data.tier || 'free',
        connectedAt: new Date(),
        lastActivity: new Date()
      }

      this.subscriptions.set(socket.id, subscription)

      // Join relevant rooms for efficient broadcasting
      const rooms = this.calculateRooms(subscription)
      for (const room of rooms) {
        socket.join(room)
      }

      // Save subscription to database for analytics
      await this.saveSubscription(subscription)

      socket.emit('subscription_confirmed', {
        subscriptionId: subscription.id,
        filters: subscription.filters,
        tier: subscription.tier,
        rooms: rooms.length
      })

      console.log(`📺 New subscription: ${subscription.id} (${subscription.tier})`)

      // Send recent updates if available
      await this.sendRecentUpdates(socket, subscription)

    } catch (error) {
      console.error(`❌ Subscription error for ${socket.id}:`, error)
      socket.emit('error', {
        type: 'SUBSCRIPTION_FAILED',
        message: 'Failed to create subscription'
      })
    }
  }

  private handleUnsubscription(socket: Socket): void {
    const subscription = this.subscriptions.get(socket.id)
    if (subscription) {
      this.subscriptions.delete(socket.id)
      console.log(`📺 Unsubscribed: ${subscription.id}`)
    }
  }

  private checkRateLimit(socketId: string): boolean {
    const now = Date.now()
    const windowMs = 60 * 1000 // 1 minute
    const maxRequests = 10

    let requests = this.rateLimiters.get(socketId) || []
    requests = requests.filter(time => now - time < windowMs)

    if (requests.length >= maxRequests) {
      return false
    }

    requests.push(now)
    this.rateLimiters.set(socketId, requests)
    return true
  }

  private validateSubscription(data: any): { isValid: boolean; message?: string } {
    if (!data.tier || !['free', 'supporter', 'hero', 'champion'].includes(data.tier)) {
      return { isValid: false, message: 'Invalid tier specified' }
    }

    if (data.filters) {
      if (data.filters.locations && !Array.isArray(data.filters.locations)) {
        return { isValid: false, message: 'Locations filter must be an array' }
      }

      if (data.filters.categories && !Array.isArray(data.filters.categories)) {
        return { isValid: false, message: 'Categories filter must be an array' }
      }

      if (data.filters.radius) {
        const radius = data.filters.radius
        if (!radius.latitude || !radius.longitude || !radius.miles) {
          return { isValid: false, message: 'Invalid radius filter' }
        }
        if (radius.miles > 500) {
          return { isValid: false, message: 'Radius cannot exceed 500 miles' }
        }
      }
    }

    return { isValid: true }
  }

  private checkTierPermissions(tier: string, filters: any): { allowed: boolean; message?: string; upgradeRequired?: string } {
    // Free tier restrictions
    if (tier === 'free') {
      if (filters.radius && filters.radius.miles > 50) {
        return {
          allowed: false,
          message: 'Free tier limited to 50-mile radius searches',
          upgradeRequired: 'supporter'
        }
      }
      
      if (filters.categories && filters.categories.length > 2) {
        return {
          allowed: false,
          message: 'Free tier limited to 2 category filters',
          upgradeRequired: 'supporter'
        }
      }
    }

    // Supporter tier restrictions  
    if (tier === 'supporter') {
      if (filters.radius && filters.radius.miles > 200) {
        return {
          allowed: false,
          message: 'Supporter tier limited to 200-mile radius searches',
          upgradeRequired: 'hero'
        }
      }
    }

    return { allowed: true }
  }

  private calculateRooms(subscription: RealtimeSubscription): string[] {
    const rooms: string[] = []

    // Always subscribe to critical updates
    rooms.push('critical')

    // Tier-based rooms
    rooms.push(`tier_${subscription.tier}`)
    
    // Location-based rooms
    if (subscription.filters.locations) {
      for (const location of subscription.filters.locations) {
        rooms.push(`location_${location.toLowerCase()}`)
      }
    }

    // Category-based rooms
    if (subscription.filters.categories) {
      for (const category of subscription.filters.categories) {
        rooms.push(`category_${category.toLowerCase().replace(/\s+/g, '_')}`)
      }
    }

    // Priority-based rooms
    if (subscription.filters.priorities) {
      for (const priority of subscription.filters.priorities) {
        rooms.push(`priority_${priority}`)
      }
    }

    return rooms
  }

  private async saveSubscription(subscription: RealtimeSubscription): Promise<void> {
    if (!adminDb) return

    try {
      await adminDb.collection('realtime_subscriptions').add({
        ...subscription,
        connectedAt: subscription.connectedAt,
        lastActivity: subscription.lastActivity
      })
    } catch (error) {
      console.warn('Warning saving subscription:', error)
    }
  }

  private async sendRecentUpdates(socket: Socket, subscription: RealtimeSubscription): Promise<void> {
    try {
      // Get recent updates from the last hour that match filters
      const recentUpdates = await this.getRecentUpdates(subscription.filters, 1)
      
      if (recentUpdates.length > 0) {
        socket.emit('recent_updates', {
          updates: recentUpdates.slice(0, 10), // Limit to 10 most recent
          timestamp: new Date()
        })
      }
    } catch (error) {
      console.warn('Warning sending recent updates:', error)
    }
  }

  private async getRecentUpdates(filters: any, hoursBack: number): Promise<RealtimeUpdate[]> {
    if (!adminDb) return []

    try {
      const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000)
      
      let query = adminDb.collection('realtime_updates')
        .where('timestamp', '>=', cutoff)
        .orderBy('timestamp', 'desc')
        .limit(50)

      const snapshot = await query.get()
      const updates = snapshot.docs.map(doc => doc.data() as RealtimeUpdate)

      // Apply client-side filtering for complex filters
      return updates.filter(update => this.matchesFilters(update, filters))
    } catch (error) {
      console.warn('Error getting recent updates:', error)
      return []
    }
  }

  private matchesFilters(update: RealtimeUpdate, filters: any): boolean {
    // Location filtering
    if (filters.locations && filters.locations.length > 0) {
      const matchesLocation = update.affectedLocations.some(location =>
        filters.locations.some((filterLoc: string) =>
          location.toLowerCase().includes(filterLoc.toLowerCase())
        )
      )
      if (!matchesLocation) return false
    }

    // Category filtering
    if (filters.categories && filters.categories.length > 0) {
      if (!filters.categories.includes(update.data.category)) {
        return false
      }
    }

    // Priority filtering
    if (filters.priorities && filters.priorities.length > 0) {
      if (!filters.priorities.includes(update.priority)) {
        return false
      }
    }

    // Radius filtering
    if (filters.radius && update.data.latitude && update.data.longitude) {
      const distance = this.calculateDistance(
        filters.radius.latitude,
        filters.radius.longitude,
        update.data.latitude,
        update.data.longitude
      )
      if (distance > filters.radius.miles) {
        return false
      }
    }

    return true
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959 // Radius of Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Public methods for broadcasting updates
  async broadcastUpdate(changeEvent: ChangeEvent): Promise<void> {
    if (!this.io) return

    try {
      const realtimeUpdate: RealtimeUpdate = {
        id: changeEvent.id,
        type: changeEvent.type,
        priority: changeEvent.priority,
        data: changeEvent.record,
        timestamp: new Date(),
        affectedLocations: this.extractLocations(changeEvent.record)
      }

      // Save update to database
      await this.saveRealtimeUpdate(realtimeUpdate)

      // Broadcast to appropriate rooms
      await this.broadcastToRooms(realtimeUpdate)

      console.log(`📡 Broadcasted ${changeEvent.type} update: ${changeEvent.id}`)

    } catch (error) {
      console.error('❌ Failed to broadcast update:', error)
    }
  }

  private extractLocations(record: any): string[] {
    const locations: string[] = []
    
    if (record.state) locations.push(record.state)
    if (record.city && record.state) locations.push(`${record.city}, ${record.state}`)
    if (record.county) locations.push(record.county)
    
    return locations
  }

  private async saveRealtimeUpdate(update: RealtimeUpdate): Promise<void> {
    if (!adminDb) return

    try {
      await adminDb.collection('realtime_updates').add(update)
    } catch (error) {
      console.warn('Warning saving realtime update:', error)
    }
  }

  private async broadcastToRooms(update: RealtimeUpdate): Promise<void> {
    if (!this.io) return

    const rooms: string[] = []

    // Critical updates go to everyone
    if (update.priority === 'critical') {
      rooms.push('critical')
    }

    // Location-based rooms
    for (const location of update.affectedLocations) {
      rooms.push(`location_${location.toLowerCase()}`)
    }

    // Category-based rooms
    if (update.data.category) {
      rooms.push(`category_${update.data.category.toLowerCase().replace(/\s+/g, '_')}`)
    }

    // Priority-based rooms
    rooms.push(`priority_${update.priority}`)

    // Tier-based broadcasting
    const tierRooms = this.getTierRoomsForUpdate(update)
    rooms.push(...tierRooms)

    // Broadcast to all relevant rooms
    for (const room of rooms) {
      this.io.to(room).emit('realtime_update', {
        ...update,
        room: room // For debugging
      })
    }

    console.log(`📡 Broadcasted to rooms: ${rooms.join(', ')}`)
  }

  private getTierRoomsForUpdate(update: RealtimeUpdate): string[] {
    const rooms: string[] = []

    // All tiers get AMBER alerts
    if (update.type === 'amber_alert') {
      rooms.push('tier_free', 'tier_supporter', 'tier_hero', 'tier_champion')
    }
    // Critical updates go to all tiers
    else if (update.priority === 'critical') {
      rooms.push('tier_free', 'tier_supporter', 'tier_hero', 'tier_champion')
    }
    // High priority updates to supporter and above
    else if (update.priority === 'high') {
      rooms.push('tier_supporter', 'tier_hero', 'tier_champion')
    }
    // Medium priority to hero and above
    else if (update.priority === 'medium') {
      rooms.push('tier_hero', 'tier_champion')
    }
    // Low priority only to champion tier
    else if (update.priority === 'low') {
      rooms.push('tier_champion')
    }

    return rooms
  }

  // Maintenance tasks
  private startMaintenanceTasks(): void {
    // Clean up old subscriptions every 5 minutes
    setInterval(() => {
      this.cleanupSubscriptions()
    }, 5 * 60 * 1000)

    // Clear rate limiters every hour
    setInterval(() => {
      this.rateLimiters.clear()
    }, 60 * 60 * 1000)

    // Clean up old updates every hour
    setInterval(() => {
      this.cleanupOldUpdates()
    }, 60 * 60 * 1000)
  }

  private cleanupSubscriptions(): void {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes
    
    for (const [socketId, subscription] of this.subscriptions) {
      if (subscription.lastActivity < cutoff) {
        this.subscriptions.delete(socketId)
        console.log(`🧹 Cleaned up stale subscription: ${subscription.id}`)
      }
    }
  }

  private async cleanupOldUpdates(): Promise<void> {
    if (!adminDb) return

    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
      
      const snapshot = await adminDb.collection('realtime_updates')
        .where('timestamp', '<', cutoff)
        .limit(100)
        .get()

      if (!snapshot.empty) {
        const batch = adminDb.batch()
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref)
        })
        await batch.commit()
        
        console.log(`🧹 Cleaned up ${snapshot.size} old realtime updates`)
      }
    } catch (error) {
      console.warn('Warning cleaning up old updates:', error)
    }
  }

  // Statistics and monitoring
  getConnectionStats(): any {
    return {
      totalConnections: this.subscriptions.size,
      connectionsByTier: this.getConnectionsByTier(),
      averageFiltersPerConnection: this.getAverageFilters(),
      uptime: process.uptime()
    }
  }

  private getConnectionsByTier(): Record<string, number> {
    const stats: Record<string, number> = {
      free: 0,
      supporter: 0,
      hero: 0,
      champion: 0
    }

    for (const subscription of this.subscriptions.values()) {
      stats[subscription.tier]++
    }

    return stats
  }

  private getAverageFilters(): number {
    if (this.subscriptions.size === 0) return 0

    let totalFilters = 0
    for (const subscription of this.subscriptions.values()) {
      const filters = subscription.filters
      totalFilters += (filters.locations?.length || 0) +
                     (filters.categories?.length || 0) +
                     (filters.priorities?.length || 0) +
                     (filters.radius ? 1 : 0)
    }

    return totalFilters / this.subscriptions.size
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Real-time Service...')
    
    if (this.io) {
      this.io.close()
      this.io = null
    }
    
    this.subscriptions.clear()
    this.rateLimiters.clear()
    
    console.log('✅ Real-time Service shutdown complete')
  }
}

export const realtimeService = new RealtimeService()