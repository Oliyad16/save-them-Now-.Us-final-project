import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDatabase } from '@/lib/database/connection'
import { v4 as uuidv4 } from 'uuid'

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
    const userId = uuidv4()

    // Create user and profile in transaction
    const insertUser = db.prepare(`
      INSERT INTO users (
        id, email, name, password_hash, tier, email_verified,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)

    const insertProfile = db.prepare(`
      INSERT INTO user_profiles (
        user_id, zip_code, onboarding_completed,
        created_at, updated_at
      ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)

    const transaction = db.transaction(() => {
      insertUser.run(userId, email, name, passwordHash, 'free', 1) // email verified = true for demo
      insertProfile.run(userId, zipCode || null, 0)
    })

    transaction()

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully! You can now sign in.',
        userId: userId
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