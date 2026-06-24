import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { PLANS } from '@/lib/plans'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single()

    if (!subscription || subscription.status !== 'active') {
      return NextResponse.json({ error: 'Active subscription required' }, { status: 403 })
    }

    const plan = subscription.plan as keyof typeof PLANS
    const planConfig = PLANS[plan] || PLANS.starter
    const seatLimit = planConfig.teamMembers

    // Starter plan — no team seats at all
    if (seatLimit === 0) {
      return NextResponse.json({
        error: 'Team members require Pro or Agency plan',
        message: 'Upgrade to Pro ($37/mo) to unlock 3 team seats.',
      }, { status: 403 })
    }

    // Server-side seat count — unique emails across all team members for this owner
    const { data: existingMembers, error: countError } = await supabase
      .from('team_members')
      .select('email')
      .eq('user_id', user.id)

    if (countError) {
      return NextResponse.json({ error: 'Failed to check seat count' }, { status: 500 })
    }

    const uniqueSeats = new Set(
      (existingMembers ?? []).map((m: { email: string }) => m.email.toLowerCase())
    ).size

    // Parse body first to check if this email already occupies a seat
    const body = await request.json()
    const { name, email, role, project_id, capacity } = body

    if (!name || !email || !project_id) {
      return NextResponse.json({ error: 'name, email, and project_id are required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if this email already exists — doesn't consume a new seat
    const emailAlreadySeated = (existingMembers ?? []).some(
      (m: { email: string }) => m.email.toLowerCase() === normalizedEmail
    )

    if (!emailAlreadySeated && uniqueSeats >= seatLimit) {
      return NextResponse.json({
        error: 'Seat limit reached',
        message: `Your ${planConfig.name} plan includes ${seatLimit} team seat${seatLimit === 1 ? '' : 's'}. Remove an existing member or upgrade to Agency for 15 seats.`,
        limit: seatLimit,
        current: uniqueSeats,
      }, { status: 403 })
    }

    // Verify the project belongs to this user
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: member, error: insertError } = await supabase
      .from('team_members')
      .insert({
        user_id: user.id,
        project_id,
        name: name.trim(),
        email: normalizedEmail,
        role: role?.trim() || null,
        capacity: capacity ? parseInt(capacity) : 100,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 })
    }

    return NextResponse.json({ member }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
