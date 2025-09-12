import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    
    if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
      console.warn('Firebase Admin SDK not configured. Some features may not work.')
      return null
    }

    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    })
  }
  
  return getApps()[0]
}

const app = initializeFirebaseAdmin()

// Export initialized services
export const adminDb = app ? getFirestore(app) : null
export const adminAuth = app ? getAuth(app) : null
export const adminStorage = app ? getStorage(app) : null

export default app