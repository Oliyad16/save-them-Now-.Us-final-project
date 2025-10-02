import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  User
} from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import { usersService } from '@/lib/firestore/services'

export interface FirebaseAuthUser {
  uid: string
  email: string | null
  displayName: string | null
  emailVerified: boolean
  photoURL: string | null
}

export class FirebaseAuthService {
  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<FirebaseAuthUser> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      // Update last login in Firestore
      try {
        await usersService.update(user.uid, {
          lastLogin: new Date(),
          email: user.email || email,
          name: user.displayName || email,
          emailVerified: user.emailVerified
        })
      } catch (error) {
        console.warn('Failed to update last login:', error)
      }
      
      return this.mapFirebaseUser(user)
    } catch (error: any) {
      throw new Error(this.getAuthErrorMessage(error.code))
    }
  }

  /**
   * Create new user account
   */
  async signUp(email: string, password: string, displayName: string): Promise<FirebaseAuthUser> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      // Update user profile
      await updateProfile(user, { displayName })
      
      // Send email verification
      await sendEmailVerification(user)
      
      // Create user document in Firestore
      try {
        await usersService.create({
          id: user.uid,
          email: user.email!,
          name: displayName,
          emailVerified: user.emailVerified,
          createdAt: new Date()
        })
      } catch (error) {
        console.warn('Failed to create user document:', error)
      }
      
      return this.mapFirebaseUser(user)
    } catch (error: any) {
      throw new Error(this.getAuthErrorMessage(error.code))
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    await signOut(auth)
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): Promise<FirebaseAuthUser | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe()
        resolve(user ? this.mapFirebaseUser(user) : null)
      })
    })
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(callback: (user: FirebaseAuthUser | null) => void): () => void {
    return onAuthStateChanged(auth, (user) => {
      callback(user ? this.mapFirebaseUser(user) : null)
    })
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(): Promise<void> {
    const user = auth.currentUser
    if (!user) {
      throw new Error('No authenticated user')
    }
    await sendEmailVerification(user)
  }

  /**
   * Check if user email is verified
   */
  isEmailVerified(): boolean {
    return auth.currentUser?.emailVerified || false
  }

  /**
   * Get ID token for API authentication
   */
  async getIdToken(): Promise<string | null> {
    const user = auth.currentUser
    if (!user) return null
    return await user.getIdToken()
  }

  /**
   * Map Firebase User to our interface
   */
  private mapFirebaseUser(user: User): FirebaseAuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      photoURL: user.photoURL
    }
  }

  /**
   * Get user-friendly error messages
   */
  private getAuthErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address'
      case 'auth/wrong-password':
        return 'Incorrect password'
      case 'auth/email-already-in-use':
        return 'An account with this email already exists'
      case 'auth/weak-password':
        return 'Password should be at least 6 characters'
      case 'auth/invalid-email':
        return 'Invalid email address'
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later'
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection'
      default:
        return 'Authentication failed. Please try again'
    }
  }
}

// Export singleton instance
export const firebaseAuth = new FirebaseAuthService()
