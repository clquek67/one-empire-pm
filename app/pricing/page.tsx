'use client'
import { useState } from 'react'
import { PLANS, PeriodType } from '@/lib/plans'

export default function PricingPage() {
  const [period, setPeriod] = useState<PeriodType>('monthly')
  const [loading, setLoading] = useState<string | null>(null)

  const savings = { monthly: null, quarterly: '20% off', yearly: '33% off' }

  const handleSubscribe = async (priceId: string) => {
    setLoading(priceId)
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId })
      })
      const { url, error } = await res.json()
      if (error) { window.location.href = '/login'; return }
      if (url) window.location.href = url
    } catch {
      setLoading(null)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#050D1A', fontFamily: 'sans-serif',
      color: '#F0F6FF', position: 'relative', overflow: 'hidden'
    }}>
      {/* Circuit BG */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08, pointerEvents: 'none' }}
        viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <g stroke="#C9993A" strokeWidth="0.8" fill="none">
          <polyline points="0,180 120,180 120,80 300,80 300,220 500,220"/>
          <polyline points="1440,200 1320,200 1320,100 1140,100 1140,250 940,250"/>
          <polyline points="0,650 160,650 160,550 340,550 340,700 520,700"/>
          <polyline points="1440,750 1300,750 1300,660 1100,660 1100,780 900,780"/>
        </g>
        <g fill="#C9993A">
          <circle cx="300" cy="80" r="3"/><circle cx="1140" cy="100" r="3"/>
        </g>
      </svg>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto', padding: '60px 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <a href="/login" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'inline-block', background: 'linear-gradient(135deg, #C9993A, #E8B84B)',
              color: '#050D1A', fontWeight: 800, fontSize: '10px', letterSpacing: '0.14em',
              padding: '4px 10px', borderRadius: '2px', marginBottom: '16px'
            }}>ONE EMPIRE</div>
          </a>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '42px', fontWeight: 300, marginBottom: '12px' }}>
            Choose Your <em style={{ color: '#E8B84B', fontStyle: 'italic' }}>Plan</em>
          </h1>
          <p style={{ color: 'rgba(240,246,255,0.75)', fontSize: '15px' }}>
            AI-powered project management for consultants and agencies
          </p>
        </div>

        {/* Period Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '48px' }}>
          {(['monthly', 'quarterly', 'yearly'] as PeriodType[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '8px 20px', borderRadius: '20px', border: '1px solid',
              borderColor: period === p ? '#E8B84B' : 'rgba(201,153,58,0.2)',
              background: period === p ? 'rgba(201,153,58,0.1)' : 'transparent',
              color: period === p ? '#E8B84B' : 'rgba(240,246,255,0.4)',
              cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'capitalize' as const,
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
              {savings[p] && (
                <span style={{
                  background: 'rgba(34,201,144,0.15)', color: '#4DFFB4',
                  fontSize: '10px', padding: '1px 6px', borderRadius: '10px',
                  border: '1px solid rgba(34,201,144,0.25)'
                }}>{savings[p]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {Object.entries(PLANS).map(([key, plan]) => {
            const isPro = key === 'pro'
            const price = plan.prices[period]
            return (
              <div key={key} style={{
                background: isPro ? 'rgba(201,153,58,0.06)' : 'rgba(16,36,72,0.6)',
                border: `1px solid ${isPro ? 'rgba(201,153,58,0.5)' : 'rgba(201,153,58,0.18)'}`,
                borderRadius: '6px', padding: '32px 28px', position: 'relative',
                transition: 'transform 0.15s'
              }}>
                {isPro && (
                  <div style={{
                    position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #C9993A, #E8B84B)', color: '#050D1A',
                    fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em',
                    padding: '3px 14px', borderRadius: '10px'
                  }}>MOST POPULAR</div>
                )}

                <div style={{ marginBottom: '24px' }}>
                  <div style={{
                    fontFamily: 'Georgia, serif', fontSize: '22px', color: '#F0F6FF',
                    marginBottom: '6px'
                  }}>{plan.name}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(240,246,255,0.75)' }}>
                    {plan.description}
                  </div>
                </div>

                <div style={{ marginBottom: '28px' }}>
                  <span style={{
                    fontFamily: 'Georgia, serif', fontSize: '42px', color: '#E8B84B', fontWeight: 300
                  }}>${price.amount}</span>
                  <span style={{ fontSize: '13px', color: 'rgba(240,246,255,0.75)', marginLeft: '6px' }}>
                    /{period === 'monthly' ? 'mo' : period === 'quarterly' ? 'qtr' : 'yr'}
                  </span>
                </div>

                <button
                  onClick={() => handleSubscribe(price.id)}
                  disabled={loading === price.id}
                  style={{
                    width: '100%', padding: '12px',
                    background: isPro ? 'linear-gradient(135deg, #C9993A, #E8B84B)' : 'transparent',
                    border: isPro ? 'none' : '1px solid rgba(201,153,58,0.75)',
                    borderRadius: '3px', cursor: 'pointer',
                    color: isPro ? '#050D1A' : '#E8B84B',
                    fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em',
                    marginBottom: '28px', opacity: loading === price.id ? 0.7 : 1
                  }}
                >
                  {loading === price.id ? 'Loading...' : `Get ${plan.name} →`}
                </button>

                <div style={{ borderTop: '1px solid rgba(201,153,58,0.15)', paddingTop: '20px' }}>
                  {plan.features.map(f => (
                    <div key={f} style={{
                      display: 'flex', gap: '8px', marginBottom: '10px',
                      fontSize: '13px', color: 'rgba(240,246,255,0.7)'
                    }}>
                      <span style={{ color: '#4DFFB4', flexShrink: 0 }}>✓</span>{f}
                    </div>
                  ))}
                  {plan.notIncluded.map(f => (
                    <div key={f} style={{
                      display: 'flex', gap: '8px', marginBottom: '10px',
                      fontSize: '13px', color: 'rgba(240,246,255,0.6)'
                    }}>
                      <span style={{ flexShrink: 0 }}>✗</span>{f}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '48px', fontSize: '12px', color: 'rgba(240,246,255,0.85)' }}>
          All plans include a 7-day free trial · Cancel anytime · Secure payments by Stripe
        </div>
      </div>
    </div>
  )
}
