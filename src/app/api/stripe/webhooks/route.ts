import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe/config'
import { getDatabase } from '@/lib/database/connection'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_CONFIG.webhookSecret
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const db = getDatabase()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription') {
          await handleSubscriptionCreated(session, db)
        } else {
          await handleOneTimePayment(session, db)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription, db)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCanceled(subscription, db)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice, db)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice, db)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCreated(
  session: Stripe.Checkout.Session,
  db: any
) {
  const userId = session.metadata?.userId
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!userId || !subscriptionId) {
    console.error('Missing userId or subscriptionId in checkout session')
    return
  }

  // Get subscription details from Stripe
  if (!stripe) {
    console.error('Stripe not configured')
    return
  }
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price.id

  // Get tier ID from price ID
  const tier = db.prepare(
    'SELECT id FROM subscription_tiers WHERE stripe_price_id_monthly = ? OR stripe_price_id_yearly = ?'
  ).get(priceId, priceId) as any

  if (!tier) {
    console.error('Unknown price ID:', priceId)
    return
  }

  // Create or update subscription record
  db.prepare(`
    INSERT OR REPLACE INTO subscriptions (
      user_id, tier_id, stripe_subscription_id, stripe_customer_id,
      status, current_period_start, current_period_end
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    tier.id,
    subscriptionId,
    customerId,
    subscription.status,
    new Date((subscription as any).current_period_start * 1000).toISOString(),
    new Date((subscription as any).current_period_end * 1000).toISOString()
  )

  // Update user tier
  db.prepare('UPDATE users SET tier = (SELECT name FROM subscription_tiers WHERE id = ?) WHERE id = ?')
    .run(tier.id, userId)

  console.log(`Subscription created for user ${userId}`)
}

async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  db: any
) {
  const subscriptionId = subscription.id
  
  db.prepare(`
    UPDATE subscriptions 
    SET status = ?, 
        current_period_start = ?, 
        current_period_end = ?,
        cancel_at_period_end = ?
    WHERE stripe_subscription_id = ?
  `).run(
    subscription.status,
    new Date((subscription as any).current_period_start * 1000).toISOString(),
    new Date((subscription as any).current_period_end * 1000).toISOString(),
    subscription.cancel_at_period_end ? 1 : 0,
    subscriptionId
  )

  console.log(`Subscription ${subscriptionId} updated`)
}

async function handleSubscriptionCanceled(
  subscription: Stripe.Subscription,
  db: any
) {
  const subscriptionId = subscription.id
  
  // Update subscription status
  db.prepare(`
    UPDATE subscriptions 
    SET status = 'canceled'
    WHERE stripe_subscription_id = ?
  `).run(subscriptionId)

  // Downgrade user to free tier
  const userRecord = db.prepare(
    'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?'
  ).get(subscriptionId) as any

  if (userRecord) {
    db.prepare('UPDATE users SET tier = ? WHERE id = ?')
      .run('free', userRecord.user_id)

    console.log(`User ${userRecord.user_id} downgraded to free tier`)
  }
}

async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  db: any
) {
  const subscriptionId = (invoice as any).subscription as string
  const customerId = (invoice as any).customer as string
  
  // Record payment
  const userRecord = db.prepare(
    'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?'
  ).get(subscriptionId) as any

  if (userRecord) {
    db.prepare(`
      INSERT INTO payments (
        user_id, stripe_payment_intent_id, amount, type, status, description
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      userRecord.user_id,
      (invoice as any).payment_intent,
      (invoice as any).amount_paid / 100, // Convert cents to dollars
      'subscription',
      'completed',
      `Subscription payment for period ${new Date((invoice as any).period_start * 1000).toISOString().split('T')[0]} to ${new Date((invoice as any).period_end * 1000).toISOString().split('T')[0]}`
    )
  }

  console.log(`Payment succeeded for invoice ${invoice.id}`)
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  db: any
) {
  const subscriptionId = (invoice as any).subscription as string
  
  // Record failed payment
  const userRecord = db.prepare(
    'SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?'
  ).get(subscriptionId) as any

  if (userRecord) {
    db.prepare(`
      INSERT INTO payments (
        user_id, stripe_payment_intent_id, amount, type, status, description
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      userRecord.user_id,
      (invoice as any).payment_intent,
      (invoice as any).amount_due / 100,
      'subscription',
      'failed',
      `Failed subscription payment for period ${new Date((invoice as any).period_start * 1000).toISOString().split('T')[0]} to ${new Date((invoice as any).period_end * 1000).toISOString().split('T')[0]}`
    )

    // Log activity
    db.prepare(`
      INSERT INTO user_activity (user_id, activity_type, activity_data) 
      VALUES (?, 'payment_failed', '{"invoice_id": "' + ? + '"}')
    `).run(userRecord.user_id, invoice.id)
  }

  console.log(`Payment failed for invoice ${invoice.id}`)
}

async function handleOneTimePayment(
  session: Stripe.Checkout.Session,
  db: any
) {
  const userId = session.metadata?.userId
  const amount = session.amount_total! / 100 // Convert cents to dollars

  if (userId) {
    // Record donation
    db.prepare(`
      INSERT INTO donations (
        user_id, amount, stripe_payment_intent_id, donation_type, anonymous
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      userId,
      amount,
      session.payment_intent,
      session.metadata?.donation_type || 'general',
      session.metadata?.anonymous === 'true' ? 1 : 0
    )

    console.log(`Donation of $${amount} recorded for user ${userId}`)
  }
}