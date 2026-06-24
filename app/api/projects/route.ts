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
    const projectLimit = planConfig.projects

    // Server-side count — count of non-completed projects owned by this user
    const { count, error: countError } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('status', 'completed')

    if (countError) {
      return NextResponse.json({ error: 'Failed to check project count' }, { status: 500 })
    }

    if ((count ?? 0) >= projectLimit) {
      return NextResponse.json({
        error: `Project limit reached`,
        message: `Your ${planConfig.name} plan allows ${projectLimit} active project${projectLimit === 1 ? '' : 's'}. Archive or complete an existing project, or upgrade your plan.`,
        limit: projectLimit,
        current: count,
      }, { status: 403 })
    }

    // Parse and validate body
    const body = await request.json()
    const { name, client_name, budget, start_date, end_date } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const { data: project, error: insertError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: name.trim(),
        client_name: client_name?.trim() || null,
        budget: budget ? parseFloat(budget) : null,
        start_date: start_date || null,
        end_date: end_date || null,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
    }

    return NextResponse.json({ project }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
