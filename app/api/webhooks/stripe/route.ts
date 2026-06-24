import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPlanFromPriceId } from '@/lib/plans'

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')!
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    let event
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err: any) {
      // Do not log err.message — it may echo back parts of the raw payload
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const subscription = event.data.object as any

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        const userId = session.metadata?.userId || session.subscription_data?.metadata?.userId
        const stripeSubscriptionId = session.subscription

        // Log only non-PII identifiers — never email, name, or customer details
        console.log('[webhook] checkout.session.completed', { userId, stripeSubscriptionId })

        if (userId && stripeSubscriptionId) {
          const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId) as any
          const priceId = stripeSub.items?.data?.[0]?.price?.id
          const planData = priceId ? getPlanFromPriceId(priceId) : null
          const periodEnd = stripeSub.current_period_end || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

          const { error } = await supabase.from('subscriptions').upsert({
            user_id: userId,
            stripe_customer_id: session.customer,
            stripe_subscription_id: stripeSubscriptionId,
            stripe_price_id: priceId,
            plan: planData?.plan || 'starter',
            period: planData?.period || 'monthly',
            status: 'active',
            current_period_end: new Date(periodEnd * 1000).toISOString(),
          }, { onConflict: 'user_id' })

          if (error) {
            console.error('[webhook] upsert error (checkout):', error.code)
          } else {
            console.log('[webhook] ✓ subscription created for user:', userId)
          }
        } else {
          // Fallback: look up user by email — email itself is never logged
          if (session.customer_email) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', session.customer_email)
              .single()

            if (profile && stripeSubscriptionId) {
              const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId) as any
              const priceId = stripeSub.items?.data?.[0]?.price?.id
              const planData = priceId ? getPlanFromPriceId(priceId) : null
              const periodEnd = stripeSub.current_period_end || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

              const { error } = await supabase.from('subscriptions').upsert({
                user_id: profile.id,
                stripe_customer_id: session.customer,
                stripe_subscription_id: stripeSubscriptionId,
                stripe_price_id: priceId,
                plan: planData?.plan || 'starter',
                period: planData?.period || 'monthly',
                status: 'active',
                current_period_end: new Date(periodEnd * 1000).toISOString(),
              }, { onConflict: 'user_id' })

              if (error) {
                console.error('[webhook] upsert error (email fallback):', error.code)
              } else {
                console.log('[webhook] ✓ subscription created via email fallback for user:', profile.id)
              }
            }
          } else {
            console.error('[webhook] no userId or email in session:', session.id)
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const priceId = subscription.items?.data?.[0]?.price?.id
        const planData = priceId ? getPlanFromPriceId(priceId) : null

        let userId = subscription.metadata?.userId

        if (!userId && subscription.customer) {
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', subscription.customer)
            .single()
          if (existingSub) userId = existingSub.user_id
        }

        // Fallback: resolve via Stripe customer — email is used for lookup only, never logged
        if (!userId && subscription.customer) {
          try {
            const customer = await stripe.customers.retrieve(subscription.customer as string) as any
            if (customer.email) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', customer.email)
                .single()
              if (profile) userId = profile.id
            }
          } catch {
            console.error('[webhook] error retrieving customer for sub:', subscription.id)
          }
        }

        const periodEnd = subscription.current_period_end
          || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

        // Log only safe identifiers — no email, no customer details
        console.log('[webhook]', event.type, {
          userId,
          plan: planData?.plan,
          status: subscription.status,
        })

        if (userId && planData) {
          const { error } = await supabase.from('subscriptions').upsert({
            user_id: userId,
            stripe_customer_id: subscription.customer,
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId,
            plan: planData.plan,
            period: planData.period,
            status: subscription.status === 'active' ? 'active' : subscription.status,
            current_period_end: new Date(periodEnd * 1000).toISOString(),
          }, { onConflict: 'user_id' })

          if (error) {
            console.error('[webhook] upsert error:', error.code)
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
          }
          console.log('[webhook] ✓ subscription updated for user:', userId)
        } else {
          console.error('[webhook] could not resolve userId:', {
            hasUserId: !!userId,
            hasPlanData: !!planData,
            priceId,
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', subscription.id)
        if (error) {
          console.error('[webhook] cancel error:', error.code)
        } else {
          console.log('[webhook] ✓ subscription cancelled:', subscription.id)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch {
    // Catch-all — no err.message logged to avoid leaking payload details
    console.error('[webhook] unhandled error in handler')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
