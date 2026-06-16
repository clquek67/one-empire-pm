'use client'
import { useState, useEffect } from 'react'

const gold = '#E8B84B'
const goldDim = '#C9993A'
const navy = '#050D1A'
const navyCard = 'rgba(16,36,72,0.85)'
const border = 'rgba(201,153,58,0.2)'
const borderMd = 'rgba(201,153,58,0.35)'
const textBright = '#F0F6FF'
const textMid = '#C8DCF4'
const textDim = '#A8C0DC'

type PromoSub = {
  id: string
  user_id: string
  email: string
  plan: string
  status: string
  current_period_end: string
  promo: boolean
}

export default function AdminPromoPage() {
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState('pro')
  const [days, setDays] = useState('30')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [promos, setPromos] = useState<PromoSub[]>([])
  const [loadingPromos, setLoadingPromos] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)

  const loadPromos = async () => {
    setLoadingPromos(true)
    try {
      const res = await fetch('/api/admin/grant-promo')
      const data = await res.json()
      if (data.promos) setPromos(data.promos)
      else setMessage({ text: data.error || 'Failed to load', type: 'error' })
    } catch {
      setMessage({ text: 'Failed to load promo list', type: 'error' })
    }
    setLoadingPromos(false)
  }

  useEffect(() => { loadPromos() }, [])

  const grantAccess = async () => {
    if (!email.trim()) { setMessage({ text: 'Please enter an email address', type: 'error' }); return }
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/grant-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), plan, days: parseInt(days) })
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ text: data.message, type: 'success' })
        setEmail('')
        loadPromos()
      } else {
        setMessage({ text: data.error, type: 'error' })
      }
    } catch {
      setMessage({ text: 'Network error — please try again', type: 'error' })
    }
    setLoading(false)
  }

  const revokeAccess = async (userId: string, userEmail: string) => {
    if (!window.confirm(`Revoke access for ${userEmail}?`)) return
    setRevoking(userId)
    try {
      const res = await fetch('/api/admin/grant-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, plan: 'starter', days: 1 })
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ text: `✓ Access revoked for ${userEmail}`, type: 'success' })
        loadPromos()
      }
    } catch {
      setMessage({ text: 'Failed to revoke', type: 'error' })
    }
    setRevoking(null)
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const isExpired = (d: string) => new Date(d) < new Date()
  const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / (1000*60*60*24))

  const input = { width: '100%', background: 'rgba(16,36,72,0.8)', border: `1px solid ${border}`, borderRadius: '3px', padding: '10px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: textBright, outline: 'none' }
  const label = { fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600 as const, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '5px', display: 'block' }

  return (
    <div style={{ minHeight: '100vh', background: navy, padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.3em', color: goldDim, marginBottom: '8px' }}>EMPIRE PM · ADMIN</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', color: textBright }}>
            Promo <em style={{ color: gold, fontStyle: 'italic' }}>Access Manager</em>
          </div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textDim, marginTop: '6px' }}>
            Grant temporary Pro/Agency access to promo users. Only accessible by admin accounts.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '20px', alignItems: 'start' }}>

          {/* Grant form */}
          <div style={{ background: navyCard, border: `1px solid ${borderMd}`, borderRadius: '6px', padding: '24px' }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', color: goldDim, marginBottom: '20px' }}>GRANT PROMO ACCESS</div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label}>User Email</label>
              <input style={input} value={email} onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com" type="email"
                onKeyDown={e => e.key === 'Enter' && grantAccess()}/>
              <div style={{ fontSize: '10px', color: textDim, marginTop: '4px' }}>
                User must have signed up at pm.one-empire.com first
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={label}>Plan</label>
              <select style={input} value={plan} onChange={e => setPlan(e.target.value)}>
                <option value="pro">Pro — $37/mo equivalent</option>
                <option value="agency">Agency — $67/mo equivalent</option>
                <option value="starter">Starter — $17/mo equivalent</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={label}>Duration</label>
              <select style={input} value={days} onChange={e => setDays(e.target.value)}>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days (1 month)</option>
                <option value="60">60 days (2 months)</option>
                <option value="90">90 days (3 months)</option>
              </select>
            </div>

            <button
              onClick={grantAccess}
              disabled={loading || !email.trim()}
              style={{ width: '100%', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', background: `linear-gradient(135deg, ${goldDim}, ${gold})`, color: navy, border: 'none', padding: '12px', borderRadius: '3px', cursor: loading ? 'not-allowed' : 'pointer', opacity: (loading || !email.trim()) ? 0.6 : 1 }}>
              {loading ? '⏳ Granting Access...' : `✦ Grant ${plan.charAt(0).toUpperCase() + plan.slice(1)} Access →`}
            </button>

            {/* Message */}
            {message && (
              <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '4px', background: message.type === 'success' ? 'rgba(34,201,144,0.08)' : 'rgba(226,75,74,0.08)', border: `1px solid ${message.type === 'success' ? 'rgba(34,201,144,0.3)' : 'rgba(226,75,74,0.3)'}`, fontSize: '12px', color: message.type === 'success' ? '#4DFFB4' : '#FF9090', lineHeight: 1.5 }}>
                {message.text}
              </div>
            )}

            {/* Info box */}
            <div style={{ marginTop: '20px', padding: '12px 14px', background: 'rgba(201,153,58,0.04)', border: `1px solid rgba(201,153,58,0.12)`, borderRadius: '3px', fontSize: '11px', color: textDim, lineHeight: 1.7 }}>
              <strong style={{ color: goldDim }}>How it works:</strong><br/>
              Upserts a subscription row directly in Supabase. Access activates immediately. After the duration ends, the user retains access until you revoke it below or they subscribe to a paid plan.
            </div>
          </div>

          {/* Active promos list */}
          <div style={{ background: navyCard, border: `1px solid ${border}`, borderRadius: '6px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', color: goldDim }}>ACTIVE PROMO USERS</div>
              <button onClick={loadPromos} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, letterSpacing: '0.1em' }}>↺ Refresh</button>
            </div>

            {loadingPromos && (
              <div style={{ textAlign: 'center', padding: '32px', color: textDim, fontSize: '12px' }}>Loading...</div>
            )}

            {!loadingPromos && promos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <div style={{ fontSize: '24px', opacity: 0.2, marginBottom: '8px' }}>◈</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', color: textMid }}>No promo users yet</div>
              </div>
            )}

            {promos.map(p => {
              const expired = isExpired(p.current_period_end)
              const left = daysLeft(p.current_period_end)
              const planColor = p.plan === 'agency' ? '#4DD8F0' : p.plan === 'pro' ? gold : textDim
              return (
                <div key={p.id} style={{ padding: '12px 0', borderBottom: `1px solid rgba(201,153,58,0.08)` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: textBright, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{p.email}</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' as const }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '2px', background: `${planColor}15`, color: planColor, border: `1px solid ${planColor}30` }}>
                          {p.plan.toUpperCase()}
                        </span>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: expired ? '#FF9090' : left <= 7 ? '#FFD080' : textDim }}>
                          {expired ? `⚠ Expired ${fmtDate(p.current_period_end)}` : `Expires ${fmtDate(p.current_period_end)} · ${left}d left`}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => revokeAccess(p.user_id, p.email)}
                      disabled={revoking === p.user_id}
                      style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', background: 'rgba(226,75,74,0.08)', border: '1px solid rgba(226,75,74,0.25)', color: '#FF9090', padding: '4px 10px', borderRadius: '2px', cursor: 'pointer', flexShrink: 0, opacity: revoking === p.user_id ? 0.5 : 1 }}>
                      {revoking === p.user_id ? '...' : 'Revoke'}
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Summary */}
            {promos.length > 0 && (
              <div style={{ marginTop: '14px', display: 'flex', gap: '16px', fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: textDim }}>
                <span>Total: {promos.length}</span>
                <span style={{ color: '#4DFFB4' }}>Active: {promos.filter(p => !isExpired(p.current_period_end)).length}</span>
                <span style={{ color: '#FF9090' }}>Expired: {promos.filter(p => isExpired(p.current_period_end)).length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '24px', textAlign: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.15em' }}>
          EMPIRE PM ADMIN · ACCESS RESTRICTED · pm.one-empire.com
        </div>

      </div>
    </div>
  )
}
