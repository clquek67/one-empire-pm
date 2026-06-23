import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const VALID_PRICE_IDS = new Set([
  // Starter
  'price_1TdjWgB2X3LkDhkWCh4mHGvs',
  'price_1TdjWgB2X3LkDhkWfRlBPSJH',
  'price_1TdjXrB2X3LkDhkWxR2V9BBo',
  // Pro
  'price_1TdjgxB2X3LkDhkWabdHxsdr',
  'price_1TdjhcB2X3LkDhkWyLYDj2Zq',
  'price_1TdjiBB2X3LkDhkWuGKOt45V',
  // Agency
  'price_1TdjjLB2X3LkDhkW4Cul3QwO',
  'price_1TdjkMB2X3LkDhkWQeYJrMZN',
  'price_1TdjkxB2X3LkDhkW1yzpYoLL',
])

export async function POST(request: Request) {
  try {
    const { priceId } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!priceId || !VALID_PRICE_IDS.has(priceId)) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
    }

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?cancelled=true`,
      customer_email: user.email,
      subscription_data: {
        metadata: { userId: user.id },
      },
      allow_promotion_codes: true,
    })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
