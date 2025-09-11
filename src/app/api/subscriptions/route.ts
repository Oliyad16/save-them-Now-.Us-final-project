import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authConfig } from '@/lib/auth/auth-config'
import { stripe } from '@/lib/stripe/config'
import { getDatabase } from '@/lib/database/connection'

// Get user's current subscription
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const db = getDatabase()
    
    // Get current subscription with tier details
    const subscription = db.prepare(`
      SELECT 
        s.*,
        st.name as tier_name,
        st.price_monthly,
        st.price_yearly,
        st.features,
        st.ai_interactions_per_day,
        st.map_access_level
      FROM subscriptions s
      JOIN subscription_tiers st ON s.tier_id = st.id
      WHERE s.user_id = ? AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `).get(session.user.id) as any

    if (!subscription) {
      // Return free tier information
      const freeTier = db.prepare(
        'SELECT * FROM subscription_tiers WHERE name = ?'
      ).get('free') as any

      return NextResponse.json({
        tier: 'free',
        status: 'active',
        features: freeTier ? JSON.parse(freeTier.features) : {},
        aiInteractionsPerDay: freeTier?.ai_interactions_per_day || 3,
        mapAccessLevel: 'basic',
        isActive: true
      })
    }

    // Check if subscription is actually active
    const isActive = subscription.status === 'active' && 
      new Date(subscription.current_period_end) > new Date()

    return NextResponse.json({
      id: subscription.id,
      tier: subscription.tier_name,
      status: subscription.status,
      stripeSubscriptionId: subscription.stripe_subscription_id,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      features: JSON.parse(subscription.features),
      aiInteractionsPerDay: subscription.ai_interactions_per_day,
      mapAccessLevel: subscription.map_access_level,
      priceMonthly: subscription.price_monthly,
      priceYearly: subscription.price_yearly,
      isActive
    })

  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

// Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const db = getDatabase()
    
    // Get current subscription
    const subscription = db.prepare(`
      SELECT stripe_subscription_id 
      FROM subscriptions 
      WHERE user_id = ? AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).get(session.user.id) as any

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    // Cancel subscription at period end
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true
    })

    // Update local database
    db.prepare(`
      UPDATE subscriptions 
      SET cancel_at_period_end = 1, updated_at = CURRENT_TIMESTAMP
      WHERE stripe_subscription_id = ?
    `).run(subscription.stripe_subscription_id)

    return NextResponse.json({
      message: 'Subscription will be canceled at the end of the current period'
    })

  } catch (error) {
    console.error('Error canceling subscription:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}

// Reactivate canceled subscription
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action !== 'reactivate') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    const db = getDatabase()
    
    // Get subscription that's set to cancel
    const subscription = db.prepare(`
      SELECT stripe_subscription_id 
      FROM subscriptions 
      WHERE user_id = ? AND status = 'active' AND cancel_at_period_end = 1
      ORDER BY created_at DESC
      LIMIT 1
    `).get(session.user.id) as any

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No subscription found that can be reactivated' },
        { status: 404 }
      )
    }

    // Remove cancellation
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false
    })

    // Update local database
    db.prepare(`
      UPDATE subscriptions 
      SET cancel_at_period_end = 0, updated_at = CURRENT_TIMESTAMP
      WHERE stripe_subscription_id = ?
    `).run(subscription.stripe_subscription_id)

    return NextResponse.json({
      message: 'Subscription reactivated successfully'
    })

  } catch (error) {
    console.error('Error reactivating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    )
  }
}