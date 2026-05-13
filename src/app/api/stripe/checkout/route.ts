import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/helpers'
import { getStripe } from '@/lib/stripe'

const PRICE_ID = process.env.STRIPE_PRICE_ID!
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProfile(supabase, user.id)

  // Re-use existing Stripe customer or create one
  let customerId = profile?.stripe_customer_id ?? undefined
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    subscription_data: { trial_period_days: 14 },
    payment_method_collection: 'always',
    success_url: `${APP_URL}/account?success=true`,
    cancel_url:  `${APP_URL}/account`,
    metadata: { user_id: user.id },
  })

  return NextResponse.json({ url: session.url })
}
