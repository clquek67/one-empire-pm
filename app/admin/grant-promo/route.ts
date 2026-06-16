import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Your admin email — only this account can grant promo access
const ADMIN_EMAILS = ['clquek@gmail.com']

export async function POST(request: Request) {
  try {
    // 1. Verify the requester is logged in
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify the requester is an admin
    if (!ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    // 3. Parse request body
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

    // 4. Use service role to look up user by email and grant access
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Look up user by email in auth.users
    const { data: { users }, error: listError } = await serviceSupabase.auth.admin.listUsers()
    if (listError) {
      return NextResponse.json({ error: 'Failed to look up users' }, { status: 500 })
    }

    const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (!targetUser) {
      return NextResponse.json({ error: `No account found for ${email}. They must sign up first.` }, { status: 404 })
    }

    const periodEnd = new Date()
    periodEnd.setDate(periodEnd.getDate() + daysNum)

    // Upsert subscription — handles both new and existing subscriptions
    const { error: subError } = await serviceSupabase
      .from('subscriptions')
      .upsert({
        user_id: targetUser.id,
        plan,
        period: 'monthly',
        status: 'active',
        current_period_end: periodEnd.toISOString(),
        promo: true,
      }, { onConflict: 'user_id' })

    if (subError) {
      return NextResponse.json({ error: `Subscription error: ${subError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `✓ ${plan.charAt(0).toUpperCase() + plan.slice(1)} access granted to ${email} for ${daysNum} days (until ${periodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })})`,
      userId: targetUser.id,
      expiresAt: periodEnd.toISOString(),
    })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET — list all promo subscriptions
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ADMIN_EMAILS.includes(user.email || '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: promos, error } = await serviceSupabase
      .from('subscriptions')
      .select('*')
      .eq('promo', true)
      .order('current_period_end', { ascending: true })

    if (error) return NextResponse.json({ error: `DB error: ${error.message}` }, { status: 500 })

    // Enrich with emails
    const { data: usersData, error: usersError } = await serviceSupabase.auth.admin.listUsers()
    if (usersError) return NextResponse.json({ error: `Users error: ${usersError.message}` }, { status: 500 })

    const enriched = (promos || []).map(sub => {
      const u = usersData.users.find((u: any) => u.id === sub.user_id)
      return { ...sub, email: u?.email || 'Unknown' }
    })

    return NextResponse.json({ promos: enriched })
  } catch (err: any) {
    return NextResponse.json({ error: `Server error: ${err?.message || 'unknown'}` }, { status: 500 })
  }
}
