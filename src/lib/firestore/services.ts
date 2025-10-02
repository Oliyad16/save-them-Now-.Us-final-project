import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  setDoc,
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp
} from 'firebase/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { db } from '@/lib/firebase/config'

// Helper function to check if Firestore is available
function isFirestoreAvailable() {
  return db !== null && db !== undefined
}

export interface PaginationOptions {
  limit?: number
  offset?: number
  lastDoc?: QueryDocumentSnapshot<DocumentData>
}

export interface MissingPersonData {
  caseNumber: string
  name: string
  age?: number
  gender?: string
  ethnicity?: string
  city?: string
  county?: string
  state?: string
  location?: string
  latitude?: number
  longitude?: number
  dateMissing?: string
  dateReported?: string
  status: string
  category: string
  description?: string
  source?: string
  searchable?: {
    name: string
    city: string
    state: string
    caseNumber: string
  }
}

export interface UserData {
  id?: string
  email: string
  name: string
  tier?: string
  zipCode?: string
  emailVerified?: boolean
  createdAt?: Date
  lastLogin?: Date
}

export interface DonationData {
  userId?: string
  email: string
  amount: number
  currency?: string
  donationType?: string
  anonymous?: boolean
  message?: string
  stripePaymentIntentId?: string
  receiptSent?: boolean
  taxReceiptId?: string
  createdAt?: Date
}

export interface SubscriptionData {
  userId: string
  tierId?: string
  status: string
  stripeSubscriptionId?: string
  stripeCustomerId?: string
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  cancelAtPeriodEnd?: boolean
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Missing Persons Service
 */
export class MissingPersonsService {
  private collectionName = 'missing_persons'

  async getAll(options: PaginationOptions = {}) {
    if (!isFirestoreAvailable()) {
      throw new Error('Firestore is not available')
    }
    
    const { limit: pageLimit = 5000, offset = 0 } = options
    
    // Cap at 5000 records maximum
    const actualLimit = Math.min(pageLimit, 5000)
    
    try {
      let q = query(
        collection(db, this.collectionName),
        orderBy('dateMissing', 'desc'),
        limit(actualLimit)
      )

      // Handle offset-based pagination
      if (offset > 0) {
        const offsetDocs = await getDocs(query(
          collection(db, this.collectionName),
          orderBy('dateMissing', 'desc'),
          limit(offset)
        ))
        
        if (offsetDocs.docs.length > 0) {
          const lastVisible = offsetDocs.docs[offsetDocs.docs.length - 1]
          q = query(
            collection(db, this.collectionName),
            orderBy('dateMissing', 'desc'),
            startAfter(lastVisible),
            limit(actualLimit)
          )
        }
      }

      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      return {
        data,
        meta: {
          total: data.length, // Note: For exact total, need a separate count query
          limit: actualLimit,
          offset,
          hasMore: data.length === actualLimit
        }
      }
    } catch (error) {
      console.error('Error fetching missing persons:', error)
      throw new Error('Failed to fetch missing persons')
    }
  }

  async search(searchTerm: string, options: PaginationOptions = {}) {
    if (!isFirestoreAvailable()) {
      throw new Error('Firestore is not available')
    }
    
    const { limit: pageLimit = 50 } = options
    
    try {
      // Create multiple search queries
      const queries = [
        // Search by name
        query(
          collection(db, this.collectionName),
          where('searchable.name', '>=', searchTerm.toLowerCase()),
          where('searchable.name', '<=', searchTerm.toLowerCase() + '\uf8ff'),
          limit(pageLimit)
        ),
        // Search by city
        query(
          collection(db, this.collectionName),
          where('searchable.city', '>=', searchTerm.toLowerCase()),
          where('searchable.city', '<=', searchTerm.toLowerCase() + '\uf8ff'),
          limit(pageLimit)
        ),
        // Search by case number
        query(
          collection(db, this.collectionName),
          where('searchable.caseNumber', '>=', searchTerm.toLowerCase()),
          where('searchable.caseNumber', '<=', searchTerm.toLowerCase() + '\uf8ff'),
          limit(pageLimit)
        )
      ]

      const results = await Promise.all(queries.map(q => getDocs(q)))
      const allDocs = new Map()

      // Combine results and remove duplicates
      results.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          allDocs.set(doc.id, { id: doc.id, ...doc.data() })
        })
      })

      return Array.from(allDocs.values()).slice(0, pageLimit)
    } catch (error) {
      console.error('Error searching missing persons:', error)
      throw new Error('Failed to search missing persons')
    }
  }

  async getByCategory(category: string, options: PaginationOptions = {}) {
    if (!isFirestoreAvailable()) {
      throw new Error('Firestore is not available')
    }
    
    const { limit: pageLimit = 100 } = options
    
    try {
      const q = query(
        collection(db, this.collectionName),
        where('category', '==', category),
        orderBy('dateMissing', 'desc'),
        limit(pageLimit)
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Error fetching by category:', error)
      throw new Error('Failed to fetch missing persons by category')
    }
  }

  async create(data: MissingPersonData) {
    if (!isFirestoreAvailable()) {
      throw new Error('Firestore is not available')
    }
    
    try {
      // Add searchable fields
      const searchableData = {
        ...data,
        searchable: {
          name: (data.name || '').toLowerCase(),
          city: (data.city || '').toLowerCase(),
          state: (data.state || '').toLowerCase(),
          caseNumber: (data.caseNumber || '').toLowerCase()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const docRef = await addDoc(collection(db, this.collectionName), searchableData)
      return { id: docRef.id, ...searchableData }
    } catch (error) {
      console.error('Error creating missing person:', error)
      throw new Error('Failed to create missing person')
    }
  }

  async update(id: string, data: Partial<MissingPersonData>) {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date()
      }

      // Update searchable fields if relevant data changed
      if (data.name || data.city || data.state || data.caseNumber) {
        updateData.searchable = {
          name: (data.name || '').toLowerCase(),
          city: (data.city || '').toLowerCase(),
          state: (data.state || '').toLowerCase(),
          caseNumber: (data.caseNumber || '').toLowerCase()
        }
      }

      await updateDoc(doc(db, this.collectionName, id), updateData)
      return { id, ...updateData }
    } catch (error) {
      console.error('Error updating missing person:', error)
      throw new Error('Failed to update missing person')
    }
  }
}

/**
 * Users Service
 */
export class UsersService {
  private collectionName = 'users'

  async getByEmail(email: string) {
    try {
      const q = query(collection(db, this.collectionName), where('email', '==', email))
      const snapshot = await getDocs(q)
      
      if (snapshot.empty) {
        return null
      }

      const doc = snapshot.docs[0]
      return { id: doc.id, ...doc.data() }
    } catch (error) {
      console.error('Error fetching user by email:', error)
      throw new Error('Failed to fetch user')
    }
  }

  async create(data: UserData) {
    try {
      if (!isFirestoreAvailable()) {
        throw new Error('Firestore is not available')
      }

      const { id, ...rest } = data
      const now = new Date()
      const userData: Omit<UserData, 'id'> & { createdAt: Date | Timestamp; updatedAt: Date } = {
        ...rest,
        tier: rest.tier || 'free',
        emailVerified: rest.emailVerified || false,
        createdAt: rest.createdAt || now,
        updatedAt: now
      }

      if (id) {
        const userRef = doc(db, this.collectionName, id)
        const existing = await getDoc(userRef)

        if (existing.exists()) {
          const existingData = existing.data() as Record<string, unknown>
          userData.createdAt = (existingData?.createdAt as Date | Timestamp) || userData.createdAt
          await setDoc(userRef, userData, { merge: true })
        } else {
          await setDoc(userRef, userData)
        }

        return { id, ...userData }
      }

      const docRef = await addDoc(collection(db, this.collectionName), userData)
      return { id: docRef.id, ...userData }
    } catch (error) {
      console.error('Error creating user:', error)
      throw new Error('Failed to create user')
    }
  }

  async update(id: string, data: Partial<UserData>) {
    try {
      if (!isFirestoreAvailable()) {
        throw new Error('Firestore is not available')
      }

      const updateData = {
        ...data,
        updatedAt: new Date()
      }

      const userRef = doc(db, this.collectionName, id)
      await setDoc(userRef, updateData, { merge: true })
      return { id, ...updateData }
    } catch (error) {
      console.error('Error updating user:', error)
      throw new Error('Failed to update user')
    }
  }
}

/**
 * Donations Service
 */
export class DonationsService {
  private collectionName = 'donations'

  async getByUserId(userId: string, options: PaginationOptions = {}) {
    const { limit: pageLimit = 10, offset = 0 } = options
    
    try {
      let q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(pageLimit)
      )

      if (offset > 0) {
        const offsetDocs = await getDocs(query(
          collection(db, this.collectionName),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(offset)
        ))
        
        if (offsetDocs.docs.length > 0) {
          const lastVisible = offsetDocs.docs[offsetDocs.docs.length - 1]
          q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            startAfter(lastVisible),
            limit(pageLimit)
          )
        }
      }

      const snapshot = await getDocs(q)
      const donations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      // Get totals
      const allUserDonations = await getDocs(query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      ))

      const totalAmount = allUserDonations.docs.reduce((sum, doc) => {
        return sum + (doc.data().amount || 0)
      }, 0)

      return {
        donations,
        pagination: { limit: pageLimit, offset, total: allUserDonations.size },
        summary: { totalDonated: totalAmount, totalDonations: allUserDonations.size }
      }
    } catch (error) {
      console.error('Error fetching donations:', error)
      throw new Error('Failed to fetch donations')
    }
  }

  async create(data: DonationData) {
    try {
      const donationData = {
        ...data,
        currency: data.currency || 'usd',
        createdAt: new Date()
      }

      const docRef = await addDoc(collection(db, this.collectionName), donationData)
      return { id: docRef.id, ...donationData }
    } catch (error) {
      console.error('Error creating donation:', error)
      throw new Error('Failed to create donation')
    }
  }
}

/**
 * Subscriptions Service
 */
export class SubscriptionsService {
  private collectionName = 'subscriptions'

  async getActiveByUserId(userId: string) {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(1)
      )

      const snapshot = await getDocs(q)
      
      if (snapshot.empty) {
        return null
      }

      const doc = snapshot.docs[0]
      return { id: doc.id, ...doc.data() }
    } catch (error) {
      console.error('Error fetching subscription:', error)
      throw new Error('Failed to fetch subscription')
    }
  }

  async create(data: SubscriptionData) {
    try {
      const subscriptionData = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const docRef = await addDoc(collection(db, this.collectionName), subscriptionData)
      return { id: docRef.id, ...subscriptionData }
    } catch (error) {
      console.error('Error creating subscription:', error)
      throw new Error('Failed to create subscription')
    }
  }

  async update(id: string, data: Partial<SubscriptionData>) {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date()
      }

      await updateDoc(doc(db, this.collectionName, id), updateData)
      return { id, ...updateData }
    } catch (error) {
      console.error('Error updating subscription:', error)
      throw new Error('Failed to update subscription')
    }
  }

  async updateByStripeId(stripeSubscriptionId: string, data: Partial<SubscriptionData>) {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('stripeSubscriptionId', '==', stripeSubscriptionId)
      )

      const snapshot = await getDocs(q)
      
      if (snapshot.empty) {
        throw new Error('Subscription not found')
      }

      const subscriptionDoc = snapshot.docs[0]
      await this.update(subscriptionDoc.id, data)
      
      return { id: subscriptionDoc.id, ...data }
    } catch (error) {
      console.error('Error updating subscription by Stripe ID:', error)
      throw new Error('Failed to update subscription')
    }
  }
}

// Export service instances
export const missingPersonsService = new MissingPersonsService()
export const usersService = new UsersService()
export const donationsService = new DonationsService()
export const subscriptionsService = new SubscriptionsService()
