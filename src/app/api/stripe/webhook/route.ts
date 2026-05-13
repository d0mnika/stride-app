import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import type Stripe from 'stripe'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (event.type === 'checkout.session.completed') {
    const session    = event.data.object as Stripe.Checkout.Session
    const userId     = session.metadata?.user_id
    const customerId = session.customer as string | null
    const subId      = session.subscription as string | null

    if (userId) {
      await supabase.from('profiles').update({
        plan: 'pro',
        stripe_customer_id:      customerId,
        stripe_subscription_id:  subId,
      }).eq('id', userId)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub        = event.data.object as Stripe.Subscription
    const customerId = sub.customer as string

    await supabase.from('profiles').update({
      plan: 'free',
      stripe_subscription_id: null,
    }).eq('stripe_customer_id', customerId)
  }

  if (event.type === 'customer.subscription.updated') {
    const sub        = event.data.object as Stripe.Subscription
    const customerId = sub.customer as string
    const plan       = sub.status === 'active' ? 'pro' : 'free'

    await supabase.from('profiles').update({ plan }).eq('stripe_customer_id', customerId)
  }

  return NextResponse.json({ received: true })
}
