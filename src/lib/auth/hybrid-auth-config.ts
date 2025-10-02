import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { firebaseAuth } from './firebase-auth'
import { usersService } from '@/lib/firestore/services'
import { getDatabase } from '@/lib/database/connection'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import bcrypt from 'bcryptjs'

// Flag to determine auth strategy
const useFirebaseAuth = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && 
                       process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'placeholder-project-id'

export const hybridAuthConfig: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        idToken: { label: 'Firebase ID Token', type: 'text' },
        provider: { label: 'Auth Provider', type: 'text' }
      },
      async authorize(credentials) {
        try {
          const idToken = credentials?.idToken as string | undefined
          const provider = credentials?.provider as string | undefined
          const email = credentials?.email as string | undefined
          const password = credentials?.password as string | undefined

          if (useFirebaseAuth && idToken) {
            if (!adminAuth) {
              console.error('Firebase Admin SDK not configured; cannot verify ID token')
              return null
            }

            const decodedToken = await adminAuth.verifyIdToken(idToken)
            const userRecord = await adminAuth.getUser(decodedToken.uid)

            if (adminDb) {
              try {
                const userRef = adminDb.collection('users').doc(userRecord.uid)
                const now = new Date()
                const existing = await userRef.get()

                if (existing.exists) {
                  await userRef.set({
                    email: userRecord.email || decodedToken.email,
                    name: userRecord.displayName || decodedToken.name || userRecord.email || 'User',
                    emailVerified: userRecord.emailVerified || decodedToken.email_verified || false,
                    updatedAt: now,
                    lastLogin: now
                  }, { merge: true })
                } else {
                  await userRef.set({
                    email: userRecord.email || decodedToken.email,
                    name: userRecord.displayName || decodedToken.name || userRecord.email || 'User',
                    emailVerified: userRecord.emailVerified || decodedToken.email_verified || false,
                    createdAt: now,
                    updatedAt: now,
                    lastLogin: now,
                    tier: 'free'
                  })
                }
              } catch (dbError) {
                console.error('Failed to upsert Firestore user during Google sign-in:', dbError)
              }
            }

            return {
              id: userRecord.uid,
              email: userRecord.email || decodedToken.email || null,
              name: userRecord.displayName || decodedToken.name || userRecord.email || undefined,
              emailVerified: userRecord.emailVerified || decodedToken.email_verified || false,
              image: userRecord.photoURL || decodedToken.picture || undefined,
              firebaseIdToken: idToken,
              firebaseProvider: provider || decodedToken.firebase?.sign_in_provider || 'google'
            }
          }

          if (!email || !password) {
            return null
          }

          if (useFirebaseAuth) {
            // Use Firebase Auth
            const firebaseUser = await firebaseAuth.signIn(email, password)
            
            return {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              emailVerified: firebaseUser.emailVerified,
              image: firebaseUser.photoURL
            }
          } else {
            // Fallback to SQLite
            const db = getDatabase()
            const user = db.prepare(
              'SELECT id, email, password_hash, name, tier, email_verified FROM users WHERE email = ?'
            ).get(email) as any

            if (!user || !user.password_hash) {
              return null
            }

            const isPasswordValid = await bcrypt.compare(password, user.password_hash)
            
            if (!isPasswordValid) {
              return null
            }

            // Update last login
            db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
              .run(user.id)

            return {
              id: user.id.toString(),
              email: user.email,
              name: user.name,
              tier: user.tier,
              emailVerified: user.email_verified
            }
          }
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      }
    }),
    
    ...(process.env.GOOGLE_CLIENT_ID && 
        process.env.GOOGLE_CLIENT_SECRET && 
        process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id' && 
        process.env.GOOGLE_CLIENT_SECRET !== 'your-google-client-secret' ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET
      })
    ] : [])
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && useFirebaseAuth) {
        // Handle Google sign-in with Firebase
        try {
          // Check if user exists in Firestore
          const existingUser = await usersService.getByEmail(user.email!)
          
          if (!existingUser) {
            // Create new user in Firestore
            await usersService.create({
              id: (user as any).id || (profile as any)?.sub,
              email: user.email!,
              name: user.name || user.email!,
              emailVerified: true,
              createdAt: new Date()
            })
          }
        } catch (error) {
          console.error('Error handling Google sign-in:', error)
        }
      }
      return true
    },

    async session({ session, token }) {
      if (session?.user && token) {
        (session.user as any).id = token.sub;
        (session.user as any).tier = token.tier as string;
        (session.user as any).emailVerified = token.emailVerified as boolean
      }
      if (token.firebaseToken) {
        (session as any).firebaseToken = token.firebaseToken
      }
      return session
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.tier = (user as any).tier || 'free'
        token.emailVerified = (user as any).emailVerified || false
        if ((user as any).firebaseIdToken) {
          token.firebaseToken = (user as any).firebaseIdToken
        }
      }

      // Add Firebase ID token if available when signing in with email/password
      if (!token.firebaseToken && account?.provider === 'credentials' && useFirebaseAuth) {
        try {
          const refreshedToken = await firebaseAuth.getIdToken()
          if (refreshedToken) {
            token.firebaseToken = refreshedToken
          }
        } catch (error) {
          console.warn('Failed to get Firebase ID token:', error)
        }
      }

      return token
    }
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },

  events: {
    async signIn({ user }) {
      try {
        if (useFirebaseAuth) {
          // Log activity in Firestore
          // Could implement activity logging here
        } else {
          // Log activity in SQLite
          const db = getDatabase()
          db.prepare(`
            INSERT INTO user_activity (user_id, activity_type, activity_data) 
            VALUES (?, 'sign_in', '{}')
          `).run(user.id)
        }
      } catch (error) {
        console.error('Error logging sign-in activity:', error)
      }
    }
  }
}

// Utility function to check auth strategy
export function getAuthStrategy(): 'firebase' | 'sqlite' {
  return useFirebaseAuth ? 'firebase' : 'sqlite'
}

// Utility function to get user data regardless of auth strategy
export async function getUserData(userId: string, email: string) {
  try {
    if (useFirebaseAuth) {
      return await usersService.getByEmail(email)
    } else {
      const db = getDatabase()
      return db.prepare('SELECT * FROM users WHERE id = ? OR email = ?').get(userId, email)
    }
  } catch (error) {
    console.error('Error fetching user data:', error)
    return null
  }
}
