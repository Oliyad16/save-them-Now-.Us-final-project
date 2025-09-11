import Stripe from 'stripe'

// Only initialize Stripe if the secret key is available
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    })
  : null

export const STRIPE_CONFIG = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  currency: 'usd',
  
  // Subscription prices (these should match your Stripe dashboard)
  prices: {
    supporter_monthly: process.env.STRIPE_SUPPORTER_MONTHLY_PRICE_ID || '',
    supporter_yearly: process.env.STRIPE_SUPPORTER_YEARLY_PRICE_ID || '',
    advocate_monthly: process.env.STRIPE_ADVOCATE_MONTHLY_PRICE_ID || '',
    advocate_yearly: process.env.STRIPE_ADVOCATE_YEARLY_PRICE_ID || '',
    guardian_monthly: process.env.STRIPE_GUARDIAN_MONTHLY_PRICE_ID || '',
    guardian_yearly: process.env.STRIPE_GUARDIAN_YEARLY_PRICE_ID || '',
    hero_monthly: process.env.STRIPE_HERO_MONTHLY_PRICE_ID || '',
    hero_yearly: process.env.STRIPE_HERO_YEARLY_PRICE_ID || '',
  }
}