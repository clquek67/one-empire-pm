'use client'
import { useState } from 'react'

const NAVY = '#050D1A'
const NAVY2 = 'rgba(16,36,72,0.6)'
const GOLD = '#E8B84B'
const GOLDDIM = '#C9993A'
const TEXT = '#F0F6FF'
const TEXTDIM = 'rgba(240,246,255,0.75)'
const TEXTBRIGHT = '#FFFFFF'
const BORDER = 'rgba(201,153,58,0.2)'

const PLANS = [
  {
    name: 'Starter',
    price: 17,
    discounted: 8.50,
    priceId: 'price_1TdjWgB2X3LkDhkWCh4mHGvs',
    features: [
      '5 Projects',
      'Tasks & Kanban Board',
      'Risk Radar',
      'Timeline & Milestones',
      'Time & Billing',
    ],
    cta: 'Start with Starter',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 37,
    discounted: 18.50,
    priceId: 'price_1TdjgxB2X3LkDhkWabdHxsdr',
    features: [
      '10 Projects',
      '3 Team seats (account-wide)',
      'AI Planner',
      'Meetings AI',
      'Scope Control AI',
      'Proposals & Estimates (AI)',
      'Invoice automation',
      'Weekly AI Reports',
    ],
    cta: 'Start with Pro',
    highlight: true,
  },
  {
    name: 'Agency',
    price: 67,
    discounted: 33.50,
    priceId: 'price_1TdjjLB2X3LkDhkW4Cul3QwO',
    features: [
      '25 Projects',
      '15 Team seats (account-wide)',
      'Everything in Pro',
      'Recurring Retainer Invoices',
      'Client Portal & client logins',
      'Workload AI',
      'Full AI Reports',
      'White label emails',
    ],
    cta: 'Start with Agency',
    highlight: false,
  },
]

export default function ProductHuntPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

  const copyCode = () => {
    navigator.clipboard.writeText('PHLAUNCH')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: NAVY, fontFamily: 'DM Sans, sans-serif', color: TEXT }}>

      {/* Circuit BG */}
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none', zIndex: 0 }}
        viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <g stroke="#C9993A" strokeWidth="0.8" fill="none">
          <polyline points="0,180 120,180 120,80 300,80 300,220 500,220"/>
          <polyline points="0,420 80,420 80,320 200,320 200,480 400,480 400,380 600,380"/>
          <polyline points="1440,200 1320,200 1320,100 1140,100 1140,250 940,250"/>
        </g>
        <g fill="#C9993A">
          <circle cx="300" cy="80" r="3"/><circle cx="200" cy="320" r="3"/><circle cx="1140" cy="100" r="3"/>
        </g>
      </svg>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── PH Badge Banner ── */}
        <div style={{ background: 'rgba(234,96,55,0.1)', borderBottom: '1px solid rgba(234,96,55,0.25)', padding: '10px 24px', textAlign: 'center' }}>
          <span style={{ fontSize: '13px', color: '#F0F6FF' }}>
            👋 Hey Product Hunt! Thanks for checking out Empire PM.
            <strong style={{ color: GOLD, marginLeft: '6px' }}>Use code PHLAUNCH for 50% off your first 3 months.</strong>
          </span>
        </div>

        {/* ── Header ── */}
        <div style={{ borderBottom: `1px solid ${BORDER}`, background: 'rgba(8,20,40,0.95)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', background: 'rgba(201,153,58,0.1)', border: `1px solid rgba(201,153,58,0.35)`, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <polygon points="10,1 1,16 4,13 10,18 16,13 19,16" stroke="#E8B84B" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
                  <line x1="1" y1="16" x2="19" y2="16" stroke="#E8B84B" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px', color: GOLD }}>EMPIRE PM</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: TEXTDIM }}>One Empire</div>
              </div>
            </div>
            <a href="/pricing" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', color: TEXTDIM, textDecoration: 'none' }}>
              View standard pricing →
            </a>
          </div>
        </div>

        {/* ── Hero ── */}
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '72px 28px 48px', textAlign: 'center' }}>

          {/* PH exclusive badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(234,96,55,0.1)', border: '1px solid rgba(234,96,55,0.3)', borderRadius: '20px', padding: '6px 16px', marginBottom: '24px' }}>
            <span style={{ fontSize: '14px' }}>🐱</span>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.16em', color: '#FF6B4A' }}>PRODUCT HUNT EXCLUSIVE OFFER</span>
          </div>

          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '52px', fontWeight: 400, color: TEXT, margin: '0 0 20px', lineHeight: 1.15 }}>
            Replace 5 PM tools with<br/>
            <em style={{ color: GOLD, fontStyle: 'italic' }}>one AI command centre</em>
          </h1>

          <p style={{ fontSize: '17px', color: 'rgba(240,246,255,0.85)', maxWidth: '560px', margin: '0 auto 32px', lineHeight: 1.7 }}>
            Empire PM combines AI planning, proposals, invoicing, risk alerts, meeting summaries and client reports — built for freelancers and agency owners who are done juggling 5 separate tools.
          </p>

          {/* Promo code box */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0', background: 'rgba(201,153,58,0.08)', border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '16px 24px', marginBottom: '40px' }}>
            <div style={{ textAlign: 'left', marginRight: '20px' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', letterSpacing: '0.2em', color: TEXTDIM, marginBottom: '4px' }}>YOUR EXCLUSIVE CODE</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '28px', fontWeight: 700, color: GOLD, letterSpacing: '0.1em' }}>PHLAUNCH</div>
              <div style={{ fontSize: '12px', color: TEXTDIM, marginTop: '2px' }}>50% off your first 3 months · Expires in 7 days</div>
            </div>
            <button onClick={copyCode} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', background: copied ? 'rgba(34,201,144,0.15)' : 'rgba(201,153,58,0.15)', border: `1px solid ${copied ? 'rgba(34,201,144,0.4)' : BORDER}`, color: copied ? '#4DFFB4' : GOLD, padding: '10px 18px', borderRadius: '4px', cursor: 'pointer' }}>
              {copied ? '✓ COPIED' : 'COPY CODE'}
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '0', justifyContent: 'center', background: 'rgba(201,153,58,0.05)', border: `1px solid ${BORDER}`, borderRadius: '4px', overflow: 'hidden', maxWidth: '500px', margin: '0 auto 48px' }}>
            {[
              { val: '$150+', label: 'saved vs 5 tools' },
              { val: '$17/mo', label: 'starting price' },
              { val: '∞', label: 'hours saved' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, padding: '14px 20px', borderRight: i < 2 ? `1px solid ${BORDER}` : 'none', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: GOLD }}>{s.val}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(240,246,255,0.65)', letterSpacing: '0.14em', marginTop: '2px' }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── What it replaces ── */}
        <div style={{ background: 'rgba(8,20,40,0.5)', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '40px 28px' }}>
          <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', letterSpacing: '0.2em', color: TEXTDIM, marginBottom: '20px' }}>WHAT EMPIRE PM REPLACES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
              {[
                { tool: 'Asana', cost: '$13/mo', icon: '📋' },
                { tool: 'Proposify', cost: '$49/mo', icon: '📄' },
                { tool: 'FreshBooks', cost: '$17/mo', icon: '💰' },
                { tool: 'Otter.ai', cost: '$17/mo', icon: '🎙' },
                { tool: 'AgencyAnalytics', cost: '$12/mo', icon: '📊' },
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,100,100,0.06)', border: '1px solid rgba(255,100,100,0.15)', borderRadius: '4px', padding: '8px 14px' }}>
                  <span style={{ textDecoration: 'line-through', fontSize: '12px', color: '#FF9090' }}>{t.icon} {t.tool} ({t.cost})</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '13px', color: TEXTDIM }}>
              That&apos;s <span style={{ color: '#FF9090', textDecoration: 'line-through' }}>$108+/mo</span> replaced by Empire PM from{' '}
              <span style={{ color: GOLD, fontWeight: 700 }}>$17/mo</span>
            </div>
          </div>
        </div>

        {/* ── Features ── */}
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '60px 28px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 400, color: TEXT, margin: '0 0 10px' }}>
              Everything in <em style={{ color: GOLD }}>one dashboard</em>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {[
              { icon: '✦', title: 'AI Planner', desc: 'Generate full project plans from a brief — tasks, risks and milestones in one click' },
              { icon: '◇', title: 'Proposals & Estimates', desc: 'AI-written client proposals in 60 seconds. Convert accepted proposals into live projects' },
              { icon: '◷', title: 'Invoice Automation', desc: 'Send invoices and retainers automatically. Never chase a payment manually again' },
              { icon: '⚠', title: 'Risk Radar', desc: 'AI scans your projects and flags budget overruns, scope creep and deadline clashes' },
              { icon: '◎', title: 'Meetings AI', desc: 'Paste raw notes, get structured summaries with decisions and action items' },
              { icon: '✦', title: 'AI Reports', desc: 'Weekly status and client-ready reports generated from live project data' },
            ].map((f, i) => (
              <div key={i} style={{ background: NAVY2, border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '20px' }}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '20px', color: GOLD, marginBottom: '8px' }}>{f.icon}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', fontWeight: 700, color: TEXT, marginBottom: '6px' }}>{f.title}</div>
                <div style={{ fontSize: '12px', color: 'rgba(240,246,255,0.8)', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pricing ── */}
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px 28px 60px' }}>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 400, color: TEXT, margin: '0 0 8px' }}>
              PH-exclusive pricing
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(240,246,255,0.85)', margin: '0 0 8px' }}>
              Apply code <strong style={{ color: GOLD }}>PHLAUNCH</strong> at checkout for 50% off your first 3 months
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(240,246,255,0.7)' }}>Plans from $17/mo · Cancel anytime · No free trial</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '32px' }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{
                background: plan.highlight ? 'rgba(201,153,58,0.08)' : NAVY2,
                border: plan.highlight ? `1px solid ${GOLDDIM}` : `1px solid ${BORDER}`,
                borderRadius: '6px', padding: '28px 24px',
                position: 'relative'
              }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg, ${GOLDDIM}, ${GOLD})`, color: NAVY, fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.16em', padding: '4px 14px', borderRadius: '10px' }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '16px', fontWeight: 700, color: GOLD, marginBottom: '12px' }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', color: GOLD }}>${plan.discounted}</span>
                  <span style={{ fontSize: '12px', color: TEXTDIM }}>/mo first 3 months</span>
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(240,246,255,0.7)', marginBottom: '20px' }}>
                  then <span style={{ textDecoration: 'line-through' }}>${plan.price}/mo</span>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '12px', color: 'rgba(240,246,255,0.9)' }}>
                      <span style={{ color: '#4DFFB4', flexShrink: 0 }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleSubscribe(plan.priceId)}
                  disabled={loading === plan.priceId}
                  style={{
                    width: '100%', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.14em', padding: '12px',
                    background: plan.highlight ? `linear-gradient(135deg, ${GOLDDIM}, ${GOLD})` : 'transparent',
                    color: plan.highlight ? NAVY : GOLD,
                    border: plan.highlight ? 'none' : `1px solid ${BORDER}`,
                    borderRadius: '3px', cursor: 'pointer',
                    opacity: loading === plan.priceId ? 0.6 : 1,
                  }}>
                  {loading === plan.priceId ? 'Loading...' : plan.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Code reminder */}
          <div style={{ textAlign: 'center', marginTop: '24px', padding: '16px', background: 'rgba(201,153,58,0.05)', border: `1px solid ${BORDER}`, borderRadius: '4px' }}>
            <span style={{ fontSize: '13px', color: TEXTDIM }}>
              Remember to apply code{' '}
              <button onClick={copyCode} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', fontSize: '14px', fontWeight: 700, color: GOLD, letterSpacing: '0.1em' }}>
                PHLAUNCH
              </button>
              {' '}at checkout · {copied ? <span style={{ color: '#4DFFB4' }}>✓ Copied!</span> : 'click to copy'}
            </span>
          </div>
        </div>

        {/* ── Founder note ── */}
        <div style={{ background: 'rgba(8,20,40,0.6)', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 28px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: 'rgba(240,246,255,0.95)', marginBottom: '16px', lineHeight: 1.6 }}>
              &ldquo;I built Empire PM because I was running 3 client projects simultaneously and spending more time switching between tools than actually doing PM work.&rdquo;
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(240,246,255,0.8)' }}>— Shine Quek, Founder of One Empire</div>
            <div style={{ marginTop: '20px' }}>
              <a href="https://www.producthunt.com/p/general/built-an-ai-powered-pm-command-centre-for-freelancers-agencies" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '12px', color: GOLD, textDecoration: 'none' }}>
                💬 Join the discussion on ProductHunt →
              </a>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '20px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.15em' }}>
            EMPIRE PM · pm.one-empire.com · ONE EMPIRE © 2026
          </div>
        </div>

      </div>
    </div>
  )
}
