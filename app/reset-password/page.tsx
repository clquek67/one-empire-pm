'use client'
import { createClient } from '@/lib/supabase-client'
import { useState, useEffect } from 'react'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabase automatically exchanges the token from the URL hash on load
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const handleReset = async () => {
    setError(null)
    if (!password || !confirmPassword) { setError('Please fill in both fields.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message) } else { setDone(true) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', background: 'rgba(5,13,26,0.6)',
    border: '1px solid rgba(201,153,58,0.25)', borderRadius: '4px',
    color: '#F0F6FF', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'DM Sans, sans-serif',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#050D1A', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: 'DM Sans, sans-serif'
    }}>
      <div style={{
        background: 'rgba(16,36,72,0.8)', border: '1px solid rgba(201,153,58,0.3)',
        borderRadius: '8px', padding: '48px', width: '420px', textAlign: 'center',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{
          display: 'inline-block', background: 'linear-gradient(135deg, #C9993A, #E8B84B)',
          color: '#050D1A', fontWeight: 800, fontSize: '11px', letterSpacing: '0.14em',
          padding: '4px 12px', borderRadius: '2px', marginBottom: '20px'
        }}>ONE EMPIRE</div>

        {done ? (
          <>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
            <div style={{ color: '#4ade80', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Password updated!</div>
            <div style={{ color: 'rgba(240,246,255,0.5)', fontSize: '13px', marginBottom: '24px' }}>
              Your password has been changed successfully.
            </div>
            <a href="/login" style={{
              display: 'block', padding: '14px', background: 'linear-gradient(135deg, #C9993A, #E8B84B)',
              borderRadius: '4px', color: '#050D1A', fontWeight: 700, fontSize: '14px', textDecoration: 'none'
            }}>Go to Sign In</a>
          </>
        ) : !sessionReady ? (
          <>
            <div style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>
              Invalid or expired reset link.
            </div>
            <a href="/login" style={{ color: '#E8B84B', fontSize: '13px' }}>← Back to sign in</a>
          </>
        ) : (
          <>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: '#F0F6FF', marginBottom: '8px' }}>
              Set New Password
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(240,246,255,0.45)', marginBottom: '24px' }}>
              Choose a strong password for your account.
            </div>
            <div style={{ marginBottom: '12px', textAlign: 'left' }}>
              <input
                type="password" placeholder="New password (min 8 characters)" value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '16px', textAlign: 'left' }}>
              <input
                type="password" placeholder="Confirm new password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
                style={inputStyle}
              />
            </div>
            {error && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px', textAlign: 'left' }}>{error}</div>}
            <button onClick={handleReset} disabled={loading} style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg, #C9993A, #E8B84B)',
              border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 700, color: '#050D1A', opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
