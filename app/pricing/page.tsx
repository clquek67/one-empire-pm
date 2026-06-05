'use client'
import { useState } from 'react'
import { PLANS, PeriodType } from '@/lib/plans'

export default function PricingPage() {
  const [period, setPeriod] = useState<PeriodType>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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

  const features = [
    {
      title: 'AI Risk Radar',
      desc: 'Automatically flags budget overruns, scope creep, and timeline delays before they become problems.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8B84B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
        </svg>
      )
    },
    {
      title: 'Smart Invoicing',
      desc: 'Generate professional invoices in one click from any project. Pull logged time automatically.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8B84B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/><line x1="8" y1="17" x2="10" y2="17"/>
        </svg>
      )
    },
    {
      title: 'Meeting AI',
      desc: 'Auto-generated summaries with action items, decisions, and follow-ups after every call.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8B84B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a8 8 0 0 0-8 8c0 3 1.5 5.5 4 7v3h8v-3c2.5-1.5 4-4 4-7a8 8 0 0 0-8-8z"/><line x1="10" y1="22" x2="14" y2="22"/>
        </svg>
      )
    },
    {
      title: 'Team Workload',
      desc: 'See who\'s overloaded and rebalance tasks across your team to prevent burnout.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8B84B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )
    },
    {
      title: 'Client Portal',
      desc: 'Give clients a professional window into project progress without exposing your internal workflow.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8B84B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      )
    },
    {
      title: 'Time & Billing',
      desc: 'Track billable hours per project and feed logged time directly into invoices — no double entry.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8B84B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      )
    }
  ]

  const faqs = [
    { q: 'What do I get when I sign up?', a: 'Instant access to your Empire PM dashboard with all features included in your plan. Create your first project, add tasks, and AI Risk Radar starts working immediately.' },
    { q: 'Can I switch plans later?', a: 'Yes. Upgrade or downgrade anytime from your account settings. When you upgrade, you get immediate access to the new features. Downgrades take effect at the end of your billing period.' },
    { q: 'What does the AI actually do?', a: 'Empire PM uses AI to scan your projects for risks (budget overrun, scope creep, timeline delays), generate meeting summaries with action items, and help you plan tasks. It works in the background automatically.' },
    { q: 'Is my data secure?', a: 'Yes. Empire PM uses Supabase with Row Level Security, meaning your data is isolated and encrypted. Authentication is handled via Google OAuth. Your project data is never shared with other users.' },
    { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your account settings at any time. Your access continues until the end of your current billing period. No cancellation fees, no lock-in contracts.' },
    { q: 'What are n8n Automations?', a: 'n8n is an automation engine built into Pro and Agency plans. It powers automated workflows like meeting summary emails, invoice notifications, and risk alert emails.' }
  ]

  const steps = [
    { num: '1', title: 'Choose your plan', desc: 'Pick Starter, Pro, or Agency. Monthly, quarterly, or yearly.' },
    { num: '2', title: 'Create your first project', desc: 'Add a project, deadline, and tasks. AI kicks in automatically.' },
    { num: '3', title: 'Let AI work for you', desc: 'Risk alerts, summaries, invoices — all running in the background.' }
  ]

  return (
    <div style={{
      minHeight: '100vh', background: '#050D1A', fontFamily: 'DM Sans, sans-serif',
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

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>

        {/* ═══════════════ HERO ═══════════════ */}
        <section style={{ textAlign: 'center', padding: '80px 0 60px' }}>
          <a href="/login" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'inline-block', background: 'linear-gradient(135deg, #C9993A, #E8B84B)',
              color: '#050D1A', fontWeight: 800, fontSize: '10px', letterSpacing: '0.14em',
              padding: '4px 10px', borderRadius: '2px', marginBottom: '24px'
            }}>ONE EMPIRE</div>
          </a>
          <h1 style={{
            fontFamily: 'Cormorant Garamond, serif', fontSize: '52px', fontWeight: 300,
            lineHeight: 1.15, marginBottom: '20px', maxWidth: '680px', marginLeft: 'auto', marginRight: 'auto'
          }}>
            Stop running projects.<br/>
            Start <em style={{ color: '#E8B84B', fontStyle: 'italic' }}>ruling</em> them.
          </h1>
          <p style={{
            color: 'rgba(240,246,255,0.5)', fontSize: '17px', lineHeight: 1.7,
            maxWidth: '520px', margin: '0 auto 36px'
          }}>
            Empire PM gives freelancers and small teams real-time visibility, AI risk alerts,
            automated invoicing, and meeting summaries — in one command centre.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
            <a href="#pricing" style={{
              display: 'inline-block', background: 'linear-gradient(135deg, #C9993A, #E8B84B)',
              color: '#050D1A', fontSize: '15px', fontWeight: 700, padding: '14px 32px',
              borderRadius: '3px', textDecoration: 'none', letterSpacing: '0.06em'
            }}>Get Started →</a>
            <a href="#features" style={{
              display: 'inline-block', background: 'transparent',
              color: '#E8B84B', fontSize: '15px', fontWeight: 700, padding: '14px 32px',
              borderRadius: '3px', textDecoration: 'none', letterSpacing: '0.06em',
              border: '1px solid rgba(201,153,58,0.75)'
            }}>See Features</a>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(240,246,255,0.3)' }}>
            Plans from $17/mo · Setup in 5 minutes · Cancel anytime
          </p>
        </section>

        {/* ═══════════════ DASHBOARD PREVIEW ═══════════════ */}
        <section style={{ paddingBottom: '80px' }}>
          <div style={{
            background: 'rgba(16,36,72,0.6)', border: '1px solid rgba(201,153,58,0.18)',
            borderRadius: '8px', overflow: 'hidden', maxWidth: '880px', margin: '0 auto',
            boxShadow: '0 40px 80px rgba(0,0,0,0.4)'
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.3)', padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: '8px',
              borderBottom: '1px solid rgba(201,153,58,0.1)'
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F09595' }}/>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E8B84B' }}/>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4DFFB4' }}/>
              <span style={{ fontSize: '11px', color: 'rgba(240,246,255,0.3)', marginLeft: 6 }}>Empire PM — Dashboard</span>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'Active projects', val: '12', color: '#F0F6FF' },
                  { label: 'At risk', val: '3', color: '#F09595' },
                  { label: 'Invoiced', val: '$24k', color: '#E8B84B' },
                  { label: 'On track', val: '75%', color: '#4DFFB4' }
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '6px', padding: '14px'
                  }}>
                    <div style={{ fontSize: '10px', color: 'rgba(240,246,255,0.3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                    <div style={{ fontSize: '22px', fontWeight: 600, color: s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '16px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(240,246,255,0.3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent tasks</div>
                  {[
                    { name: 'Website redesign', status: 'At risk', color: '#F09595', bg: 'rgba(240,149,149,0.15)' },
                    { name: 'API integration', status: 'On track', color: '#4DFFB4', bg: 'rgba(77,255,180,0.1)' },
                    { name: 'Client onboarding', status: 'Review', color: '#E8B84B', bg: 'rgba(232,184,75,0.15)' },
                    { name: 'Q3 report', status: 'On track', color: '#4DFFB4', bg: 'rgba(77,255,180,0.1)' }
                  ].map(t => (
                    <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }}/>
                      <span style={{ fontSize: '12px', color: 'rgba(240,246,255,0.65)', flex: 1 }}>{t.name}</span>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: 4, background: t.bg, color: t.color }}>{t.status}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '16px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(240,246,255,0.3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Risk Radar</div>
                  {[
                    { label: 'Budget overrun', pct: 72, color: '#F09595' },
                    { label: 'Scope creep', pct: 45, color: '#E8B84B' },
                    { label: 'Timeline slip', pct: 28, color: '#4DFFB4' },
                    { label: 'Resource gap', pct: 58, color: '#E8B84B' }
                  ].map(r => (
                    <div key={r.label} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: '12px', color: 'rgba(240,246,255,0.5)', marginBottom: 5 }}>{r.label}</div>
                      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6 }}>
                        <div style={{ width: `${r.pct}%`, height: 6, borderRadius: 4, background: r.color }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ FEATURES ═══════════════ */}
        <section id="features" style={{ padding: '80px 0', borderTop: '1px solid rgba(201,153,58,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#E8B84B', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>EVERYTHING YOU NEED</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300, marginBottom: 12 }}>
              Built for the <em style={{ color: '#E8B84B', fontStyle: 'italic' }}>one-person empire</em>
            </h2>
            <p style={{ color: 'rgba(240,246,255,0.5)', fontSize: '15px', maxWidth: 480, margin: '0 auto' }}>
              Six powerful tools that replace spreadsheets, WhatsApp threads, and gut feelings.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '16px' }}>
            {features.map(f => (
              <div key={f.title} style={{
                background: 'rgba(16,36,72,0.4)', border: '1px solid rgba(201,153,58,0.12)',
                borderRadius: '6px', padding: '28px 24px',
                transition: 'border-color 0.3s, transform 0.3s'
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,153,58,0.4)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,153,58,0.12)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: 'rgba(201,153,58,0.1)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', marginBottom: 16
                }}>{f.icon}</div>
                <div style={{ fontSize: '17px', fontWeight: 600, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: '14px', color: 'rgba(240,246,255,0.5)', lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════ HOW IT WORKS ═══════════════ */}
        <section style={{ padding: '80px 0', borderTop: '1px solid rgba(201,153,58,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#E8B84B', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>HOW IT WORKS</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300 }}>
              Up and running in <em style={{ color: '#E8B84B', fontStyle: 'italic' }}>5 minutes</em>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '32px' }}>
            {steps.map(s => (
              <div key={s.num} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  border: '2px solid rgba(201,153,58,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#E8B84B',
                  margin: '0 auto 20px', background: 'rgba(16,36,72,0.6)'
                }}>{s.num}</div>
                <div style={{ fontSize: '17px', fontWeight: 600, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: '14px', color: 'rgba(240,246,255,0.5)', lineHeight: 1.6, maxWidth: 260, margin: '0 auto' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════ PRICING ═══════════════ */}
        <section id="pricing" style={{ padding: '80px 0', borderTop: '1px solid rgba(201,153,58,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#E8B84B', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>SIMPLE, HONEST PRICING</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300, marginBottom: 12 }}>
              Choose Your <em style={{ color: '#E8B84B', fontStyle: 'italic' }}>Plan</em>
            </h2>
            <p style={{ color: 'rgba(240,246,255,0.5)', fontSize: '15px' }}>
              Every feature included at every tier. The only difference is scale.
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
                      fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#F0F6FF',
                      marginBottom: '6px'
                    }}>{plan.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(240,246,255,0.75)' }}>
                      {plan.description}
                    </div>
                  </div>

                  <div style={{ marginBottom: '28px' }}>
                    <span style={{
                      fontFamily: 'Cormorant Garamond, serif', fontSize: '42px', color: '#E8B84B', fontWeight: 300
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
        </section>

        {/* ═══════════════ FAQ ═══════════════ */}
        <section style={{ padding: '80px 0', borderTop: '1px solid rgba(201,153,58,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#E8B84B', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>FAQ</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300 }}>
              Common <em style={{ color: '#E8B84B', fontStyle: 'italic' }}>questions</em>
            </h2>
          </div>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            {faqs.map((faq, i) => (
              <div key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  borderBottom: '1px solid rgba(201,153,58,0.1)',
                  padding: '24px 0', cursor: 'pointer'
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: '16px', fontWeight: 500, color: 'rgba(240,246,255,0.9)'
                }}>
                  {faq.q}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(240,246,255,0.3)" strokeWidth="2"
                    style={{ flexShrink: 0, transition: 'transform 0.3s', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)' }}>
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <div style={{
                  fontSize: '14px', color: 'rgba(240,246,255,0.5)', lineHeight: 1.7,
                  maxHeight: openFaq === i ? 200 : 0, overflow: 'hidden',
                  transition: 'max-height 0.4s ease, padding 0.4s ease',
                  paddingTop: openFaq === i ? 16 : 0
                }}>
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════ FINAL CTA ═══════════════ */}
        <section style={{ padding: '80px 0', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '36px', fontWeight: 300, marginBottom: 16 }}>
            Ready to <em style={{ color: '#E8B84B', fontStyle: 'italic' }}>rule</em> your projects?
          </h2>
          <p style={{ color: 'rgba(240,246,255,0.5)', fontSize: '15px', marginBottom: 32 }}>
            Join freelancers and teams who replaced chaos with a command centre.
          </p>
          <a href="#pricing" style={{
            display: 'inline-block', background: 'linear-gradient(135deg, #C9993A, #E8B84B)',
            color: '#050D1A', fontSize: '15px', fontWeight: 700, padding: '14px 36px',
            borderRadius: '3px', textDecoration: 'none', letterSpacing: '0.06em'
          }}>Choose your plan →</a>
        </section>

        {/* Footer */}
        <div style={{
          textAlign: 'center', padding: '40px 0',
          borderTop: '1px solid rgba(201,153,58,0.1)',
          fontSize: '12px', color: 'rgba(240,246,255,0.3)'
        }}>
          Plans from $17/mo · Cancel anytime · Secure payments by Stripe
        </div>

      </div>
    </div>
  )
}
