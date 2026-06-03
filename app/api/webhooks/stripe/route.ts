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
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const priceId = subscription.items?.data?.[0]?.price?.id
        const planData = priceId ? getPlanFromPriceId(priceId) : null
        const userId = subscription.metadata?.userId

        // Get current_period_end from items or subscription level
        const periodEnd = subscription.items?.data?.[0]?.current_period_end 
          || subscription.current_period_end
          || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // fallback: 30 days

        console.log('Webhook received:', { 
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
          console.log('Subscription saved to Supabase for user:', userId)
        } else {
          console.error('Missing userId or planData:', { userId, planData, priceId })
        }
        break
      }
      case 'customer.subscription.deleted': {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', subscription.id)
        if (error) console.error('Cancel error:', error)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Internal error', details: err.message }, { status: 500 })
  }
}
