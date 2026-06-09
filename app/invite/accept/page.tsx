'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function AcceptInviteContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')      // team_member id
  const projectId = searchParams.get('project')
  const role = searchParams.get('role') || 'team_member'

  const [status, setStatus] = useState<'loading' | 'signin' | 'processing' | 'done' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await processInvite(user)
    } else {
      setStatus('signin')
    }
  }

  const processInvite = async (user: any) => {
    setStatus('processing')
    try {
      // Update profile role
      // Always force-set the role from the invite URL
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        role: role,
      }, { onConflict: 'id' })
      // Double-update to ensure role is set correctly
      await supabase.from('profiles').update({ role: role }).eq('id', user.id)

      // Link team_member record to this user
      if (token) {
        await supabase
          .from('team_members')
          .update({
            linked_user_id: user.id,
            invite_status: 'accepted',
            invited_email: user.email
          })
          .eq('id', token)
      }

      setStatus('done')
      // Redirect based on role
      setTimeout(() => {
        window.location.href = role === 'client' ? '/client-dashboard' : '/team-dashboard'
      }, 2000)
    } catch (err) {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent('/invite/accept?token=' + token + '&project=' + projectId + '&role=' + role)}`,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
      },
    })
  }

  const gold = '#E8B84B'
  const navy = '#050D1A'

  return (
    <div style={{ minHeight: '100vh', background: navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ background: 'rgba(16,36,72,0.9)', border: `1px solid rgba(201,153,58,0.3)`, borderRadius: '8px', padding: '48px', width: '420px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: '#F0F6FF', marginBottom: '6px' }}>
          <em style={{ color: gold }}>Empire</em> PM
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(201,153,58,0.6)', letterSpacing: '0.2em', marginBottom: '32px' }}>ONE EMPIRE</div>

        {status === 'loading' && (
          <div style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px' }}>Checking your invitation...</div>
        )}

        {status === 'signin' && (
          <>
            <div style={{ fontSize: '18px', color: '#E8F0FF', marginBottom: '8px' }}>You've been invited</div>
            <div style={{ fontSize: '13px', color: 'rgba(192,208,232,0.75)', marginBottom: '28px', lineHeight: 1.6 }}>
              Sign in with Google to accept your invitation and access your {role === 'client' ? 'project dashboard' : 'team workspace'}.
            </div>
            <button onClick={signInWithGoogle} style={{ width: '100%', padding: '14px', background: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '14px', fontWeight: 600, color: '#333' }}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
              </svg>
              Continue with Google
            </button>
          </>
        )}

        {status === 'processing' && (
          <div style={{ color: gold, fontSize: '14px' }}>✦ Setting up your access...</div>
        )}

        {status === 'done' && (
          <>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>✓</div>
            <div style={{ fontSize: '16px', color: '#22C990', marginBottom: '8px' }}>Invitation accepted!</div>
            <div style={{ fontSize: '13px', color: 'rgba(192,208,232,0.75)' }}>Redirecting to your dashboard...</div>
          </>
        )}

        {status === 'error' && (
          <div style={{ color: '#FF9090', fontSize: '14px' }}>{message}</div>
        )}
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#050D1A' }}/>}>
      <AcceptInviteContent />
    </Suspense>
  )
}
