import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Check if Firebase config is valid
function isFirebaseConfigValid() {
  return !!(
    firebaseConfig.apiKey && 
    firebaseConfig.authDomain && 
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== 'your-firebase-api-key' // Check for placeholder
  )
}

let app: any = null
let db: any = null
let auth: any = null
let storage: any = null

// Initialize Firebase only if config is valid
if (isFirebaseConfigValid()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    db = getFirestore(app)
    auth = getAuth(app)
    storage = getStorage(app)
    console.log('Firebase initialized successfully')
  } catch (error) {
    console.warn('Firebase initialization failed:', error)
    app = null
    db = null
    auth = null
    storage = null
  }
} else {
  console.warn('Firebase config is invalid or incomplete, skipping initialization')
}

export { db, auth, storage }
export default app