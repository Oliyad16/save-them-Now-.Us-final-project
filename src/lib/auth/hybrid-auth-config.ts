import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { firebaseAuth } from './firebase-auth'
import { usersService } from '@/lib/firestore/services'
import { getDatabase } from '@/lib/database/connection'
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
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          if (useFirebaseAuth) {
            // Use Firebase Auth
            const firebaseUser = await firebaseAuth.signIn(credentials.email, credentials.password)
            
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
            ).get(credentials.email) as any

            if (!user || !user.password_hash) {
              return null
            }

            const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash)
            
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
    
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
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
              email: user.email!,
              name: user.name!,
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
      return session
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.tier = (user as any).tier || 'free'
        token.emailVerified = (user as any).emailVerified || false
      }

      // Add Firebase ID token if available
      if (account?.provider === 'credentials' && useFirebaseAuth) {
        try {
          const idToken = await firebaseAuth.getIdToken()
          if (idToken) {
            token.firebaseToken = idToken
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