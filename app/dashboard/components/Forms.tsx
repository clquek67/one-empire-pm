'use client'
import { useState, useEffect, useRef, Fragment } from 'react'
import { createClient } from '@/lib/supabase-client'
import DOMPurify from 'isomorphic-dompurify'

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

export function ProjectForm({ user, onCreated, supabase, isMobile, canAddProject, limits, plan }: any) {
  const [name, setName] = useState(''); const [client, setClient] = useState(''); const [budget, setBudget] = useState(''); const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  const submit = async () => {
    if (!name || !user) return
    setError('')
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, client_name: client, budget: budget || null, start_date: startDate || null, end_date: endDate || null })
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.message || data.error || 'Failed to create project')
      return
    }
    setName(''); setClient(''); setBudget(''); setStartDate(''); setEndDate(''); setError(''); onCreated()
  }
  return (
    <div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Project Name</div><input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Enterprise CRM"/></div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Client Name</div><input style={s.input} value={client} onChange={e => setClient(e.target.value)} placeholder="e.g. Acme Corp"/></div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Budget ($)</div><input style={s.input} value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. 50000" type="number"/></div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div><div style={s.label}>Start Date</div><input style={s.input} value={startDate} onChange={e => setStartDate(e.target.value)} type="date"/></div>
        <div><div style={s.label}>End Date</div><input style={s.input} value={endDate} onChange={e => setEndDate(e.target.value)} type="date"/></div>
      </div>
      {canAddProject === false ? (
        <div style={{ padding: '12px', background: 'rgba(226,75,74,0.08)', border: '1px solid rgba(226,75,74,0.25)', borderRadius: '4px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: '#FF9090', marginBottom: '4px', fontWeight: 600 }}>⬆ Project limit reached ({limits?.projects} on {(plan||'starter').charAt(0).toUpperCase()+(plan||'starter').slice(1)} plan)</div>
          <div style={{ fontSize: '11px', color: '#A8C0DC' }}>Upgrade your plan to add more projects.</div>
        </div>
      ) : (
        <>
          {error && <div style={{ padding: '10px 12px', background: 'rgba(226,75,74,0.08)', border: '1px solid rgba(226,75,74,0.25)', borderRadius: '4px', fontSize: '12px', color: '#FF9090', marginBottom: '10px' }}>{error}</div>}
          <button style={{ ...s.btnGold, width: '100%' }} onClick={submit}>Create Project →</button>
        </>
      )}
    </div>
  )
}

export function TeamMemberForm({ user, projects, onCreated, supabase, isMobile, canAddTeamMember, limits, plan, uniqueTeamSeats }: any) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [role, setRole] = useState(''); const [projectId, setProjectId] = useState(''); const [capacity, setCapacity] = useState('100')
  const [error, setError] = useState('')
  const submit = async () => {
    if (!name || !email || !projectId || !user) return
    setError('')
    const res = await fetch('/api/team-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role, project_id: projectId, capacity })
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.message || data.error || 'Failed to add team member')
      return
    }
    setName(''); setEmail(''); setRole(''); setError(''); onCreated()
  }

  const planName = (plan || 'starter').charAt(0).toUpperCase() + (plan || 'starter').slice(1)

  // Starter — no team logins at all
  if (limits?.teamMembers === 0) {
    return (
      <div style={{ padding: '16px', background: 'rgba(201,153,58,0.04)', border: '1px solid rgba(201,153,58,0.15)', borderRadius: '4px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: '#E8B84B', marginBottom: '4px', fontWeight: 700 }}>⬆ Upgrade to Pro</div>
        <div style={{ fontSize: '11px', color: '#A8C0DC', lineHeight: 1.6 }}>Team member logins require the Pro plan ($37/mo).<br/>Pro includes 3 team seats across all your projects.</div>
      </div>
    )
  }

  const seatLimitReached = canAddTeamMember && !canAddTeamMember()

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div><div style={s.label}>Name</div><input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Full name"/></div>
        <div><div style={s.label}>Email</div><input style={s.input} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@company.com" type="email"/></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div><div style={s.label}>Role</div><input style={s.input} value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Developer"/></div>
        <div><div style={s.label}>Capacity %</div><input style={s.input} value={capacity} onChange={e => setCapacity(e.target.value)} type="number" min="0" max="100"/></div>
      </div>
      <div style={{ marginBottom: '12px' }}>
        <div style={s.label}>Project</div>
        <select style={s.input} value={projectId} onChange={e => setProjectId(e.target.value)}>
          <option value="">Select project...</option>
          {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {/* Seat usage indicator */}
      <div style={{ marginBottom: '10px', fontSize: '11px', color: '#A8C0DC' }}>
        {uniqueTeamSeats} of {limits?.teamMembers} seats used · {planName} plan
      </div>
      {seatLimitReached ? (
        <div style={{ padding: '12px', background: 'rgba(226,75,74,0.08)', border: '1px solid rgba(226,75,74,0.25)', borderRadius: '4px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: '#FF9090', marginBottom: '4px', fontWeight: 600 }}>⬆ Seat limit reached ({limits?.teamMembers} seats on {planName} plan)</div>
          <div style={{ fontSize: '11px', color: '#A8C0DC' }}>Upgrade to Agency for 15 seats, or remove an existing team member to free up a seat.</div>
        </div>
      ) : (
        <>
          {error && <div style={{ padding: '10px 12px', background: 'rgba(226,75,74,0.08)', border: '1px solid rgba(226,75,74,0.25)', borderRadius: '4px', fontSize: '12px', color: '#FF9090', marginBottom: '10px' }}>{error}</div>}
          <button style={{ ...s.btnGold, width: '100%' }} onClick={submit}>Add Team Member →</button>
        </>
      )}
    </div>
  )
}

