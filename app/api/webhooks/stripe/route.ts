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
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const subscription = event.data.object as any
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const priceId = subscription.items.data[0].price.id
        const planData = getPlanFromPriceId(priceId)
        const userId = subscription.metadata?.userId
        if (userId && planData) {
          await supabase.from('subscriptions').upsert({
            user_id: userId, stripe_customer_id: subscription.customer,
            stripe_subscription_id: subscription.id, stripe_price_id: priceId,
            plan: planData.plan, period: planData.period,
            status: subscription.status === 'active' ? 'active' : subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          }, { onConflict: 'user_id' })
        }
        break
      }
      case 'customer.subscription.deleted':
        await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('stripe_subscription_id', subscription.id)
        break
    }
    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
