import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDatabase } from '@/lib/database/connection'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, zipCode } = body

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Check if user already exists
    const existingUser = db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).get(email)

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create user
    const result = db.prepare(`
      INSERT INTO users (
        email, password_hash, name, zip_code, 
        email_verification_token, verification_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      email,
      passwordHash,
      name,
      zipCode || null,
      verificationToken,
      verificationExpires.toISOString()
    )

    // Log user registration activity
    db.prepare(`
      INSERT INTO user_activity (user_id, activity_type, activity_data) 
      VALUES (?, 'registration', '{"ip_address": "pending", "user_agent": "pending"}')
    `).run(result.lastInsertRowid)

    // TODO: Send verification email
    // await sendVerificationEmail(email, verificationToken)

    return NextResponse.json(
      {
        message: 'User registered successfully. Please check your email for verification.',
        userId: result.lastInsertRowid,
        requiresVerification: true
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Email verification endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  if (!token || !email) {
    return NextResponse.json(
      { error: 'Missing verification token or email' },
      { status: 400 }
    )
  }

  try {
    const db = getDatabase()

    // Find user with matching token and email
    const user = db.prepare(`
      SELECT id, email_verification_token, verification_expires_at 
      FROM users 
      WHERE email = ? AND email_verification_token = ?
    `).get(email, token) as any

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      )
    }

    // Check if token has expired
    const now = new Date()
    const expires = new Date(user.verification_expires_at)
    
    if (now > expires) {
      return NextResponse.json(
        { error: 'Verification token has expired' },
        { status: 400 }
      )
    }

    // Mark email as verified
    db.prepare(`
      UPDATE users 
      SET email_verified = 1, 
          email_verification_token = NULL, 
          verification_expires_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(user.id)

    // Log verification activity
    db.prepare(`
      INSERT INTO user_activity (user_id, activity_type, activity_data) 
      VALUES (?, 'email_verified', '{}')
    `).run(user.id)

    return NextResponse.json(
      { message: 'Email verified successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}