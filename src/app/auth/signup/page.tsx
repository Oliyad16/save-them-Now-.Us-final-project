'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { firebaseAuth } from '@/lib/auth/firebase-auth'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import { motion } from 'framer-motion'
import { LoadingState, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'

export default function SignUp() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    zipCode: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password strength
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      // Use Firebase Authentication
      const user = await firebaseAuth.signUp(formData.email, formData.password, formData.name)
      
      // Success - show success message
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setLoading(true)
    setError('')
    
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      
      // Success - redirect to profile
      router.push('/profile')
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="shadow-2xl p-8 text-center">
              <CardContent>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <h1 className="text-2xl font-bold text-white mb-4">🎉 Account Created!</h1>
                <p className="text-mission-gray-300 mb-6">
                  We've sent a verification email to <strong className="text-mission-primary">{formData.email}</strong>.
                  Please check your inbox and click the verification link to activate your account.
                </p>
                <div className="space-y-4">
                  <Link
                    href="/auth/signin"
                    className="inline-block w-full bg-mission-primary hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    Go to Sign In
                  </Link>
                  <Link
                    href="/"
                    className="inline-block w-full text-mission-gray-400 hover:text-white transition-colors"
                  >
                    ← Back to Home
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    )
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
                  🔐 Create Account
                </CardTitle>
                <p className="text-mission-gray-400">Join SaveThemNow.Jesus and help save lives</p>
              </motion.div>
            </CardHeader>

            <CardContent>
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
                  <label htmlFor="name" className="block text-sm font-medium text-mission-gray-300 mb-2">
                    👤 Full Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-mission-gray-800 border border-mission-gray-700 text-white rounded-lg focus:ring-2 focus:ring-mission-primary focus:border-mission-primary placeholder-mission-gray-400 transition-all duration-200"
                    placeholder="Your full name"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-mission-gray-300 mb-2">
                    📧 Email Address *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-mission-gray-800 border border-mission-gray-700 text-white rounded-lg focus:ring-2 focus:ring-mission-primary focus:border-mission-primary placeholder-mission-gray-400 transition-all duration-200"
                    placeholder="your@email.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="zipCode" className="block text-sm font-medium text-mission-gray-300 mb-2">
                    📍 ZIP Code (Optional)
                  </label>
                  <input
                    id="zipCode"
                    name="zipCode"
                    type="text"
                    value={formData.zipCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-mission-gray-800 border border-mission-gray-700 text-white rounded-lg focus:ring-2 focus:ring-mission-primary focus:border-mission-primary placeholder-mission-gray-400 transition-all duration-200"
                    placeholder="12345"
                    disabled={loading}
                  />
                  <p className="text-xs text-mission-gray-500 mt-1">
                    Help us show relevant local cases
                  </p>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-mission-gray-300 mb-2">
                    🔒 Password *
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-mission-gray-800 border border-mission-gray-700 text-white rounded-lg focus:ring-2 focus:ring-mission-primary focus:border-mission-primary placeholder-mission-gray-400 transition-all duration-200"
                    placeholder="At least 6 characters"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-mission-gray-300 mb-2">
                    🔒 Confirm Password *
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-mission-gray-800 border border-mission-gray-700 text-white rounded-lg focus:ring-2 focus:ring-mission-primary focus:border-mission-primary placeholder-mission-gray-400 transition-all duration-200"
                    placeholder="Repeat your password"
                    disabled={loading}
                  />
                </div>

                <div className="text-xs text-mission-gray-400">
                  By creating an account, you agree to our mission of helping locate missing persons 
                  and protecting families. We will never share your personal information.
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
                    'Create Account'
                  )}
                </motion.button>
              </motion.form>

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
                    <span className="px-2 bg-mission-gray-900 text-mission-gray-400">Or sign up with</span>
                  </div>
                </div>

                <motion.button
                  onClick={handleGoogleSignUp}
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
                  Sign up with Google
                </motion.button>
              </motion.div>

              <motion.div 
                className="mt-8 text-center text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <span className="text-mission-gray-400">Already have an account? </span>
                <Link 
                  href="/auth/signin" 
                  className="text-mission-primary hover:text-blue-400 transition-colors"
                >
                  Sign in here
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