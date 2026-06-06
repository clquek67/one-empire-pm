'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'

type User = { id: string; email: string; user_metadata: { full_name?: string; avatar_url?: string } }
type Project = { id: string; name: string; client_name: string; status: string; health: number; budget?: number; start_date?: string; end_date?: string }
type Task = { id: string; name: string; status: string; priority: string; owner: string; project_id: string; due_date?: string }
type Risk = { id: string; title: string; description: string; level: string; status: string; project_id: string; due_date?: string }
type TeamMember = { id: string; name: string; email: string; role: string; capacity: number; project_id: string }
type TimeLog = { id: string; description: string; hours: number; rate: number; billed: boolean; project_id: string; created_at: string; log_date?: string }
type Milestone = { id: string; title: string; due_date?: string; status: string; project_id: string; user_id: string; created_at: string }

const gold = '#E8B84B'
const goldDim = '#C9993A'
const navy = '#050D1A'
const navyCard = 'rgba(16,36,72,0.7)'
const border = 'rgba(201,153,58,0.2)'
const borderMd = 'rgba(201,153,58,0.35)'
const textBright = '#E8F0FF'
const textMid = '#D8E4F4'
const textDim = 'rgba(192,208,232,0.75)'
const whiteFaint = 'rgba(240,246,255,0.55)'

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
  return text
    .replace(/\*\*(.*?)\*\*/g, `<strong style="color:${gold}">$1</strong>`)
    .replace(/^## (.+)$/gm, `<div style="font-family:Cormorant Garamond,serif;font-size:15px;color:${textBright};margin:16px 0 6px;border-bottom:1px solid ${border};padding-bottom:4px">$1</div>`)
    .replace(/^### (.+)$/gm, `<div style="font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${gold};margin:14px 0 6px">$1</div>`)
    .replace(/^[-•] (.+)$/gm, `<div style="display:flex;gap:8px;margin:4px 0;padding-left:4px"><span style="color:${goldDim};flex-shrink:0">▸</span><span>$1</span></div>`)
    .replace(/^\d+\. (.+)$/gm, `<div style="display:flex;gap:8px;margin:4px 0;padding-left:4px"><span style="color:${goldDim};flex-shrink:0">▸</span><span>$1</span></div>`)
    .replace(/^---+$/gm, `<hr style="border:none;border-top:1px solid ${border};margin:12px 0">`)
    .replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function callAI(system: string, content: string): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system, messages: [{ role: 'user', content }] })
  })
  const data = await res.json()
  return data.content?.[0]?.text || 'Unable to generate response.'
}

export default function Dashboard() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [tab, setTab] = useState('dashboard')
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [aiText, setAiText] = useState<Record<string, string>>({})
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({})
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<Record<string, any>>({})

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUser(user as User); loadData(user.id) }
    })
  }, [])

  const loadData = async (userId: string) => {
    const [p, t, r, tm, tl, profile, ms] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', userId),
      supabase.from('tasks').select('*').eq('user_id', userId),
      supabase.from('risks').select('*').eq('user_id', userId),
      supabase.from('team_members').select('*').eq('user_id', userId),
      supabase.from('time_logs').select('*').eq('user_id', userId).eq('billed', false),
      supabase.from('profiles').select('onboarded').eq('id', userId).single(),
      supabase.from('milestones').select('*').eq('user_id', userId).order('due_date', { ascending: true }),
    ])
    if (p.data) setProjects(p.data)
    if (t.data) setTasks(t.data)
    if (r.data) setRisks(r.data)
    if (tm.data) setTeamMembers(tm.data)
    if (tl.data) setTimeLogs(tl.data)
    if (ms.data) setMilestones(ms.data)
    if (profile.data && (profile.data.onboarded === false || profile.data.onboarded === null)) setShowWizard(true)
  }

  const completeOnboarding = async () => {
    if (!user) return
    await supabase.from('profiles').update({ onboarded: true }).eq('id', user.id)
    setShowWizard(false)
    setWizardStep(0)
  }

  const startEdit = (id: string, fields: Record<string, any>) => { setEditingId(id); setEditFields(fields) }
  const cancelEdit = () => { setEditingId(null); setEditFields({}) }
  const saveEdit = async (table: string, id: string, extra?: Record<string, any>) => {
    const data = { ...editFields, ...extra }
    await supabase.from(table).update(data).eq('id', id)
    if (user) loadData(user.id)
    cancelEdit()
  }
  const deleteRow = async (table: string, id: string) => {
    if (!confirm('Delete this item? This cannot be undone.')) return
    await supabase.from(table).delete().eq('id', id)
    if (user) loadData(user.id)
  }

  const editBtn = (id: string, fields: Record<string, any>) => (
    <button onClick={e => { e.stopPropagation(); editingId === id ? cancelEdit() : startEdit(id, fields) }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: editingId === id ? gold : 'rgba(200,220,255,0.6)', fontSize: '13px', padding: '2px 5px', flexShrink: 0, transition: 'color 0.15s' }}
      title={editingId === id ? 'Cancel' : 'Edit'}>
      {editingId === id ? '✕' : '✎'}
    </button>
  )

  const deleteBtn = (table: string, id: string) => (
    <button onClick={e => { e.stopPropagation(); deleteRow(table, id) }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(226,75,74,0.75)', fontSize: '13px', padding: '2px 5px', flexShrink: 0, transition: 'color 0.15s' }}
      title="Delete">🗑</button>
  )

  const ef = (field: string) => editFields[field] ?? ''
  const setEf = (field: string, val: any) => setEditFields(prev => ({ ...prev, [field]: val }))

  const inlineInput = (field: string, placeholder?: string, type = 'text') => (
    <input value={ef(field)} onChange={e => setEf(field, e.target.value)} type={type} placeholder={placeholder}
      style={{ background: 'rgba(16,36,72,0.9)', border: `1px solid rgba(201,153,58,0.35)`, borderRadius: '3px', padding: '5px 8px', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#E8F0FF', outline: 'none', width: '100%' }}/>
  )
  const inlineSelect = (field: string, options: string[]) => (
    <select value={ef(field)} onChange={e => setEf(field, e.target.value)}
      style={{ background: 'rgba(16,36,72,0.9)', border: `1px solid rgba(201,153,58,0.35)`, borderRadius: '3px', padding: '5px 8px', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: '#E8F0FF', outline: 'none', width: '100%' }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
  const saveBtnInline = (table: string, id: string) => (
    <button onClick={() => saveEdit(table, id)}
      style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', background: `linear-gradient(135deg, #C9993A, #E8B84B)`, color: '#050D1A', border: 'none', padding: '5px 12px', borderRadius: '2px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
      Save →
    </button>
  )

  const ai = async (key: string, system: string, content: string) => {
    setAiLoading(prev => ({ ...prev, [key]: true }))
    setAiText(prev => ({ ...prev, [key]: '' }))
    const text = await callAI(system, content)
    setAiText(prev => ({ ...prev, [key]: text }))
    setAiLoading(prev => ({ ...prev, [key]: false }))
  }

  const signOut = async () => { await supabase.auth.signOut(); window.location.href = '/login' }

  const toggleTimer = () => {
    if (timerRunning) {
      if (timerRef.current) clearInterval(timerRef.current)
      setTimerRunning(false)
    } else {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000)
      setTimerRunning(true)
    }
  }

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerRunning(false); setTimerSeconds(0)
  }

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0')
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${h}:${m}:${sec}`
  }

  const unbilledTotal = timeLogs.reduce((sum, l) => sum + l.hours * l.rate, 0)
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const activeProjects = projects.filter(p => p.status === 'active').length
  const activeTasks = tasks.filter(t => t.status === 'active').length
  const openRisks = risks.filter(r => r.status !== 'closed').length

  // ── Notifications ──
  const today = new Date(); today.setHours(0,0,0,0)
  const in3 = new Date(today); in3.setDate(in3.getDate() + 3)
  const in7 = new Date(today); in7.setDate(in7.getDate() + 7)
  const in14 = new Date(today); in14.setDate(in14.getDate() + 14)

  const notifications: { id: string; type: 'critical'|'warning'|'info'; title: string; detail: string; tab: string }[] = []

  tasks.forEach((t: Task) => {
    if (t.status === 'done') return
    if (t.due_date) {
      const d = new Date(t.due_date); d.setHours(0,0,0,0)
      const proj = projects.find((p: Project) => p.id === t.project_id)
      if (d < today) notifications.push({ id: `task-overdue-${t.id}`, type: 'critical', title: `Task overdue: ${t.name}`, detail: `${proj?.name || 'Unknown project'} · due ${fmtDate(t.due_date)}`, tab: 'tasks' })
      else if (d <= in3) notifications.push({ id: `task-soon-${t.id}`, type: 'warning', title: `Task due soon: ${t.name}`, detail: `${proj?.name || 'Unknown project'} · due ${fmtDate(t.due_date)}`, tab: 'tasks' })
    }
  })

  risks.forEach((r: Risk) => {
    if (r.status === 'closed') return
    if (r.due_date) {
      const d = new Date(r.due_date); d.setHours(0,0,0,0)
      const proj = projects.find((p: Project) => p.id === r.project_id)
      if (d < today) notifications.push({ id: `risk-overdue-${r.id}`, type: 'critical', title: `Risk overdue: ${r.title}`, detail: `${proj?.name || 'Unknown project'} · resolve by ${fmtDate(r.due_date)}`, tab: 'risks' })
    }
  })

  milestones.forEach((m: Milestone) => {
    if (m.status === 'completed') return
    if (m.due_date) {
      const d = new Date(m.due_date); d.setHours(0,0,0,0)
      const proj = projects.find((p: Project) => p.id === m.project_id)
      if (d < today) notifications.push({ id: `ms-overdue-${m.id}`, type: 'critical', title: `Milestone overdue: ${m.title}`, detail: `${proj?.name || 'Unknown project'} · due ${fmtDate(m.due_date)}`, tab: 'timeline' })
      else if (d <= in7) notifications.push({ id: `ms-soon-${m.id}`, type: 'warning', title: `Milestone due soon: ${m.title}`, detail: `${proj?.name || 'Unknown project'} · due ${fmtDate(m.due_date)}`, tab: 'timeline' })
    }
  })

  projects.forEach((p: Project) => {
    if (p.status === 'completed') return
    if (p.end_date) {
      const d = new Date(p.end_date); d.setHours(0,0,0,0)
      if (d < today) notifications.push({ id: `proj-overdue-${p.id}`, type: 'critical', title: `Project overdue: ${p.name}`, detail: `${p.client_name || 'Internal'} · ended ${fmtDate(p.end_date)}`, tab: 'projects' })
      else if (d <= in14) notifications.push({ id: `proj-soon-${p.id}`, type: 'warning', title: `Project ending soon: ${p.name}`, detail: `${p.client_name || 'Internal'} · ends ${fmtDate(p.end_date)}`, tab: 'projects' })
    }
  })

  const criticalCount = notifications.filter(n => n.type === 'critical').length
  const notifCount = notifications.length

  const navItems = [
    { id: 'dashboard', icon: '◈', label: 'Dashboard', section: 'Command' },
    { id: 'projects', icon: '◻', label: 'Projects', section: null, badge: activeProjects > 0 ? activeProjects : null },
    { id: 'tasks', icon: '✓', label: 'Tasks', section: null, badge: activeTasks > 0 ? activeTasks : null },
    { id: 'planner', icon: '✦', label: 'AI Planner', section: null, gold: true, ai: true },
    { id: 'meetings', icon: '◎', label: 'Meetings', section: 'Operations', ai: true },
    { id: 'risks', icon: '⚠', label: 'Risk Radar', section: null, badge: openRisks > 0 ? openRisks : null, ai: true },
    { id: 'scope', icon: '⊕', label: 'Scope Control', section: null, ai: true },
    { id: 'clients', icon: '◈', label: 'Client Portal', section: null, ai: true },
    { id: 'workload', icon: '⊞', label: 'Workload', section: null, ai: true },
    { id: 'timeline', icon: '▷', label: 'Timeline', section: null },
    { id: 'billing', icon: '◷', label: 'Time & Billing', section: null },
    { id: 'settings', icon: '⚙', label: 'Settings', section: 'Account' },
  ]

  const pageLabels: Record<string,string> = { dashboard:'Dashboard', projects:'Projects', tasks:'Tasks', planner:'AI Planner', meetings:'Meetings', risks:'Risk Radar', scope:'Scope Control', clients:'Client Portal', workload:'Workload', timeline:'Timeline', billing:'Time & Billing', settings:'Settings' }
  const pageCrumbs: Record<string,string> = { dashboard:'/ Overview', projects:'/ All Projects', tasks:'/ All Tasks', planner:'/ Generate Plan', meetings:'/ Process Notes', risks:'/ Risk Register', scope:'/ Change Log', clients:'/ Email Generator', workload:'/ Capacity', timeline:'/ Milestones & Gantt', billing:'/ Timer & Invoices', settings:'/ Account' }

  return (
    <div style={{ display: 'flex', height: '100vh', background: navy, overflow: 'hidden' }} onClick={() => setShowNotifications(false)}>

      {/* Circuit BG */}
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', opacity: 0.1, pointerEvents: 'none', zIndex: 0 }}
        viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <g stroke="#C9993A" strokeWidth="0.8" fill="none">
          <polyline points="0,180 120,180 120,80 300,80 300,220 500,220"/>
          <polyline points="0,420 80,420 80,320 200,320 200,480 400,480 400,380 600,380"/>
          <polyline points="1440,200 1320,200 1320,100 1140,100 1140,250 940,250"/>
          <polyline points="1440,500 1360,500 1360,400 1200,400 1200,560 1000,560"/>
          <polyline points="600,0 600,150 700,150 700,50 860,50"/>
        </g>
        <g fill="#C9993A">
          <circle cx="300" cy="80" r="3"/><circle cx="200" cy="320" r="3"/>
          <circle cx="1140" cy="100" r="3"/><circle cx="860" cy="50" r="3"/>
        </g>
      </svg>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* SIDEBAR */}
        <aside style={{ width: '220px', flexShrink: 0, background: 'rgba(8,20,40,0.95)', borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Logo */}
          <div style={{ padding: '18px 16px', borderBottom: `1px solid rgba(201,153,58,0.12)`, display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{ width: '30px', height: '30px', background: 'rgba(201,153,58,0.1)', border: `1px solid rgba(201,153,58,0.35)`, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="10,1 1,16 4,13 10,18 16,13 19,16" stroke="#E8B84B" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    <line x1="1" y1="16" x2="19" y2="16" stroke="#E8B84B" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="10" cy="1" r="1.5" fill="#E8B84B"/>
    <circle cx="1" cy="16" r="1.2" fill="#C9993A"/>
    <circle cx="19" cy="16" r="1.2" fill="#C9993A"/>
  </svg>
</div>
            <div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', color: gold, textTransform: 'uppercase' as const }}>Empire PM</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.5px' }}>One Empire</div>
            </div>
          </div>
          {/* Nav */}
          <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {navItems.map((item, i) => (
              <div key={item.id}>
                {item.section && (
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: 'rgba(201,153,58,0.4)', padding: '12px 8px 3px', marginTop: i > 0 ? '4px' : 0 }}>
                    {item.section}
                  </div>
                )}
                <div onClick={() => setTab(item.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px',
                  borderRadius: '3px', fontFamily: 'Rajdhani, sans-serif', fontSize: '12px',
                  fontWeight: 500, letterSpacing: '0.06em', cursor: 'pointer',
                  borderLeft: tab === item.id ? `2px solid ${gold}` : '2px solid transparent',
                  transition: 'all 0.15s',
                  background: tab === item.id ? 'rgba(201,153,58,0.08)' : 'transparent',
                  color: tab === item.id ? gold : (item as any).gold ? 'rgba(232,184,75,0.8)' : 'rgba(216,228,244,0.8)',
                }}>
                  <span style={{ fontSize: '14px', flexShrink: 0, opacity: tab === item.id ? 1 : 0.85 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {(item as any).ai && !item.badge && (
                    <span style={{ fontSize: '8px', padding: '1px 5px', borderRadius: '8px', background: 'rgba(201,153,58,0.1)', color: 'rgba(201,168,80,0.85)', fontWeight: 600, letterSpacing: '0.3px' }}>AI</span>
                  )}
                  {item.badge && (
                    <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(226,75,74,0.18)', color: '#FFB0B0', fontWeight: 700 }}>
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </nav>
          {/* User footer */}
          <div style={{ padding: '12px 14px', borderTop: `1px solid rgba(201,153,58,0.12)`, display: 'flex', alignItems: 'center', gap: '9px', flexShrink: 0 }}>
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} style={{ width: '28px', height: '28px', borderRadius: '50%', border: `1px solid rgba(201,153,58,0.3)`, flexShrink: 0 }} alt="avatar"/>
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(201,153,58,0.1)', border: `1px solid rgba(201,153,58,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, color: gold, flexShrink: 0 }}>
                {user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2) || 'U'}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(201,153,58,0.5)' }}>One Empire</div>
            </div>
            <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: '14px', padding: '2px', flexShrink: 0 }} title="Sign Out">⏻</button>
          </div>
        </aside>

        {/* MAIN */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Topbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: '52px', background: 'rgba(8,20,40,0.95)', borderBottom: `1px solid rgba(201,153,58,0.12)`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '14px', fontWeight: 600, color: '#F0F6FF', letterSpacing: '0.04em' }}>{pageLabels[tab] || tab}</span>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginLeft: '8px' }}>{pageCrumbs[tab] || ''}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(34,201,144,0.07)', border: '1px solid rgba(34,201,144,0.2)', borderRadius: '20px', padding: '3px 10px', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, color: '#4DFFB4' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C990' }}/>
                {activeProjects} Active
              </div>

              {/* Bell icon */}
              <div style={{ position: 'relative' }}>
                <button onClick={e => { e.stopPropagation(); setShowNotifications(v => !v) }} style={{ background: notifCount > 0 ? 'rgba(226,75,74,0.08)' : 'transparent', border: `1px solid ${notifCount > 0 ? 'rgba(226,75,74,0.3)' : 'rgba(201,153,58,0.2)'}`, borderRadius: '3px', padding: '5px 9px', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '14px', color: notifCount > 0 ? '#FF9090' : 'rgba(200,220,255,0.65)' }}>🔔</span>
                  {notifCount > 0 && (
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, color: criticalCount > 0 ? '#FF9090' : '#FFD080', minWidth: '14px' }}>{notifCount}</span>
                  )}
                </button>

                {/* Notification dropdown */}
                {showNotifications && (
                  <div style={{ position: 'absolute', top: '42px', right: 0, width: '360px', background: 'rgba(8,20,44,0.98)', border: `1px solid rgba(201,153,58,0.3)`, borderRadius: '4px', zIndex: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                    <div style={{ padding: '12px 16px', borderBottom: 'rgba(201,153,58,0.15) solid 1px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', color: goldDim }}>NOTIFICATIONS</span>
                      {notifCount > 0 && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(200,220,255,0.55)' }}>{notifCount} alert{notifCount !== 1 ? 's' : ''}</span>}
                    </div>

                    {notifications.length === 0 && (
                      <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', marginBottom: '8px', opacity: 0.3 }}>✓</div>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textMid, marginBottom: '3px' }}>All clear</div>
                        <div style={{ fontSize: '11px', color: textDim }}>No overdue items or upcoming deadlines.</div>
                      </div>
                    )}

                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {notifications.map(n => (
                        <div key={n.id}
                          onClick={() => { setTab(n.tab); setShowNotifications(false) }}
                          style={{ display: 'flex', gap: '12px', padding: '11px 16px', borderBottom: '1px solid rgba(201,153,58,0.08)', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,153,58,0.06)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: n.type === 'critical' ? '#E24B4A' : n.type === 'warning' ? '#FFD080' : '#4DD8F0', flexShrink: 0, marginTop: '4px' }}/>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, color: n.type === 'critical' ? '#FF9090' : n.type === 'warning' ? '#FFD080' : textMid, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                            <div style={{ fontSize: '10px', color: textDim }}>{n.detail}</div>
                          </div>
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(200,220,255,0.55)', flexShrink: 0, marginTop: '3px' }}>→</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button style={{ ...s.btnGhost, fontSize: '10px', padding: '5px 12px' }} onClick={() => setTab('planner')}>✦ AI Planner</button>
              <button style={{ ...s.btnGold, fontSize: '10px', padding: '5px 14px' }} onClick={() => setTab('projects')}>+ New Project</button>
            </div>
          </div>
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* ═══ DASHBOARD ═══ */}
          {tab === 'dashboard' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '22px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: 400, color: '#F0F6FF' }}>
                    Good morning, <em style={{ fontStyle: 'italic', color: gold }}>{firstName}</em> ✦
                  </div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: whiteFaint, marginTop: '5px', letterSpacing: '0.08em' }}>
                    {activeProjects} active projects · {openRisks} open risks · ${unbilledTotal.toLocaleString()} unbilled
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={s.btnGhost} onClick={() => setTab('tasks')}>+ New Task</button>
                  <button style={s.btnGold} onClick={() => setTab('planner')}>✦ AI Planner</button>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
                {[
                  { label: 'Active Projects', val: activeProjects, color: textBright },
                  { label: 'Active Tasks', val: activeTasks, color: '#4DD8F0' },
                  { label: 'Open Risks', val: openRisks, color: '#FF9090' },
                  { label: 'Unbilled', val: `$${unbilledTotal.toLocaleString()}`, color: gold },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(201,153,58,0.05)', border: `1px solid ${borderMd}`, borderRadius: '4px', padding: '14px 16px' }}>
                    <div style={s.label}>{m.label}</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 500, color: m.color, lineHeight: 1 }}>{m.val}</div>
                  </div>
                ))}
              </div>

              {/* AI Insight */}
              <div style={{ background: 'rgba(201,153,58,0.05)', border: `1px solid ${borderMd}`, borderRadius: '4px', padding: '14px 16px', display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(201,153,58,0.1)', border: `1px solid ${borderMd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0, color: gold }}>✦</div>
                <div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: gold, marginBottom: '4px' }}>Empire AI · Daily Insight</div>
                  <div style={{ fontSize: '12px', color: textMid, lineHeight: 1.65 }}>
                    {projects.length === 0 ? 'Welcome to Empire PM! Start by creating your first project.' :
                      `You have ${activeProjects} active project${activeProjects !== 1 ? 's' : ''} and ${openRisks} open risk${openRisks !== 1 ? 's' : ''}. ${unbilledTotal > 0 ? `$${unbilledTotal.toLocaleString()} is ready to invoice.` : ''}`}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Recent Tasks <span style={{ fontSize: '9px', color: gold, cursor: 'pointer', fontWeight: 400 }} onClick={() => setTab('tasks')}>View all →</span></div>
                    {tasks.slice(0, 5).map(t => {
                      const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
                      return (
                      <div key={t.id} style={{ padding: '8px 0', borderBottom: `1px solid rgba(201,153,58,0.1)`, fontSize: '11px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={s.badge(t.status === 'done' ? 'rgba(34,201,144,0.12)' : t.status === 'active' ? 'rgba(26,171,204,0.12)' : t.status === 'blocked' ? 'rgba(226,75,74,0.12)' : 'rgba(240,246,255,0.05)', t.status === 'done' ? '#4DFFB4' : t.status === 'active' ? '#4DD8F0' : t.status === 'blocked' ? '#FF9090' : whiteFaint, t.status === 'done' ? 'rgba(34,201,144,0.28)' : t.status === 'active' ? 'rgba(26,171,204,0.28)' : t.status === 'blocked' ? 'rgba(226,75,74,0.28)' : 'rgba(240,246,255,0.1)')}>{t.status}</span>
                          <span style={{ flex: 1, color: textMid }}>{t.name}</span>
                          {t.owner && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: whiteFaint }}>{t.owner}</span>}
                        </div>
                        {t.due_date && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: isOverdue ? '#FF9090' : textMid, paddingLeft: '2px' }}>{isOverdue ? '⚠ Overdue · ' : 'Due '}{fmtDate(t.due_date)}</div>}
                      </div>
                    )})}
                    {tasks.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px 16px' }}>
                        <div style={{ fontSize: '11px', color: textDim, marginBottom: '10px' }}>No tasks yet. Break your project into actions.</div>
                        <button style={{ ...s.btnGhost, fontSize: '10px', padding: '6px 12px' }} onClick={() => setTab('tasks')}>+ Add First Task</button>
                      </div>
                    )}
                  </div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Project Health</div>
                    {projects.slice(0, 4).map(p => {
                      const isOverdue = p.end_date && new Date(p.end_date) < new Date() && p.status !== 'completed'
                      const daysLeft = p.end_date ? Math.ceil((new Date(p.end_date).getTime() - new Date().getTime()) / (1000*60*60*24)) : null
                      return (
                      <div key={p.id} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '11px' }}>
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, color: textMid }}>{p.name}</span>
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: isOverdue ? '#FF9090' : daysLeft !== null && daysLeft <= 7 ? '#FFD080' : whiteFaint }}>
                            {p.health}% {isOverdue ? '· Overdue' : daysLeft !== null ? `· ${daysLeft > 0 ? daysLeft+'d left' : 'due today'}` : ''}
                          </span>
                        </div>
                        {p.end_date && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: isOverdue ? '#FF9090' : '#C8D8F0', marginBottom: '4px' }}>{`Due ${fmtDate(p.end_date)}`}</div>}
                        <div style={{ height: '3px', background: 'rgba(240,246,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '3px', width: `${p.health}%`, background: isOverdue ? 'linear-gradient(90deg,#E24B4A,#FF9090)' : `linear-gradient(90deg, ${goldDim}, ${gold})`, borderRadius: '2px' }}/>
                        </div>
                      </div>
                    )})}
                    {projects.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px 16px' }}>
                        <div style={{ fontSize: '11px', color: textDim, marginBottom: '10px' }}>No projects yet. Everything starts with a project.</div>
                        <button style={{ ...s.btnGold, fontSize: '10px', padding: '6px 12px' }} onClick={() => setTab('projects')}>+ Create First Project</button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Top Risks <span style={{ fontSize: '9px', color: gold, cursor: 'pointer', fontWeight: 400 }} onClick={() => setTab('risks')}>View all →</span></div>
                    {risks.filter(r => r.status !== 'closed').slice(0, 3).map(r => {
                      const proj = projects.find(p => p.id === r.project_id)
                      return (
                      <div key={r.id} style={{ borderLeft: `3px solid ${r.level === 'critical' || r.level === 'high' ? '#E24B4A' : r.level === 'medium' ? '#F5A623' : '#22C990'}`, padding: '10px 12px', marginBottom: '8px', background: 'rgba(16,36,72,0.5)', borderRadius: '0 3px 3px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textBright }}>{r.title}</div>
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(201,168,80,0.75)' }}>{proj?.name || '—'}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: textDim }}>{r.description}</div>
                      </div>
                    )})}
                    {risks.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '28px 16px' }}>
                        <div style={{ fontSize: '22px', marginBottom: '8px', opacity: 0.3 }}>⚠</div>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textMid, marginBottom: '4px' }}>No risks logged</div>
                        <div style={{ fontSize: '11px', color: textDim, marginBottom: '14px' }}>Every project has risks. Log them early — the AI will help you manage them.</div>
                        <button style={{ ...s.btnGold, fontSize: '10px', padding: '7px 14px' }} onClick={() => {}}>Log First Risk →</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ PROJECTS ═══ */}
          {tab === 'projects' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>Your <em style={{ color: gold, fontStyle: 'italic' }}>Projects</em></div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: whiteFaint, marginTop: '5px' }}>Manage projects and team members</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Create New Project</div>
                    <ProjectForm user={user} onCreated={() => user && loadData(user.id)} supabase={supabase} />
                  </div>
                </div>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Active Projects</div>
                    {projects.map(p => {
                      const isOverdue = p.end_date && new Date(p.end_date) < new Date() && p.status !== 'completed'
                      const daysLeft = p.end_date ? Math.ceil((new Date(p.end_date).getTime() - new Date().getTime()) / (1000*60*60*24)) : null
                      return (
                      <div key={p.id} style={{ padding: '12px 0', borderBottom: `1px solid rgba(201,153,58,0.1)` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, fontSize: '13px', color: textBright }}>{p.name}</span>
                          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            {isOverdue && <span style={s.badge('rgba(226,75,74,0.12)', '#FF9090', 'rgba(226,75,74,0.28)')}>OVERDUE</span>}
                            <span style={s.badge('rgba(201,153,58,0.08)', gold, 'rgba(201,153,58,0.25)')}>{p.status}</span>
                            {editBtn(p.id, { name: p.name, client_name: p.client_name || '', status: p.status, health: p.health, budget: p.budget || '', start_date: p.start_date || '', end_date: p.end_date || '' })}
                            {deleteBtn('projects', p.id)}
                          </div>
                        </div>
                        {editingId === p.id ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px', marginBottom: '8px' }}>
                            <div style={{ gridColumn: '1/-1' }}>{inlineInput('name', 'Project name')}</div>
                            {inlineInput('client_name', 'Client name')}
                            {inlineSelect('status', ['active','on-hold','completed'])}
                            {inlineInput('start_date', '', 'date')}
                            {inlineInput('end_date', '', 'date')}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: goldDim }}>HEALTH %</span>
                              {inlineInput('health', '100', 'number')}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>{saveBtnInline('projects', p.id)}</div>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <div style={{ fontSize: '11px', color: textDim }}>{p.client_name || '—'}</div>
                              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: isOverdue ? '#FF9090' : daysLeft !== null && daysLeft <= 7 ? '#FFD080' : '#C8D8F0' }}>
                                {p.start_date && p.end_date ? `${fmtDate(p.start_date)} → ${fmtDate(p.end_date)}` : p.end_date ? `Due ${fmtDate(p.end_date)}` : 'No dates set'}
                                {daysLeft !== null && !isOverdue && daysLeft <= 14 && <span style={{ marginLeft: '6px', color: '#FFD080' }}>({daysLeft}d left)</span>}
                                {isOverdue && <span style={{ marginLeft: '6px' }}>({Math.abs(daysLeft!)}d ago)</span>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '2px', background: 'rgba(240,246,255,0.07)', borderRadius: '1px', overflow: 'hidden' }}>
                                <div style={{ height: '2px', width: `${p.health}%`, background: `linear-gradient(90deg, ${goldDim}, ${gold})` }}/>
                              </div>
                              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: whiteFaint, flexShrink: 0 }}>{p.health}%</span>
                            </div>
                          </>
                        )}
                      </div>
                    )})}
                    {projects.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '28px 16px' }}>
                        <div style={{ fontSize: '22px', marginBottom: '8px', opacity: 0.3 }}>◻</div>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textMid, marginBottom: '4px' }}>No projects yet</div>
                        <div style={{ fontSize: '11px', color: textDim }}>Create your first project on the left to get started.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Team Members */}
              <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={s.card}>
                  <div style={s.sectionTitle}>Add Team Member</div>
                  <TeamMemberForm user={user} projects={projects} onCreated={() => user && loadData(user.id)} supabase={supabase} />
                </div>
                <div style={s.card}>
                  <div style={s.sectionTitle}>Team Members</div>
                  {teamMembers.map(m => {
                    const proj = projects.find(p => p.id === m.project_id)
                    return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: `1px solid rgba(201,153,58,0.1)` }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(201,153,58,0.12)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700, color: gold, flexShrink: 0 }}>
                        {m.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textMid }}>{m.name}</div>
                        <div style={{ fontSize: '10px', color: textDim }}>{m.email} · {m.role || 'No role'}</div>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(201,168,80,0.75)', marginTop: '1px' }}>{proj?.name || 'No project assigned'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ width: '80px', height: '3px', background: 'rgba(240,246,255,0.07)', borderRadius: '2px', overflow: 'hidden', marginBottom: '3px' }}>
                          <div style={{ height: '3px', width: `${m.capacity}%`, background: m.capacity > 80 ? 'linear-gradient(90deg,#E24B4A,#FF9090)' : `linear-gradient(90deg,#1AABCC,#4DD8F0)` }}/>
                        </div>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: m.capacity > 80 ? '#FF9090' : whiteFaint }}>{m.capacity}%</span>
                      </div>
                    </div>
                  )})}
                  {teamMembers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '28px 16px' }}>
                      <div style={{ fontSize: '22px', marginBottom: '8px', opacity: 0.3 }}>⊞</div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textMid, marginBottom: '4px' }}>No team members yet</div>
                      <div style={{ fontSize: '11px', color: textDim }}>Add your first team member above — they'll appear in workload and task assignment.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ TASKS ═══ */}
          {tab === 'tasks' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF', marginBottom: '22px' }}>
                Task <em style={{ color: gold, fontStyle: 'italic' }}>Manager</em>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={s.card}>
                  <div style={s.sectionTitle}>Add New Task</div>
                  <TaskForm user={user} projects={projects} teamMembers={teamMembers} onCreated={() => user && loadData(user.id)} supabase={supabase} />
                </div>
                <div style={s.card}>
                  <div style={s.sectionTitle}>All Tasks</div>
                  {tasks.map(t => {
                    const proj = projects.find((p: Project) => p.id === t.project_id)
                    const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
                    const daysLeft = t.due_date ? Math.ceil((new Date(t.due_date).getTime() - new Date().getTime()) / (1000*60*60*24)) : null
                    return (
                    <div key={t.id} style={{ padding: '10px 0', borderBottom: `1px solid rgba(201,153,58,0.1)`, fontSize: '11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={s.badge(t.status === 'done' ? 'rgba(34,201,144,0.12)' : t.status === 'active' ? 'rgba(26,171,204,0.12)' : t.status === 'blocked' ? 'rgba(226,75,74,0.12)' : 'rgba(240,246,255,0.05)', t.status === 'done' ? '#4DFFB4' : t.status === 'active' ? '#4DD8F0' : t.status === 'blocked' ? '#FF9090' : whiteFaint, t.status === 'done' ? 'rgba(34,201,144,0.28)' : 'rgba(26,171,204,0.28)')}>{t.status}</span>
                        <span style={s.badge(t.priority === 'high' ? 'rgba(226,75,74,0.08)' : 'rgba(26,171,204,0.08)', t.priority === 'high' ? '#FFAAAA' : '#4DD8F0', 'rgba(26,171,204,0.18)')}>{t.priority}</span>
                        <span style={{ flex: 1, color: textMid, fontWeight: 500 }}>{t.name}</span>
                        {t.owner && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: whiteFaint, flexShrink: 0 }}>{t.owner}</span>}
                        {editBtn(t.id, { name: t.name, status: t.status, priority: t.priority, owner: t.owner || '', due_date: t.due_date || '' })}
                        {deleteBtn('tasks', t.id)}
                      </div>
                      {editingId === t.id ? (
                        <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <div style={{ gridColumn: '1/-1' }}>{inlineInput('name', 'Task name')}</div>
                          {inlineSelect('status', ['todo','active','blocked','done'])}
                          {inlineSelect('priority', ['high','medium','low'])}
                          {inlineInput('owner', 'Owner')}
                          {inlineInput('due_date', '', 'date')}
                          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>{saveBtnInline('tasks', t.id)}</div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px' }}>
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(201,168,80,0.75)' }}>{proj?.name || '—'}</span>
                          {t.due_date && (
                            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: isOverdue ? '#FF9090' : daysLeft !== null && daysLeft <= 3 ? '#FFD080' : textMid }}>
                              {isOverdue ? `Overdue · ${fmtDate(t.due_date)}` : `Due ${fmtDate(t.due_date)}${daysLeft !== null && daysLeft <= 7 ? ` · ${daysLeft}d` : ''}`}
                            </span>
                          )}
                          {!t.due_date && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(200,220,255,0.35)' }}>No due date</span>}
                        </div>
                      )}
                    </div>
                  )})}
                  {tasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '28px 16px' }}>
                      <div style={{ fontSize: '22px', marginBottom: '8px', opacity: 0.3 }}>✓</div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textMid, marginBottom: '4px' }}>No tasks yet</div>
                      <div style={{ fontSize: '11px', color: textDim, marginBottom: '14px' }}>Tasks keep your project moving. Add your first one to the left.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ RISKS ═══ */}
          {tab === 'risks' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>Risk <em style={{ color: gold, fontStyle: 'italic' }}>Radar</em></div>
                <button style={s.btnGold} onClick={() => {
                  const projectContext = projects.map(p => {
                    const projTasks = tasks.filter(t => t.project_id === p.id)
                    const projRisks = risks.filter(r => r.project_id === p.id && r.status !== 'closed')
                    const projTeam = teamMembers.filter(m => m.project_id === p.id)
                    const overdueTasks = projTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done')
                    return `PROJECT: ${p.name} (Client: ${p.client_name || 'Internal'}, Health: ${p.health}%, Status: ${p.status}, Timeline: ${p.start_date || 'TBD'} → ${p.end_date || 'TBD'})
  Tasks: ${projTasks.length} total, ${projTasks.filter(t => t.status === 'active').length} active, ${projTasks.filter(t => t.status === 'blocked').length} blocked, ${overdueTasks.length} overdue
  Open Risks: ${projRisks.map(r => `${r.title} [${r.level}]`).join(', ') || 'None logged'}
  Team: ${projTeam.map(m => `${m.name} (${m.role}, ${m.capacity}% capacity)`).join(', ') || 'No team assigned'}`
                  }).join('\n\n')
                  ai('risks',
                    'You are an expert risk manager with 20 years experience. Analyse the project data provided and: 1. Identify hidden or emerging risks not yet logged, 2. Flag any existing risks that need escalation, 3. Highlight capacity or deadline conflicts, 4. Provide specific mitigation actions. Use bullet points only — no markdown tables. Be direct and specific to the actual data, not generic advice.',
                    `Analyse these projects for risks:\n\n${projectContext}\n\nTotal team members: ${teamMembers.length}. Provide a prioritised risk assessment.`
                  )
                }}>✦ AI Risk Scan</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Log New Risk</div>
                    <RiskForm user={user} projects={projects} onCreated={() => user && loadData(user.id)} supabase={supabase} />
                  </div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Active Risks</div>
                    {risks.filter(r => r.status !== 'closed').map(r => {
                      const proj = projects.find(p => p.id === r.project_id)
                      const isOverdue = r.due_date && new Date(r.due_date) < new Date()
                      const levelColor = r.level === 'critical' ? '#E24B4A' : r.level === 'high' ? '#FF7043' : r.level === 'medium' ? '#F5A623' : '#22C990'
                      const levelBg = r.level === 'critical' ? 'rgba(226,75,74,0.15)' : r.level === 'high' ? 'rgba(255,112,67,0.12)' : 'rgba(245,166,35,0.12)'
                      const levelBdr = r.level === 'critical' ? 'rgba(226,75,74,0.3)' : r.level === 'high' ? 'rgba(255,112,67,0.28)' : 'rgba(245,166,35,0.28)'
                      const levelText = r.level === 'critical' ? '#FF9090' : r.level === 'high' ? '#FFAA88' : '#FFD080'
                      return (
                      <div key={r.id} style={{ borderLeft: `3px solid ${levelColor}`, padding: '10px 12px', marginBottom: '10px', background: 'rgba(16,36,72,0.5)', borderRadius: '0 3px 3px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textBright }}>{r.title}</div>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span style={s.badge(levelBg, levelText, levelBdr)}>{r.level}</span>
                            {editBtn(r.id, { title: r.title, description: r.description || '', level: r.level, status: r.status, due_date: r.due_date || '' })}
                            {deleteBtn('risks', r.id)}
                          </div>
                        </div>
                        {editingId === r.id ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
                            <div style={{ gridColumn: '1/-1' }}>{inlineInput('title', 'Risk title')}</div>
                            <div style={{ gridColumn: '1/-1' }}>{inlineInput('description', 'Description')}</div>
                            {inlineSelect('level', ['low','medium','high','critical'])}
                            {inlineSelect('status', ['open','mitigated','closed'])}
                            {inlineInput('due_date', '', 'date')}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>{saveBtnInline('risks', r.id)}</div>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: '11px', color: textDim, marginBottom: '5px' }}>{r.description}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(201,168,80,0.75)' }}>{proj?.name || '—'}</span>
                              {r.due_date && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: isOverdue ? '#FF9090' : textMid }}>{isOverdue ? '⚠ Overdue · ' : 'Resolve by '}{fmtDate(r.due_date)}</span>}
                            </div>
                          </>
                        )}
                      </div>
                    )})}
                    {risks.length === 0 && <div style={{ color: textDim, fontSize: '12px' }}>No risks logged yet</div>}
                  </div>
                </div>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>✦ AI Risk Analysis</div>
                    {aiLoading['risks'] && <div style={{ color: textDim, fontSize: '12px' }}>Scanning for hidden risks...</div>}
                    {aiText['risks'] && <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(aiText['risks']) }}/>}
                    {!aiLoading['risks'] && !aiText['risks'] && (
                      <div style={{ fontSize: '11px', color: textDim, lineHeight: 1.7 }}>
                        Click <strong style={{ color: gold }}>AI Risk Scan</strong> to identify hidden risks across your projects.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ MEETINGS ═══ */}
          {tab === 'meetings' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF', marginBottom: '22px' }}>
                Meeting <em style={{ color: gold, fontStyle: 'italic' }}>Processor</em>
              </div>
              <MeetingProcessor user={user} projects={projects} tasks={tasks} risks={risks} supabase={supabase} onSaved={() => user && loadData(user.id)} />
            </div>
          )}

          {/* ═══ CLIENTS ═══ */}
          {tab === 'clients' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>Client <em style={{ color: gold, fontStyle: 'italic' }}>Portal</em></div>
    ai('client', 'You are a professional PM writing client updates. Write clear professional updates that build confidence. Never reveal internal issues unless explicitly included. Use bullet points only — no markdown tables.', `Generate a professional client status update covering all active projects.\n\nActive projects:\n${projects.filter((p: Project) => p.status === 'active').map((p: Project) => `- ${p.name} (Client: ${p.client_name || 'Internal'}, Health: ${p.health}%, Due: ${p.end_date || 'TBD'})`).join('\n') || 'No active projects'}`)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>
                <div style={s.card}>
                  <div style={s.sectionTitle}>Generate Client Update</div>
                  <ClientUpdateForm ai={ai} aiLoading={aiLoading} aiText={aiText} projects={projects} />
                </div>
                <div>
                  {projects.map(p => {
                    const projTasks = tasks.filter(t => t.project_id === p.id)
                    const doneTasks = projTasks.filter(t => t.status === 'done').length
                    const isOverdue = p.end_date && new Date(p.end_date) < new Date() && p.status !== 'completed'
                    return (
                    <div key={p.id} style={{ ...s.card, marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: textBright }}>{p.client_name || p.name}</div>
                        <span style={s.badge(isOverdue ? 'rgba(226,75,74,0.12)' : 'rgba(201,153,58,0.08)', isOverdue ? '#FF9090' : gold, isOverdue ? 'rgba(226,75,74,0.28)' : border)}>{isOverdue ? 'OVERDUE' : p.status}</span>
                      </div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: whiteFaint, marginBottom: '6px' }}>{p.name} · {p.health}% complete · {doneTasks}/{projTasks.length} tasks done</div>
                      {p.end_date && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: isOverdue ? '#FF9090' : textMid }}>{`Due ${fmtDate(p.end_date)}`}</div>}
                    </div>
                  )})}
                </div>
              </div>
            </div>
          )}

          {/* ═══ WORKLOAD ═══ */}
          {tab === 'workload' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>Team <em style={{ color: gold, fontStyle: 'italic' }}>Workload</em></div>
                <button style={s.btnGold} onClick={() => ai('workload', 'You are an expert resource manager. Analyse team workload and provide specific rebalancing recommendations.', `Team: ${teamMembers.map(m => `${m.name} (${m.capacity}% capacity)`).join(', ')}. Tasks: ${tasks.filter(t => t.status === 'active').length} active.`)}>✦ AI Rebalance</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={s.card}>
                  <div style={s.sectionTitle}>Team Capacity</div>
                  {teamMembers.map(m => {
                    const memberTasks = tasks.filter(t => t.owner === m.name && t.status !== 'done')
                    const proj = projects.find(p => p.id === m.project_id)
                    return (
                    <div key={m.id} style={{ padding: '10px 0', borderBottom: `1px solid rgba(201,153,58,0.1)` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '5px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(201,153,58,0.12)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700, color: gold, flexShrink: 0 }}>
                          {m.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textMid }}>{m.name}</div>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(201,168,80,0.75)' }}>{m.role || 'No role'} · {proj?.name || 'No project'} · {memberTasks.length} active task{memberTasks.length !== 1 ? 's' : ''}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ width: '100px', height: '4px', background: 'rgba(240,246,255,0.07)', borderRadius: '2px', overflow: 'hidden', marginBottom: '3px' }}>
                            <div style={{ height: '4px', width: `${m.capacity}%`, background: m.capacity > 80 ? 'linear-gradient(90deg,#E24B4A,#FF9090)' : 'linear-gradient(90deg,#1AABCC,#4DD8F0)', borderRadius: '2px' }}/>
                          </div>
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: m.capacity > 80 ? '#FF9090' : whiteFaint }}>{m.capacity}% · {m.capacity > 80 ? 'Busy' : 'Available'}</span>
                        </div>
                      </div>
                    </div>
                  )})}
                  {teamMembers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '28px 16px' }}>
                      <div style={{ fontSize: '22px', marginBottom: '8px', opacity: 0.3 }}>⊞</div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textMid, marginBottom: '6px' }}>No team members yet</div>
                      <div style={{ fontSize: '11px', color: textDim, marginBottom: '14px' }}>Add people in the Projects tab to start tracking workload and capacity.</div>
                      <button style={{ ...s.btnGhost, fontSize: '10px', padding: '7px 14px' }} onClick={() => setTab('projects')}>Go to Projects →</button>
                    </div>
                  )}
                </div>
                <div style={s.card}>
                  <div style={s.sectionTitle}>✦ AI Rebalancing</div>
                  {aiLoading['workload'] && <div style={{ color: textDim, fontSize: '12px' }}>Analysing workload...</div>}
                  {aiText['workload'] && <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(aiText['workload']) }}/>}
                  {!aiLoading['workload'] && !aiText['workload'] && (
                    <div style={{ fontSize: '11px', color: textDim, lineHeight: 1.7 }}>Click <strong style={{ color: gold }}>AI Rebalance</strong> for recommendations based on your team capacity.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ BILLING ═══ */}
          {tab === 'billing' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>Time &amp; <em style={{ color: gold, fontStyle: 'italic' }}>Billing</em></div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: whiteFaint, marginTop: '5px' }}>${unbilledTotal.toLocaleString()} unbilled · ready to invoice</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    id="invoice-client-email"
                    style={{ ...s.input, width: '220px', fontSize: '11px', padding: '7px 10px' }}
                    placeholder="Client email to send invoice..."
                    type="email"
                  />
                  <button style={s.btnGold} onClick={async () => {
                    const clientEmail = (document.getElementById('invoice-client-email') as HTMLInputElement)?.value
                    const items = timeLogs.map(l => `${l.description} (${l.hours}h @ $${l.rate}/hr)`).join(', ')
                    await ai('invoice', 'You are a professional billing assistant. Generate a professional invoice covering email with itemised billing and payment instructions.', `Unbilled items: ${items}. Total: $${unbilledTotal.toLocaleString()}. Client email: ${clientEmail || 'Not provided'}`)
                    if (clientEmail) {
                      const project = projects[0]
                      await fetch('https://n8n.one-empire.com/webhook/empire-pm-invoice', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          client: project?.client_name || 'Client',
                          project: project?.name || 'Project',
                          clientEmail,
                          items,
                          total: `$${unbilledTotal.toLocaleString()}`,
                          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                          senderName: user?.user_metadata?.full_name,
                          senderEmail: user?.email
                        })
                      }).catch(() => {})
                    }
                  }}>✦ Generate Invoice</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Live Timer</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '48px', fontWeight: 400, color: gold, textAlign: 'center', padding: '20px 0' }}>{formatTime(timerSeconds)}</div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '16px' }}>
                      <button style={s.btnGold} onClick={toggleTimer}>{timerRunning ? '⏸ Pause' : '▶ Start'}</button>
                      <button style={s.btnGhost} onClick={resetTimer}>↺ Reset</button>
                    </div>
                  </div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Log Time</div>
                    <TimeLogForm user={user} projects={projects} onCreated={() => user && loadData(user.id)} supabase={supabase} />
                  </div>
                </div>
                <div style={s.card}>
                  <div style={s.sectionTitle}>Unbilled Hours</div>
                  {timeLogs.map(l => {
                    const proj = projects.find(p => p.id === l.project_id)
                    return (
                    <div key={l.id} style={{ padding: '9px 0', borderBottom: `1px solid rgba(201,153,58,0.1)` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', fontSize: '11px' }}>
                        <span style={{ flex: 1, color: textMid }}>{l.description}</span>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', color: whiteFaint, width: '35px', textAlign: 'right' }}>{l.hours}h</span>
                        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '14px', color: gold, width: '70px', textAlign: 'right' }}>${(l.hours * l.rate).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(201,168,80,0.75)' }}>{proj?.name || '—'}</span>
                        {l.log_date && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(200,220,255,0.55)' }}>{fmtDate(l.log_date)}</span>}
                      </div>
                    </div>
                  )})}
                  <div style={{ borderTop: `1px solid ${borderMd}`, marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 600, color: goldDim }}>TOTAL UNBILLED</span>
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: gold }}>${unbilledTotal.toLocaleString()}</span>
                  </div>
                  {aiText['invoice'] && <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(aiText['invoice']) }}/>}
                </div>
              </div>
            </div>
          )}

          {/* ═══ TIMELINE ═══ */}
          {tab === 'timeline' && (
            <TimelineView
              projects={projects}
              tasks={tasks}
              milestones={milestones}
              user={user}
              supabase={supabase}
              onSaved={() => user && loadData(user.id)}
              editingId={editingId}
              editFields={editFields}
              startEdit={startEdit}
              cancelEdit={cancelEdit}
              saveEdit={saveEdit}
              deleteRow={deleteRow}
              editBtn={editBtn}
              deleteBtn={deleteBtn}
              inlineInput={inlineInput}
              inlineSelect={inlineSelect}
              saveBtnInline={saveBtnInline}
            />
          )}

          {/* ═══ AI PLANNER ═══ */}
          {tab === 'planner' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF', marginBottom: '22px' }}>
                ✦ AI <em style={{ color: gold, fontStyle: 'italic' }}>Planner</em>
              </div>
              <AIPlannerForm ai={ai} aiLoading={aiLoading} aiText={aiText} projects={projects} tasks={tasks} risks={risks} teamMembers={teamMembers} />
            </div>
          )}

          {/* ═══ SCOPE ═══ */}
          {tab === 'scope' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF', marginBottom: '22px' }}>
                Scope <em style={{ color: gold, fontStyle: 'italic' }}>Control</em>
              </div>
              <ScopeForm ai={ai} aiLoading={aiLoading} aiText={aiText} projects={projects} tasks={tasks} />
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {tab === 'settings' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF', marginBottom: '22px' }}>
                Account <em style={{ color: gold, fontStyle: 'italic' }}>Settings</em>
              </div>
              <SettingsForm user={user} supabase={supabase} />
            </div>
          )}

        </main>
          {/* STATUS BAR */}
          <div style={{ height: '28px', background: 'rgba(5,13,26,0.97)', borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: '20px', flexShrink: 0 }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em', color: whiteFaint, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C990' }}/>All systems live
            </div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: whiteFaint }}>pm.one-empire.com</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: whiteFaint }}>Empire PM v2.0</div>
            <div style={{ marginLeft: 'auto', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: whiteFaint }}>One Empire © 2025</div>
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}} @keyframes wizardIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}`}</style>

      {/* ═══ ONBOARDING WIZARD ═══ */}
      {showWizard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'rgba(10,24,52,0.98)', border: `1px solid ${borderMd}`, borderRadius: '8px', width: '100%', maxWidth: '560px', padding: '36px 40px', animation: 'wizardIn 0.25s ease', position: 'relative' }}>

            {/* Skip */}
            <button onClick={completeOnboarding} style={{ position: 'absolute', top: '16px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>SKIP SETUP</button>

            {/* Step dots */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width: i === wizardStep ? '20px' : '6px', height: '6px', borderRadius: '3px', background: i === wizardStep ? gold : i < wizardStep ? goldDim : 'rgba(255,255,255,0.12)', transition: 'all 0.3s' }}/>
              ))}
            </div>

            {/* Step 0 — Welcome */}
            {wizardStep === 0 && (
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: textBright, marginBottom: '8px' }}>Welcome to <em style={{ color: gold }}>Empire PM</em></div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textDim, letterSpacing: '0.08em', marginBottom: '24px' }}>Your AI-powered command centre. Let's set it up in 3 quick steps.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                  {[
                    { icon: '◻', title: 'Create your first project', desc: 'Set up a client project with timeline and budget' },
                    { icon: '⊞', title: 'Add a team member', desc: 'Bring in your first collaborator or client contact' },
                    { icon: '✓', title: 'Add a task', desc: 'Break your project into actionable tasks with owners' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '12px 14px', background: 'rgba(201,153,58,0.04)', border: `1px solid ${border}`, borderRadius: '4px' }}>
                      <span style={{ fontSize: '16px', color: gold, flexShrink: 0, marginTop: '1px' }}>{item.icon}</span>
                      <div>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textBright, marginBottom: '2px' }}>{item.title}</div>
                        <div style={{ fontSize: '11px', color: textDim }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <button style={{ ...s.btnGold, width: '100%', padding: '11px' }} onClick={() => setWizardStep(1)}>Let's Begin →</button>
              </div>
            )}

            {/* Step 1 — Create Project */}
            {wizardStep === 1 && (
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: textBright, marginBottom: '4px' }}>Create your <em style={{ color: gold }}>first project</em></div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: textDim, letterSpacing: '0.1em', marginBottom: '20px' }}>STEP 1 OF 3 — Everything in Empire PM lives inside a project</div>
                <ProjectForm user={user} onCreated={() => { if (user) loadData(user.id); setWizardStep(2) }} supabase={supabase} />
                <button style={{ ...s.btnGhost, width: '100%', marginTop: '10px', padding: '9px' }} onClick={() => setWizardStep(2)}>Skip this step →</button>
              </div>
            )}

            {/* Step 2 — Add Team Member */}
            {wizardStep === 2 && (
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: textBright, marginBottom: '4px' }}>Add a <em style={{ color: gold }}>team member</em></div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: textDim, letterSpacing: '0.1em', marginBottom: '20px' }}>STEP 2 OF 3 — Add people first so you can assign tasks to them</div>
                {projects.length === 0 ? (
                  <div style={{ fontSize: '12px', color: textDim, padding: '16px', textAlign: 'center' }}>Create a project first to assign team members to it.</div>
                ) : (
                  <TeamMemberForm user={user} projects={projects} onCreated={() => { if (user) loadData(user.id); setWizardStep(3) }} supabase={supabase} />
                )}
                <button style={{ ...s.btnGhost, width: '100%', marginTop: '10px', padding: '9px' }} onClick={() => setWizardStep(3)}>Skip this step →</button>
              </div>
            )}

            {/* Step 3 — Add Task */}
            {wizardStep === 3 && (
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: textBright, marginBottom: '4px' }}>Add your <em style={{ color: gold }}>first task</em></div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: textDim, letterSpacing: '0.1em', marginBottom: '20px' }}>STEP 3 OF 3 — Tasks keep your project moving forward</div>
                {projects.length === 0 ? (
                  <div style={{ fontSize: '12px', color: textDim, padding: '16px', textAlign: 'center' }}>No project created yet — go back and create one first, or skip.</div>
                ) : (
                  <TaskForm user={user} projects={projects} teamMembers={teamMembers} onCreated={() => { if (user) loadData(user.id) }} supabase={supabase} />
                )}
                <button style={{ ...s.btnGold, width: '100%', marginTop: '14px', padding: '11px' }} onClick={completeOnboarding}>Enter Empire PM →</button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

// ─── SUB-COMPONENTS ───

function ProjectForm({ user, onCreated, supabase }: any) {
  const [name, setName] = useState(''); const [client, setClient] = useState(''); const [budget, setBudget] = useState(''); const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState('')
  const submit = async () => {
    if (!name || !user) return
    await supabase.from('projects').insert({ user_id: user.id, name, client_name: client, budget: budget ? parseFloat(budget) : null, start_date: startDate || null, end_date: endDate || null })
    setName(''); setClient(''); setBudget(''); setStartDate(''); setEndDate(''); onCreated()
  }
  return (
    <div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Project Name</div><input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Enterprise CRM"/></div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Client Name</div><input style={s.input} value={client} onChange={e => setClient(e.target.value)} placeholder="e.g. Acme Corp"/></div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Budget ($)</div><input style={s.input} value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. 50000" type="number"/></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div><div style={s.label}>Start Date</div><input style={s.input} value={startDate} onChange={e => setStartDate(e.target.value)} type="date"/></div>
        <div><div style={s.label}>End Date</div><input style={s.input} value={endDate} onChange={e => setEndDate(e.target.value)} type="date"/></div>
      </div>
      <button style={{ ...s.btnGold, width: '100%' }} onClick={submit}>Create Project →</button>
    </div>
  )
}

function TeamMemberForm({ user, projects, onCreated, supabase }: any) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [role, setRole] = useState(''); const [projectId, setProjectId] = useState(''); const [capacity, setCapacity] = useState('100')
  const submit = async () => {
    if (!name || !email || !projectId || !user) return
    await supabase.from('team_members').insert({ user_id: user.id, project_id: projectId, name, email, role, capacity: parseInt(capacity) })
    setName(''); setEmail(''); setRole(''); onCreated()
  }
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div><div style={s.label}>Name</div><input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Full name"/></div>
        <div><div style={s.label}>Email</div><input style={s.input} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@company.com" type="email"/></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
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
      <button style={{ ...s.btnGold, width: '100%' }} onClick={submit}>Add Team Member →</button>
    </div>
  )
}

function TaskForm({ user, projects, teamMembers, onCreated, supabase }: any) {
  const [name, setName] = useState(''); const [status, setStatus] = useState('todo'); const [priority, setPriority] = useState('medium'); const [owner, setOwner] = useState(''); const [projectId, setProjectId] = useState(''); const [dueDate, setDueDate] = useState('')
  const submit = async () => {
    if (!name || !projectId || !user) return
    await supabase.from('tasks').insert({ user_id: user.id, project_id: projectId, name, status, priority, owner, due_date: dueDate || null })
    setName(''); setOwner(''); setDueDate(''); onCreated()
  }
  return (
    <div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Task Name</div><input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="What needs to be done?"/></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div><div style={s.label}>Project</div>
          <select style={s.input} value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">Select...</option>
            {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div><div style={s.label}>Priority</div>
          <select style={s.input} value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div><div style={s.label}>Owner <span style={{ color: textDim, fontWeight: 400 }}>(optional)</span></div>
          {teamMembers.length > 0 ? (
            <select style={s.input} value={owner} onChange={e => setOwner(e.target.value)}>
              <option value="">Select...</option>
              {teamMembers.map((m: TeamMember) => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          ) : (
            <input style={s.input} value={owner} onChange={e => setOwner(e.target.value)} placeholder="e.g. your name or leave blank"/>
          )}
        </div>
        <div><div style={s.label}>Due Date</div><input style={s.input} value={dueDate} onChange={e => setDueDate(e.target.value)} type="date"/></div>
      </div>
      <button style={{ ...s.btnGold, width: '100%' }} onClick={submit}>Add Task →</button>
    </div>
  )
}

function RiskForm({ user, projects, onCreated, supabase }: any) {
  const [title, setTitle] = useState(''); const [desc, setDesc] = useState(''); const [level, setLevel] = useState('medium'); const [projectId, setProjectId] = useState(''); const [notifyEmail, setNotifyEmail] = useState(''); const [dueDate, setDueDate] = useState('')
  const submit = async () => {
    if (!title || !projectId || !user) return
    await supabase.from('risks').insert({ user_id: user.id, project_id: projectId, title, description: desc, level, due_date: dueDate || null })
    const project = projects.find((p: Project) => p.id === projectId)
    if (notifyEmail) {
      await fetch('https://n8n.one-empire.com/webhook/empire-pm-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: notifyEmail, title, description: desc, level,
          project: project?.name || 'Unknown',
          senderName: user?.user_metadata?.full_name || 'PM',
          senderEmail: user?.email
        })
      }).catch(() => {})
    }
    setTitle(''); setDesc(''); setNotifyEmail(''); onCreated()
  }
  return (
    <div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Risk Title</div><input style={s.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Security audit delay"/></div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Description</div><textarea style={{ ...s.input, minHeight: '70px', resize: 'vertical' as const }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the risk and potential impact..."/></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div><div style={s.label}>Project</div>
          <select style={s.input} value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">Select...</option>
            {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div><div style={s.label}>Level</div>
          <select style={s.input} value={level} onChange={e => setLevel(e.target.value)}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div><div style={s.label}>Resolve By</div><input style={s.input} value={dueDate} onChange={e => setDueDate(e.target.value)} type="date"/></div>
        <div><div style={s.label}>Notify (Email) — Optional</div><input style={s.input} value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} placeholder="team@company.com" type="email"/></div>
      </div>
      <button style={{ ...s.btnGold, width: '100%' }} onClick={submit}>Log Risk →</button>
    </div>
  )
}

function TimeLogForm({ user, projects, onCreated, supabase }: any) {
  const [desc, setDesc] = useState(''); const [hours, setHours] = useState(''); const [rate, setRate] = useState('250'); const [projectId, setProjectId] = useState(''); const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])
  const submit = async () => {
    if (!desc || !hours || !projectId || !user) return
    await supabase.from('time_logs').insert({ user_id: user.id, project_id: projectId, description: desc, hours: parseFloat(hours), rate: parseFloat(rate), log_date: logDate || null })
    setDesc(''); setHours(''); onCreated()
  }
  return (
    <div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Description</div><input style={s.input} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Task description"/></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div><div style={s.label}>Project</div>
          <select style={s.input} value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">Select...</option>
            {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div><div style={s.label}>Date</div><input style={s.input} value={logDate} onChange={e => setLogDate(e.target.value)} type="date"/></div>
        <div><div style={s.label}>Hours</div><input style={s.input} value={hours} onChange={e => setHours(e.target.value)} type="number" step="0.5" placeholder="e.g. 2.5"/></div>
        <div><div style={s.label}>Rate ($/hr)</div><input style={s.input} value={rate} onChange={e => setRate(e.target.value)} type="number" placeholder="250"/></div>
      </div>
      <button style={{ ...s.btnGold, width: '100%' }} onClick={submit}>Log Time →</button>
    </div>
  )
}

function MeetingProcessor({ user, projects, tasks, risks, supabase, onSaved }: any) {
  const [title, setTitle] = useState(''); const [notes, setNotes] = useState(''); const [email, setEmail] = useState(''); const [projectId, setProjectId] = useState(''); const [result, setResult] = useState(''); const [loading, setLoading] = useState(false); const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0])
  const process = async () => {
    if (!notes) return
    setLoading(true); setResult('')
    const project = projects.find((p: Project) => p.id === projectId)
    const projContext = project ? (() => {
      const pTasks = (tasks || []).filter((t: Task) => t.project_id === projectId)
      const pRisks = (risks || []).filter((r: Risk) => r.project_id === projectId && r.status !== 'closed')
      return `\n\nPROJECT CONTEXT for "${project.name}" (Client: ${project.client_name || 'Internal'}, Health: ${project.health}%):
Active tasks: ${pTasks.filter((t: Task) => t.status === 'active').map((t: Task) => `${t.name} [owner: ${t.owner || 'unassigned'}, due: ${t.due_date || 'no date'}]`).join('; ') || 'None'}
Blocked tasks: ${pTasks.filter((t: Task) => t.status === 'blocked').map((t: Task) => t.name).join(', ') || 'None'}
Open risks: ${pRisks.map((r: Risk) => `${r.title} [${r.level}]`).join(', ') || 'None logged'}
Use this context to cross-reference action items with existing tasks and flag any conflicts or overlaps with open risks.`
    })() : ''
    const text = await callAI(
      'You are an expert meeting facilitator and project manager. Extract and structure the following from the meeting notes. Use bullet points only — no markdown tables. Sections: 1. Summary (2-3 sentences), 2. Key Decisions, 3. Action Items (with owner and deadline if mentioned), 4. Risks or Issues Raised, 5. Follow-up Questions. If project context is provided, cross-reference action items against existing tasks and flag overlaps with open risks.',
      `Meeting: ${title}\n\nNotes:\n${notes}${projContext}`
    )
    setResult(text)
    if (user && projectId) {
      await supabase.from('meetings').insert({ user_id: user.id, project_id: projectId, title, notes, summary: text, meeting_date: meetingDate || null })
      onSaved()
    }
    if (email) {
      await fetch('https://n8n.one-empire.com/webhook/empire-pm-meeting', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, notes, email, senderName: user?.user_metadata?.full_name, senderEmail: user?.email })
      }).catch(() => {})
    }
    setLoading(false)
    setTimeout(() => { setTitle(''); setNotes(''); setEmail(''); setResult('') }, 5000)
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
      <div style={s.card}>
        <div style={s.sectionTitle}>Process Meeting Notes</div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Meeting Title</div><input style={s.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Alpha Sprint Review"/></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div><div style={s.label}>Project</div>
            <select style={s.input} value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">Select...</option>
              {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><div style={s.label}>Meeting Date</div><input style={s.input} value={meetingDate} onChange={e => setMeetingDate(e.target.value)} type="date"/></div>
        <div><div style={s.label}>Send Summary To</div><input style={s.input} value={email} onChange={e => setEmail(e.target.value)} placeholder="team@client.com" type="email"/></div>
        </div>
        <div style={{ marginBottom: '12px' }}><div style={s.label}>Notes / Transcript</div><textarea style={{ ...s.input, minHeight: '160px', resize: 'vertical' as const }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Paste raw meeting notes here..."/></div>
        <button style={{ ...s.btnGold, width: '100%' }} onClick={process} disabled={loading}>{loading ? 'Processing...' : '✦ Process with AI →'}</button>
        {result && <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(result) }}/>}
      </div>
      <div style={s.card}>
        <div style={s.sectionTitle}>How It Works</div>
        <div style={{ fontSize: '12px', color: textDim, lineHeight: 1.8 }}>
          Paste your meeting notes and Empire AI will extract:<br/><br/>
          <span style={{ color: gold }}>▸</span> <strong style={{ color: textMid }}>Summary</strong> — concise overview<br/>
          <span style={{ color: gold }}>▸</span> <strong style={{ color: textMid }}>Key Decisions</strong> — what was agreed<br/>
          <span style={{ color: gold }}>▸</span> <strong style={{ color: textMid }}>Action Items</strong> — who does what by when<br/>
          <span style={{ color: gold }}>▸</span> <strong style={{ color: textMid }}>Follow-up Questions</strong><br/><br/>
          Add an email address to automatically send the summary to your team via n8n.
        </div>
      </div>
    </div>
  )
}

function ClientUpdateForm({ ai, aiLoading, aiText, projects }: any) {
  const [projectId, setProjectId] = useState(''); const [tone, setTone] = useState('Professional'); const [notes, setNotes] = useState('')
  const generate = () => {
    const project = projects.find((p: Project) => p.id === projectId)
    ai('client',
      'You are a professional PM writing client updates. Write clear professional updates that build confidence. Never reveal internal issues unless explicitly included in the notes. Use bullet points only — no markdown tables. Write in email format with a subject line.',
      `Project: ${project?.name || 'General update'}
Client: ${project?.client_name || 'Client'}
Project health: ${project?.health || 'N/A'}%
Timeline: ${project?.start_date || 'TBD'} → ${project?.end_date || 'TBD'}
Tone: ${tone}
Key points from PM: ${notes || 'General progress update — project on track'}

Write a professional client status update email.`
    )
  }
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div><div style={s.label}>Project</div>
          <select style={s.input} value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">Select...</option>
            {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div><div style={s.label}>Tone</div>
          <select style={s.input} value={tone} onChange={e => setTone(e.target.value)}>
            <option>Professional</option><option>Concise</option><option>Detailed</option><option>Reassuring</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: '12px' }}><div style={s.label}>Key Points</div><textarea style={{ ...s.input, minHeight: '80px', resize: 'vertical' as const }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. milestone reached, delay in audit, next steps..."/></div>
      <button style={{ ...s.btnGold, width: '100%' }} onClick={generate}>{aiLoading['client'] ? 'Generating...' : '✦ Generate Update →'}</button>
      {aiText['client'] && <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(aiText['client']) }}/>}
    </div>
  )
}

function AIPlannerForm({ ai, aiLoading, aiText, projects, tasks, risks, teamMembers }: any) {
  const [name, setName] = useState(''); const [brief, setBrief] = useState(''); const [timeline, setTimeline] = useState('8 weeks'); const [team, setTeam] = useState('2–3 people')
  const generate = () => {
    if (!brief) return
    const existingContext = projects.length > 0 ? `\n\nEXISTING PORTFOLIO CONTEXT (avoid duplicating effort):
Active projects: ${projects.filter((p: Project) => p.status === 'active').map((p: Project) => `${p.name} (${p.health}% health, ends ${p.end_date || 'TBD'})`).join(', ') || 'None'}
Available team members: ${teamMembers.length > 0 ? teamMembers.map((m: TeamMember) => `${m.name} — ${m.role} (${m.capacity}% capacity)`).join(', ') : 'Not specified — use team size below'}
Current open risks across portfolio: ${risks.filter((r: Risk) => r.status !== 'closed').length} open risks — consider these when identifying risks for the new project
Total active tasks in flight: ${tasks.filter((t: Task) => t.status === 'active').length} — factor team availability accordingly` : ''
    ai('planner',
      'You are an expert PM with 20 years experience. Generate a comprehensive, actionable project plan. Use bullet points only — no markdown tables. Structure: 1. Phase Breakdown (with milestone dates relative to start), 2. Key Tasks (owner, priority, estimated duration), 3. Risk Register (likelihood, impact, mitigation), 4. KPIs and success criteria, 5. Budget considerations, 6. Team allocation recommendations. Be specific — avoid generic advice. If existing team members are listed, assign tasks to them by name.',
      `New Project: ${name || 'New Project'}\nTimeline: ${timeline}\nTeam Size: ${team}\n\nBrief:\n${brief}${existingContext}`
    )
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
      <div style={s.card}>
        <div style={s.sectionTitle}>Project Brief</div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Project Name</div><input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Customer Portal v2"/></div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Brief Description</div><textarea style={{ ...s.input, minHeight: '120px', resize: 'vertical' as const }} value={brief} onChange={e => setBrief(e.target.value)} placeholder="Describe your project, goals, constraints..."/></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          <div><div style={s.label}>Timeline</div>
            <select style={s.input} value={timeline} onChange={e => setTimeline(e.target.value)}>
              <option>4 weeks</option><option>6 weeks</option><option>8 weeks</option><option>12 weeks</option><option>6 months</option>
            </select>
          </div>
          <div><div style={s.label}>Team Size</div>
            <select style={s.input} value={team} onChange={e => setTeam(e.target.value)}>
              <option>Solo</option><option>2–3 people</option><option>4–6 people</option><option>7+ people</option>
            </select>
          </div>
        </div>
        <button style={{ ...s.btnGold, width: '100%' }} onClick={generate}>{aiLoading['planner'] ? 'Generating...' : '✦ Generate Full Project Plan →'}</button>
      </div>
      <div style={s.card}>
        {aiLoading['planner'] && <div style={{ color: textDim, fontSize: '12px' }}>Generating your project plan...</div>}
        {aiText['planner'] && <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(aiText['planner']) }}/>}
        {!aiLoading['planner'] && !aiText['planner'] && (
          <div>
            <div style={s.sectionTitle}>How It Works</div>
            <div style={{ fontSize: '12px', color: textDim, lineHeight: 1.8 }}>
              Fill in your brief and Empire AI generates:<br/><br/>
              <span style={{ color: gold }}>▸</span> Phase breakdown with milestones<br/>
              <span style={{ color: gold }}>▸</span> Task list with owners and priorities<br/>
              <span style={{ color: gold }}>▸</span> Risk register with mitigation<br/>
              <span style={{ color: gold }}>▸</span> KPIs to measure success<br/>
              <span style={{ color: gold }}>▸</span> Budget considerations
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ScopeForm({ ai, aiLoading, aiText, projects, tasks }: any) {
  const [desc, setDesc] = useState(''); const [projectId, setProjectId] = useState(''); const [by, setBy] = useState('')
  const analyse = () => {
    if (!desc) return
    const project = projects.find((p: Project) => p.id === projectId)
    const projTasks = (tasks || []).filter((t: Task) => t.project_id === projectId)
    const scopeContext = project ? `
Project health: ${project.health}%
Budget: ${project.budget ? `$${Number(project.budget).toLocaleString()}` : 'Not set'}
Timeline: ${project.start_date || 'TBD'} → ${project.end_date || 'TBD'}
Active tasks: ${projTasks.filter((t: Task) => t.status === 'active').length}, Blocked: ${projTasks.filter((t: Task) => t.status === 'blocked').length}` : ''
    ai('scope',
      'You are an expert PM. Analyse scope changes and provide impact assessments. Use bullet points only — no markdown tables. Sections: Impact Summary, Time Impact (days/weeks), Budget Impact (estimated cost), Risk Level (Low/Medium/High/Critical), Effect on existing tasks, Recommendation (approve/reject/negotiate).',
      `Project: ${project?.name || 'Unknown'}${scopeContext}\nRequested by: ${by || 'Unknown'}\nScope change requested:\n${desc}`
    )
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
      <div style={s.card}>
        <div style={s.sectionTitle}>Log Scope Change</div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Change Description</div><textarea style={{ ...s.input, minHeight: '100px', resize: 'vertical' as const }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the scope change requested..."/></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          <div><div style={s.label}>Project</div>
            <select style={s.input} value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">Select...</option>
              {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><div style={s.label}>Requested By</div><input style={s.input} value={by} onChange={e => setBy(e.target.value)} placeholder="Client / stakeholder"/></div>
        </div>
        <button style={{ ...s.btnGold, width: '100%' }} onClick={analyse}>{aiLoading['scope'] ? 'Analysing...' : '✦ Analyse Impact →'}</button>
      </div>
      <div style={s.card}>
        {aiText['scope'] && <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(aiText['scope']) }}/>}
        {!aiText['scope'] && !aiLoading['scope'] && (
          <div style={{ fontSize: '12px', color: textDim, lineHeight: 1.7 }}>
            Log a scope change on the left and Empire AI will analyse the time, budget, and risk impact instantly.
          </div>
        )}
      </div>
    </div>
  )
}

function SettingsForm({ user, supabase }: any) {
  const [company, setCompany] = useState(''); const [phone, setPhone] = useState(''); const [saved, setSaved] = useState(false)
  const [sub, setSub] = useState<any>(null); const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('company_name, phone').eq('id', user.id).single().then(({ data }: any) => {
        if (data) { setCompany(data.company_name || ''); setPhone(data.phone || '') }
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
  const planPrices: any = { starter: { monthly: '$17', quarterly: '$42', yearly: '$147' }, pro: { monthly: '$37', quarterly: '$89', yearly: '$297' }, agency: { monthly: '$67', quarterly: '$161', yearly: '$537' } }

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

function TimelineView({ projects, tasks, milestones, user, supabase, onSaved, editingId, editFields, startEdit, cancelEdit, saveEdit, deleteRow, editBtn, deleteBtn, inlineInput, inlineSelect, saveBtnInline }: any) {
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)

  const gold = '#E8B84B'; const goldDim = '#C9993A'; const navy = '#050D1A'
  const navyCard = 'rgba(16,36,72,0.7)'; const border = 'rgba(201,153,58,0.2)'
  const borderMd = 'rgba(201,153,58,0.35)'; const textBright = '#E8F0FF'
  const textMid = '#D8E4F4'; const textDim = 'rgba(192,208,232,0.75)'
  const whiteFaint = 'rgba(240,246,255,0.55)'

  const project = projects.find((p: Project) => p.id === selectedProjectId) || projects[0]
  const pid = project?.id

  const projTasks = tasks.filter((t: Task) => t.project_id === pid && t.due_date)
  const projMilestones = milestones.filter((m: Milestone) => m.project_id === pid)

  // Build timeline date range from project start/end or task dates
  const allDates = [
    project?.start_date,
    project?.end_date,
    ...projTasks.map((t: Task) => t.due_date),
    ...projMilestones.map((m: Milestone) => m.due_date),
  ].filter(Boolean).map((d: string) => new Date(d).getTime())

  const minDate = allDates.length ? Math.min(...allDates) : Date.now()
  const maxDate = allDates.length ? Math.max(...allDates) : Date.now() + 30 * 86400000
  const span = Math.max(maxDate - minDate, 7 * 86400000)

  const toPercent = (dateStr: string) => {
    const t = new Date(dateStr).getTime()
    return Math.min(100, Math.max(0, ((t - minDate) / span) * 100))
  }

  const formatDate = (d: string) => fmtDate(d)
  const today = new Date().toISOString().split('T')[0]
  const todayPct = toPercent(today)

  const statusColor = (status: string) => {
    if (status === 'done' || status === 'completed') return '#22C990'
    if (status === 'active' || status === 'in-progress') return '#4DD8F0'
    if (status === 'blocked') return '#E24B4A'
    return goldDim
  }

  const taskBarColor = (t: Task) => {
    if (t.status === 'done') return 'rgba(34,201,144,0.5)'
    if (t.status === 'blocked') return 'rgba(226,75,74,0.5)'
    if (t.status === 'active') return 'rgba(26,171,204,0.5)'
    if (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done') return 'rgba(226,75,74,0.35)'
    return 'rgba(201,153,58,0.35)'
  }
  const taskBarBorder = (t: Task) => {
    if (t.status === 'done') return '#22C990'
    if (t.status === 'blocked') return '#E24B4A'
    if (t.status === 'active') return '#4DD8F0'
    if (t.due_date && new Date(t.due_date) < new Date()) return '#E24B4A'
    return goldDim
  }

  if (projects.length === 0) return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ fontSize: '32px', opacity: 0.2, marginBottom: '12px' }}>▷</div>
      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '14px', fontWeight: 600, color: textMid, marginBottom: '6px' }}>No projects yet</div>
      <div style={{ fontSize: '12px', color: textDim }}>Create a project first to view its timeline.</div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>
          Project <em style={{ color: gold, fontStyle: 'italic' }}>Timeline</em>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={selectedProjectId || pid || ''}
            onChange={e => setSelectedProjectId(e.target.value)}
            style={{ background: 'rgba(16,36,72,0.8)', border: `1px solid ${borderMd}`, borderRadius: '3px', padding: '7px 12px', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textBright, outline: 'none' }}
          >
            {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button
            style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', background: `linear-gradient(135deg, ${goldDim}, ${gold})`, color: navy, border: 'none', padding: '8px 16px', borderRadius: '2px', cursor: 'pointer' }}
            onClick={() => setShowMilestoneForm(f => !f)}
          >+ Milestone</button>
        </div>
      </div>

      {/* Project summary strip */}
      {project && (
        <div style={{ background: 'rgba(201,153,58,0.05)', border: `1px solid ${border}`, borderRadius: '4px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: goldDim, marginBottom: '2px' }}>PROJECT</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', fontWeight: 700, color: textBright }}>{project.name}</div>
          </div>
          <div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: goldDim, marginBottom: '2px' }}>CLIENT</div>
            <div style={{ fontSize: '12px', color: textMid }}>{project.client_name || '—'}</div>
          </div>
          <div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: goldDim, marginBottom: '2px' }}>TIMELINE</div>
            <div style={{ fontSize: '12px', color: textMid }}>{fmtDate(project.start_date)} → {fmtDate(project.end_date)}</div>
          </div>
          <div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: goldDim, marginBottom: '2px' }}>HEALTH</div>
            <div style={{ fontSize: '12px', color: project.health >= 70 ? '#22C990' : project.health >= 40 ? '#FFD080' : '#FF9090' }}>{project.health}%</div>
          </div>
          <div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: goldDim, marginBottom: '2px' }}>TASKS</div>
            <div style={{ fontSize: '12px', color: textMid }}>{projTasks.filter((t: Task) => t.status === 'done').length}/{projTasks.length} done</div>
          </div>
        </div>
      )}

      {/* Add Milestone Form */}
      {showMilestoneForm && (
        <div style={{ background: navyCard, border: `1px solid ${borderMd}`, borderRadius: '4px', padding: '16px 18px', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', color: goldDim, marginBottom: '12px' }}>ADD MILESTONE</div>
          <MilestoneForm user={user} projectId={pid} supabase={supabase} onCreated={() => { onSaved(); setShowMilestoneForm(false) }} />
        </div>
      )}

      {/* Date axis header */}
      <div style={{ background: navyCard, border: `1px solid ${border}`, borderRadius: '4px 4px 0 0', padding: '8px 16px 8px 220px', display: 'flex', justifyContent: 'space-between' }}>
        {[0, 25, 50, 75, 100].map(pct => {
          const d = new Date(minDate + (pct / 100) * span)
          return <span key={pct} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, color: '#C8D8F0', letterSpacing: '0.06em' }}>{fmtDate(d.toISOString().split('T')[0])}</span>
        })}
      </div>

      {/* Timeline canvas */}
      <div style={{ background: 'rgba(8,20,44,0.6)', border: `1px solid ${border}`, borderTop: 'none', borderRadius: '0 0 4px 4px', padding: '0', overflow: 'hidden' }}>

        {/* Today marker — absolute over the whole canvas */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: `calc(220px + ${todayPct}% * (100% - 220px) / 100)`, top: 0, bottom: 0, width: '1px', background: 'rgba(232,184,75,0.4)', zIndex: 2, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: '4px', left: '4px', fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: gold, whiteSpace: 'nowrap', letterSpacing: '0.1em' }}>TODAY</div>
          </div>

          {/* ── MILESTONES SECTION ── */}
          <div style={{ borderBottom: `1px solid rgba(201,153,58,0.15)`, padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px 8px 16px' }}>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.2em', color: gold }}>MILESTONES</span>
            </div>

            {projMilestones.length === 0 && (
              <div style={{ padding: '12px 16px 12px 220px', fontSize: '11px', color: textDim }}>No milestones yet — click + Milestone to add one.</div>
            )}

            {projMilestones.map((m: Milestone) => {
              const pct = m.due_date ? toPercent(m.due_date) : 50
              const isOverdue = m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed'
              const dotColor = m.status === 'completed' ? '#22C990' : isOverdue ? '#E24B4A' : gold
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 16px', position: 'relative', minHeight: '32px' }}>
                  {/* Label */}
                  <div style={{ width: '204px', flexShrink: 0, paddingRight: '8px' }}>
                    {editingId === m.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
                        {inlineInput('title', 'Milestone name')}
                        {inlineInput('due_date', '', 'date')}
                        {inlineSelect('status', ['pending','in-progress','completed'])}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{saveBtnInline('milestones', m.id)}</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, color: isOverdue ? '#FF9090' : textMid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{m.title}</div>
                          {editBtn(m.id, { title: m.title, due_date: m.due_date || '', status: m.status })}
                          {deleteBtn('milestones', m.id)}
                        </div>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 600, color: isOverdue ? '#FF9090' : '#C8D8F0' }}>{m.due_date ? formatDate(m.due_date) : 'No date'}</div>
                      </>
                    )}
                  </div>
                  {/* Track */}
                  <div style={{ flex: 1, position: 'relative', height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px' }}>
                    <div style={{ position: 'absolute', left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)', width: '12px', height: '12px', borderRadius: '50%', background: dotColor, border: `2px solid ${navy}`, boxShadow: `0 0 6px ${dotColor}`, zIndex: 3 }}/>
                    <div style={{ position: 'absolute', left: `${pct}%`, top: '-8px', height: '18px', width: '1px', background: `${dotColor}55` }}/>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── TASKS GANTT SECTION ── */}
          <div style={{ padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px 8px 16px' }}>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.2em', color: '#4DD8F0' }}>TASKS</span>
            </div>

            {projTasks.length === 0 && (
              <div style={{ padding: '12px 16px 12px 220px', fontSize: '11px', color: textDim }}>No tasks with due dates. Add due dates to tasks to see them here.</div>
            )}

            {projTasks.map((t: Task) => {
              const endPct = toPercent(t.due_date!)
              const startPct = Math.max(0, endPct - 8)
              const barWidth = Math.max(1.5, endPct - startPct)
              const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '5px 16px', minHeight: '30px' }}>
                  {/* Label */}
                  <div style={{ width: '204px', flexShrink: 0, paddingRight: '16px' }}>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 500, color: isOverdue ? '#FF9090' : textMid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    <div style={{ display: 'flex', gap: '5px', marginTop: '2px' }}>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', padding: '1px 4px', borderRadius: '2px', background: t.status === 'done' ? 'rgba(34,201,144,0.12)' : t.status === 'active' ? 'rgba(26,171,204,0.12)' : t.status === 'blocked' ? 'rgba(226,75,74,0.12)' : 'rgba(255,255,255,0.05)', color: t.status === 'done' ? '#4DFFB4' : t.status === 'active' ? '#4DD8F0' : t.status === 'blocked' ? '#FF9090' : whiteFaint }}>{t.status}</span>
                      {t.owner && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: goldDim }}>{t.owner}</span>}
                    </div>
                  </div>
                  {/* Track + bar */}
                  <div style={{ flex: 1, position: 'relative', height: '20px' }}>
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.04)', transform: 'translateY(-50%)' }}/>
                    <div style={{ position: 'absolute', left: `${startPct}%`, width: `${barWidth}%`, top: '3px', height: '14px', background: taskBarColor(t), border: `1px solid ${taskBarBorder(t)}`, borderRadius: '2px', minWidth: '6px' }}>
                      {barWidth > 8 && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, color: '#FFFFFF', padding: '2px 4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.due_date ? formatDate(t.due_date) : ''}</div>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ borderTop: `1px solid rgba(201,153,58,0.1)`, padding: '10px 16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            {[
              { color: '#22C990', label: 'Done' },
              { color: '#4DD8F0', label: 'Active' },
              { color: goldDim, label: 'To do' },
              { color: '#E24B4A', label: 'Blocked / Overdue' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: l.color, opacity: 0.7 }}/>
                <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim }}>{l.label}</span>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '1px', background: 'rgba(232,184,75,0.5)' }}/>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: goldDim }}>Today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MilestoneForm({ user, projectId, supabase, onCreated }: any) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState('pending')

  const gold = '#E8B84B'; const goldDim = '#C9993A'; const navy = '#050D1A'
  const border = 'rgba(201,153,58,0.2)'; const borderMd = 'rgba(201,153,58,0.35)'
  const textBright = '#E8F0FF'
  const s_input = { width: '100%', background: 'rgba(16,36,72,0.8)', border: `1px solid ${border}`, borderRadius: '3px', padding: '9px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: textBright, outline: 'none' }
  const s_label = { fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '5px' }

  const submit = async () => {
    if (!title || !projectId || !user) return
    await supabase.from('milestones').insert({ user_id: user.id, project_id: projectId, title, due_date: dueDate || null, status })
    setTitle(''); setDueDate(''); setStatus('pending')
    onCreated()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
      <div><div style={s_label}>Milestone Name</div><input style={s_input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. MVP Launch, Client Sign-off"/></div>
      <div><div style={s_label}>Due Date</div><input style={s_input} value={dueDate} onChange={e => setDueDate(e.target.value)} type="date"/></div>
      <div><div style={s_label}>Status</div>
        <select style={s_input} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <button style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', background: `linear-gradient(135deg, ${goldDim}, ${gold})`, color: navy, border: 'none', padding: '9px 16px', borderRadius: '2px', cursor: 'pointer', whiteSpace: 'nowrap' as const }} onClick={submit}>Add →</button>
    </div>
  )
}
