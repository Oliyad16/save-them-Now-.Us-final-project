import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authConfig } from '@/lib/auth/auth-config'
import { stripe } from '@/lib/stripe/config'
import { donationsService } from '@/lib/firestore/services'
import { getDatabase } from '@/lib/database/connection'

// Create donation payment intent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, donationType, anonymous, message, email } = body

    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: 'Amount must be at least $1' },
        { status: 400 }
      )
    }

    const session = await getServerSession(authConfig)
    const userId = session?.user?.email // Use email as user identifier
    const donorEmail = email || session?.user?.email

    if (!donorEmail) {
      return NextResponse.json(
        { error: 'Email is required for donations' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment processing is not configured' },
        { status: 503 }
      )
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        type: 'donation',
        donation_type: donationType || 'general',
        user_id: userId || '',
        anonymous: anonymous ? 'true' : 'false',
        message: message || ''
      },
      receipt_email: anonymous ? undefined : donorEmail,
      description: `Donation to SaveThemNow.Jesus - ${donationType || 'General Support'}`
    })

    // Store donation record (pending until payment succeeds)
    let donationRecord
    try {
      // Try Firestore first
      donationRecord = await donationsService.create({
        userId: userId || undefined,
        email: donorEmail,
        amount,
        donationType: donationType || 'general',
        anonymous: !!anonymous,
        message: message || undefined,
        stripePaymentIntentId: paymentIntent.id
      })
    } catch (firestoreError: any) {
      console.warn('Firestore failed, using SQLite fallback:', firestoreError.message)
      // Fallback to SQLite
      const db = getDatabase()
      const result = db.prepare(`
        INSERT INTO donations (
          user_id, email, amount, donation_type, anonymous, message, stripe_payment_intent_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId || null,
        donorEmail,
        amount,
        donationType || 'general',
        anonymous ? 1 : 0,
        message || null,
        paymentIntent.id
      )
      donationRecord = { id: result.lastInsertRowid }
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      donationId: donationRecord.id,
      amount: amount
    })

  } catch (error) {
    console.error('Error creating donation:', error)
    return NextResponse.json(
      { error: 'Failed to create donation' },
      { status: 500 }
    )
  }
}

// Get donation history for authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    try {
      // Try Firestore first
      const result = await donationsService.getByUserId(session.user.email, { limit, offset })
      return NextResponse.json(result)
    } catch (firestoreError: any) {
      console.warn('Firestore failed, using SQLite fallback:', firestoreError.message)
      // Fallback to SQLite
      const db = getDatabase()
      
      const donations = db.prepare(`
        SELECT 
          id, amount, currency, donation_type, message, anonymous,
          receipt_sent, tax_receipt_id, created_at
        FROM donations 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `).all(session.user.email, limit, offset)

      const total = db.prepare(`
        SELECT COUNT(*) as count, SUM(amount) as total_amount
        FROM donations 
        WHERE user_id = ?
      `).get(session.user.email) as any

      return NextResponse.json({
        donations,
        pagination: {
          limit,
          offset,
          total: total.count || 0
        },
        summary: {
          totalDonated: total.total_amount || 0,
          totalDonations: total.count || 0
        }
      })
    }

  } catch (error) {
    console.error('Error fetching donations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch donations' },
      { status: 500 }
    )
  }
}

// Create quick donation checkout session
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, donationType, successUrl, cancelUrl } = body

    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: 'Amount must be at least $1' },
        { status: 400 }
      )
    }

    const session = await getServerSession(authConfig)
    const userId = session?.user?.email

    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment processing is not configured' },
        { status: 503 }
      )
    }

    // Create checkout session for donation
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `SaveThemNow.Jesus Donation - ${donationType || 'General Support'}`,
              description: 'Help us locate missing persons and save lives',
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.SITE_URL}/donation-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.SITE_URL}/donate`,
      metadata: {
        type: 'donation',
        donation_type: donationType || 'general',
        user_id: userId || '',
      },
      allow_promotion_codes: false,
    })

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url
    })

  } catch (error) {
    console.error('Error creating donation checkout:', error)
    return NextResponse.json(
      { error: 'Failed to create donation checkout' },
      { status: 500 }
    )
  }
}