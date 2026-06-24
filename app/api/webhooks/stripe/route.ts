import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getPlanFromPriceId } from '@/lib/plans'

// ── Shared upsert helper ────────────────────────────────────────────────────
// Single source of truth for writing subscription state to Supabase.
// All webhook events funnel through here — no duplicated upsert logic.
async function upsertSubscription(
  supabase: SupabaseClient,
  params: {
    userId: string
    stripeCustomerId: string
    stripeSubscriptionId: string
    priceId: string | undefined
    status: string
    periodEnd: number
  }
): Promise<{ error: boolean }> {
  const { userId, stripeCustomerId, stripeSubscriptionId, priceId, status, periodEnd } = params
  const planData = priceId ? getPlanFromPriceId(priceId) : null

  const { error } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_price_id: priceId ?? null,
    plan: planData?.plan || 'starter',
    period: planData?.period || 'monthly',
    status: status === 'active' ? 'active' : status,
    current_period_end: new Date(periodEnd * 1000).toISOString(),
  }, { onConflict: 'user_id' })

  if (error) {
    console.error('[webhook] upsert error:', error.code)
    return { error: true }
  }

  console.log('[webhook] ✓ subscription upserted for user:', userId, '| plan:', planData?.plan, '| status:', status)
  return { error: false }
}

// ── Resolve userId from a Stripe customer ID ────────────────────────────────
// Tries our DB first (O(1)), falls back to Stripe API + profiles lookup.
// Email is used for lookup only — never logged.
async function resolveUserIdFromCustomer(
  supabase: SupabaseClient,
  stripe: any,
  customerId: string,
  subscriptionId: string
): Promise<string | null> {
  // 1. Check existing subscriptions table
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()
  if (existingSub?.user_id) return existingSub.user_id

  // 2. Fetch customer from Stripe, look up by email in profiles
  try {
    const customer = await stripe.customers.retrieve(customerId) as any
    if (customer.email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', customer.email)
        .single()
      if (profile?.id) return profile.id
    }
  } catch {
    console.error('[webhook] error retrieving customer for sub:', subscriptionId)
  }

  return null
}
// ───────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')!
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    let event
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        const stripeSubscriptionId = session.subscription
        let userId = session.metadata?.userId || session.subscription_data?.metadata?.userId

        console.log('[webhook] checkout.session.completed', { userId, stripeSubscriptionId })

        // Fallback: resolve userId from customer email — email never logged
        if (!userId && session.customer_email) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', session.customer_email)
            .single()
          if (profile) userId = profile.id
        }

        if (!userId || !stripeSubscriptionId) {
          console.error('[webhook] no userId or email in session:', session.id)
          break
        }

        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId) as any
        const priceId = stripeSub.items?.data?.[0]?.price?.id
        const periodEnd = stripeSub.current_period_end || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

        await upsertSubscription(supabase, {
          userId,
          stripeCustomerId: session.customer,
          stripeSubscriptionId,
          priceId,
          status: 'active',
          periodEnd,
        })
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as any
        const priceId = sub.items?.data?.[0]?.price?.id
        const periodEnd = sub.current_period_end || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

        let userId = sub.metadata?.userId
        if (!userId && sub.customer) {
          userId = await resolveUserIdFromCustomer(supabase, stripe, sub.customer, sub.id)
        }

        console.log('[webhook]', event.type, { userId, plan: priceId, status: sub.status })

        if (!userId) {
          console.error('[webhook] could not resolve userId for sub:', sub.id)
          break
        }

        const { error } = await upsertSubscription(supabase, {
          userId,
          stripeCustomerId: sub.customer,
          stripeSubscriptionId: sub.id,
          priceId,
          status: sub.status,
          periodEnd,
        })

        if (error) {
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as any
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', sub.id)
        if (error) {
          console.error('[webhook] cancel error:', error.code)
        } else {
          console.log('[webhook] ✓ subscription cancelled:', sub.id)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch {
    console.error('[webhook] unhandled error in handler')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
