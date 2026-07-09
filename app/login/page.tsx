'use client'
import { createClient } from '@/lib/supabase-client'
import { useState } from 'react'

type Tab = 'google' | 'signin' | 'signup'
type AuthError = string | null

export default function LoginPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('google')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<AuthError>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: { prompt: 'select_account', access_type: 'offline' },
      },
    })
  }

  const handleSignIn = async () => {
    setError(null)
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Incorrect email or password.'
        : err.message)
    } else {
      window.location.href = '/dashboard'
    }
  }

  const handleSignUp = async () => {
    setError(null)
    if (!email || !password || !confirmPassword) { setError('Please fill in all fields.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setSuccessMsg('Account created! Check your email to confirm before signing in.')
    }
  }

  const handleForgotPassword = async () => {
    setError(null)
    if (!forgotEmail) { setError('Please enter your email address.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setSuccessMsg('Password reset link sent — check your inbox.')
      setShowForgot(false)
    }
  }

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', background: 'rgba(5,13,26,0.6)',
    border: '1px solid rgba(201,153,58,0.25)', borderRadius: '4px',
    color: '#F0F6FF', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'DM Sans, sans-serif',
  }
  const goldBtn: React.CSSProperties = {
    width: '100%', padding: '14px 24px',
    background: 'linear-gradient(135deg, #C9993A, #E8B84B)',
    border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer',
    fontSize: '14px', fontWeight: 700, color: '#050D1A',
    opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
  }
  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px', background: 'none', border: 'none',
    borderBottom: active ? '2px solid #E8B84B' : '2px solid transparent',
    color: active ? '#E8B84B' : 'rgba(240,246,255,0.4)',
    fontSize: '13px', fontWeight: active ? 600 : 400, cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
  })

  return (
    <div style={{
      minHeight: '100vh', background: '#050D1A', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', position: 'relative', overflow: 'hidden'
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

      {/* Card */}
      <div style={{
        background: 'rgba(16,36,72,0.8)', border: '1px solid rgba(201,153,58,0.3)',
        borderRadius: '8px', padding: '48px', width: '420px',
        backdropFilter: 'blur(12px)', position: 'relative', zIndex: 1
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-block', background: 'linear-gradient(135deg, #C9993A, #E8B84B)',
            color: '#050D1A', fontWeight: 800, fontSize: '11px', letterSpacing: '0.14em',
            padding: '4px 12px', borderRadius: '2px', marginBottom: '12px'
          }}>ONE EMPIRE</div>
          <div style={{
            fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', color: '#F0F6FF',
            fontWeight: 300, marginBottom: '8px'
          }}>
            <em style={{ color: '#E8B84B', fontStyle: 'italic' }}>Empire</em> PM
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(240,246,255,0.45)', letterSpacing: '0.06em' }}>
            AI-Powered Project Management
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(201,153,58,0.2)', marginBottom: '20px' }}/>

        {/* Forgot password overlay */}
        {showForgot ? (
          <div>
            <div style={{ fontSize: '15px', color: '#F0F6FF', fontWeight: 600, marginBottom: '8px' }}>
              Reset your password
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(240,246,255,0.5)', marginBottom: '20px' }}>
              Enter your email and we&apos;ll send a reset link.
            </div>
            <input
              type="email" placeholder="your@email.com" value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
              style={{ ...inputStyle, marginBottom: '12px' }}
            />
            {error && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
            {successMsg && <div style={{ color: '#4ade80', fontSize: '13px', marginBottom: '12px' }}>{successMsg}</div>}
            <button onClick={handleForgotPassword} disabled={loading} style={{ ...goldBtn, marginBottom: '12px' }}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <button onClick={() => { setShowForgot(false); setError(null); setSuccessMsg(null) }}
              style={{ background: 'none', border: 'none', color: 'rgba(240,246,255,0.4)', fontSize: '13px', cursor: 'pointer', width: '100%' }}>
              ← Back to sign in
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', marginBottom: '24px', borderBottom: '1px solid rgba(201,153,58,0.15)' }}>
              <button style={tabStyle(tab === 'google')} onClick={() => { setTab('google'); setError(null); setSuccessMsg(null) }}>Google</button>
              <button style={tabStyle(tab === 'signin')} onClick={() => { setTab('signin'); setError(null); setSuccessMsg(null) }}>Sign In</button>
              <button style={tabStyle(tab === 'signup')} onClick={() => { setTab('signup'); setError(null); setSuccessMsg(null) }}>Create Account</button>
            </div>

            {/* Google Tab */}
            {tab === 'google' && (
              <div>
                <div style={{ fontSize: '13px', color: 'rgba(240,246,255,0.5)', marginBottom: '20px', textAlign: 'center' }}>
                  Sign in instantly with your Google account
                </div>
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
                <div style={{ textAlign: 'center', margin: '16px 0', color: 'rgba(240,246,255,0.25)', fontSize: '12px' }}>
                  or use email instead →
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setTab('signin')} style={{
                    flex: 1, padding: '10px', background: 'rgba(201,153,58,0.08)',
                    border: '1px solid rgba(201,153,58,0.2)', borderRadius: '4px',
                    color: 'rgba(240,246,255,0.6)', fontSize: '13px', cursor: 'pointer'
                  }}>Sign In with Email</button>
                  <button onClick={() => setTab('signup')} style={{
                    flex: 1, padding: '10px', background: 'rgba(201,153,58,0.08)',
                    border: '1px solid rgba(201,153,58,0.2)', borderRadius: '4px',
                    color: 'rgba(240,246,255,0.6)', fontSize: '13px', cursor: 'pointer'
                  }}>Create Account</button>
                </div>
              </div>
            )}

            {/* Sign In Tab */}
            {tab === 'signin' && (
              <div>
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="email" placeholder="Email address" value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <input
                    type="password" placeholder="Password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                    style={inputStyle}
                  />
                </div>
                <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                  <button onClick={() => { setShowForgot(true); setError(null); setSuccessMsg(null); setForgotEmail(email) }}
                    style={{ background: 'none', border: 'none', color: '#E8B84B', fontSize: '12px', cursor: 'pointer', padding: 0 }}>
                    Forgot password?
                  </button>
                </div>
                {error && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
                {successMsg && <div style={{ color: '#4ade80', fontSize: '13px', marginBottom: '12px' }}>{successMsg}</div>}
                <button onClick={handleSignIn} disabled={loading} style={goldBtn}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
                <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'rgba(240,246,255,0.4)' }}>
                  No account?{' '}
                  <button onClick={() => { setTab('signup'); setError(null) }}
                    style={{ background: 'none', border: 'none', color: '#E8B84B', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
                    Create one →
                  </button>
                </div>
              </div>
            )}

            {/* Sign Up Tab */}
            {tab === 'signup' && (
              <div>
                {successMsg ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>📬</div>
                    <div style={{ color: '#4ade80', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Check your inbox!</div>
                    <div style={{ color: 'rgba(240,246,255,0.5)', fontSize: '13px', lineHeight: '1.6' }}>
                      We sent a confirmation link to <strong style={{ color: '#F0F6FF' }}>{email}</strong>.<br/>
                      Click it to activate your account, then sign in.
                    </div>
                    <button onClick={() => { setTab('signin'); setSuccessMsg(null) }}
                      style={{ marginTop: '20px', background: 'none', border: 'none', color: '#E8B84B', fontSize: '13px', cursor: 'pointer' }}>
                      ← Back to sign in
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <input
                        type="email" placeholder="Email address" value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <input
                        type="password" placeholder="Password (min 8 characters)" value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <input
                        type="password" placeholder="Confirm password" value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSignUp()}
                        style={inputStyle}
                      />
                    </div>
                    {error && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
                    <button onClick={handleSignUp} disabled={loading} style={goldBtn}>
                      {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'rgba(240,246,255,0.4)' }}>
                      Already have an account?{' '}
                      <button onClick={() => { setTab('signin'); setError(null) }}
                        style={{ background: 'none', border: 'none', color: '#E8B84B', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
                        Sign in →
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        <div style={{ borderTop: '1px solid rgba(201,153,58,0.2)', margin: '24px 0 0' }}/>
        <div style={{ fontSize: '11px', color: 'rgba(240,246,255,0.25)', lineHeight: '1.6', textAlign: 'center', marginTop: '16px' }}>
          By signing in you agree to our{' '}
          <a href="/terms" style={{ color: '#E8B84B', textDecoration: 'none' }}>Terms of Service</a>{' '}and{' '}
          <a href="/privacy" style={{ color: '#E8B84B', textDecoration: 'none' }}>Privacy Policy</a>.<br/>
          Don&apos;t have a subscription?{' '}
          <a href="/pricing" style={{ color: '#E8B84B', textDecoration: 'none' }}>Plans from $17/mo →</a>
        </div>
      </div>
    </div>
  )
}
