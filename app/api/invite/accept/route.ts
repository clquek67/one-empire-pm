import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Derive userId from verified session — never trust userId from request body
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { teamMemberId, role } = await request.json()

    // Validate role — only allow permitted values, never freeform from client
    const allowedRoles = ['team_member', 'client']
    const safeRole = allowedRoles.includes(role) ? role : 'team_member'

    // Use service role key to bypass RLS for the write operations
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Set profile role using verified user.id from session
    const { error: profileError } = await serviceSupabase
      .from('profiles')
      .update({ role: safeRole })
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return NextResponse.json({ error: 'Profile update failed' }, { status: 500 })
    }

    // 2. Link team_member record — match by token ID first, fallback to verified email
    let tmError = null
    if (teamMemberId) {
      const { error } = await serviceSupabase
        .from('team_members')
        .update({ linked_user_id: user.id, invite_status: 'accepted' })
        .eq('id', teamMemberId)
      tmError = error
    }

    // Fallback: match by verified email from session (not from request body)
    if (tmError || !teamMemberId) {
      const { error } = await serviceSupabase
        .from('team_members')
        .update({ linked_user_id: user.id, invite_status: 'accepted' })
        .eq('invited_email', user.email)
        .is('linked_user_id', null)
      tmError = error
    }

    if (tmError) {
      console.error('Team member link error:', tmError)
      // Don't fail — role is set, log and continue
    }

    return NextResponse.json({ success: true, role: safeRole })
  } catch (error: any) {
    console.error('Accept invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
