import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId, userEmail, teamMemberId, role } = await request.json()
    if (!userId || !userEmail) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Use service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Force-set profile role
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: role || 'team_member' })
      .eq('id', userId)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return NextResponse.json({ error: 'Profile update failed', details: profileError.message }, { status: 500 })
    }

    // 2. Link team_member record using either token ID or email match
    let tmError = null
    if (teamMemberId) {
      const { error } = await supabase
        .from('team_members')
        .update({ linked_user_id: userId, invite_status: 'accepted' })
        .eq('id', teamMemberId)
      tmError = error
    }
    
    // Fallback: match by email
    if (tmError || !teamMemberId) {
      const { error } = await supabase
        .from('team_members')
        .update({ linked_user_id: userId, invite_status: 'accepted' })
        .eq('invited_email', userEmail)
        .is('linked_user_id', null)
      tmError = error
    }

    if (tmError) {
      console.error('Team member link error:', tmError)
      // Don't fail — role is set, just log the error
    }

    return NextResponse.json({ success: true, role: role || 'team_member' })
  } catch (error: any) {
    console.error('Accept invite error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
