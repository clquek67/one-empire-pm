'use client'
import { useState, useEffect, useRef, Fragment } from 'react'
import { createClient } from '@/lib/supabase-client'
import DOMPurify from 'isomorphic-dompurify'
import { PLANS } from '@/lib/plans'

type User = { id: string; email: string; user_metadata: { full_name?: string; avatar_url?: string } }
type Project = { id: string; name: string; client_name: string; status: string; health: number; budget?: number; start_date?: string; end_date?: string }
type Task = { id: string; name: string; status: string; priority: string; owner: string; project_id: string; due_date?: string; depends_on?: string | null; created_at?: string }
type Risk = { id: string; title: string; description: string; level: string; status: string; project_id: string; due_date?: string; probability?: string; impact?: string; category?: string }
type TeamMember = { id: string; name: string; email: string; role: string; capacity: number; project_id: string; weekly_hours?: number; invited_email?: string; invite_status?: string; linked_user_id?: string }
type TimeLog = { id: string; description: string; hours: number; rate: number; billed: boolean; project_id: string; created_at: string; log_date?: string }
type Milestone = { id: string; title: string; due_date?: string; status: string; project_id: string; user_id: string; created_at: string }
type Proposal = { id: string; title: string; client_name: string; project_type: string; budget?: number; timeline?: string; status: string; scope_summary?: string; deliverables?: string; ai_body?: string; created_at: string; user_id: string }
type RecurringInvoice = { id: string; user_id: string; project_id: string; client_email: string; description: string; amount: number; frequency: 'monthly' | 'weekly' | 'quarterly'; next_run_date: string; active: boolean; created_at: string }

const gold = '#E8B84B'
const goldDim = '#C9993A'
const navy = '#050D1A'
const navyCard = 'rgba(16,36,72,0.7)'
const border = 'rgba(201,153,58,0.2)'
const borderMd = 'rgba(201,153,58,0.35)'
const textBright = '#F0F6FF'
const textMid = '#C8DCF4'
const textDim = '#A8C0DC'
const whiteFaint = '#C0D4EC'

const s = {
  badge: (bg: string, color: string, bdr: string) => ({
    display: 'inline-block' as const, fontSize: '9px', padding: '2px 7px', borderRadius: '2px',
    fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, letterSpacing: '0.05em',
    background: bg, color, border: `1px solid ${bdr}`, flexShrink: 0 as const
  }),
  card: { background: navyCard, border: `1px solid ${border}`, borderRadius: '4px', padding: '16px 18px', marginBottom: '12px' },
  label: { fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '5px' },
  input: { width: '100%', background: 'rgba(16,36,72,0.8)', border: `1px solid ${border}`, borderRadius: '3px', padding: '9px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: textBright, outline: 'none' },
  btnGold: { fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', background: `linear-gradient(135deg, ${goldDim}, ${gold})`, color: navy, border: 'none', padding: '8px 16px', borderRadius: '2px', cursor: 'pointer' },
  btnGhost: { fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', border: `1px solid ${borderMd}`, background: 'transparent', color: textMid, padding: '7px 14px', borderRadius: '2px', cursor: 'pointer' },
  sectionTitle: { fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  aiResponse: { background: 'rgba(201,153,58,0.05)', border: `1px solid ${borderMd}`, borderRadius: '4px', padding: '14px 16px', marginTop: '12px', fontSize: '12px', color: textMid, lineHeight: 1.7 },
}

function formatAI(text: string) {
  const html = text
    .replace(/\*\*(.*?)\*\*/g, `<strong style="color:${gold}">$1</strong>`)
    .replace(/^## (.+)$/gm, `<div style="font-family:Cormorant Garamond,serif;font-size:15px;color:${textBright};margin:16px 0 6px;border-bottom:1px solid ${border};padding-bottom:4px">$1</div>`)
    .replace(/^### (.+)$/gm, `<div style="font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.16em;color:${goldDim};margin:12px 0 4px">$1</div>`)
    .replace(/^# (.+)$/gm, `<div style="font-family:Cormorant Garamond,serif;font-size:18px;color:${textBright};margin:8px 0 12px;padding-bottom:6px;border-bottom:1px solid ${border}">$1</div>`)
    .replace(/^• (.+)$/gm, `<div style="display:flex;gap:8px;margin:4px 0"><span style="color:${gold};flex-shrink:0">·</span><span>$1</span></div>`)
    .replace(/^- (.+)$/gm, `<div style="display:flex;gap:8px;margin:3px 0"><span style="color:${goldDim};flex-shrink:0">–</span><span>$1</span></div>`)
    .replace(/^(\d+\.) (.+)$/gm, `<div style="display:flex;gap:8px;margin:4px 0"><span style="color:${gold};flex-shrink:0;min-width:16px">$1</span><span>$2</span></div>`)
    .replace(/`([^`]+)`/g, `<code style="background:rgba(201,153,58,0.1);border:1px solid ${border};padding:1px 5px;border-radius:2px;font-size:11px;color:${gold}">$1</code>`)
    .replace(/\n/g, '')
    .replace(/<\/div><br>/g, '</div>')
  return DOMPurify.sanitize(html, { ADD_ATTR: ['style'] })
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

export function SettingsForm({ user, supabase }: any) {
  const [company, setCompany] = useState(''); const [phone, setPhone] = useState(''); const [saved, setSaved] = useState(false)
  const [sub, setSub] = useState<any>(null); const [portalLoading, setPortalLoading] = useState(false)
  const [telegramChatId, setTelegramChatId] = useState(''); const [timezone, setTimezone] = useState('Asia/Singapore')
  const [telegramSaved, setTelegramSaved] = useState(false); const [telegramTesting, setTelegramTesting] = useState(false); const [telegramTestMsg, setTelegramTestMsg] = useState('')

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('company_name, phone, telegram_chat_id, timezone').eq('id', user.id).single().then(({ data }: any) => {
        if (data) {
          setCompany(data.company_name || ''); setPhone(data.phone || '')
          setTelegramChatId(data.telegram_chat_id || ''); setTimezone(data.timezone || 'Asia/Singapore')
        }
      })
      supabase.from('subscriptions').select('*').eq('user_id', user.id).single().then(({ data }: any) => {
        if (data) setSub(data)
      })
    }
  }, [user])

  const save = async () => {
    if (!user) return
    await supabase.from('profiles').update({ company_name: company, phone }).eq('id', user.id)
    setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  const saveTelegram = async () => {
    if (!user) return
    await supabase.from('profiles').update({ telegram_chat_id: telegramChatId, timezone }).eq('id', user.id)
    setTelegramSaved(true); setTimeout(() => setTelegramSaved(false), 3000)
  }

  const testTelegram = async () => {
    if (!telegramChatId) { setTelegramTestMsg('Please enter your Chat ID first'); return }
    setTelegramTesting(true); setTelegramTestMsg('')
    try {
      const res = await fetch('/api/telegram-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          name: user?.user_metadata?.full_name || 'there'
        })
      })
      const data = await res.json()
      if (data.success) { setTelegramTestMsg('✓ Test message sent! Check your Telegram.') }
      else { setTelegramTestMsg(`✗ Failed: ${data.error || 'Unknown error'}`) }
    } catch { setTelegramTestMsg('✗ Network error — please try again') }
    setTelegramTesting(false)
  }

  const disconnectTelegram = async () => {
    if (!user) return
    if (!window.confirm('Disconnect Telegram? You will stop receiving daily briefings.')) return
    await supabase.from('profiles').update({ telegram_chat_id: null }).eq('id', user.id)
    setTelegramChatId(''); setTelegramTestMsg('Telegram disconnected.')
  }

  const manageSubscription = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/manage-subscription', { method: 'POST' })
      const { url, error } = await res.json()
      if (url) window.location.href = url
      else console.error('Portal error:', error)
    } catch (e) { console.error(e) }
    setPortalLoading(false)
  }

  const planNames: any = { starter: 'Starter', pro: 'Pro', agency: 'Agency' }
  // Plan display strings and prices derived from PLANS (lib/plans.ts) — no local duplication
  const planPrices: any = Object.fromEntries(
    Object.entries(PLANS).map(([key, p]) => [
      key,
      Object.fromEntries(Object.entries(p.prices).map(([period, v]) => [period, `$${v.amount}`]))
    ])
  )

  const timezones = [
    { value: 'Asia/Singapore', label: 'Singapore (SGT, UTC+8)' },
    { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (MYT, UTC+8)' },
    { value: 'Asia/Jakarta', label: 'Jakarta (WIB, UTC+7)' },
    { value: 'Asia/Bangkok', label: 'Bangkok (ICT, UTC+7)' },
    { value: 'Asia/Manila', label: 'Manila (PST, UTC+8)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT, UTC+8)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST, UTC+9)' },
    { value: 'Asia/Seoul', label: 'Seoul (KST, UTC+9)' },
    { value: 'Asia/Kolkata', label: 'India (IST, UTC+5:30)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST, UTC+4)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET, UTC+1)' },
    { value: 'America/New_York', label: 'New York (EST, UTC-5)' },
    { value: 'America/Chicago', label: 'Chicago (CST, UTC-6)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST, UTC-8)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT, UTC+11)' },
  ]

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={s.card}>
        <div style={s.sectionTitle}>Profile</div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Full Name</div><input style={{ ...s.input, opacity: 0.6 }} value={user?.user_metadata?.full_name || ''} disabled/></div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Email (from Google)</div><input style={{ ...s.input, opacity: 0.6 }} value={user?.email || ''} disabled/></div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Company Name</div><input style={s.input} value={company} onChange={e => setCompany(e.target.value)} placeholder="Your company or consultancy name"/></div>
        <div style={{ marginBottom: '14px' }}><div style={s.label}>Phone</div><input style={s.input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+65 9123 4567"/></div>
        <button style={{ ...s.btnGold, width: '100%' }} onClick={save}>{saved ? '✓ Saved!' : 'Save Changes →'}</button>
      </div>

      {/* ── Telegram ── */}
      <div style={{ ...s.card, marginTop: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={s.sectionTitle}>Telegram Alerts</div>
          {telegramChatId && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '2px', background: 'rgba(34,201,144,0.12)', color: '#4DFFB4', border: '1px solid rgba(34,201,144,0.3)' }}>CONNECTED</span>}
        </div>
        <div style={{ fontSize: '11px', color: textDim, marginBottom: '16px', lineHeight: 1.6 }}>
          Receive a daily 9am briefing in Telegram — overdue tasks, risks, upcoming milestones and unbilled hours.
        </div>

        {/* How to connect instructions */}
        <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'rgba(8,20,44,0.5)', border: '1px solid rgba(201,153,58,0.15)', borderRadius: '4px' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.16em', color: goldDim, marginBottom: '8px' }}>HOW TO CONNECT</div>
          {[
            'Open Telegram and search for @EmpirePMBot',
            'Send /start to the bot',
            'The bot replies with your Chat ID (a number like 123456789)',
            'Paste that number below and click Save',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '11px', color: textMid }}>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, color: goldDim, flexShrink: 0 }}>{i + 1}.</span>
              <span>{step}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '10px' }}>
          <div style={s.label}>Your Telegram Chat ID</div>
          <input style={s.input} value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)}
            placeholder="e.g. 123456789" type="text"/>
        </div>
        <div style={{ marginBottom: '14px' }}>
          <div style={s.label}>Your Timezone</div>
          <select style={s.input} value={timezone} onChange={e => setTimezone(e.target.value)}>
            {timezones.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button style={{ ...s.btnGold, flex: 1 }} onClick={saveTelegram}>
            {telegramSaved ? '✓ Saved!' : 'Save Telegram Settings →'}
          </button>
          <button style={{ ...s.btnGhost, flex: 1 }} onClick={testTelegram} disabled={telegramTesting}>
            {telegramTesting ? 'Sending...' : '◎ Send Test Message'}
          </button>
        </div>
        {telegramChatId && (
          <button onClick={disconnectTelegram}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#FF9090', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.1em' }}>
            Disconnect Telegram
          </button>
        )}
        {telegramTestMsg && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: telegramTestMsg.startsWith('✓') ? '#4DFFB4' : '#FF9090' }}>
            {telegramTestMsg}
          </div>
        )}
      </div>

      <div style={{ ...s.card, marginTop: '14px' }}>
        <div style={s.sectionTitle}>Subscription</div>
        {sub ? (
          <div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1, background: 'rgba(201,153,58,0.06)', border: '1px solid rgba(201,153,58,0.25)', borderRadius: '4px', padding: '14px 16px' }}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '4px' }}>Current Plan</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: gold }}>{planNames[sub.plan] || sub.plan}</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(201,153,58,0.06)', border: '1px solid rgba(201,153,58,0.25)', borderRadius: '4px', padding: '14px 16px' }}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '4px' }}>Billing</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: gold }}>{planPrices[sub.plan]?.[sub.period] || ''}<span style={{ fontSize: '13px', color: textDim }}> /{sub.period === 'monthly' ? 'mo' : sub.period === 'quarterly' ? 'qtr' : 'yr'}</span></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1, background: 'rgba(34,201,144,0.06)', border: '1px solid rgba(34,201,144,0.2)', borderRadius: '4px', padding: '14px 16px' }}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '4px' }}>Status</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '14px', fontWeight: 600, color: '#4DFFB4', textTransform: 'capitalize' as const }}>{sub.status}</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(201,153,58,0.06)', border: '1px solid rgba(201,153,58,0.25)', borderRadius: '4px', padding: '14px 16px' }}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '4px' }}>Renews</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '14px', fontWeight: 600, color: textMid }}>{sub.current_period_end ? fmtDate(sub.current_period_end) : '—'}</div>
              </div>
            </div>
            {/* Plan limits display */}
            <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'rgba(8,20,44,0.5)', border: '1px solid rgba(201,153,58,0.15)', borderRadius: '4px' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.16em', color: goldDim, marginBottom: '6px' }}>PLAN LIMITS</div>
              <div style={{ fontSize: '11px', color: textMid }}>{PLANS[sub.plan as keyof typeof PLANS]?.display || PLANS.starter.display}</div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ ...s.btnGold, flex: 1 }} onClick={manageSubscription} disabled={portalLoading}>{portalLoading ? 'Loading...' : 'Manage Subscription →'}</button>
              <a href="/pricing" style={{ ...s.btnGhost, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>Change Plan →</a>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '12px', color: textDim, marginBottom: '12px' }}>No active subscription found</div>
            <a href="/pricing" style={{ ...s.btnGold, textDecoration: 'none', display: 'inline-block' }}>View Plans →</a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TIMELINE VIEW ───────────────────────────────────────────────────────────

