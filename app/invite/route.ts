import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email, name, role, projectId, teamMemberId } = await request.json()
    if (!email || !projectId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    // Verify the caller owns this project
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // Get PM profile
    const { data: pmProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    // Update team_member record with invite info
    await supabase
      .from('team_members')
      .update({ invited_email: email, invite_status: 'invited' })
      .eq('id', teamMemberId)

    // Send invite email via Supabase Auth (magic link / OAuth invite)
    // We use Resend directly via the existing email setup
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://pm.one-empire.com'}/invite/accept?token=${teamMemberId}&project=${projectId}&role=${role || 'team_member'}`

    // Use Resend to send invite email
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Empire PM <noreply@pm.one-empire.com>',
        to: email,
        subject: `You've been invited to ${project.name} on Empire PM`,
        html: `
          <div style="font-family: 'DM Sans', sans-serif; background: #050D1A; color: #E8F0FF; padding: 40px; max-width: 560px; margin: 0 auto; border-radius: 8px; border: 1px solid rgba(201,153,58,0.3);">
            <div style="font-family: Georgia, serif; font-size: 28px; color: #F0F6FF; margin-bottom: 8px;">
              <em style="color: #E8B84B;">Empire</em> PM
            </div>
            <div style="font-size: 11px; color: rgba(201,153,58,0.7); letter-spacing: 0.2em; margin-bottom: 32px;">ONE EMPIRE</div>
            
            <p style="font-size: 16px; color: #D8E4F4; margin-bottom: 8px;">Hi ${name || email},</p>
            <p style="font-size: 14px; color: rgba(192,208,232,0.75); line-height: 1.7; margin-bottom: 24px;">
              <strong style="color: #E8B84B;">${pmProfile?.full_name || pmProfile?.email || 'Your PM'}</strong> has invited you to collaborate on 
              <strong style="color: #E8F0FF;">${project.name}</strong> using Empire PM.
            </p>
            
            <div style="background: rgba(201,153,58,0.08); border: 1px solid rgba(201,153,58,0.25); border-radius: 6px; padding: 20px; margin-bottom: 28px;">
              <div style="font-size: 11px; color: rgba(201,153,58,0.7); letter-spacing: 0.18em; margin-bottom: 8px;">YOUR ACCESS</div>
              <div style="font-size: 14px; color: #E8F0FF;">Project: <strong>${project.name}</strong></div>
              <div style="font-size: 14px; color: #E8F0FF; margin-top: 4px;">Role: <strong>${role === 'client' ? 'Client (View only)' : 'Team Member'}</strong></div>
            </div>
            
            <a href="${inviteUrl}" style="display: block; background: linear-gradient(135deg, #C9993A, #E8B84B); color: #050D1A; text-align: center; padding: 14px 24px; border-radius: 4px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.08em; margin-bottom: 24px;">
              Accept Invitation →
            </a>
            
            <p style="font-size: 11px; color: rgba(240,246,255,0.3); line-height: 1.6;">
              You'll sign in with Google using this email address (${email}).<br/>
              If you weren't expecting this invitation, you can ignore this email.
            </p>
          </div>
        `
      })
    })

    if (!resendRes.ok) {
      console.error('Resend error:', await resendRes.text())
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
