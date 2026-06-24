import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const ADMIN_EMAILS = ['clquek@gmail.com']

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!ADMIN_EMAILS.includes(user.email || '')) return { user: null, error: NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 }) }
  return { user, error: null }
}

// POST — grant promo access to a user by email
export async function POST(request: Request) {
  try {
    const { error: authError } = await verifyAdmin()
    if (authError) return authError

    const { email, plan, days } = await request.json()

    if (!email || !plan || !days) {
      return NextResponse.json({ error: 'Missing required fields: email, plan, days' }, { status: 400 })
    }

    const allowedPlans = ['starter', 'pro', 'agency']
    if (!allowedPlans.includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const daysNum = parseInt(days)
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
      return NextResponse.json({ error: 'Days must be between 1 and 365' }, { status: 400 })
    }

    const serviceSupabase = getServiceClient()

    // O(1) lookup — query profiles table directly by email, no listUsers() needed
    const { data: profile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (profileError || !profile) {
      return NextResponse.json({
        error: `No account found for ${email}. They must sign up first.`
      }, { status: 404 })
    }

    const periodEnd = new Date()
    periodEnd.setDate(periodEnd.getDate() + daysNum)

    const { error: subError } = await serviceSupabase
      .from('subscriptions')
      .upsert({
        user_id: profile.id,
        plan,
        period: 'monthly',
        status: 'active',
        current_period_end: periodEnd.toISOString(),
        promo: true,
      }, { onConflict: 'user_id' })

    if (subError) {
      return NextResponse.json({ error: `Subscription error: ${subError.code}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `✓ ${plan.charAt(0).toUpperCase() + plan.slice(1)} access granted to ${email} for ${daysNum} days (until ${periodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })})`,
      userId: profile.id,
      expiresAt: periodEnd.toISOString(),
    })

  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET — list all promo subscriptions, enriched with email from profiles table
export async function GET() {
  try {
    const { error: authError } = await verifyAdmin()
    if (authError) return authError

    const serviceSupabase = getServiceClient()

    // Fetch promo subscriptions joined with profiles — O(1) per row via foreign key
    // profiles.id = subscriptions.user_id, profiles.email gives us what we need
    const { data: promos, error } = await serviceSupabase
      .from('subscriptions')
      .select('*, profiles(email)')
      .eq('promo', true)
      .order('current_period_end', { ascending: true })

    if (error) return NextResponse.json({ error: `DB error: ${error.code}` }, { status: 500 })

    // Flatten profiles join into email field for the UI
    const enriched = (promos || []).map((sub: any) => ({
      ...sub,
      email: sub.profiles?.email || 'Unknown',
      profiles: undefined, // strip nested object
    }))

    return NextResponse.json({ promos: enriched })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
