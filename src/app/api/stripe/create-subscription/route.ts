import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authConfig } from '@/lib/auth/auth-config'
import { stripe } from '@/lib/stripe/config'
import { getDatabase } from '@/lib/database/connection'

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment processing not configured' },
        { status: 503 }
      )
    }

    const session = await getServerSession(authConfig)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { priceId, successUrl, cancelUrl } = body

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      )
    }

    const db = getDatabase()
    
    // Get or create Stripe customer
    let stripeCustomerId: string
    
    const existingCustomer = db.prepare(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL LIMIT 1'
    ).get(session.user.id) as any

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: session.user.email!,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id
        }
      })
      stripeCustomerId = customer.id
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.SITE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.SITE_URL}/pricing`,
      metadata: {
        userId: session.user.id,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
        },
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url
    })

  } catch (error) {
    console.error('Error creating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}