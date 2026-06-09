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

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://pm.one-empire.com'}/invite/accept?token=${teamMemberId}&project=${projectId}&role=${role || 'team_member'}`

    // Send via Resend
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
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
            <div style="background: #050D1A; padding: 24px; border-bottom: 3px solid #C9993A;">
              <div style="color: #E8B84B; font-size: 11px; letter-spacing: 2px;">ONE EMPIRE</div>
              <div style="color: #F0F6FF; font-size: 24px; margin-top: 4px;">Empire <em>PM</em></div>
            </div>
            <div style="padding: 32px 24px; background: #ffffff; color: #333;">
              <p style="font-size: 16px; margin: 0 0 16px;">Hi ${name || email},</p>
              <p style="font-size: 14px; line-height: 1.7; margin: 0 0 24px; color: #555;">
                <strong>${pmProfile?.full_name || pmProfile?.email || 'Your PM'}</strong> has invited you to collaborate on 
                <strong>${project.name}</strong> using Empire PM.
              </p>
              <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin-bottom: 28px;">
                <div style="font-size: 11px; color: #999; letter-spacing: 2px; margin-bottom: 10px;">YOUR ACCESS</div>
                <div style="font-size: 14px; color: #333; margin-bottom: 6px;">Project: <strong>${project.name}</strong></div>
                <div style="font-size: 14px; color: #333;">Role: <strong>${role === 'client' ? 'Client (View only)' : 'Team Member'}</strong></div>
              </div>
              <a href="${inviteUrl}" style="display: block; background: linear-gradient(135deg, #C9993A, #E8B84B); color: #050D1A; text-align: center; padding: 14px 24px; border-radius: 4px; text-decoration: none; font-weight: 700; font-size: 14px; margin-bottom: 24px;">
                Accept Invitation →
              </a>
              <p style="font-size: 12px; color: #999; line-height: 1.6;">
                You'll sign in with Google using this email address (${email}).<br/>
                If you weren't expecting this invitation, you can safely ignore this email.
              </p>
            </div>
            <div style="background: #050D1A; padding: 14px 24px; text-align: center;">
              <div style="color: rgba(201,153,58,0.6); font-size: 10px; letter-spacing: 2px;">EMPIRE PM · pm.one-empire.com</div>
            </div>
          </div>
        `
      })
    })

    const resendData = await resendRes.json()
    
    if (!resendRes.ok) {
      console.error('Resend error:', resendData)
      return NextResponse.json({ 
        error: 'Failed to send email', 
        details: resendData,
        resendKey: process.env.RESEND_API_KEY ? 'present' : 'MISSING'
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Invite error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error?.message || String(error)
    }, { status: 500 })
  }
}
