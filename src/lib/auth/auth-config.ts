import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { getDatabase } from '@/lib/database/connection'
import bcrypt from 'bcryptjs'

export const authConfig: NextAuthOptions = {
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
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = token.sub || ''
        session.user.tier = token.tier || 'free'
      }
      return session
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.tier = (user as any).tier
      }
      return token
    }
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  // events: {
  //   async signIn({ user }) {
  //     // Activity tracking disabled for now
  //   }
  // }
}