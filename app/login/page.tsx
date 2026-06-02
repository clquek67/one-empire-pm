'use client'
import { createClient } from '@/lib/supabase-client'

export default function LoginPage() {
  const supabase = createClient()

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#050D1A', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden'
    }}>
      {/* Circuit BG */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.1, pointerEvents: 'none' }}
        viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <g stroke="#C9993A" strokeWidth="0.8" fill="none">
          <polyline points="0,180 120,180 120,80 300,80 300,220 500,220"/>
          <polyline points="1440,200 1320,200 1320,100 1140,100 1140,250 940,250"/>
          <polyline points="0,650 160,650 160,550 340,550 340,700 520,700"/>
          <polyline points="1440,750 1300,750 1300,660 1100,660 1100,780 900,780"/>
          <polyline points="600,0 600,150 700,150 700,50 860,50 860,200 1000,200"/>
        </g>
        <g fill="#C9993A">
          <circle cx="300" cy="80" r="3"/><circle cx="1140" cy="100" r="3"/>
          <circle cx="340" cy="700" r="3"/><circle cx="860" cy="50" r="3"/>
        </g>
      </svg>

      {/* Glow */}
      <div style={{
        position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '600px',
        background: 'radial-gradient(ellipse, rgba(201,153,58,0.1) 0%, transparent 70%)',
        pointerEvents: 'none'
      }}/>

      {/* Login Card */}
      <div style={{
        background: 'rgba(16,36,72,0.8)', border: '1px solid rgba(201,153,58,0.3)',
        borderRadius: '8px', padding: '48px', width: '420px', textAlign: 'center',
        backdropFilter: 'blur(12px)', position: 'relative', zIndex: 1
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'inline-block', background: 'linear-gradient(135deg, #C9993A, #E8B84B)',
            color: '#050D1A', fontWeight: 800, fontSize: '11px', letterSpacing: '0.14em',
            padding: '4px 12px', borderRadius: '2px', marginBottom: '12px'
          }}>ONE EMPIRE</div>
          <div style={{
            fontFamily: 'Georgia, serif', fontSize: '32px', color: '#F0F6FF',
            fontWeight: 300, marginBottom: '8px'
          }}>
            <em style={{ color: '#E8B84B', fontStyle: 'italic' }}>Empire</em> PM
          </div>
          <div style={{
            fontSize: '13px', color: 'rgba(240,246,255,0.45)', letterSpacing: '0.06em'
          }}>AI-Powered Project Management</div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(201,153,58,0.2)', margin: '24px 0' }}/>

        {/* Sign in text */}
        <div style={{ fontSize: '14px', color: 'rgba(240,246,255,0.6)', marginBottom: '24px' }}>
          Sign in to access your projects
        </div>

        {/* Google Button */}
        <button onClick={signInWithGoogle} style={{
          width: '100%', padding: '14px 24px', background: '#ffffff',
          border: 'none', borderRadius: '4px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          fontSize: '14px', fontWeight: 600, color: '#333', transition: 'opacity 0.15s'
        }}
          onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseOut={e => (e.currentTarget.style.opacity = '1')}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(201,153,58,0.2)', margin: '24px 0' }}/>

        {/* Footer */}
        <div style={{ fontSize: '11px', color: 'rgba(240,246,255,0.25)', lineHeight: '1.6' }}>
          By signing in you agree to our Terms of Service.<br/>
          Don't have a subscription?{' '}
          <a href="/pricing" style={{ color: '#E8B84B', textDecoration: 'none' }}>View plans →</a>
        </div>
      </div>
    </div>
  )
}
