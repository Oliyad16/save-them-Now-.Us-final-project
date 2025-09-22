'use client'

import { useState, useEffect } from 'react'
import { firebaseAuth, FirebaseAuthUser } from './firebase-auth'

// Hook for React components
export function useFirebaseAuth() {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  return {
    user,
    loading,
    signIn: firebaseAuth.signIn.bind(firebaseAuth),
    signUp: firebaseAuth.signUp.bind(firebaseAuth),
    signOut: firebaseAuth.signOut.bind(firebaseAuth),
    sendEmailVerification: firebaseAuth.sendEmailVerification.bind(firebaseAuth),
    isEmailVerified: firebaseAuth.isEmailVerified.bind(firebaseAuth),
    getIdToken: firebaseAuth.getIdToken.bind(firebaseAuth)
  }
}