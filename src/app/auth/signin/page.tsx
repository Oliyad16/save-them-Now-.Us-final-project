'use client'

import { useState, Suspense } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LoadingState, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { motion } from 'framer-motion'

function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Check if Google OAuth is configured
  const isGoogleConfigured = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && 
                             process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID !== 'your-google-client-id' &&
                             process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID !== 'your-actual-google-client-id'
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/profile'
  const message = searchParams.get('message')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Use NextAuth with credentials provider
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl
      })

      if (result?.error) {
        setError('Invalid email or password. Please try again.')
      } else if (result?.ok) {
        // Success - redirect to callback URL
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Use NextAuth with Google provider
      const result = await signIn('google', {
        callbackUrl,
        redirect: false
      })

      if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      } else if (result?.error) {
        setError('Google sign-in failed. Please try again.')
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="shadow-2xl p-8">
            <CardHeader className="text-center mb-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <CardTitle className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                  🔐 Sign In
                </CardTitle>
                <p className="text-mission-gray-400">Welcome back to SaveThemNow.Jesus</p>
              </motion.div>
            </CardHeader>

            <CardContent>
              {message === 'account-created' && (
                <motion.div 
                  className="bg-green-900/20 border border-green-500/30 text-green-300 px-4 py-3 rounded mb-6"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  ✅ Account created successfully! Please verify your email and sign in below.
                </motion.div>
              )}

              {error && (
                <motion.div 
                  className="bg-mission-secondary/10 border border-mission-secondary/30 text-mission-secondary px-4 py-3 rounded mb-6"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {error}
                </motion.div>
              )}

              <motion.form 
                onSubmit={handleSubmit} 
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-mission-gray-300 mb-2">
                    📧 Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-mission-gray-800 border border-mission-gray-700 text-white rounded-lg focus:ring-2 focus:ring-mission-primary focus:border-mission-primary placeholder-mission-gray-400 transition-all duration-200"
                    placeholder="your@email.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-mission-gray-300 mb-2">
                    🔒 Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-mission-gray-800 border border-mission-gray-700 text-white rounded-lg focus:ring-2 focus:ring-mission-primary focus:border-mission-primary placeholder-mission-gray-400 transition-all duration-200"
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-mission-primary hover:bg-blue-600 disabled:bg-mission-primary/50 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <LoadingState type="dots" size="sm" />
                  ) : (
                    'Sign In'
                  )}
                </motion.button>
              </motion.form>

              {isGoogleConfigured && (
                <motion.div 
                  className="mt-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-mission-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-mission-gray-900 text-mission-gray-400">Or continue with</span>
                    </div>
                  </div>

                  <motion.button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="mt-4 w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </motion.button>
                </motion.div>
              )}

              <motion.div 
                className="mt-8 text-center text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <span className="text-mission-gray-400">Don&apos;t have an account? </span>
                <Link 
                  href="/auth/signup" 
                  className="text-mission-primary hover:text-blue-400 transition-colors"
                >
                  Sign up here
                </Link>
              </motion.div>

              <motion.div 
                className="mt-4 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1 }}
              >
                <Link 
                  href="/" 
                  className="text-mission-gray-400 hover:text-white transition-colors text-sm"
                >
                  ← Back to Home
                </Link>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <LoadingState 
          type="spinner" 
          message="Loading sign in..." 
          size="lg"
        />
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}