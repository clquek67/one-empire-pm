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
      console.error('Webhook signature error:', err.message)
      return NextResponse.json({ error: 'Invalid signature', details: err.message }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const subscription = event.data.object as any

    switch (event.type) {
      case 'checkout.session.completed': {
        // Handle checkout session — this is the most reliable place to get userId
        const session = event.data.object as any
        const userId = session.metadata?.userId || session.subscription_data?.metadata?.userId
        const stripeSubscriptionId = session.subscription

        console.log('Checkout session completed:', { userId, stripeSubscriptionId, customerEmail: session.customer_email })

        if (userId && stripeSubscriptionId) {
          // Fetch the full subscription from Stripe to get price info
          const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
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
            console.error('Supabase upsert error (checkout):', error)
          } else {
            console.log('✓ Subscription created via checkout.session.completed for user:', userId)
          }
        } else {
          // Fallback: look up user by email
          if (session.customer_email) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', session.customer_email)
              .single()

            if (profile && stripeSubscriptionId) {
              const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
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
                console.error('Supabase upsert error (email fallback):', error)
              } else {
                console.log('✓ Subscription created via email fallback for:', session.customer_email)
              }
            }
          } else {
            console.error('No userId or email found in checkout session:', session.id)
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const priceId = subscription.items?.data?.[0]?.price?.id
        const planData = priceId ? getPlanFromPriceId(priceId) : null

        // Try userId from metadata first
        let userId = subscription.metadata?.userId

        // Fallback: look up by stripe_customer_id in our DB
        if (!userId && subscription.customer) {
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', subscription.customer)
            .single()
          if (existingSub) userId = existingSub.user_id
        }

        // Fallback: look up customer email from Stripe
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
          } catch (e) {
            console.error('Error fetching customer:', e)
          }
        }

        const periodEnd = subscription.current_period_end
          || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

        console.log('Subscription event:', { 
          type: event.type, userId, priceId, 
          plan: planData?.plan, status: subscription.status 
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
            console.error('Supabase upsert error:', error)
            return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 })
          }
          console.log('✓ Subscription updated for user:', userId)
        } else {
          console.error('Could not resolve userId:', { userId, planData, priceId, customer: subscription.customer })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', subscription.id)
        if (error) console.error('Cancel error:', error)
        else console.log('✓ Subscription cancelled:', subscription.id)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Internal error', details: err.message }, { status: 500 })
  }
}
