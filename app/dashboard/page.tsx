'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'
import DOMPurify from 'isomorphic-dompurify'

type User = { id: string; email: string; user_metadata: { full_name?: string; avatar_url?: string } }
type Project = { id: string; name: string; client_name: string; status: string; health: number; budget?: number; start_date?: string; end_date?: string }
type Task = { id: string; name: string; status: string; priority: string; owner: string; project_id: string; due_date?: string; depends_on?: string | null; created_at?: string }
type Risk = { id: string; title: string; description: string; level: string; status: string; project_id: string; due_date?: string }
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
    .replace(/^### (.+)$/gm, `<div style="font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${gold};margin:14px 0 6px">$1</div>`)
    .replace(/^[-•] (.+)$/gm, `<div style="display:flex;gap:8px;margin:4px 0;padding-left:4px"><span style="color:${goldDim};flex-shrink:0">▸</span><span>$1</span></div>`)
    .replace(/^\d+\. (.+)$/gm, `<div style="display:flex;gap:8px;margin:4px 0;padding-left:4px"><span style="color:${goldDim};flex-shrink:0">▸</span><span>$1</span></div>`)
    .replace(/^---+$/gm, `<hr style="border:none;border-top:1px solid ${border};margin:12px 0">`)
    .replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')
  return DOMPurify.sanitize(html)
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
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([])
  const [subscription, setSubscription] = useState<any>(null)
  const [aiText, setAiText] = useState<Record<string, string>>({})
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({})
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [timerProjectId, setTimerProjectId] = useState('')
  const [timerDesc, setTimerDesc] = useState('')
  const [timerRate, setTimerRate] = useState('250')
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [showNotifications, setShowNotifications] = useState(false)
  const [riskProjectId, setRiskProjectId] = useState<string>('all')
  const [taskView, setTaskView] = useState<'list' | 'kanban'>('list')
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<Record<string, any>>({})

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUser(user as User); loadData(user.id) }
    })
  }, [])

  const loadData = async (userId: string) => {
    const [p, t, r, tm, tl, profile, ms, subData, pr, ri] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', userId),
      supabase.from('tasks').select('*').eq('user_id', userId),
      supabase.from('risks').select('*').eq('user_id', userId),
      supabase.from('team_members').select('*').eq('user_id', userId),
      supabase.from('time_logs').select('*').eq('user_id', userId).eq('billed', false),
      supabase.from('profiles').select('onboarded').eq('id', userId).single(),
      supabase.from('milestones').select('*').eq('user_id', userId).order('due_date', { ascending: true }),
      supabase.from('subscriptions').select('plan,status').eq('user_id', userId).single(),
      supabase.from('proposals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('recurring_invoices').select('*').eq('user_id', userId).order('next_run_date', { ascending: true }),
    ])
    if (p.data) setProjects(p.data)
    if (t.data) setTasks(t.data)
    if (r.data) setRisks(r.data)
    if (tm.data) setTeamMembers(tm.data)
    if (tl.data) setTimeLogs(tl.data)
    if (ms.data) setMilestones(ms.data)
    if (pr.data) setProposals(pr.data)
    if (ri.data) setRecurringInvoices(ri.data)
    if (subData.data) setSubscription(subData.data)
    if (profile.data && (profile.data.onboarded === false || profile.data.onboarded === null)) setShowWizard(true)
  }

  const completeOnboarding = async () => {
    if (!user) return
    await supabase.from('profiles').update({ onboarded: true }).eq('id', user.id)
    setShowWizard(false)
    setWizardStep(0)
  }

  const startEdit = (id: string, fields: Record<string, any>) => {
    inputRefs.current = {}
    setEditingId(id)
    setEditFields(fields)
  }
  const cancelEdit = () => { setEditingId(null); setEditFields({}); inputRefs.current = {} }
  const saveEdit = async (table: string, id: string, extra?: Record<string, any>) => {
    // Collect current values from uncontrolled refs first, fall back to editFields state
    const refVals: Record<string, any> = {}
    Object.keys(inputRefs.current).forEach(field => {
      const el = inputRefs.current[field]
      if (el) refVals[field] = el.value
    })
    const raw = { ...editFields, ...refVals, ...extra }
    // Null-coerce empty strings for FK/date fields to prevent DB errors
    const data: Record<string, any> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (v === '' && ['depends_on', 'due_date', 'linked_user_id', 'owner'].includes(k)) {
        data[k] = null
      } else {
        data[k] = v
      }
    }
    // Dependency warning — if setting a task to active and dependency isn't done
    if (table === 'tasks' && data.status === 'active') {
      const depId = data.depends_on || tasks.find((t: Task) => t.id === id)?.depends_on
      if (depId) {
        const dep = tasks.find((t: Task) => t.id === depId)
        if (dep && dep.status !== 'done') {
          const proceed = window.confirm(`⚠ Dependency Warning

"${dep.name}" is not yet complete (status: ${dep.status}).

Proceed and set this task to active anyway?`)
          if (!proceed) return
        }
      }
    }
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
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: editingId === id ? gold : 'rgba(200,220,255,0.75)', fontSize: '13px', padding: '2px 5px', flexShrink: 0, transition: 'color 0.15s' }}
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

  // Uncontrolled input refs — prevents focus loss on every keystroke
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({})
  const getInputVal = (field: string) => (inputRefs.current[field] as HTMLInputElement)?.value ?? ef(field)

  const inlineInput = (field: string, placeholder?: string, type = 'text') => (
    <input
      key={`${editingId}-${field}`}
      ref={el => { inputRefs.current[field] = el }}
      defaultValue={ef(field)}
      type={type}
      placeholder={placeholder}
      style={{ background: 'rgba(16,36,72,0.9)', border: `1px solid rgba(201,153,58,0.35)`, borderRadius: '3px', padding: '5px 8px', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#E8F0FF', outline: 'none', width: '100%' }}
    />
  )
  const inlineSelect = (field: string, options: string[]) => (
    <select
      key={`${editingId}-${field}`}
      ref={el => { inputRefs.current[field] = el }}
      defaultValue={ef(field)}
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

  const sendInvite = async (memberId: string, email: string, name: string, role: string, projectId: string) => {
    if (!email) { alert('This team member has no email set. Please edit their record to add an email first.'); return }
    const confirmMsg = `Send invitation to ${email}?\n\nThey will receive an email to join Empire PM as a ${role === 'client' ? 'Client (read-only)' : 'Team Member'}.`
    if (!confirm(confirmMsg)) return
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role: role || 'team_member', projectId, teamMemberId: memberId })
      })
      if (res.ok) { 
        alert(`✓ Invitation sent to ${email}`) 
      } else { 
        const errData = await res.json()
        alert(`Failed to send invitation.\n\nError: ${errData.details || errData.error}\nResend Key: ${errData.resendKey || 'unknown'}`)
      }
    } catch (err) {
      alert('Error sending invitation.')
    }
  }

  const ai = async (key: string, system: string, content: string): Promise<string> => {
    setAiLoading(prev => ({ ...prev, [key]: true }))
    setAiText(prev => ({ ...prev, [key]: '' }))
    const text = await callAI(system, content)
    setAiText(prev => ({ ...prev, [key]: text }))
    setAiLoading(prev => ({ ...prev, [key]: false }))
    return text
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

  // Dependency overdue notifications
  tasks.forEach((t: Task) => {
    if (t.depends_on && t.status !== 'done') {
      const dep = tasks.find((d: Task) => d.id === t.depends_on)
      if (dep && dep.status !== 'done' && dep.due_date && new Date(dep.due_date) < today) {
        const proj = projects.find((p: Project) => p.id === t.project_id)
        notifications.push({ id: `dep-overdue-${t.id}`, type: 'warning', title: `Dependency overdue: ${dep.name}`, detail: `Required by "${t.name}" · ${proj?.name || '—'}`, tab: 'tasks' })
      }
    }
  })

  tasks.forEach((t: Task) => {
    if (t.status === 'done') return
    if (t.due_date) {
      const todayDateStr = new Date().toISOString().split('T')[0]
      const proj = projects.find((p: Project) => p.id === t.project_id)
      if (t.due_date < todayDateStr) notifications.push({ id: `task-overdue-${t.id}`, type: 'critical', title: `Task overdue: ${t.name}`, detail: `${proj?.name || 'Unknown project'} · due ${fmtDate(t.due_date)}`, tab: 'tasks' })
      else {
        const d = new Date(t.due_date); d.setHours(0,0,0,0)
        if (d <= in3) notifications.push({ id: `task-soon-${t.id}`, type: 'warning', title: `Task due soon: ${t.name}`, detail: `${proj?.name || 'Unknown project'} · due ${fmtDate(t.due_date)}`, tab: 'tasks' })
      }
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

  // ── Plan Limits ──
  const plan = subscription?.plan || 'starter'
  const planLimits: Record<string, { projects: number; teamMembers: number; aiFeatures: string[] }> = {
    starter: {
      projects: 3,
      teamMembers: 3,
      // Starter: basic features only, no AI (except risk logging), no collaboration
      aiFeatures: ['risks', 'timeline', 'billing']
    },
    pro: {
      projects: 10,
      teamMembers: 8,
      // Pro: full AI suite + collaboration
      aiFeatures: ['risks', 'planner', 'meetings', 'scope', 'clients', 'workload', 'reports', 'timeline', 'billing']
    },
    agency: {
      projects: 25,
      teamMembers: 15,
      // Agency: everything in Pro + white label
      aiFeatures: ['risks', 'planner', 'meetings', 'scope', 'clients', 'workload', 'reports', 'timeline', 'billing']
    }
  }
  const limits = planLimits[plan] || planLimits.starter
  const activeProjectCount = projects.filter((p: Project) => p.status !== 'completed').length
  const canAddProject = activeProjectCount < limits.projects
  const canAddTeamMember = (projectId: string) => {
    const count = teamMembers.filter((m: TeamMember) => m.project_id === projectId).length
    return count < limits.teamMembers
  }
  const hasAIFeature = (feature: string) => limits.aiFeatures.includes(feature)

  const navItems = [
    { id: 'dashboard', icon: '◈', label: 'Dashboard', section: 'Command' },
    { id: 'projects', icon: '◻', label: 'Projects', section: null, badge: activeProjects > 0 ? activeProjects : null },
    { id: 'tasks', icon: '✓', label: 'Tasks', section: null, badge: activeTasks > 0 ? activeTasks : null },
    { id: 'proposals', icon: '◇', label: 'Proposals', section: null, ai: true },
    { id: 'planner', icon: '✦', label: 'AI Planner', section: null, gold: true, ai: true, locked: !hasAIFeature('planner') },
    { id: 'meetings', icon: '◎', label: 'Meetings', section: 'Operations', ai: true, locked: !hasAIFeature('meetings') },
    { id: 'risks', icon: '⚠', label: 'Risk Radar', section: null, badge: openRisks > 0 ? openRisks : null, ai: true },
    { id: 'scope', icon: '⊕', label: 'Scope Control', section: null, ai: true, locked: !hasAIFeature('scope') },
    { id: 'clients', icon: '◈', label: 'Client Portal', section: null, ai: true, locked: !hasAIFeature('clients') },
    { id: 'workload', icon: '⊞', label: 'Workload', section: null, ai: true, locked: !hasAIFeature('workload') },
    { id: 'timeline', icon: '▷', label: 'Timeline', section: null },
    { id: 'reports', icon: '◈', label: 'Reports', section: null, locked: !hasAIFeature('reports') },
    { id: 'billing', icon: '◷', label: 'Time & Billing', section: null },
    { id: 'retainers', icon: '◷', label: 'Retainers', section: null },
    { id: 'settings', icon: '⚙', label: 'Settings', section: 'Account' },
  ]

  const pageLabels: Record<string,string> = { dashboard:'Dashboard', projects:'Projects', tasks:'Tasks', proposals:'Proposals', planner:'AI Planner', meetings:'Meetings', risks:'Risk Radar', scope:'Scope Control', clients:'Client Portal', workload:'Workload', timeline:'Timeline', reports:'Reports', billing:'Time & Billing', retainers:'Retainers', settings:'Settings' }
  const pageCrumbs: Record<string,string> = { dashboard:'/ Overview', projects:'/ All Projects', tasks:'/ All Tasks', proposals:'/ Estimates & Proposals', planner:'/ Generate Plan', meetings:'/ Process Notes', risks:'/ Risk Register', scope:'/ Change Log', clients:'/ Email Generator', workload:'/ Capacity', timeline:'/ Milestones & Gantt', reports:'/ Project Report', billing:'/ Timer & Invoices', retainers:'/ Recurring Invoices', settings:'/ Account' }

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100dvh', width: '100vw', background: navy, overflow: 'hidden' }} onClick={() => setShowNotifications(false)}>

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

      <div style={{ display: 'flex', flex: 1, flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* SIDEBAR */}
        <aside style={{ width: '100%', maxWidth: isMobile ? '100%' : '220px', flexShrink: 0, flexGrow: 0, background: 'rgba(8,20,40,0.95)', borderRight: isMobile ? 'none' : `1px solid ${border}`, borderBottom: isMobile ? `1px solid rgba(201,153,58,0.2)` : 'none', display: 'flex', flexDirection: isMobile ? 'row' : 'column', overflowX: isMobile ? 'auto' : 'hidden', overflowY: isMobile ? 'hidden' : 'auto', zIndex: 10, height: isMobile ? 'auto' : '100%' }}>
          {/* Logo */}
          {!isMobile && (<div style={{ padding: '18px 16px', borderBottom: `1px solid rgba(201,153,58,0.12)`, display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
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
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: '#7090B0' }}>One Empire</div>
            </div>
          </div>)}
          {/* Nav */}
          <nav style={{ flex: isMobile ? 'none' : 1, padding: isMobile ? '8px 10px' : '8px 10px', overflowY: isMobile ? 'hidden' : 'auto', overflowX: isMobile ? 'auto' : 'hidden', display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: isMobile ? '4px' : '1px', alignItems: isMobile ? 'flex-start' : 'stretch' }}>
            {navItems.map((item, i) => (
              <div key={item.id}>
                {item.section && !isMobile && (
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: 'rgba(201,153,58,0.75)', padding: '12px 8px 3px', marginTop: i > 0 ? '4px' : 0 }}>
                    {item.section}
                  </div>
                )}
                <div onClick={() => {
                    if ((item as any).locked) {
                      alert('⬆ Upgrade Required\n\nClient Portal is not available on your ' + plan.charAt(0).toUpperCase() + plan.slice(1) + ' plan.\n\nUpgrade to Pro or Agency to unlock.')
                    } else { setTab(item.id) }
                  }} style={{
                  display: 'flex', alignItems: 'center', gap: isMobile ? '3px' : '10px',
                  padding: isMobile ? '8px 10px' : '7px 12px', flexDirection: isMobile ? 'column' : 'row',
                  borderRadius: '6px', fontFamily: 'Rajdhani, sans-serif', fontSize: '12px',
                  fontWeight: 500, letterSpacing: '0.06em',
                  cursor: (item as any).locked ? 'not-allowed' : 'pointer', flexShrink: 0,
                  borderLeft: isMobile ? 'none' : (tab === item.id ? `2px solid ${gold}` : '2px solid transparent'),
                  borderBottom: isMobile ? (tab === item.id ? `2px solid ${gold}` : '2px solid transparent') : 'none',
                  transition: 'all 0.15s',
                  background: tab === item.id ? 'rgba(201,153,58,0.12)' : 'transparent',
                  color: (item as any).locked ? 'rgba(255,255,255,0.3)' : tab === item.id ? gold : (item as any).gold ? 'rgba(232,184,75,0.9)' : 'rgba(230,240,255,0.9)',
                  opacity: (item as any).locked ? 0.5 : 1,
                  minWidth: isMobile ? '52px' : 'auto', textAlign: isMobile ? 'center' as const : 'left' as const,
                }}>
                  <span style={{ fontSize: isMobile ? '18px' : '14px', flexShrink: 0, opacity: tab === item.id ? 1 : 0.9, width: isMobile ? 'auto' : '18px', textAlign: 'center' as const, display: 'inline-block' }}>{item.icon}</span>
                  <span style={{ flex: isMobile ? 'unset' : 1, fontSize: isMobile ? '8px' : '12px', letterSpacing: isMobile ? '0.04em' : '0.06em', fontWeight: isMobile ? 600 : 500, color: (item as any).locked ? 'rgba(255,255,255,0.3)' : tab === item.id ? gold : 'rgba(230,240,255,0.9)' }}>{item.label}</span>
                  {(item as any).locked && !isMobile && <span style={{ fontSize: '9px', opacity: 0.7 }}>🔒</span>}
                  {(item as any).ai && !item.badge && (
                    <span style={{ fontSize: '8px', padding: '1px 5px', borderRadius: '8px', background: 'rgba(201,153,58,0.1)', color: '#E8C96A', fontWeight: 600, letterSpacing: '0.3px' }}>AI</span>
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
          {!isMobile && (<div style={{ padding: '12px 14px', borderTop: `1px solid rgba(201,153,58,0.12)`, display: 'flex', alignItems: 'center', gap: '9px', flexShrink: 0 }}>
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} style={{ width: '28px', height: '28px', borderRadius: '50%', border: `1px solid rgba(201,153,58,0.3)`, flexShrink: 0 }} alt="avatar"/>
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(201,153,58,0.1)', border: `1px solid rgba(201,153,58,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, color: gold, flexShrink: 0 }}>
                {user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2) || 'U'}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: '#E8F0FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: '#C9993A' }}>One Empire</div>
            </div>
            <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0, display: 'flex', alignItems: 'center' }} title="Sign Out">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
          </div>)}
        </aside>

        {/* MAIN */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, minWidth: 0 }}>
          {/* Topbar */}
          <div className="empire-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: '52px', background: 'rgba(8,20,40,0.95)', borderBottom: `1px solid rgba(201,153,58,0.12)`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '14px', fontWeight: 600, color: '#F0F6FF', letterSpacing: '0.04em' }}>{pageLabels[tab] || tab}</span>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: '#8FA8C8', marginLeft: '8px' }}>{pageCrumbs[tab] || ''}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!isMobile && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(34,201,144,0.07)', border: '1px solid rgba(34,201,144,0.2)', borderRadius: '20px', padding: '3px 10px', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, color: '#4DFFB4' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C990' }}/>
                {activeProjects} Active
              </div>}

              {/* Bell icon */}
              <div style={{ position: 'relative' }}>
                <button onClick={e => { e.stopPropagation(); setShowNotifications(v => !v) }} style={{ background: notifCount > 0 ? 'rgba(226,75,74,0.08)' : 'transparent', border: `1px solid ${notifCount > 0 ? 'rgba(226,75,74,0.3)' : 'rgba(201,153,58,0.2)'}`, borderRadius: '3px', padding: '5px 9px', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '14px', color: notifCount > 0 ? '#FF9090' : 'rgba(200,220,255,0.75)' }}>🔔</span>
                  {notifCount > 0 && (
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, color: criticalCount > 0 ? '#FF9090' : '#FFD080', minWidth: '14px' }}>{notifCount}</span>
                  )}
                </button>

                {/* Notification dropdown */}
                {showNotifications && (
                  <div style={{ position: 'absolute', top: '42px', right: 0, width: '360px', background: 'rgba(8,20,44,0.98)', border: `1px solid rgba(201,153,58,0.3)`, borderRadius: '4px', zIndex: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                    <div style={{ padding: '12px 16px', borderBottom: 'rgba(201,153,58,0.15) solid 1px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', color: goldDim }}>NOTIFICATIONS</span>
                      {notifCount > 0 && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: '#C0D4EC' }}>{notifCount} alert{notifCount !== 1 ? 's' : ''}</span>}
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
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: '#C0D4EC', flexShrink: 0, marginTop: '3px' }}>→</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

             {!isMobile && <button style={{ ...s.btnGhost, fontSize: '10px', padding: '5px 12px' }} onClick={() => { if (!hasAIFeature('planner')) { alert('⬆ Upgrade Required\n\nAI Planner is not available on your ' + plan.charAt(0).toUpperCase() + plan.slice(1) + ' plan.\n\nUpgrade to Pro or Agency to unlock.'); return; } setTab('planner') }}>✦ AI Planner</button>}
              <button style={{ ...s.btnGold, fontSize: '10px', padding: '5px 14px' }} onClick={() => setTab('projects')}>{isMobile ? '+ New' : '+ New Project'}</button>
              {isMobile && (
                <button onClick={signOut} title="Sign Out" style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '3px', cursor: 'pointer', padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: isMobile ? '16px 14px' : '24px 28px', minHeight: 0, WebkitOverflowScrolling: 'touch' } as any}>

          {/* ═══ DASHBOARD ═══ */}
          {tab === 'dashboard' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '22px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: 400, color: '#F0F6FF' }}>
                    {(() => { const h = new Date().getHours(); const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; return <>{g}, <em style={{ fontStyle: 'italic', color: gold }}>{firstName}</em> ✦</> })()} 
                  </div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: whiteFaint, marginTop: '5px', letterSpacing: '0.08em' }}>
                    {activeProjects} active projects · {openRisks} open risks · ${unbilledTotal.toLocaleString()} unbilled
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={s.btnGhost} onClick={() => setTab('tasks')}>+ New Task</button>
                  <button style={s.btnGold} onClick={() => { if (!hasAIFeature('planner')) { alert('⬆ Upgrade Required\n\nAI Planner is not available on your ' + plan.charAt(0).toUpperCase() + plan.slice(1) + ' plan.\n\nUpgrade to Pro or Agency to unlock.'); return; } setTab('planner') }}>✦ AI Planner</button>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '14px' }}>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Recent Tasks <span style={{ fontSize: '9px', color: gold, cursor: 'pointer', fontWeight: 400 }} onClick={() => setTab('tasks')}>View all →</span></div>
                    {tasks.slice(0, 5).map(t => {
                      const todayStr = new Date().toISOString().split('T')[0]
                      const isOverdue = t.due_date && t.due_date < todayStr && t.status !== 'done'
                      return (
                      <div key={t.id} style={{ padding: '8px 0', borderBottom: `1px solid rgba(201,153,58,0.1)`, fontSize: '11px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={s.badge(t.status === 'done' ? 'rgba(34,201,144,0.12)' : t.status === 'active' ? 'rgba(26,171,204,0.12)' : t.status === 'blocked' ? 'rgba(226,75,74,0.12)' : 'rgba(240,246,255,0.05)', t.status === 'done' ? '#4DFFB4' : t.status === 'active' ? '#4DD8F0' : t.status === 'blocked' ? '#FF9090' : whiteFaint, t.status === 'done' ? 'rgba(34,201,144,0.28)' : t.status === 'active' ? 'rgba(26,171,204,0.28)' : t.status === 'blocked' ? 'rgba(226,75,74,0.28)' : 'rgba(240,246,255,0.1)')}>{t.status}</span>
                          <span style={{ flex: 1, color: textMid }}>{t.name}</span>
                          {t.owner && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: whiteFaint }}>{t.owner}</span>}
                        </div>
                        {t.due_date && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: isOverdue ? '#FF9090' : textMid, paddingLeft: '2px' }}>{isOverdue ? '⚠ Overdue · ' : 'Due '}{fmtDate(t.due_date)}</div>}
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
                        {p.end_date && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: isOverdue ? '#FF9090' : '#C8D8F0', marginBottom: '4px' }}>{`Due ${fmtDate(p.end_date)}`}</div>}
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
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 500, color: '#E8C96A' }}>{proj?.name || '—'}</span>
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
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Create New Project</div>
                    <ProjectForm user={user} onCreated={() => user && loadData(user.id)} supabase={supabase} isMobile={isMobile} canAddProject={canAddProject} limits={limits} plan={plan} />
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
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '6px', marginTop: '6px', marginBottom: '8px' }}>
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
                              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: whiteFaint, flexShrink: 0 }}>{p.health}%</span>
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
              <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                <div style={s.card}>
                  <div style={s.sectionTitle}>Add Team Member</div>
                  <TeamMemberForm user={user} projects={projects} onCreated={() => user && loadData(user.id)} supabase={supabase} isMobile={isMobile} canAddTeamMember={canAddTeamMember} limits={limits} plan={plan} />
                </div>
                <div style={s.card}>
                  <div style={s.sectionTitle}>Team Members</div>
                  {teamMembers.map(m => {
                    const proj = projects.find(p => p.id === m.project_id)
                    const inviteStatus = m.invite_status || 'not_invited'
                    const statusColor = inviteStatus === 'accepted' ? '#4DFFB4' : inviteStatus === 'invited' ? '#FFD080' : '#8FA8C8'
                    const statusLabel = inviteStatus === 'accepted' ? '● Active' : inviteStatus === 'invited' ? '◌ Invited' : '○ Not invited'
                    return (
                    <div key={m.id} style={{ padding: '10px 0', borderBottom: `1px solid rgba(201,153,58,0.1)` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: inviteStatus === 'accepted' ? 'rgba(34,201,144,0.15)' : 'rgba(201,153,58,0.12)', border: `1px solid ${inviteStatus === 'accepted' ? 'rgba(34,201,144,0.4)' : border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700, color: inviteStatus === 'accepted' ? '#22C990' : gold, flexShrink: 0 }}>
                          {m.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '14px', fontWeight: 700, color: '#F0F6FF' }}>{m.name}</div>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: '#C8DCF4', marginTop: '1px' }}>{m.email} · {m.role || 'No role'}</div>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: '#E8C96A', marginTop: '2px' }}>{proj?.name || 'No project assigned'}</div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {editBtn(m.id, { name: m.name, email: m.email, role: m.role || '', capacity: m.capacity })}
                            {deleteBtn('team_members', m.id)}
                          </div>
                          <div style={{ width: '80px', height: '3px', background: 'rgba(240,246,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '3px', width: `${m.capacity}%`, background: m.capacity > 80 ? 'linear-gradient(90deg,#E24B4A,#FF9090)' : `linear-gradient(90deg,#1AABCC,#4DD8F0)` }}/>
                          </div>
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, color: statusColor }}>{statusLabel}</span>
                        </div>
                      </div>
                      {editingId === m.id && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px', paddingLeft: '42px' }}>
                          {inlineInput('name', 'Full name')}
                          {inlineInput('email', 'Email')}
                          {inlineInput('role', 'Role')}
                          {inlineInput('capacity', 'Capacity %', 'number')}
                          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>{saveBtnInline('team_members', m.id)}</div>
                        </div>
                      )}
                      {inviteStatus !== 'accepted' && editingId !== m.id && (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', paddingLeft: '42px' }}>
                          <button onClick={() => sendInvite(m.id, m.email, m.name, 'team_member', m.project_id)}
                            style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', background: 'rgba(201,153,58,0.1)', border: `1px solid rgba(201,153,58,0.3)`, color: gold, padding: '4px 10px', borderRadius: '2px', cursor: 'pointer' }}>
                            {inviteStatus === 'invited' ? '↺ Resend Invite' : '✉ Invite as Team Member'}
                          </button>
                          <button onClick={() => sendInvite(m.id, m.email, m.name, 'client', m.project_id)}
                            style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', background: 'rgba(26,171,204,0.08)', border: `1px solid rgba(26,171,204,0.25)`, color: '#4DD8F0', padding: '4px 10px', borderRadius: '2px', cursor: 'pointer' }}>
                            ◇ Invite as Client
                          </button>
                        </div>
                      )}
                      {inviteStatus === 'accepted' && editingId !== m.id && (
                        <div style={{ paddingLeft: '42px', marginTop: '4px' }}>
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: '#4DFFB4' }}>✓ Active user — can access team dashboard</span>
                        </div>
                      )}
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
          {tab === 'tasks' && (() => {
            const kanbanCols: { id: string; label: string; color: string; bg: string; border: string }[] = [
              { id: 'todo',    label: 'To Do',       color: whiteFaint,  bg: 'rgba(240,246,255,0.04)', border: 'rgba(240,246,255,0.1)' },
              { id: 'active',  label: 'In Progress', color: '#4DD8F0',   bg: 'rgba(26,171,204,0.06)',  border: 'rgba(26,171,204,0.25)' },
              { id: 'blocked', label: 'Blocked',     color: '#FF9090',   bg: 'rgba(226,75,74,0.06)',   border: 'rgba(226,75,74,0.25)'  },
              { id: 'done',    label: 'Done',        color: '#4DFFB4',   bg: 'rgba(34,201,144,0.06)',  border: 'rgba(34,201,144,0.25)' },
            ]
            const todayStr = new Date().toISOString().split('T')[0]

            const handleDragStart = (e: React.DragEvent, taskId: string) => {
              e.dataTransfer.setData('taskId', taskId)
              e.dataTransfer.effectAllowed = 'move'
            }
            const handleDragOver = (e: React.DragEvent, colId: string) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setDragOverCol(colId)
            }
            const handleDrop = async (e: React.DragEvent, colId: string) => {
              e.preventDefault()
              setDragOverCol(null)
              const taskId = e.dataTransfer.getData('taskId')
              if (!taskId) return
              const task = tasks.find((t: Task) => t.id === taskId)
              if (!task || task.status === colId) return
              if (colId === 'active' && task.depends_on) {
                const dep = tasks.find((d: Task) => d.id === task.depends_on)
                if (dep && dep.status !== 'done') {
                  if (!window.confirm(`"${dep.name}" is not yet complete.\nProceed and set this task to active anyway?`)) return
                }
              }
              setTasks((prev: Task[]) => prev.map((t: Task) => t.id === taskId ? { ...t, status: colId } : t))
              await supabase.from('tasks').update({ status: colId }).eq('id', taskId)
            }

            const TaskCard = ({ t }: { t: Task }) => {
              const proj = projects.find((p: Project) => p.id === t.project_id)
              const isOverdue = t.due_date && t.due_date < todayStr && t.status !== 'done'
              const daysLeft = t.due_date ? Math.ceil((new Date(t.due_date).getTime() - new Date(todayStr).getTime()) / (1000*60*60*24)) : null
              const dep = t.depends_on ? tasks.find((d: Task) => d.id === t.depends_on) : null
              const depIncomplete = dep && dep.status !== 'done'
              const depOverdue = dep && dep.status !== 'done' && dep.due_date && new Date(dep.due_date) < new Date()
              return (
                <div
                  draggable
                  onDragStart={e => handleDragStart(e, t.id)}
                  style={{ background: 'rgba(16,36,72,0.85)', border: `1px solid ${border}`, borderRadius: '4px', padding: '10px 12px', marginBottom: '8px', cursor: 'grab', transition: 'border-color 0.15s', userSelect: 'none' as const }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.2)')}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '7px' }}>
                    <span style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '13px', lineHeight: 1.4, flex: 1 }}>{t.name}</span>
                    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                      {editBtn(t.id, { name: t.name, status: t.status, priority: t.priority, owner: t.owner || '', due_date: t.due_date || '', depends_on: t.depends_on || '' })}
                      {deleteBtn('tasks', t.id)}
                    </div>
                  </div>
                  {editingId === t.id ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
                      <div style={{ gridColumn: '1/-1' }}>{inlineInput('name', 'Task name')}</div>
                      {inlineSelect('status', ['todo','active','blocked','done'])}
                      {inlineSelect('priority', ['high','medium','low'])}
                      {inlineInput('owner', 'Owner')}
                      {inlineInput('due_date', '', 'date')}
                      <div style={{ gridColumn: '1/-1' }}>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: goldDim, marginBottom: '4px', letterSpacing: '0.15em' }}>DEPENDS ON</div>
                        <select ref={el => { inputRefs.current['depends_on'] = el }} defaultValue={editFields.depends_on || ''}
                          style={{ width: '100%', background: 'rgba(16,36,72,0.9)', border: `1px solid rgba(201,153,58,0.35)`, borderRadius: '3px', padding: '5px 8px', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: '#E8F0FF', outline: 'none' }}>
                          <option value="">No dependency</option>
                          {tasks.filter((d: Task) => d.project_id === t.project_id && d.id !== t.id).map((d: Task) => <option key={d.id} value={d.id}>{d.name} [{d.status}]</option>)}
                        </select>
                      </div>
                      <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>{saveBtnInline('tasks', t.id)}</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' as const, marginBottom: '2px' }}>
                        <span style={s.badge(t.priority === 'high' ? 'rgba(226,75,74,0.15)' : t.priority === 'medium' ? 'rgba(201,153,58,0.15)' : 'rgba(26,171,204,0.15)', t.priority === 'high' ? '#FFB0B0' : t.priority === 'medium' ? '#F0CC6A' : '#6ADAF0', t.priority === 'high' ? 'rgba(226,75,74,0.35)' : t.priority === 'medium' ? 'rgba(201,153,58,0.35)' : 'rgba(26,171,204,0.35)')}>{t.priority}</span>
                        {t.owner && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: '#C8DCF4', fontWeight: 500 }}>👤 {t.owner}</span>}
                      </div>
                      {dep && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}>
                          <span style={{ fontSize: '9px', color: depOverdue ? '#FF9090' : depIncomplete ? '#FFD080' : '#4DFFB4' }}>⊘</span>
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 500, color: depOverdue ? '#FF9090' : depIncomplete ? '#FFD080' : '#4DFFB4' }}>
                            {depOverdue ? 'Dep. OVERDUE: ' : depIncomplete ? 'Waiting on: ' : 'Dep. done: '}{dep.name}
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(201,153,58,0.12)' }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, color: '#E8C96A' }}>{proj?.name || '—'}</span>
                        {t.due_date && (
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 500, color: isOverdue ? '#FF8080' : t.status === 'done' ? 'rgba(200,220,255,0.7)' : daysLeft !== null && daysLeft <= 3 ? '#FFD080' : '#C8DCF4' }}>
                            {isOverdue ? `⚠ Overdue · ${fmtDate(t.due_date)}` : `Due ${fmtDate(t.due_date)}${t.status !== 'done' && daysLeft !== null && daysLeft <= 7 ? ` · ${daysLeft}d` : ''}`}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            }

            return (
              <div>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap' as const, gap: '10px' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>
                    Task <em style={{ color: gold, fontStyle: 'italic' }}>Manager</em>
                  </div>
                  {/* View toggle */}
                  <div style={{ display: 'flex', background: 'rgba(16,36,72,0.8)', border: `1px solid ${border}`, borderRadius: '3px', overflow: 'hidden' }}>
                    {(['list', 'kanban'] as const).map(v => (
                      <button key={v} onClick={() => setTaskView(v)} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', padding: '6px 14px', border: 'none', cursor: 'pointer', background: taskView === v ? `linear-gradient(135deg, ${goldDim}, ${gold})` : 'transparent', color: taskView === v ? navy : textDim, transition: 'all 0.15s', textTransform: 'uppercase' as const }}>
                        {v === 'list' ? '☰ List' : '⊞ Kanban'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* LIST VIEW */}
                {taskView === 'list' && (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                    <div style={s.card}>
                      <div style={s.sectionTitle}>Add New Task</div>
                      <TaskForm user={user} projects={projects} teamMembers={teamMembers} tasks={tasks} onCreated={() => user && loadData(user.id)} supabase={supabase} isMobile={isMobile} />
                    </div>
                    <div style={s.card}>
                      <div style={s.sectionTitle}>All Tasks</div>
                      {tasks.map(t => {
                        const proj = projects.find((p: Project) => p.id === t.project_id)
                        const isOverdue = t.due_date && t.due_date < todayStr && t.status !== 'done'
                        const daysLeft = t.due_date ? Math.ceil((new Date(t.due_date).getTime() - new Date(todayStr).getTime()) / (1000*60*60*24)) : null
                        return (
                          <div key={t.id} style={{ padding: '10px 0', borderBottom: `1px solid rgba(201,153,58,0.1)` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                              <span style={s.badge(t.status === 'done' ? 'rgba(34,201,144,0.12)' : t.status === 'active' ? 'rgba(26,171,204,0.12)' : t.status === 'blocked' ? 'rgba(226,75,74,0.12)' : 'rgba(240,246,255,0.05)', t.status === 'done' ? '#4DFFB4' : t.status === 'active' ? '#4DD8F0' : t.status === 'blocked' ? '#FF9090' : whiteFaint, t.status === 'done' ? 'rgba(34,201,144,0.28)' : 'rgba(26,171,204,0.28)')}>{t.status}</span>
                              <span style={s.badge(t.priority === 'high' ? 'rgba(226,75,74,0.08)' : 'rgba(26,171,204,0.08)', t.priority === 'high' ? '#FFAAAA' : '#4DD8F0', 'rgba(26,171,204,0.18)')}>{t.priority}</span>
                              <span style={{ flex: 1, color: '#F0F6FF', fontWeight: 600, fontSize: '13px' }}>{t.name}</span>
                              {t.owner && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 500, color: '#C8DCF4', flexShrink: 0 }}>{t.owner}</span>}
                              {editBtn(t.id, { name: t.name, status: t.status, priority: t.priority, owner: t.owner || '', due_date: t.due_date || '', depends_on: t.depends_on || '' })}
                              {deleteBtn('tasks', t.id)}
                            </div>
                            {editingId === t.id ? (
                              <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '6px' }}>
                                <div style={{ gridColumn: '1/-1' }}>{inlineInput('name', 'Task name')}</div>
                                {inlineSelect('status', ['todo','active','blocked','done'])}
                                {inlineSelect('priority', ['high','medium','low'])}
                                {inlineInput('owner', 'Owner')}
                                {inlineInput('due_date', '', 'date')}
                                <div style={{ gridColumn: '1/-1' }}>
                                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: goldDim, marginBottom: '4px', letterSpacing: '0.15em' }}>DEPENDS ON</div>
                                  <select ref={el => { inputRefs.current['depends_on'] = el }} defaultValue={editFields.depends_on || ''}
                                    style={{ width: '100%', background: 'rgba(16,36,72,0.9)', border: `1px solid rgba(201,153,58,0.35)`, borderRadius: '3px', padding: '5px 8px', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: '#E8F0FF', outline: 'none' }}>
                                    <option value="">No dependency</option>
                                    {tasks.filter((d: Task) => d.project_id === t.project_id && d.id !== t.id).map((d: Task) => <option key={d.id} value={d.id}>{d.name} [{d.status}]</option>)}
                                  </select>
                                </div>
                                <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>{saveBtnInline('tasks', t.id)}</div>
                              </div>
                            ) : (() => {
                                const dep = t.depends_on ? tasks.find((d: Task) => d.id === t.depends_on) : null
                                const depIncomplete = dep && dep.status !== 'done'
                                const depOverdue = dep && dep.status !== 'done' && dep.due_date && new Date(dep.due_date) < new Date()
                                return (
                                  <>
                                    {dep && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', paddingLeft: '4px', marginBottom: '3px' }}>
                                        <span style={{ fontSize: '8px', color: depOverdue ? '#FF9090' : depIncomplete ? '#FFD080' : '#22C990' }}>⊘</span>
                                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: depOverdue ? '#FF9090' : depIncomplete ? '#FFD080' : '#22C990' }}>
                                          {depOverdue ? 'Dep. OVERDUE: ' : depIncomplete ? 'Waiting on: ' : 'Dep. done: '}
                                          {dep.name}
                                        </span>
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px', marginTop: '2px' }}>
                                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: '#E8C96A' }}>{proj?.name || '—'}</span>
                                      {t.due_date && (
                                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 500, color: isOverdue ? '#FF9090' : t.status === 'done' ? 'rgba(200,220,255,0.75)' : daysLeft !== null && daysLeft <= 3 ? '#FFD080' : '#C8DCF4' }}>
                                          {isOverdue ? `Overdue · ${fmtDate(t.due_date)}` : `Due ${fmtDate(t.due_date)}${t.status !== 'done' && daysLeft !== null && daysLeft <= 7 ? ` · ${daysLeft}d` : ''}`}
                                        </span>
                                      )}
                                      {!t.due_date && t.status !== 'done' && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', color: '#8FA8C8' }}>No due date</span>}
                                    </div>
                                  </>
                                )
                              })()}
                          </div>
                        )
                      })}
                      {tasks.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '28px 16px' }}>
                          <div style={{ fontSize: '22px', marginBottom: '8px', opacity: 0.3 }}>✓</div>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textMid, marginBottom: '4px' }}>No tasks yet</div>
                          <div style={{ fontSize: '11px', color: textDim, marginBottom: '14px' }}>Tasks keep your project moving. Add your first one to the left.</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* KANBAN VIEW */}
                {taskView === 'kanban' && (
                  <div>
                    {/* Add task form collapsed at top */}
                    <div style={{ ...s.card, marginBottom: '16px' }}>
                      <div style={s.sectionTitle}>Add New Task</div>
                      <TaskForm user={user} projects={projects} teamMembers={teamMembers} tasks={tasks} onCreated={() => user && loadData(user.id)} supabase={supabase} isMobile={isMobile} />
                    </div>
                    {/* Board */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px', alignItems: 'start' }}>
                      {kanbanCols.map(col => {
                        const colTasks = tasks.filter((t: Task) => t.status === col.id)
                        const isOver = dragOverCol === col.id
                        return (
                          <div
                            key={col.id}
                            onDragOver={e => handleDragOver(e, col.id)}
                            onDragLeave={() => setDragOverCol(null)}
                            onDrop={e => handleDrop(e, col.id)}
                            style={{ background: isOver ? col.bg : 'rgba(16,36,72,0.45)', border: `1px solid ${isOver ? col.border : border}`, borderRadius: '4px', padding: '12px', minHeight: '200px', transition: 'all 0.15s' }}
                          >
                            {/* Column header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                                <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: col.color }}>{col.label}</span>
                              </div>
                              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: whiteFaint, background: 'rgba(240,246,255,0.06)', border: `1px solid rgba(240,246,255,0.1)`, borderRadius: '8px', padding: '1px 7px' }}>{colTasks.length}</span>
                            </div>
                            {/* Cards */}
                            {colTasks.map((t: Task) => <TaskCard key={t.id} t={t} />)}
                            {/* Drop hint when empty */}
                            {colTasks.length === 0 && (
                              <div style={{ border: `1px dashed ${isOver ? col.border : 'rgba(240,246,255,0.08)'}`, borderRadius: '4px', padding: '20px 12px', textAlign: 'center' as const, transition: 'border-color 0.15s' }}>
                                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: isOver ? col.color : '#8FA8C8', letterSpacing: '0.1em' }}>{isOver ? 'Drop here' : 'No tasks'}</div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ═══ RISKS ═══ */}
          {tab === 'risks' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>Risk <em style={{ color: gold, fontStyle: 'italic' }}>Radar</em></div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select value={riskProjectId} onChange={e => { setRiskProjectId(e.target.value); setAiText(prev => ({ ...prev, risks: '' })) }}
                    style={{ background: 'rgba(16,36,72,0.8)', border: `1px solid rgba(201,153,58,0.35)`, borderRadius: '3px', padding: '7px 12px', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textBright, outline: 'none' }}>
                    <option value="all">All Projects</option>
                    {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button style={s.btnGold} onClick={() => {
                    const selectedProjects = riskProjectId === 'all' ? projects : projects.filter((p: Project) => p.id === riskProjectId)
                    const todayStr = new Date().toISOString().split('T')[0]
                    const projectContext = selectedProjects.map((p: Project) => {
                      const projTasks = tasks.filter((t: Task) => t.project_id === p.id)
                      const projRisks = risks.filter((r: Risk) => r.project_id === p.id && r.status !== 'closed')
                      const projTeam = teamMembers.filter((m: TeamMember) => m.project_id === p.id)
                      const overdueTasks = projTasks.filter((t: Task) => t.due_date && t.due_date < todayStr && t.status !== 'done')
                      return `PROJECT: ${p.name} | Client: ${p.client_name || 'Internal'} | Health: ${p.health}% | Timeline: ${p.start_date || 'TBD'} to ${p.end_date || 'TBD'}\nTasks: ${projTasks.map((t: Task) => t.name + ' [' + t.status + ', due: ' + (t.due_date || 'none') + ', owner: ' + (t.owner || 'unassigned') + ']').join('; ') || 'None'}\nOverdue: ${overdueTasks.map((t: Task) => t.name).join(', ') || 'None'}\nOpen Risks: ${projRisks.map((r: Risk) => r.title + ' [' + r.level + ']').join(', ') || 'None'}\nTeam: ${projTeam.map((m: TeamMember) => m.name + ' (' + m.role + ', ' + m.capacity + '% capacity)').join(', ') || 'No team'}`
                    }).join('\n\n')
                    ai('risks',
                      'You are an expert risk manager with 20 years PM experience. Analyse this specific project data. Be highly specific — reference actual task names, owners, and dates. Never give generic advice. Use bullet points only. Structure: 1. CRITICAL RISKS, 2. HIDDEN RISKS NOT YET LOGGED, 3. CAPACITY & DEADLINE CONFLICTS, 4. RECOMMENDED ACTIONS (with owner and deadline).',
                      'Risk analysis for: ' + (riskProjectId === 'all' ? 'Full Portfolio' : (selectedProjects[0]?.name || 'Project')) + '\n\n' + projectContext
                    )
                  }}>✦ AI Risk Scan</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Log New Risk</div>
                    <RiskForm user={user} projects={projects} onCreated={() => user && loadData(user.id)} supabase={supabase} isMobile={isMobile} />
                  </div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Active Risks</div>
                    {risks.filter((r: Risk) => r.status !== 'closed' && (riskProjectId === 'all' || r.project_id === riskProjectId)).map(r => {
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
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '6px', marginTop: '6px' }}>
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
                              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: '#E8C96A' }}>{proj?.name || '—'}</span>
                              {r.due_date && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: isOverdue ? '#FF9090' : textMid }}>{isOverdue ? '⚠ Overdue · ' : 'Resolve by '}{fmtDate(r.due_date)}</span>}
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
                    {aiLoading['risks'] && <div style={{ color: textDim, fontSize: '12px' }}>Scanning {riskProjectId === 'all' ? 'all projects' : (projects.find((p: Project) => p.id === riskProjectId)?.name || 'project')} for risks...</div>}
                    {aiText['risks'] && <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(aiText['risks']) }}/>}
                    {!aiLoading['risks'] && !aiText['risks'] && (
                      <div style={{ fontSize: '11px', color: textDim, lineHeight: 1.7 }}>
                        Select a project then click <strong style={{ color: gold }}>AI Risk Scan</strong> for a project-specific analysis, or leave on All Projects for portfolio-wide scan.
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
              <MeetingProcessor user={user} projects={projects} tasks={tasks} risks={risks} supabase={supabase} onSaved={() => user && loadData(user.id)} isMobile={isMobile} />
            </div>
          )}

          {/* ═══ CLIENTS ═══ */}
          {tab === 'clients' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>Client <em style={{ color: gold, fontStyle: 'italic' }}>Portal</em></div>
                <button style={s.btnGold} onClick={() => ai('client', 'You are a professional PM writing client updates. Write clear professional updates that build confidence. Never reveal internal issues unless explicitly included. Use bullet points only — no markdown tables.', `Generate a professional client status update covering all active projects.\n\nActive projects:\n${projects.filter((p: Project) => p.status === 'active').map((p: Project) => `- ${p.name} (Client: ${p.client_name || 'Internal'}, Health: ${p.health}%, Due: ${p.end_date || 'TBD'})`).join('\n') || 'No active projects'}`)}>✦ Quick Update</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>
                <div style={s.card}>
                  <div style={s.sectionTitle}>Generate Client Update</div>
                  <ClientUpdateForm ai={ai} aiLoading={aiLoading} aiText={aiText} projects={projects} isMobile={isMobile} />
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
                      {p.end_date && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: isOverdue ? '#FF9090' : textMid }}>{`Due ${fmtDate(p.end_date)}`}</div>}
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
                <button style={s.btnGold} onClick={() => {
                  const capacityData = teamMembers.map((m: TeamMember) => {
                    const memberTasks = tasks.filter((t: Task) => t.owner === m.name && t.status !== 'done')
                    const overdue = memberTasks.filter((t: Task) => t.due_date && new Date(t.due_date) < new Date())
                    const proj = projects.find((p: Project) => p.id === m.project_id)
                    return `${m.name} (${m.role || 'No role'}, ${m.capacity}% capacity, project: ${proj?.name || 'None'}): ${memberTasks.length} active tasks, ${overdue.length} overdue`
                  }).join('\n')
                  ai('workload',
                    'You are an expert resource manager with 20 years experience. Analyse team workload and provide specific, actionable rebalancing recommendations. Use bullet points only — no markdown tables.',
                    `Team capacity analysis:\n${capacityData || 'No team members yet'}\n\nTotal active tasks: ${tasks.filter((t: Task) => t.status === 'active').length}\nTotal blocked tasks: ${tasks.filter((t: Task) => t.status === 'blocked').length}\n\nProvide: 1. Overloaded members (risk of burnout), 2. Underutilised capacity, 3. Specific task rebalancing suggestions by name, 4. Bottleneck risks.`
                  )
                }}>✦ AI Capacity Analysis</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
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
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: '#E8C96A' }}>{m.role || 'No role'} · {proj?.name || 'No project'} · {memberTasks.length} active task{memberTasks.length !== 1 ? 's' : ''}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ width: '100px', height: '4px', background: 'rgba(240,246,255,0.07)', borderRadius: '2px', overflow: 'hidden', marginBottom: '3px' }}>
                            <div style={{ height: '4px', width: `${m.capacity}%`, background: m.capacity > 80 ? 'linear-gradient(90deg,#E24B4A,#FF9090)' : 'linear-gradient(90deg,#1AABCC,#4DD8F0)', borderRadius: '2px' }}/>
                          </div>
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: m.capacity > 80 ? '#FF9090' : whiteFaint }}>{m.capacity}% · {m.capacity > 80 ? 'Busy' : 'Available'}</span>
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
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: whiteFaint, marginTop: '5px' }}>${unbilledTotal.toLocaleString()} unbilled · {recurringInvoices.filter(r => r.active).length > 0 ? `${recurringInvoices.filter(r => r.active).length} retainer${recurringInvoices.filter(r => r.active).length !== 1 ? 's' : ''} active` : 'ready to invoice'}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '3px' }}>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.15em', color: goldDim }}>SEND INVOICE TO (CLIENT EMAIL)</div>
                    <input
                      id="invoice-client-email"
                      style={{ ...s.input, width: '260px', fontSize: '11px', padding: '7px 10px' }}
                      placeholder="e.g. client@acmacorp.com"
                      type="email"
                    />
                  </div>
                  <button style={{ ...s.btnGold, alignSelf: 'flex-end' }} onClick={async () => {
                    const clientEmail = (document.getElementById('invoice-client-email') as HTMLInputElement)?.value
                    const itemsData = timeLogs.map(l => {
                      const proj = projects.find((p: Project) => p.id === l.project_id)
                      return { description: l.description, project: proj?.name || '—', hours: l.hours, rate: l.rate, amount: l.hours * l.rate, date: l.log_date || '' }
                    })
                    const items = itemsData.map(i => `${i.description} (${i.hours}h @ $${i.rate}/hr = $${i.amount})`).join(', ')
                    const pmName = user?.user_metadata?.full_name || user?.email || 'Project Manager'
                    const coverEmailText = await ai('invoice',
                      `You are ${pmName}, a professional project manager. Write a brief professional invoice cover email (4-5 sentences). Do NOT use any placeholder text like [Your Name] or [Invoice Number] — use the actual data provided. Do not include tables or itemized lists. Structure: greeting to client, one sentence summary of work completed, state the total amount due, state 14-day payment terms, professional sign-off with the PM name provided.`,
                      `PM Name: ${pmName} | PM Email: ${user?.email} | Client: ${projects[0]?.client_name || 'Client'} | Project: ${projects[0]?.name || 'Project'} | Work completed: ${items} | Total Due: $${unbilledTotal.toLocaleString()} | Due Date: ${fmtDate(new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0])}`
                    )
                    if (clientEmail) {
                      const project = projects[0]
                      const pmNameForEmail = user?.user_metadata?.full_name || user?.email || 'Project Manager'
                      const dueDateForEmail = fmtDate(new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0])
                      const lineItems = timeLogs.map((l: TimeLog) => {
                        const proj = projects.find((p: Project) => p.id === l.project_id)
                        return `${l.description} | ${l.hours}h | $${l.rate}/hr | $${(l.hours * l.rate).toLocaleString()}`
                      }).join('\n')
                      await fetch('https://n8n.one-empire.com/webhook/empire-pm-invoice', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          client: project?.client_name || 'Client',
                          project: project?.name || 'Project',
                          clientEmail,
                          senderName: pmNameForEmail,
                          senderEmail: user?.email,
                          invoiceDate: fmtDate(new Date().toISOString().split('T')[0]),
                          dueDate: dueDateForEmail,
                          lineItems,
                          total: `$${unbilledTotal.toLocaleString()}`,
                          coverEmail: (coverEmailText || '').replace(/^Subject:.*\n?/i, '').replace(/^Subject:.*$/im, '').trim()
                        })
                      }).catch(() => {})
                    }
                  }}>✦ Generate Invoice</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Live Timer</div>
                    {/* Timer display */}
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '48px', fontWeight: 400, color: timerRunning ? gold : textDim, textAlign: 'center', padding: '16px 0 10px', transition: 'color 0.3s' }}>{formatTime(timerSeconds)}</div>
                    {timerSeconds > 0 && (
                      <div style={{ textAlign: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: textDim, marginBottom: '10px', letterSpacing: '0.1em' }}>
                        = {(Math.round(timerSeconds / 900) * 0.25).toFixed(2)}h (rounded to 15 min)
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '16px' }}>
                      <button style={s.btnGold} onClick={toggleTimer}>{timerRunning ? '⏸ Pause' : '▶ Start'}</button>
                      <button style={s.btnGhost} onClick={resetTimer}>↺ Reset</button>
                    </div>
                    {/* Timer log fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                      <div><div style={s.label}>Project</div>
                        <select style={s.input} value={timerProjectId} onChange={e => setTimerProjectId(e.target.value)}>
                          <option value="">Select project...</option>
                          {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div><div style={s.label}>Description</div>
                        <input style={s.input} value={timerDesc} onChange={e => setTimerDesc(e.target.value)} placeholder="What did you work on?"/>
                      </div>
                      <div><div style={s.label}>Rate ($/hr)</div>
                        <input style={s.input} value={timerRate} onChange={e => setTimerRate(e.target.value)} type="number" placeholder="250"/>
                      </div>
                    </div>
                    <button style={{ ...s.btnGold, width: '100%', marginTop: '12px', opacity: (timerSeconds === 0 || !timerProjectId || !timerDesc) ? 0.5 : 1 }}
                      disabled={timerSeconds === 0 || !timerProjectId || !timerDesc}
                      onClick={async () => {
                        if (!user || !timerProjectId || !timerDesc || timerSeconds === 0) return
                        // Round to nearest 15 minutes
                        const roundedHours = Math.max(0.25, Math.round(timerSeconds / 900) * 0.25)
                        await supabase.from('time_logs').insert({
                          user_id: user.id, project_id: timerProjectId,
                          description: timerDesc, hours: roundedHours,
                          rate: parseFloat(timerRate) || 250,
                          billed: false, log_date: new Date().toISOString().split('T')[0]
                        })
                        resetTimer(); setTimerDesc(''); setTimerProjectId('')
                        if (user) loadData(user.id)
                      }}>
                      ◷ Log {timerSeconds > 0 ? `${(Math.max(0.25, Math.round(timerSeconds / 900) * 0.25)).toFixed(2)}h` : 'Time'} →
                    </button>
                  </div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Log Time</div>
                    <TimeLogForm user={user} projects={projects} onCreated={() => user && loadData(user.id)} supabase={supabase} isMobile={isMobile} />
                  </div>
                </div>
                <div style={s.card}>
                  <div style={s.sectionTitle}>Unbilled Hours</div>
                  {timeLogs.map(l => {
                    const proj = projects.find(p => p.id === l.project_id)
                    return (
                    <div key={l.id} style={{ padding: '9px 0', borderBottom: `1px solid rgba(201,153,58,0.1)` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '13px' }}>
                        <span style={{ flex: 1, color: '#FFFFFF', fontWeight: 600 }}>{l.description}</span>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', color: '#C8DCF4', width: '40px', textAlign: 'right', fontSize: '13px', fontWeight: 500 }}>{l.hours}h</span>
                        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: gold, width: '75px', textAlign: 'right' }}>${(l.hours * l.rate).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 500, color: '#E8C96A' }}>{proj?.name || '—'}</span>
                        {l.log_date && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 500, color: '#C8DCF4' }}>{fmtDate(l.log_date)}</span>}
                      </div>
                    </div>
                  )})}
                  <div style={{ borderTop: `1px solid ${borderMd}`, marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', color: gold }}>TOTAL UNBILLED</span>
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold }}>${unbilledTotal.toLocaleString()}</span>
                  </div>
                  {aiText['invoice'] && (
                    <div style={{ marginTop: '16px', border: `1px solid rgba(201,153,58,0.25)`, borderRadius: '4px', overflow: 'hidden' }}>
                      {/* Invoice header */}
                      <div style={{ background: 'rgba(201,153,58,0.08)', padding: '16px 20px', borderBottom: `1px solid rgba(201,153,58,0.2)` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: textBright, marginBottom: '2px' }}>Tax Invoice</div>
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: goldDim, letterSpacing: '0.15em' }}>EMPIRE PM · ONE EMPIRE</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, letterSpacing: '0.12em' }}>DATE</div>
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textMid }}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, letterSpacing: '0.12em', marginTop: '6px' }}>DUE DATE</div>
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textMid }}>{new Date(Date.now() + 14*24*60*60*1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '32px', marginTop: '12px' }}>
                          <div>
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, letterSpacing: '0.12em', marginBottom: '2px' }}>FROM</div>
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, color: textBright }}>{user?.user_metadata?.full_name || 'Project Manager'}</div>
                            <div style={{ fontSize: '10px', color: textDim }}>{user?.email}</div>
                          </div>
                          <div>
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, letterSpacing: '0.12em', marginBottom: '2px' }}>TO</div>
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, color: textBright }}>{projects[0]?.client_name || 'Client'}</div>
                            <div style={{ fontSize: '10px', color: textDim }}>{projects[0]?.name}</div>
                          </div>
                        </div>
                      </div>

                      {/* Line items table */}
                      <div style={{ padding: '0 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0', borderBottom: `1px solid rgba(201,153,58,0.15)`, padding: '10px 0' }}>
                          {['DESCRIPTION', 'HOURS', 'RATE', 'AMOUNT'].map(h => (
                            <div key={h} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', fontWeight: 700, letterSpacing: '0.18em', color: goldDim }}>{h}</div>
                          ))}
                        </div>
                        {timeLogs.map((l: TimeLog) => {
                          const proj = projects.find((p: Project) => p.id === l.project_id)
                          return (
                            <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0', padding: '9px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                              <div>
                                <div style={{ fontSize: '11px', color: textBright, fontWeight: 500 }}>{l.description}</div>
                                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: '#E8C96A' }}>{proj?.name} · {fmtDate(l.log_date)}</div>
                              </div>
                              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textMid, paddingTop: '2px' }}>{l.hours}h</div>
                              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textMid, paddingTop: '2px' }}>${l.rate}/hr</div>
                              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '13px', color: gold, paddingTop: '1px' }}>${(l.hours * l.rate).toLocaleString()}</div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Total */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 20px', borderTop: `1px solid rgba(201,153,58,0.2)`, background: 'rgba(201,153,58,0.05)' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', color: goldDim }}>TOTAL DUE</span>
                            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: gold }}>${unbilledTotal.toLocaleString()}</span>
                          </div>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textDim, marginTop: '4px' }}>Payment due within 14 days</div>
                        </div>
                      </div>

                      {/* Cover email */}
                      <div style={{ padding: '16px 20px', borderTop: `1px solid rgba(201,153,58,0.12)` }}>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', color: goldDim, marginBottom: '8px' }}>COVER EMAIL</div>
                        <div style={{ fontSize: '12px', color: textMid, lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{aiText['invoice']}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ RETAINERS ═══ */}
          {tab === 'retainers' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>
                    Recurring <em style={{ color: gold, fontStyle: 'italic' }}>Retainers</em>
                  </div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: whiteFaint, marginTop: '5px' }}>
                    {recurringInvoices.filter(r => r.active).length} active · ${recurringInvoices.filter(r => r.active).reduce((s, r) => s + r.amount, 0).toLocaleString()} / month in retainer revenue
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                {/* Create form */}
                <div style={s.card}>
                  <div style={s.sectionTitle}>◷ New Retainer Invoice</div>
                  <RecurringInvoiceForm
                    user={user}
                    projects={projects}
                    supabase={supabase}
                    onCreated={() => user && loadData(user.id)}
                    isMobile={isMobile}
                  />
                </div>

                {/* Active retainers list */}
                <div style={s.card}>
                  <div style={s.sectionTitle}>
                    Active Retainers
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, fontWeight: 400 }}>{recurringInvoices.filter(r => r.active).length} active</span>
                  </div>

                  {recurringInvoices.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '28px 16px' }}>
                      <div style={{ fontSize: '22px', marginBottom: '8px', opacity: 0.3 }}>◷</div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textMid, marginBottom: '4px' }}>No retainers set up</div>
                      <div style={{ fontSize: '11px', color: textDim }}>Set up recurring invoices for monthly retainer clients — they&apos;ll send automatically via n8n.</div>
                    </div>
                  )}

                  {recurringInvoices.map(ri => {
                    const proj = projects.find((p: Project) => p.id === ri.project_id)
                    const nextDate = new Date(ri.next_run_date)
                    const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / (1000*60*60*24))
                    const isOverdue = daysUntil < 0
                    const isSoon = daysUntil >= 0 && daysUntil <= 3
                    const freqLabel = ri.frequency === 'monthly' ? 'Monthly' : ri.frequency === 'weekly' ? 'Weekly' : 'Quarterly'
                    const freqColor = ri.active ? '#4DFFB4' : '#A8C0DC'
                    return (
                      <div key={ri.id} style={{ padding: '12px 0', borderBottom: `1px solid rgba(201,153,58,0.1)` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: '#F0F6FF', fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>{ri.description}</div>
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', color: '#C8DCF4' }}>{proj?.name || '—'} · {ri.client_email}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={s.badge(ri.active ? 'rgba(34,201,144,0.1)' : 'rgba(240,246,255,0.04)', freqColor, ri.active ? 'rgba(34,201,144,0.3)' : 'rgba(240,246,255,0.1)')}>{freqLabel}</span>
                            <button
                              onClick={async () => {
                                await supabase.from('recurring_invoices').update({ active: !ri.active }).eq('id', ri.id)
                                if (user) loadData(user.id)
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px 4px' }}
                              title={ri.active ? 'Pause retainer' : 'Activate retainer'}
                            >{ri.active ? '⏸' : '▶'}</button>
                            {deleteBtn('recurring_invoices', ri.id)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: gold }}>${ri.amount.toLocaleString()}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: isOverdue ? '#FF9090' : isSoon ? '#FFD080' : '#C8DCF4' }}>
                              {isOverdue ? '⚠ Overdue · ' : 'Next: '}{fmtDate(ri.next_run_date)}
                              {!isOverdue && daysUntil <= 7 && ` · ${daysUntil}d`}
                            </span>
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Send invoice now to ${ri.client_email}?\n\n${ri.description}\nAmount: $${ri.amount.toLocaleString()}`)) return
                                const pmName = user?.user_metadata?.full_name || user?.email || 'Project Manager'
                                try {
                                  const res = await fetch('https://n8n.one-empire.com/webhook/empire-pm-invoice', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      client: proj?.client_name || proj?.name || 'Client',
                                      project: proj?.name || 'Retainer',
                                      clientEmail: ri.client_email,
                                      senderName: pmName,
                                      senderEmail: user?.email,
                                      invoiceDate: fmtDate(new Date().toISOString().split('T')[0]),
                                      dueDate: fmtDate(new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0]),
                                      lineItems: `${ri.description} | ${freqLabel} retainer | - | $${ri.amount.toLocaleString()}`,
                                      total: `$${ri.amount.toLocaleString()}`,
                                      coverEmail: `Please find attached the ${freqLabel.toLowerCase()} retainer invoice for ${ri.description}. Total due: $${ri.amount.toLocaleString()}. Payment is due within 14 days. Thank you for your continued partnership.`
                                    })
                                  })
                                  if (!res.ok) {
                                    const errText = await res.text().catch(() => res.statusText)
                                    alert(`✗ Webhook error ${res.status}: ${errText}`)
                                    return
                                  }
                                  // Advance next_run_date only on success
                                  const next = new Date()
                                  if (ri.frequency === 'weekly') next.setDate(next.getDate() + 7)
                                  else if (ri.frequency === 'quarterly') next.setMonth(next.getMonth() + 3)
                                  else next.setMonth(next.getMonth() + 1)
                                  await supabase.from('recurring_invoices').update({ next_run_date: next.toISOString().split('T')[0] }).eq('id', ri.id)
                                  if (user) loadData(user.id)
                                  alert(`✓ Invoice sent to ${ri.client_email}`)
                                } catch (err: any) {
                                  alert(`✗ Failed to send: ${err.message || 'Network error — check n8n is running and the webhook is active'}`)
                                }
                              }}
                              style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', background: 'rgba(201,153,58,0.1)', border: `1px solid rgba(201,153,58,0.3)`, color: gold, padding: '3px 8px', borderRadius: '2px', cursor: 'pointer' }}
                            >Send Now</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Upcoming this month summary */}
                  {recurringInvoices.filter(r => r.active).length > 0 && (
                    <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(201,153,58,0.04)', border: `1px solid rgba(201,153,58,0.12)`, borderRadius: '3px' }}>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: goldDim, marginBottom: '6px' }}>UPCOMING THIS MONTH</div>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold }}>
                        ${recurringInvoices.filter(r => r.active && (() => {
                          const d = new Date(r.next_run_date); const now = new Date()
                          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
                        })()).reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                      </div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: textDim, marginTop: '2px' }}>
                        {recurringInvoices.filter(r => r.active && (() => {
                          const d = new Date(r.next_run_date); const now = new Date()
                          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
                        })()).length} retainer{recurringInvoices.filter(r => r.active).length !== 1 ? 's' : ''} due this month
                      </div>
                    </div>
                  )}
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
              isMobile={isMobile}
            />
          )}

          {/* ═══ AI PLANNER ═══ */}
          {tab === 'planner' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF', marginBottom: '22px' }}>
                ✦ AI <em style={{ color: gold, fontStyle: 'italic' }}>Planner</em>
              </div>
              {!hasAIFeature('planner') ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', textAlign: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '36px', color: gold, opacity: 0.4 }}>✦</div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#F0F6FF' }}>AI Planner is a <em style={{ color: gold }}>Pro feature</em></div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#A8C0DC', maxWidth: '420px', lineHeight: 1.7 }}>
                    Upgrade to Pro or Agency to access the AI Planner, AI Meetings, Scope Control, Workload AI, and the full AI suite.
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <a href="/pricing" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', background: `linear-gradient(135deg, ${goldDim}, ${gold})`, color: navy, border: 'none', padding: '10px 22px', borderRadius: '2px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>
                      Upgrade to Pro →
                    </a>
                    <button onClick={() => setTab('dashboard')} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', border: `1px solid rgba(201,153,58,0.35)`, background: 'transparent', color: '#C8DCF4', padding: '10px 18px', borderRadius: '2px', cursor: 'pointer' }}>
                      ← Back to Dashboard
                    </button>
                  </div>
                  <div style={{ marginTop: '16px', padding: '14px 20px', background: 'rgba(201,153,58,0.05)', border: `1px solid rgba(201,153,58,0.2)`, borderRadius: '4px', maxWidth: '380px' }}>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', color: goldDim, marginBottom: '8px' }}>PRO PLAN — $37/MO</div>
                    <div style={{ fontSize: '12px', color: '#A8C0DC', lineHeight: 1.7, textAlign: 'left' }}>
                      ✦ AI Planner · AI Meetings · Scope Control AI<br/>
                      ✦ Workload AI · AI Reports · Client Portal<br/>
                      ✦ Team login · Invoice automation · n8n
                    </div>
                  </div>
                </div>
              ) : (
                <AIPlannerForm ai={ai} aiLoading={aiLoading} aiText={aiText} projects={projects} tasks={tasks} risks={risks} teamMembers={teamMembers} supabase={supabase} user={user} onPopulated={() => user && loadData(user.id)} setTab={setTab} isMobile={isMobile} />
              )}
            </div>
          )}

          {/* ═══ SCOPE ═══ */}
          {tab === 'scope' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF', marginBottom: '22px' }}>
                Scope <em style={{ color: gold, fontStyle: 'italic' }}>Control</em>
              </div>
              <ScopeForm ai={ai} aiLoading={aiLoading} aiText={aiText} projects={projects} tasks={tasks} isMobile={isMobile} />
            </div>
          )}

          {/* ═══ REPORTS ═══ */}
          {tab === 'reports' && (
            <ReportsView
              projects={projects}
              tasks={tasks}
              risks={risks}
              timeLogs={timeLogs}
              milestones={milestones}
              teamMembers={teamMembers}
              isMobile={isMobile}
            />
          )}

          {/* ═══ SETTINGS ═══ */}
          {tab === 'proposals' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>
                    Proposals &amp; <em style={{ color: gold, fontStyle: 'italic' }}>Estimates</em>
                  </div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: whiteFaint, marginTop: '5px' }}>
                    {proposals.length} proposal{proposals.length !== 1 ? 's' : ''} · {proposals.filter(p => p.status === 'accepted').length} accepted · {proposals.filter(p => p.status === 'sent').length} awaiting response
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                {/* Left: Create form */}
                <div style={s.card}>
                  <div style={s.sectionTitle}>New Proposal</div>
                  <ProposalForm
                    user={user}
                    projects={projects}
                    supabase={supabase}
                    onCreated={() => user && loadData(user.id)}
                    setTab={setTab}
                    isMobile={isMobile}
                  />
                </div>
                {/* Right: Proposals list */}
                <div style={s.card}>
                  <div style={s.sectionTitle}>All Proposals</div>
                  {proposals.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '28px 16px' }}>
                      <div style={{ fontSize: '22px', marginBottom: '8px', opacity: 0.3 }}>◇</div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textMid, marginBottom: '4px' }}>No proposals yet</div>
                      <div style={{ fontSize: '11px', color: textDim }}>Create your first proposal on the left — generate a full AI-written proposal in seconds.</div>
                    </div>
                  )}
                  {proposals.map(prop => {
                    const statusColor = prop.status === 'accepted' ? '#4DFFB4' : prop.status === 'sent' ? '#FFD080' : prop.status === 'declined' ? '#FF9090' : textDim
                    const statusBg = prop.status === 'accepted' ? 'rgba(34,201,144,0.1)' : prop.status === 'sent' ? 'rgba(255,208,128,0.08)' : prop.status === 'declined' ? 'rgba(226,75,74,0.08)' : 'rgba(240,246,255,0.04)'
                    const statusBdr = prop.status === 'accepted' ? 'rgba(34,201,144,0.3)' : prop.status === 'sent' ? 'rgba(255,208,128,0.25)' : prop.status === 'declined' ? 'rgba(226,75,74,0.25)' : 'rgba(240,246,255,0.1)'
                    return (
                      <div key={prop.id} style={{ padding: '12px 0', borderBottom: `1px solid rgba(201,153,58,0.1)` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: '#F0F6FF', fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>{prop.title}</div>
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', color: '#C8DCF4' }}>{prop.client_name} · {prop.project_type}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={s.badge(statusBg, statusColor, statusBdr)}>{prop.status}</span>
                            {editBtn(prop.id, { title: prop.title, client_name: prop.client_name, project_type: prop.project_type, budget: prop.budget || '', timeline: prop.timeline || '', status: prop.status, scope_summary: prop.scope_summary || '', deliverables: prop.deliverables || '' })}
                            {deleteBtn('proposals', prop.id)}
                          </div>
                        </div>
                        {editingId === prop.id ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px' }}>
                            <div style={{ gridColumn: '1/-1' }}>{inlineInput('title', 'Proposal title')}</div>
                            {inlineInput('client_name', 'Client name')}
                            {inlineInput('project_type', 'Project type')}
                            {inlineInput('budget', 'Budget ($)', 'number')}
                            {inlineInput('timeline', 'Timeline')}
                            {inlineSelect('status', ['draft','sent','accepted','declined'])}
                            <div style={{ gridColumn: '1/-1' }}>{inlineInput('scope_summary', 'Scope summary')}</div>
                            <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>{saveBtnInline('proposals', prop.id)}</div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              {prop.budget && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: '#E8C96A' }}>${Number(prop.budget).toLocaleString()}</span>}
                              {prop.timeline && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: '#A8C0DC' }}>{prop.timeline}</span>}
                            </div>
                            {prop.status === 'accepted' && (
                              <button
                                onClick={async () => {
                                  if (!user) return
                                  if (!window.confirm(`Convert "${prop.title}" into a live project?\n\nThis will:\n• Create a new active project with start & end dates\n• Extract tasks from the proposal\n• Assign all tasks to the project automatically`)) return

                                  // 1 — Calculate project dates from timeline string
                                  const startDate = new Date().toISOString().split('T')[0]
                                  let endDate: string | null = null
                                  if (prop.timeline) {
                                    const tl = prop.timeline.toLowerCase()
                                    const num = parseFloat(tl.replace(/[^0-9.]/g, '')) || 0
                                    if (num > 0) {
                                      const end = new Date()
                                      if (tl.includes('day')) end.setDate(end.getDate() + Math.round(num))
                                      else if (tl.includes('month')) end.setMonth(end.getMonth() + Math.round(num))
                                      else end.setDate(end.getDate() + Math.round(num * 7)) // default: weeks
                                      endDate = end.toISOString().split('T')[0]
                                    }
                                  }

                                  // 2 — Create the project
                                  const { data: newProject } = await supabase.from('projects').insert({
                                    user_id: user.id,
                                    name: prop.title,
                                    client_name: prop.client_name,
                                    status: 'active',
                                    health: 100,
                                    budget: prop.budget || null,
                                    start_date: startDate,
                                    end_date: endDate,
                                  }).select().single()

                                  await supabase.from('proposals').update({ status: 'accepted' }).eq('id', prop.id)

                                  // 3 — Extract tasks from proposal body via AI
                                  if (newProject && prop.ai_body) {
                                    try {
                                      const extractedRaw = await callAI(
                                        'You are a project manager extracting tasks from a proposal document. Return ONLY a valid JSON array, no other text, no markdown fences. Each item: {"name": "task name", "priority": "high|medium|low"}. Extract every specific deliverable and action item. Aim for 5–12 concrete tasks.',
                                        `Extract all tasks and deliverables from this proposal as a JSON array:\n\n${prop.ai_body}\n\nProject type: ${prop.project_type || 'General'}\nTimeline: ${prop.timeline || 'TBD'}`
                                      )
                                      const clean = extractedRaw.replace(/```json|```/g, '').trim()
                                      const taskList: { name: string; priority: string }[] = JSON.parse(clean)
                                      if (Array.isArray(taskList) && taskList.length > 0) {
                                        const taskRows = taskList.map((t: { name: string; priority: string }) => ({
                                          user_id: user.id,
                                          project_id: newProject.id,
                                          name: t.name,
                                          status: 'todo',
                                          priority: ['high','medium','low'].includes(t.priority) ? t.priority : 'medium',
                                        }))
                                        await supabase.from('tasks').insert(taskRows)
                                        await loadData(user.id)
                                        setTab('projects')
                                        setTimeout(() => alert(`✓ Project created!\n\nDates: ${startDate} → ${endDate || 'No end date'}\n${taskList.length} tasks extracted and added.\n\nNext: Go to AI Planner to generate a full schedule with owners, sequencing and due dates.`), 300)
                                        return
                                      }
                                    } catch {}
                                  }

                                  // Fallback — no tasks extracted
                                  await loadData(user.id)
                                  setTab('projects')
                                  setTimeout(() => alert(`✓ Project created!\n\nDates: ${startDate} → ${endDate || 'No end date'}\n\nNext: Go to AI Planner to generate tasks and a full schedule.`), 300)
                                }}
                                style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', background: 'rgba(34,201,144,0.1)', border: '1px solid rgba(34,201,144,0.3)', color: '#4DFFB4', padding: '4px 10px', borderRadius: '2px', cursor: 'pointer' }}
                              >⊕ Convert to Project</button>
                            )}
                          </div>
                        )}
                        {/* Show AI body preview if exists */}
                        {prop.ai_body && editingId !== prop.id && (
                          <details style={{ marginTop: '8px' }}>
                            <summary style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: goldDim, cursor: 'pointer', letterSpacing: '0.1em' }}>VIEW PROPOSAL →</summary>
                            <div style={{ ...s.aiResponse, marginTop: '8px', fontSize: '11px' }} dangerouslySetInnerHTML={{ __html: formatAI(prop.ai_body) }}/>
                          </details>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

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
            <div style={{ marginLeft: 'auto', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: whiteFaint, display: 'flex', gap: '14px', alignItems: 'center' }}><a href="/terms" target="_blank" style={{ color: '#C9993A', textDecoration: 'none' }}>Terms</a><a href="/privacy" target="_blank" style={{ color: '#C9993A', textDecoration: 'none' }}>Privacy</a><span>One Empire © 2026</span></div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes wizardIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(201,153,58,0.3); border-radius: 2px; }
        @media (max-width: 768px) {
          .empire-layout { flex-direction: column !important; }
          .empire-sidebar { width: 100% !important; height: auto !important; flex-direction: row !important; overflow-x: auto !important; padding: 8px !important; border-right: none !important; border-bottom: 1px solid rgba(201,153,58,0.15) !important; }
          .empire-sidebar .nav-section-label { display: none !important; }
          .empire-sidebar .nav-item { padding: 6px 10px !important; flex-shrink: 0 !important; border-radius: 4px !important; }
          .empire-sidebar .nav-item span:last-child { display: none !important; }
          .empire-main { height: calc(100vh - 110px) !important; }
          .empire-topbar { padding: 0 12px !important; }
          .empire-topbar .topbar-actions span, .empire-topbar .topbar-crumb { display: none !important; }
          .empire-content { padding: 16px 14px !important; }
          .empire-grid-2 { grid-template-columns: 1fr !important; }
          .empire-grid-3 { grid-template-columns: 1fr !important; }
          .empire-grid-4 { grid-template-columns: 1fr 1fr !important; }
          .empire-wizard { padding: 24px 20px !important; margin: 12px !important; }
          .empire-report-stats { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .empire-sidebar .nav-item-label { display: none !important; }
          .empire-grid-4 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ═══ ONBOARDING WIZARD ═══ */}
      {showWizard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'rgba(10,24,52,0.98)', border: `1px solid ${borderMd}`, borderRadius: '8px', width: '100%', maxWidth: '560px', padding: '36px 40px', animation: 'wizardIn 0.25s ease', position: 'relative' }}>

            {/* Skip */}
            <button onClick={completeOnboarding} style={{ position: 'absolute', top: '16px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: '#7090B0', letterSpacing: '0.1em' }}>SKIP SETUP</button>

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
                <ProjectForm user={user} onCreated={() => { if (user) loadData(user.id); setWizardStep(2) }} supabase={supabase} isMobile={isMobile} canAddProject={canAddProject} limits={limits} plan={plan} />
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
                  <TeamMemberForm user={user} projects={projects} onCreated={() => { if (user) loadData(user.id); setWizardStep(3) }} supabase={supabase} isMobile={isMobile} canAddTeamMember={canAddTeamMember} limits={limits} plan={plan} />
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
                  <TaskForm user={user} projects={projects} teamMembers={teamMembers} tasks={tasks} onCreated={() => { if (user) loadData(user.id) }} supabase={supabase} />
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

function ProjectForm({ user, onCreated, supabase, isMobile, canAddProject, limits, plan }: any) {
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
        <button style={{ ...s.btnGold, width: '100%' }} onClick={submit}>Create Project →</button>
      )}
    </div>
  )
}

function TeamMemberForm({ user, projects, onCreated, supabase, isMobile, canAddTeamMember, limits, plan }: any) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [role, setRole] = useState(''); const [projectId, setProjectId] = useState(''); const [capacity, setCapacity] = useState('100')
  const submit = async () => {
    if (!name || !email || !projectId || !user) return
    await supabase.from('team_members').insert({ user_id: user.id, project_id: projectId, name, email, role, capacity: parseInt(capacity) })
    setName(''); setEmail(''); setRole(''); onCreated()
  }
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
      {projectId && canAddTeamMember && !canAddTeamMember(projectId) ? (
        <div style={{ padding: '12px', background: 'rgba(226,75,74,0.08)', border: '1px solid rgba(226,75,74,0.25)', borderRadius: '4px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: '#FF9090', marginBottom: '4px', fontWeight: 600 }}>⬆ Team limit reached ({limits?.teamMembers}/project on {(plan||'starter').charAt(0).toUpperCase()+(plan||'starter').slice(1)} plan)</div>
          <div style={{ fontSize: '11px', color: '#A8C0DC' }}>Upgrade to add more team members.</div>
        </div>
      ) : (
        <button style={{ ...s.btnGold, width: '100%' }} onClick={submit}>Add Team Member →</button>
      )}
    </div>
  )
}

function TaskForm({ user, projects, teamMembers, tasks, onCreated, supabase, isMobile }: any) {
  const [name, setName] = useState(''); const [status, setStatus] = useState('todo'); const [priority, setPriority] = useState('medium'); const [owner, setOwner] = useState(''); const [projectId, setProjectId] = useState(''); const [dueDate, setDueDate] = useState(''); const [dependsOn, setDependsOn] = useState('')
  const projectTasks = (tasks || []).filter((t: Task) => t.project_id === projectId)
  const submit = async () => {
    if (!name || !projectId || !user) return
    await supabase.from('tasks').insert({ user_id: user.id, project_id: projectId, name, status, priority, owner, due_date: dueDate || null, depends_on: dependsOn || null })
    setName(''); setOwner(''); setDueDate(''); setDependsOn(''); onCreated()
  }
  return (
    <div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Task Name</div><input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="What needs to be done?"/></div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div><div style={s.label}>Project</div>
          <select style={s.input} value={projectId} onChange={e => { setProjectId(e.target.value); setDependsOn('') }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
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
      <div style={{ marginBottom: '12px' }}>
        <div style={s.label}>Depends On <span style={{ color: textDim, fontWeight: 400 }}>(optional — must complete first)</span></div>
        <select style={s.input} value={dependsOn} onChange={e => setDependsOn(e.target.value)}>
          <option value="">No dependency</option>
          {projectTasks.map((t: Task) => <option key={t.id} value={t.id}>{t.name} [{t.status}]</option>)}
        </select>
      </div>
      <button style={{ ...s.btnGold, width: '100%' }} onClick={submit}>Add Task →</button>
    </div>
  )
}

function RiskForm({ user, projects, onCreated, supabase, isMobile }: any) {
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
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div><div style={s.label}>Resolve By</div><input style={s.input} value={dueDate} onChange={e => setDueDate(e.target.value)} type="date"/></div>
        <div><div style={s.label}>Notify (Email) — Optional</div><input style={s.input} value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} placeholder="team@company.com" type="email"/></div>
      </div>
      <button style={{ ...s.btnGold, width: '100%' }} onClick={submit}>Log Risk →</button>
    </div>
  )
}

function TimeLogForm({ user, projects, onCreated, supabase, isMobile }: any) {
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

function MeetingProcessor({ user, projects, tasks, risks, supabase, onSaved, isMobile }: any) {
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
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
      <div style={s.card}>
        <div style={s.sectionTitle}>Process Meeting Notes</div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Meeting Title</div><input style={s.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Alpha Sprint Review"/></div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
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

function ClientUpdateForm({ ai, aiLoading, aiText, projects, isMobile }: any) {
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
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
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

function AIPlannerForm({ ai, aiLoading, aiText, projects, tasks, risks, teamMembers, supabase, user, onPopulated, setTab, isMobile }: any) {
  const [name, setName] = useState(''); const [brief, setBrief] = useState(''); const [timeline, setTimeline] = useState('8 weeks'); const [team, setTeam] = useState('2–3 people')
  const [targetProjectId, setTargetProjectId] = useState('')
  const [populating, setPopulating] = useState(false)
  const [populateResult, setPopulateResult] = useState<{tasks: number, risks: number, milestones: number} | null>(null)

  const gold = '#E8B84B'; const goldDim = '#C9993A'

  const generate = () => {
    if (!brief) return
    const existingContext = projects.length > 0 ? `\n\nEXISTING PORTFOLIO CONTEXT (avoid duplicating effort):
Active projects: ${projects.filter((p: Project) => p.status === 'active').map((p: Project) => `${p.name} (${p.health}% health, ends ${p.end_date || 'TBD'})`).join(', ') || 'None'}
Available team members: ${teamMembers.length > 0 ? teamMembers.map((m: TeamMember) => `${m.name} — ${m.role} (${m.capacity}% capacity)`).join(', ') : 'Not specified — use team size below'}
Current open risks across portfolio: ${risks.filter((r: Risk) => r.status !== 'closed').length} open risks
Total active tasks in flight: ${tasks.filter((t: Task) => t.status === 'active').length}` : ''
    ai('planner',
      `You are an expert PM with 20 years experience. Generate a comprehensive project plan using EXACTLY this structure with these EXACT section headers (used for parsing):

TASKS:
- Task name | priority (high/medium/low) | owner name or "Unassigned" | due date as YYYY-MM-DD or "TBD"

RISKS:
- Risk title | level (critical/high/medium/low) | description

MILESTONES:
- Milestone name | due date as YYYY-MM-DD

SUMMARY:
2-3 sentences overview.

PHASES:
Phase breakdown with dates.

KPIS:
Success metrics.

Rules: Use bullet points only. No markdown tables. Be specific, not generic. Assign tasks to named team members if provided. IMPORTANT: Today is ${new Date().toISOString().split('T')[0]} — ALL dates must be AFTER today. Never use past dates.`,
      `New Project: ${name || 'New Project'}\nProject Start Date: ${new Date().toISOString().split('T')[0]}\nTimeline: ${timeline}\nTeam Size: ${team}\n\nBrief:\n${brief}${existingContext}`
    )
    setPopulateResult(null)
  }

  const autoPopulate = async () => {
    if (!aiText['planner'] || !targetProjectId || !user) return
    setPopulating(true)
    const raw = aiText['planner']

    // Parse TASKS section
    const tasksMatch = raw.match(/TASKS[:\s]*\n([\s\S]*?)(?=\n[A-Z]+:|$)/i)
    const tasksRaw = tasksMatch ? tasksMatch[1] : ''
    const taskLines = tasksRaw.split('\n').filter((l: string) => l.trim().startsWith('-')).map((l: string) => l.replace(/^-\s*/, '').trim())

    // Parse RISKS section
    const risksMatch = raw.match(/RISKS[:\s]*\n([\s\S]*?)(?=\n[A-Z]+:|$)/i)
    const risksRaw = risksMatch ? risksMatch[1] : ''
    const riskLines = risksRaw.split('\n').filter((l: string) => l.trim().startsWith('-')).map((l: string) => l.replace(/^-\s*/, '').trim())

    // Parse MILESTONES section
    const msMatch = raw.match(/MILESTONES[:\s]*\n([\s\S]*?)(?=\n[A-Z]+:|$)/i)
    const msRaw = msMatch ? msMatch[1] : ''
    const msLines = msRaw.split('\n').filter((l: string) => l.trim().startsWith('-')).map((l: string) => l.replace(/^-\s*/, '').trim())

    let taskCount = 0; let riskCount = 0; let msCount = 0

    // Insert tasks
    for (const line of taskLines) {
      const parts = line.split('|').map((p: string) => p.trim())
      if (!parts[0]) continue
      const taskName = parts[0]
      const priority = ['high','medium','low'].includes(parts[1]?.toLowerCase()) ? parts[1].toLowerCase() : 'medium'
      const owner = parts[2] === 'Unassigned' || !parts[2] ? '' : parts[2]
      const dueRaw = parts[3]
      const dueDate = dueRaw && dueRaw !== 'TBD' && /\d{4}-\d{2}-\d{2}/.test(dueRaw) ? dueRaw : null
      const { error } = await supabase.from('tasks').insert({ user_id: user.id, project_id: targetProjectId, name: taskName, status: 'todo', priority, owner, due_date: dueDate })
      if (!error) taskCount++
    }

    // Insert risks
    for (const line of riskLines) {
      const parts = line.split('|').map((p: string) => p.trim())
      if (!parts[0]) continue
      const title = parts[0]
      const level = ['critical','high','medium','low'].includes(parts[1]?.toLowerCase()) ? parts[1].toLowerCase() : 'medium'
      const description = parts[2] || ''
      const { error } = await supabase.from('risks').insert({ user_id: user.id, project_id: targetProjectId, title, level, description, status: 'open' })
      if (!error) riskCount++
    }

    // Insert milestones
    for (const line of msLines) {
      const parts = line.split('|').map((p: string) => p.trim())
      if (!parts[0]) continue
      const title = parts[0]
      const dueRaw = parts[1]
      const dueDate = dueRaw && dueRaw !== 'TBD' && /\d{4}-\d{2}-\d{2}/.test(dueRaw) ? dueRaw : null
      const { error } = await supabase.from('milestones').insert({ user_id: user.id, project_id: targetProjectId, title, due_date: dueDate, status: 'pending' })
      if (!error) msCount++
    }

    setPopulateResult({ tasks: taskCount, risks: riskCount, milestones: msCount })
    setPopulating(false)
    if (onPopulated) onPopulated()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
      <div style={s.card}>
        <div style={s.sectionTitle}>Project Brief</div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Project Name</div><input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Customer Portal v2"/></div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Brief Description</div><textarea style={{ ...s.input, minHeight: '120px', resize: 'vertical' as const }} value={brief} onChange={e => setBrief(e.target.value)} placeholder="Describe your project, goals, constraints, deliverables..."/></div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
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
        <button style={{ ...s.btnGold, width: '100%' }} onClick={generate}>{aiLoading['planner'] ? '✦ Generating...' : '✦ Generate Full Project Plan →'}</button>

        {/* Auto-populate panel — appears after plan is generated */}
        {aiText['planner'] && !aiLoading['planner'] && (
          <div style={{ marginTop: '14px', padding: '14px', background: 'rgba(201,153,58,0.05)', border: `1px solid rgba(201,153,58,0.25)`, borderRadius: '4px' }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', color: goldDim, marginBottom: '10px' }}>⚡ AUTO-POPULATE PROJECT</div>
            <div style={{ fontSize: '11px', color: '#A8C0DC', marginBottom: '10px', lineHeight: 1.6 }}>
              Select a project and click Populate — tasks, risks and milestones from this plan will be created automatically.
            </div>
            <div style={{ marginBottom: '10px' }}>
              <div style={s.label}>Target Project</div>
              <select style={s.input} value={targetProjectId} onChange={e => setTargetProjectId(e.target.value)}>
                <option value="">Select project...</option>
                {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {populateResult && (
              <div style={{ marginBottom: '10px', padding: '10px 12px', background: 'rgba(34,201,144,0.08)', border: '1px solid rgba(34,201,144,0.25)', borderRadius: '3px' }}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: '#22C990', marginBottom: '4px', fontWeight: 700 }}>✓ Successfully populated!</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: '#A8C0DC' }}>
                  {populateResult.tasks} tasks · {populateResult.risks} risks · {populateResult.milestones} milestones created
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button style={{ ...s.btnGhost, fontSize: '9px', padding: '4px 10px' }} onClick={() => setTab('tasks')}>View Tasks →</button>
                  <button style={{ ...s.btnGhost, fontSize: '9px', padding: '4px 10px' }} onClick={() => setTab('timeline')}>View Timeline →</button>
                </div>
              </div>
            )}
            <button style={{ ...s.btnGold, width: '100%' }} onClick={autoPopulate} disabled={!targetProjectId || populating}>
              {populating ? '⚡ Populating...' : `⚡ Populate "${projects.find((p: Project) => p.id === targetProjectId)?.name || 'Project'}" →`}
            </button>
          </div>
        )}
      </div>
      <div style={s.card}>
        {aiLoading['planner'] && <div style={{ color: textDim, fontSize: '12px', textAlign: 'center', padding: '20px' }}>✦ Generating your project plan...</div>}
        {aiText['planner'] && <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(aiText['planner']) }}/>}
        {!aiLoading['planner'] && !aiText['planner'] && (
          <div>
            <div style={s.sectionTitle}>How It Works</div>
            <div style={{ fontSize: '12px', color: textDim, lineHeight: 1.8 }}>
              Fill in your brief and Empire AI generates a full structured plan. Then use <span style={{ color: gold }}>⚡ Auto-Populate</span> to create everything in one click:<br/><br/>
              <span style={{ color: gold }}>▸</span> Tasks with owners, priorities and due dates<br/>
              <span style={{ color: gold }}>▸</span> Risk register with levels and descriptions<br/>
              <span style={{ color: gold }}>▸</span> Milestones on your Timeline<br/>
              <span style={{ color: gold }}>▸</span> Phase breakdown and KPIs<br/><br/>
              <span style={{ color: '#A8C0DC', fontSize: '11px' }}>No manual entry. Plan → Populate → Execute.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ScopeForm({ ai, aiLoading, aiText, projects, tasks, isMobile }: any) {
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
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
      <div style={s.card}>
        <div style={s.sectionTitle}>Log Scope Change</div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Change Description</div><textarea style={{ ...s.input, minHeight: '100px', resize: 'vertical' as const }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the scope change requested..."/></div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
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
  const planLimitsDisplay: any = {
    starter: '3 projects · 3 team members/project · Risk Radar · Timeline · Time & Billing · No AI suite · No collaboration',
    pro: '10 projects · 8 team members/project · Full AI suite · Client Portal · Team login · Invoice automation · n8n',
    agency: '25 projects · 15 team members/project · Everything in Pro · White label emails · Priority support'
  }
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
            {/* Plan limits display */}
            <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'rgba(8,20,44,0.5)', border: '1px solid rgba(201,153,58,0.15)', borderRadius: '4px' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.16em', color: goldDim, marginBottom: '6px' }}>PLAN LIMITS</div>
              <div style={{ fontSize: '11px', color: textMid }}>{planLimitsDisplay[sub.plan] || planLimitsDisplay.starter}</div>
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

function TimelineView({ projects, tasks, milestones, user, supabase, onSaved, editingId, editFields, startEdit, cancelEdit, saveEdit, deleteRow, editBtn, deleteBtn, inlineInput, inlineSelect, saveBtnInline, isMobile }: any) {
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)

  const gold = '#E8B84B'; const goldDim = '#C9993A'; const navy = '#050D1A'
  const navyCard = 'rgba(16,36,72,0.7)'; const border = 'rgba(201,153,58,0.2)'
  const borderMd = 'rgba(201,153,58,0.35)'; const textBright = '#E8F0FF'
  const textMid = '#C8DCF4'; const textDim = '#A8C0DC'
  const whiteFaint = '#C0D4EC'

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
          return <span key={pct} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, color: '#C8DCF4', letterSpacing: '0.06em' }}>{fmtDate(d.toISOString().split('T')[0])}</span>
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
              const dep = t.depends_on ? projTasks.find((d: Task) => d.id === t.depends_on) : null
              const depIncomplete = dep && dep.status !== 'done'
              const depOverdue = dep && dep.status !== 'done' && dep.due_date && new Date(dep.due_date) < new Date()
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '5px 16px', minHeight: '30px' }}>
                  {/* Label */}
                  <div style={{ width: '204px', flexShrink: 0, paddingRight: '16px' }}>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 500, color: isOverdue ? '#FF9090' : textMid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    <div style={{ display: 'flex', gap: '5px', marginTop: '2px', flexWrap: 'wrap' as const }}>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', padding: '1px 4px', borderRadius: '2px', background: t.status === 'done' ? 'rgba(34,201,144,0.12)' : t.status === 'active' ? 'rgba(26,171,204,0.12)' : t.status === 'blocked' ? 'rgba(226,75,74,0.12)' : 'rgba(255,255,255,0.05)', color: t.status === 'done' ? '#4DFFB4' : t.status === 'active' ? '#4DD8F0' : t.status === 'blocked' ? '#FF9090' : whiteFaint }}>{t.status}</span>
                      {t.owner && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: goldDim }}>{t.owner}</span>}
                      {dep && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: depOverdue ? '#FF9090' : depIncomplete ? '#FFD080' : '#22C990', padding: '1px 4px', background: depOverdue ? 'rgba(226,75,74,0.1)' : depIncomplete ? 'rgba(245,166,35,0.1)' : 'rgba(34,201,144,0.1)', borderRadius: '2px' }}>⊘ {dep.name.slice(0,14)}{dep.name.length > 14 ? '…' : ''}</span>}
                    </div>
                  </div>
                  {/* Track + bar */}
                  <div style={{ flex: 1, position: 'relative', height: '20px' }}>
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.04)', transform: 'translateY(-50%)' }}/>
                    {/* Dependency arrow — line from dep bar end to this bar start */}
                    {dep && dep.due_date && (() => {
                      const depEndPct = toPercent(dep.due_date)
                      const thisStartPct = startPct
                      if (depEndPct < thisStartPct) {
                        const lineLeft = Math.min(depEndPct, thisStartPct)
                        const lineWidth = Math.abs(thisStartPct - depEndPct)
                        return (
                          <div style={{ position: 'absolute', left: `${lineLeft}%`, width: `${lineWidth}%`, top: '50%', height: '1px', background: depOverdue ? 'rgba(226,75,74,0.5)' : 'rgba(255,208,128,0.35)', transform: 'translateY(-50%)' }}>
                            <div style={{ position: 'absolute', right: 0, top: '-3px', width: 0, height: 0, borderTop: '3px solid transparent', borderBottom: '3px solid transparent', borderLeft: `5px solid ${depOverdue ? 'rgba(226,75,74,0.7)' : 'rgba(255,208,128,0.5)'}` }}/>
                          </div>
                        )
                      }
                      return null
                    })()}
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

// ─── PROPOSAL FORM ───────────────────────────────────────────────────────────

function ProposalForm({ user, projects, supabase, onCreated, setTab, isMobile }: any) {
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [projectType, setProjectType] = useState('')
  const [budget, setBudget] = useState('')
  const [timeline, setTimeline] = useState('')
  const [scopeSummary, setScopeSummary] = useState('')
  const [deliverables, setDeliverables] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedBody, setGeneratedBody] = useState('')

  const gold = '#E8B84B'; const goldDim = '#C9993A'; const navy = '#050D1A'
  const border = 'rgba(201,153,58,0.2)'; const textMid = '#C8DCF4'; const textDim = '#A8C0DC'

  const generateAndSave = async () => {
    if (!title || !clientName || !user) return
    setGenerating(true)
    setGeneratedBody('')

    const pmName = user?.user_metadata?.full_name || user?.email || 'Project Manager'

    const budgetStr = budget ? '$' + Number(budget).toLocaleString() : 'To be confirmed'

    const aiBody = await callAI(
      `You are ${pmName}, a professional project manager writing a client proposal. Write in a confident, polished, client-facing tone. Use bullet points for deliverables and scope. Structure the proposal with clear sections. No markdown tables. CRITICAL: You must use EXACTLY the budget figure provided — never change, round, or estimate a different number. The budget is a hard constraint given by the PM.`,
      `Write a professional project proposal with these exact sections:

PROPOSAL OVERVIEW
A 2-sentence summary of what we are proposing to deliver.

SCOPE OF WORK
What is included in this engagement. Use bullet points.

DELIVERABLES
Specific items the client will receive. Use bullet points.

TIMELINE
How the project will be phased and delivered.

INVESTMENT
IMPORTANT: The total investment is EXACTLY ${budgetStr}. Do not change this figure under any circumstances. State the total as ${budgetStr}, explain what it covers, then list payment terms: 50% upfront, 50% on completion.

NEXT STEPS
How to proceed — simple 3-step CTA.

---
Project: ${title}
Client: ${clientName}
Type: ${projectType || 'Project'}
Budget (USE THIS EXACT FIGURE): ${budgetStr}
Timeline: ${timeline || 'To be confirmed'}
Scope: ${scopeSummary || 'Full project scope as discussed'}
Deliverables: ${deliverables || 'As agreed in brief'}`
    )

    // Save to Supabase
    await supabase.from('proposals').insert({
      user_id: user.id,
      title,
      client_name: clientName,
      project_type: projectType,
      budget: budget ? parseFloat(budget) : null,
      timeline: timeline || null,
      scope_summary: scopeSummary || null,
      deliverables: deliverables || null,
      status: 'draft',
      ai_body: aiBody,
    })

    setGeneratedBody(aiBody)
    setGenerating(false)
    setTitle(''); setClientName(''); setProjectType(''); setBudget(''); setTimeline(''); setScopeSummary(''); setDeliverables('')
    onCreated()
  }

  return (
    <div>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '5px' }}>Proposal Title</div>
        <input style={{ width: '100%', background: 'rgba(16,36,72,0.8)', border: `1px solid ${border}`, borderRadius: '3px', padding: '9px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#F0F6FF', outline: 'none' }}
          value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. E-Commerce Platform Redesign"/>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '5px' }}>Client Name</div>
          <input style={{ width: '100%', background: 'rgba(16,36,72,0.8)', border: `1px solid ${border}`, borderRadius: '3px', padding: '9px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#F0F6FF', outline: 'none' }}
            value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Acme Corp"/>
        </div>
        <div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '5px' }}>Project Type</div>
          <input style={{ width: '100%', background: 'rgba(16,36,72,0.8)', border: `1px solid ${border}`, borderRadius: '3px', padding: '9px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#F0F6FF', outline: 'none' }}
            value={projectType} onChange={e => setProjectType(e.target.value)} placeholder="e.g. Web Development"/>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '5px' }}>Budget ($)</div>
          <input style={{ width: '100%', background: 'rgba(16,36,72,0.8)', border: `1px solid ${border}`, borderRadius: '3px', padding: '9px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#F0F6FF', outline: 'none' }}
            value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. 15000" type="number"/>
        </div>
        <div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '5px' }}>Timeline</div>
          <input style={{ width: '100%', background: 'rgba(16,36,72,0.8)', border: `1px solid ${border}`, borderRadius: '3px', padding: '9px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#F0F6FF', outline: 'none' }}
            value={timeline} onChange={e => setTimeline(e.target.value)} placeholder="e.g. 6 weeks"/>
        </div>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '5px' }}>Scope Summary</div>
        <textarea style={{ width: '100%', background: 'rgba(16,36,72,0.8)', border: `1px solid ${border}`, borderRadius: '3px', padding: '9px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#F0F6FF', outline: 'none', resize: 'vertical' as const, minHeight: '70px' }}
          value={scopeSummary} onChange={e => setScopeSummary(e.target.value)} placeholder="Brief description of what will be done..."/>
      </div>
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '5px' }}>Key Deliverables</div>
        <textarea style={{ width: '100%', background: 'rgba(16,36,72,0.8)', border: `1px solid ${border}`, borderRadius: '3px', padding: '9px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#F0F6FF', outline: 'none', resize: 'vertical' as const, minHeight: '60px' }}
          value={deliverables} onChange={e => setDeliverables(e.target.value)} placeholder="e.g. 5-page website, admin dashboard, mobile responsive design..."/>
      </div>

      <button
        style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', background: `linear-gradient(135deg, ${goldDim}, ${gold})`, color: navy, border: 'none', padding: '10px 16px', borderRadius: '2px', cursor: generating ? 'not-allowed' : 'pointer', width: '100%', opacity: (!title || !clientName || generating) ? 0.6 : 1 }}
        onClick={generateAndSave}
        disabled={!title || !clientName || generating}
      >
        {generating ? '✦ Generating Proposal...' : '✦ Generate AI Proposal →'}
      </button>

      {generating && (
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: gold, animation: 'pulse 1.2s infinite' }}/>
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: goldDim, letterSpacing: '0.1em' }}>Writing your proposal...</span>
        </div>
      )}

      {generatedBody && (
        <div style={{ marginTop: '14px', background: 'rgba(34,201,144,0.06)', border: '1px solid rgba(34,201,144,0.25)', borderRadius: '4px', padding: '14px 16px' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, color: '#4DFFB4', marginBottom: '6px', letterSpacing: '0.15em' }}>✓ PROPOSAL SAVED</div>
          <div style={{ fontSize: '11px', color: textMid, lineHeight: 1.6 }}>Your proposal has been saved. View it in the list on the right. When accepted, use "Convert to Project" to create a live project automatically.</div>
        </div>
      )}
    </div>
  )
}


// ─── RECURRING INVOICE FORM ──────────────────────────────────────────────────

function RecurringInvoiceForm({ user, projects, supabase, onCreated, isMobile }: any) {
  const [projectId, setProjectId]     = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount]           = useState('')
  const [frequency, setFrequency]     = useState<'monthly'|'weekly'|'quarterly'>('monthly')
  const [startDate, setStartDate]     = useState(new Date().toISOString().split('T')[0])

  const gold = '#E8B84B'; const goldDim = '#C9993A'; const navy = '#050D1A'
  const border = 'rgba(201,153,58,0.2)'

  const submit = async () => {
    if (!description || !amount || !clientEmail || !projectId || !user) return
    await supabase.from('recurring_invoices').insert({
      user_id:       user.id,
      project_id:    projectId,
      client_email:  clientEmail,
      description,
      amount:        parseFloat(amount),
      frequency,
      next_run_date: startDate,
      active:        true,
    })
    setDescription(''); setAmount(''); setClientEmail(''); setProjectId('')
    onCreated()
  }

  return (
    <div>
      <div style={{ marginBottom: '10px' }}>
        <div style={s.label}>Retainer Description</div>
        <input style={s.input} value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Monthly SEO Retainer"/>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <div style={s.label}>Project</div>
          <select style={s.input} value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">Select project...</option>
            {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <div style={s.label}>Client Email</div>
          <input style={s.input} value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@company.com" type="email"/>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <div style={s.label}>Amount ($)</div>
          <input style={s.input} value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 3000" type="number"/>
        </div>
        <div>
          <div style={s.label}>Frequency</div>
          <select style={s.input} value={frequency} onChange={e => setFrequency(e.target.value as any)}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div>
          <div style={s.label}>First Invoice Date</div>
          <input style={s.input} value={startDate} onChange={e => setStartDate(e.target.value)} type="date"/>
        </div>
      </div>
      <div style={{ marginBottom: '14px', padding: '10px 12px', background: 'rgba(201,153,58,0.04)', border: `1px solid rgba(201,153,58,0.12)`, borderRadius: '3px', fontSize: '11px', color: '#A8C0DC', lineHeight: 1.6 }}>
        ↻ An n8n workflow checks daily and auto-sends this invoice on the scheduled date. Use <strong style={{ color: '#E8B84B' }}>Send Now</strong> in the list to fire it manually anytime.
      </div>
      <button
        style={{ ...s.btnGold, width: '100%', opacity: (!description || !amount || !clientEmail || !projectId) ? 0.5 : 1 }}
        onClick={submit}
        disabled={!description || !amount || !clientEmail || !projectId}
      >
        ↻ Create Retainer →
      </button>
    </div>
  )
}

// ─── REPORTS VIEW (v2 — Professional PM Report) ──────────────────────────────

function ReportsView({ projects, tasks, risks, timeLogs, milestones, teamMembers, isMobile }: any) {
  const gold = '#E8B84B'; const goldDim = '#C9993A'; const navy = '#050D1A'
  const navyCard = 'rgba(16,36,72,0.7)'; const border = 'rgba(201,153,58,0.2)'
  const borderMd = 'rgba(201,153,58,0.35)'; const textBright = '#E8F0FF'
  const textMid = '#C8DCF4'; const textDim = '#A8C0DC'

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [execSummary, setExecSummary] = useState('')
  const [editingSummary, setEditingSummary] = useState(false)
  const [nextSteps, setNextSteps] = useState('')
  const [editingNextSteps, setEditingNextSteps] = useState(false)
  const [loadingAI, setLoadingAI] = useState(false)
  const [sectionNotes, setSectionNotes] = useState<Record<string,string>>({})
  const [editingSection, setEditingSection] = useState<string|null>(null)

  const fp = selectedProjectId === 'all' ? projects : projects.filter((p: Project) => p.id === selectedProjectId)
  const ft = tasks.filter((t: Task) => selectedProjectId === 'all' || t.project_id === selectedProjectId)
  const fr = risks.filter((r: Risk) => selectedProjectId === 'all' || r.project_id === selectedProjectId)
  const fl = timeLogs.filter((l: TimeLog) => selectedProjectId === 'all' || l.project_id === selectedProjectId)
  const fm = milestones.filter((m: Milestone) => selectedProjectId === 'all' || m.project_id === selectedProjectId)

  const doneTasks = ft.filter((t: Task) => t.status === 'done').length
  const overdueTasks = ft.filter((t: Task) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done')
  const blockedTasks = ft.filter((t: Task) => t.status === 'blocked')
  const completionRate = ft.length > 0 ? Math.round((doneTasks / ft.length) * 100) : 0
  const openRisks = fr.filter((r: Risk) => r.status !== 'closed')
  const criticalRisks = openRisks.filter((r: Risk) => r.level === 'critical' || r.level === 'high')
  const mitigatedRisks = fr.filter((r: Risk) => r.status === 'mitigated')
  const totalHours = fl.reduce((s: number, l: TimeLog) => s + Number(l.hours), 0)
  const totalBillable = fl.reduce((s: number, l: TimeLog) => s + Number(l.hours) * Number(l.rate), 0)
  const avgHealth = fp.length > 0 ? Math.round(fp.reduce((s: number, p: Project) => s + p.health, 0) / fp.length) : 0
  const completedMs = fm.filter((m: Milestone) => m.status === 'completed').length

  // RAG status
  const ragStatus = criticalRisks.length > 0 || overdueTasks.length > 2 || avgHealth < 40 ? 'RED'
    : overdueTasks.length > 0 || openRisks.length > 0 || avgHealth < 70 ? 'AMBER' : 'GREEN'
  const ragColor = ragStatus === 'RED' ? '#E24B4A' : ragStatus === 'AMBER' ? '#F5A623' : '#22C990'
  const ragBg = ragStatus === 'RED' ? 'rgba(226,75,74,0.1)' : ragStatus === 'AMBER' ? 'rgba(245,166,35,0.1)' : 'rgba(34,201,144,0.1)'
  const ragText = ragStatus === 'RED'
    ? `${criticalRisks.length} critical risk${criticalRisks.length !== 1 ? 's' : ''} and ${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? 's' : ''} require immediate attention.`
    : ragStatus === 'AMBER'
    ? `Project is progressing with ${overdueTasks.length > 0 ? `${overdueTasks.length} overdue item${overdueTasks.length !== 1 ? 's' : ''} to resolve` : `${openRisks.length} open risk${openRisks.length !== 1 ? 's' : ''} to monitor`}.`
    : `All projects on track. ${completionRate}% task completion with no critical issues.`

  const generateAI = async () => {
    setLoadingAI(true)
    const prompt = `Write a professional 3-paragraph executive project status report for a client or C-suite stakeholder. Use confident, direct PM language. No bullet points, no markdown, no tables — flowing professional prose only.

Project data:
- Projects: ${fp.map((p: Project) => `${p.name} (${p.status}, ${p.health}% health, client: ${p.client_name || 'Internal'}, due: ${p.end_date || 'TBD'})`).join('; ')}
- Overall RAG status: ${ragStatus}
- Tasks: ${doneTasks}/${ft.length} complete (${completionRate}%), ${overdueTasks.length} overdue, ${blockedTasks.length} blocked
- Milestones: ${completedMs}/${fm.length} completed
- Risks: ${openRisks.length} open (${criticalRisks.length} critical/high), ${mitigatedRisks.length} mitigated
- Hours logged: ${totalHours.toFixed(1)}h, Billable value: $${totalBillable.toLocaleString()}

Paragraph 1: Overall status and trajectory.
Paragraph 2: Key achievements this period and items requiring attention.
Paragraph 3: Confidence statement and forward outlook.`
    const text = await callAI('You are a senior PM writing a professional client-facing status report. Write in first person plural (we). Be confident and factual. No bullet points or markdown.', prompt)
    setExecSummary(text)
    setLoadingAI(false)
  }

  const divider = <div style={{ height: '1px', background: `linear-gradient(90deg, ${borderMd}, transparent)`, margin: '20px 0' }}/>

  const sectionHeader = (num: string, title: string, key: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(201,153,58,0.15)', border: `1px solid ${borderMd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, color: gold, flexShrink: 0 }}>{num}</div>
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: textBright }}>{title}</div>
      </div>
      {editingSection !== key && <button className="no-print" onClick={() => setEditingSection(key)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(200,220,255,0.75)', letterSpacing: '0.1em', padding: 0 }}>
        ✎ ADD NOTE
      </button>}
    </div>
  )

  const noteBlock = (key: string) => (
    <>
      {editingSection === key && (
        <div style={{ marginTop: '14px' }}>
          <textarea value={sectionNotes[key] || ''} onChange={e => setSectionNotes(p => ({...p, [key]: e.target.value}))}
            placeholder="Add PM notes — this will appear in the printed report..."
            style={{ width: '100%', background: 'rgba(8,20,44,0.8)', border: `1px solid ${borderMd}`, borderRadius: '3px', padding: '10px 12px', color: textMid, fontFamily: 'DM Sans, sans-serif', fontSize: '12px', resize: 'vertical', minHeight: '64px', outline: 'none' }}/>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button onClick={() => setEditingSection(null)}
              style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', background: `linear-gradient(135deg, #C9993A, #E8B84B)`, color: '#050D1A', border: 'none', padding: '6px 14px', borderRadius: '2px', cursor: 'pointer' }}>
              Save Note →
            </button>
          </div>
        </div>
      )}
      {sectionNotes[key] && editingSection !== key && (
        <div style={{ marginTop: '14px', padding: '12px 14px', background: 'rgba(201,153,58,0.04)', borderLeft: `3px solid ${goldDim}`, borderRadius: '0 3px 3px 0' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', letterSpacing: '0.2em', color: goldDim, marginBottom: '5px' }}>PM NOTE</div>
          <div style={{ fontSize: '12px', color: textMid, fontStyle: 'italic', lineHeight: '1.6' }}>{sectionNotes[key]}</div>
        </div>
      )}
    </>
  )

  return (
    <div>
      <style>{`
        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* Toolbar — no-print */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>
          Project <em style={{ color: gold }}>Report</em>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
            style={{ background: 'rgba(16,36,72,0.8)', border: `1px solid ${borderMd}`, borderRadius: '3px', padding: '7px 12px', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textBright, outline: 'none' }}>
            <option value="all">All Projects</option>
            {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={generateAI} disabled={loadingAI}
            style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', background: 'rgba(201,153,58,0.1)', border: `1px solid ${borderMd}`, color: gold, padding: '8px 14px', borderRadius: '2px', cursor: 'pointer', opacity: loadingAI ? 0.6 : 1 }}>
            {loadingAI ? '✦ Generating...' : '✦ AI Summary'}
          </button>
          <button onClick={() => {
            const el = document.getElementById('empire-report')
            if (!el) return
            const html = el.innerHTML
            const win = window.open('', '_blank')
            if (!win) { alert('Please allow popups for this site to export PDF'); return }
            win.document.write('<!DOCTYPE html><html><head><title>Empire PM Report</title><meta charset="utf-8"/><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,400&family=Rajdhani:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet"/><style>*{box-sizing:border-box;margin:0;padding:0}@page{margin:15mm 18mm;size:A4}body{font-family:"DM Sans",sans-serif;background:white;color:#111;font-size:12px;line-height:1.5;width:100%}[style*="rgba(16,36,72"],[style*="rgba(8,20,44"]{background:#f8f9fa!important;border:1px solid #ddd!important;border-radius:4px;padding:14px 16px;margin-bottom:10px;page-break-inside:avoid}.no-print{display:none!important}[style*="Cormorant Garamond"]{font-family:"Cormorant Garamond",Georgia,serif!important}[style*="Rajdhani"]{font-family:"Rajdhani",sans-serif!important}.rag-block{border:2px solid #999!important;padding:14px;margin-bottom:10px}[style*="color: rgb(232, 184, 75)"],[style*="color: #E8B84B"],[style*="color:#E8B84B"]{color:#9a7000!important}[style*="color: rgb(34, 201, 144)"],[style*="color: #22C990"]{color:#1a7a50!important}[style*="color: rgb(226, 75, 74)"],[style*="color: #FF9090"],[style*="color: #E24B4A"]{color:#c0392b!important}[style*="background: linear-gradient"]{-webkit-print-color-adjust:exact;print-color-adjust:exact}div{max-width:100%}</style></head><body id="empire-report">' + html + '<script>window.onload=function(){setTimeout(function(){window.print()},800)}<\/script></body></html>')
            win.document.close()
          }}
            style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', background: `linear-gradient(135deg, ${goldDim}, ${gold})`, color: navy, border: 'none', padding: '8px 16px', borderRadius: '2px', cursor: 'pointer' }}>
            ⬇ Export PDF
          </button>
        </div>
      </div>

      {/* ══ REPORT BODY ══ */}
      <div id="empire-report" style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* ── Cover Header ── */}
        <div style={{ background: 'rgba(8,20,44,0.8)', border: `1px solid ${borderMd}`, borderRadius: '6px', padding: '28px 32px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.3em', color: goldDim, marginBottom: '8px' }}>EMPIRE PM · PROJECT STATUS REPORT</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: textBright, marginBottom: '6px' }}>
                {selectedProjectId === 'all' ? 'All Projects Overview' : fp[0]?.name || 'Project Report'}
              </div>
              {selectedProjectId !== 'all' && fp[0]?.client_name && (
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', color: textDim }}>Client: {fp[0].client_name}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: textDim, marginBottom: '4px', letterSpacing: '0.08em' }}>REPORT DATE</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: textMid }}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              {selectedProjectId !== 'all' && fp[0] && (
                <>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: textDim, marginTop: '8px', letterSpacing: '0.08em' }}>PROJECT PERIOD</div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textMid }}>{fmtDate(fp[0].start_date)} → {fmtDate(fp[0].end_date)}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── RAG Status Banner ── */}
        <div className="rag-block" style={{ background: ragBg, border: `2px solid ${ragColor}`, borderRadius: '6px', padding: '18px 24px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: ragColor, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${ragColor}55` }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700, color: navy, letterSpacing: '0.05em' }}>{ragStatus}</div>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', color: ragColor, marginBottom: '4px' }}>OVERALL PROJECT STATUS</div>
            <div style={{ fontSize: '13px', color: textMid, lineHeight: '1.5' }}>{ragText}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '20px', flexShrink: 0 }}>
            {[
              { val: `${avgHealth}%`, sub: 'Avg Health' },
              { val: `${completionRate}%`, sub: 'Tasks Done' },
              { val: `${completedMs}/${fm.length}`, sub: 'Milestones' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: textBright }}>{s.val}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: textDim, letterSpacing: '0.12em' }}>{s.sub.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 1: Project Snapshot ── */}
        <div style={{ background: navyCard, border: `1px solid ${border}`, borderRadius: '6px', padding: '24px 28px', marginBottom: '14px' }}>
          {sectionHeader('1', 'PROJECT SNAPSHOT', 'snapshot')}
          {fp.map((p: Project) => {
            const pTasks = tasks.filter((t: Task) => t.project_id === p.id)
            const pDone = pTasks.filter((t: Task) => t.status === 'done').length
            const pOverdue = pTasks.filter((t: Task) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length
            const pRisks = risks.filter((r: Risk) => r.project_id === p.id && r.status !== 'closed').length
            const pHours = timeLogs.filter((l: TimeLog) => l.project_id === p.id).reduce((s: number, l: TimeLog) => s + Number(l.hours), 0)
            const daysLeft = p.end_date ? Math.ceil((new Date(p.end_date).getTime() - Date.now()) / 86400000) : null
            const isOverdue = daysLeft !== null && daysLeft < 0
            return (
              <div key={p.id} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid rgba(201,153,58,0.1)` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '15px', fontWeight: 700, color: textBright, marginBottom: '2px' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: textDim }}>{p.client_name || 'Internal'} · {p.status}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', color: p.health >= 70 ? '#22C990' : p.health >= 40 ? '#FFD080' : '#FF9090', lineHeight: 1 }}>{p.health}%</div>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: textDim, letterSpacing: '0.15em' }}>HEALTH</div>
                  </div>
                </div>
                {/* Health bar — large */}
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div className="health-bar-fill" style={{ height: '8px', width: `${p.health}%`, background: p.health >= 70 ? 'linear-gradient(90deg,#1AABCC,#22C990)' : p.health >= 40 ? 'linear-gradient(90deg,#C9993A,#E8B84B)' : 'linear-gradient(90deg,#E24B4A,#FF9090)', borderRadius: '4px', transition: 'width 0.5s' }}/>
                </div>
                {/* Key metrics row */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(5,1fr)', gap: '8px' }}>
                  {[
                    { label: 'Tasks Done', val: `${pDone}/${pTasks.length}`, color: textMid },
                    { label: 'Overdue Tasks', val: pOverdue, color: pOverdue > 0 ? '#FF9090' : '#22C990' },
                    { label: 'Open Risks', val: pRisks, color: pRisks > 0 ? '#FFD080' : '#22C990' },
                    { label: 'Hours Logged', val: `${pHours.toFixed(1)}h`, color: textMid },
                    { label: daysLeft !== null ? (isOverdue ? 'Days Overdue' : 'Days Remaining') : 'Deadline', val: daysLeft !== null ? Math.abs(daysLeft) : '—', color: isOverdue ? '#FF9090' : daysLeft !== null && daysLeft <= 7 ? '#FFD080' : textMid },
                  ].map((m, i) => (
                    <div key={i} style={{ background: 'rgba(8,20,44,0.5)', border: `1px solid rgba(201,153,58,0.1)`, borderRadius: '4px', padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: m.color, marginBottom: '3px' }}>{m.val}</div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: textDim, letterSpacing: '0.12em' }}>{m.label.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                {p.end_date && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px', position: 'relative', overflow: 'hidden' }}>
                      {p.start_date && (() => {
                        const start = new Date(p.start_date).getTime(); const end = new Date(p.end_date!).getTime(); const now = Date.now()
                        const elapsed = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
                        return <div style={{ height: '2px', width: `${elapsed}%`, background: isOverdue ? '#E24B4A' : gold, borderRadius: '1px' }}/>
                      })()}
                    </div>
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: isOverdue ? '#FF9090' : textDim, flexShrink: 0 }}>{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</span>
                  </div>
                )}
              </div>
            )
          })}
          {noteBlock('snapshot')}
        </div>

        {/* ── Section 2: Milestone Tracker ── */}
        <div style={{ background: navyCard, border: `1px solid ${border}`, borderRadius: '6px', padding: '24px 28px', marginBottom: '14px' }}>
          {sectionHeader('2', 'MILESTONE TRACKER', 'milestones')}
          {fm.length === 0 ? (
            <div style={{ fontSize: '12px', color: textDim, padding: '8px 0' }}>No milestones logged. Add milestones in the Timeline tab.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {fm.map((m: Milestone) => {
                const isCompleted = m.status === 'completed'
                const isOverdue = m.due_date && new Date(m.due_date) < new Date() && !isCompleted
                const proj = projects.find((p: Project) => p.id === m.project_id)
                const msColor = isCompleted ? '#22C990' : isOverdue ? '#E24B4A' : m.status === 'in-progress' ? '#4DD8F0' : goldDim
                return (
                  <div key={m.id} style={{ background: 'rgba(8,20,44,0.5)', border: `1px solid ${isCompleted ? 'rgba(34,201,144,0.25)' : isOverdue ? 'rgba(226,75,74,0.25)' : border}`, borderRadius: '4px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: isCompleted ? 'rgba(34,201,144,0.2)' : 'rgba(255,255,255,0.05)', border: `2px solid ${msColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        {isCompleted && <span style={{ fontSize: '9px', color: '#22C990' }}>✓</span>}
                        {isOverdue && <span style={{ fontSize: '9px', color: '#E24B4A' }}>!</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, color: isCompleted ? '#22C990' : isOverdue ? '#FF9090' : textMid, marginBottom: '3px' }}>{m.title}</div>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textDim }}>{fmtDate(m.due_date)}</div>
                        {proj && selectedProjectId === 'all' && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: '#E8C96A', marginTop: '2px' }}>{proj.name}</div>}
                      </div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', padding: '2px 6px', borderRadius: '10px', background: `${msColor}15`, color: msColor, border: `1px solid ${msColor}40`, flexShrink: 0 }}>
                        {m.status?.toUpperCase()}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {/* Progress bar */}
          {fm.length > 0 && (
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, letterSpacing: '0.12em', flexShrink: 0 }}>MILESTONE PROGRESS</div>
              <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '6px', width: `${fm.length > 0 ? (completedMs / fm.length) * 100 : 0}%`, background: 'linear-gradient(90deg,#1AABCC,#22C990)', borderRadius: '3px', transition: 'width 0.5s' }}/>
              </div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: '#22C990', flexShrink: 0 }}>{completedMs}/{fm.length}</div>
            </div>
          )}
          {noteBlock('milestones')}
        </div>

        {/* ── Section 3: Task Summary ── */}
        <div style={{ background: navyCard, border: `1px solid ${border}`, borderRadius: '6px', padding: '24px 28px', marginBottom: '14px' }}>
          {sectionHeader('3', 'TASK SUMMARY', 'tasks')}
          {/* Completion bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: textDim, letterSpacing: '0.12em' }}>COMPLETION RATE</span>
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: completionRate >= 70 ? '#22C990' : completionRate >= 40 ? '#FFD080' : '#FF9090' }}>{completionRate}%</span>
            </div>
            <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ height: '10px', width: `${completionRate}%`, background: completionRate >= 70 ? 'linear-gradient(90deg,#1AABCC,#22C990)' : completionRate >= 40 ? 'linear-gradient(90deg,#C9993A,#E8B84B)' : 'linear-gradient(90deg,#E24B4A,#FF9090)', borderRadius: '5px', transition: 'width 0.5s' }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textDim }}>{doneTasks} DONE</span>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim }}>{ft.length - doneTasks} REMAINING</span>
            </div>
          </div>
          {/* Status breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '8px', marginBottom: '16px' }}>
            {[
              { label: 'To Do', val: ft.filter((t: Task) => t.status === 'todo').length, color: textDim },
              { label: 'Active', val: ft.filter((t: Task) => t.status === 'active').length, color: '#4DD8F0' },
              { label: 'Blocked', val: blockedTasks.length, color: blockedTasks.length > 0 ? '#FFD080' : textDim },
              { label: 'Done', val: doneTasks, color: '#22C990' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(8,20,44,0.5)', border: `1px solid rgba(201,153,58,0.1)`, borderRadius: '4px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: s.color, marginBottom: '3px' }}>{s.val}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: textDim, letterSpacing: '0.15em' }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
          {overdueTasks.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', color: '#FF9090', marginBottom: '8px', paddingBottom: '4px', borderBottom: `1px solid rgba(226,75,74,0.2)` }}>⚠ OVERDUE TASKS</div>
              {overdueTasks.map((t: Task) => {
                const proj = projects.find((p: Project) => p.id === t.project_id)
                return (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <span style={{ fontSize: '12px', color: textMid }}>{t.name}</span>
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: '#FF9090' }}>{proj?.name} · {fmtDate(t.due_date)}</span>
                  </div>
                )
              })}
            </div>
          )}
          {blockedTasks.length > 0 && (
            <div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', color: '#FFD080', marginBottom: '8px', paddingBottom: '4px', borderBottom: `1px solid rgba(245,166,35,0.2)` }}>⊘ BLOCKED TASKS</div>
              {blockedTasks.map((t: Task) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <span style={{ fontSize: '12px', color: textMid }}>{t.name}</span>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: '#FFD080' }}>{t.owner || 'Unassigned'}</span>
                </div>
              ))}
            </div>
          )}
          {noteBlock('tasks')}
        </div>

        {/* ── Section 4: Risk Register ── */}
        <div style={{ background: navyCard, border: `1px solid ${border}`, borderRadius: '6px', padding: '24px 28px', marginBottom: '14px' }}>
          {sectionHeader('4', 'RISK REGISTER', 'risks')}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '8px', marginBottom: '16px' }}>
            {[
              { label: 'Total Risks', val: fr.length, color: textMid },
              { label: 'Open', val: openRisks.length, color: openRisks.length > 0 ? '#FFD080' : '#22C990' },
              { label: 'Critical / High', val: criticalRisks.length, color: criticalRisks.length > 0 ? '#FF9090' : '#22C990' },
              { label: 'Mitigated', val: mitigatedRisks.length, color: '#22C990' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(8,20,44,0.5)', border: `1px solid rgba(201,153,58,0.1)`, borderRadius: '4px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: s.color, marginBottom: '3px' }}>{s.val}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: textDim, letterSpacing: '0.12em' }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
          {openRisks.length > 0 && (
            <div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', color: textDim, marginBottom: '8px', paddingBottom: '4px', borderBottom: `1px solid ${border}` }}>OPEN RISKS</div>
              {openRisks.map((r: Risk) => {
                const proj = projects.find((p: Project) => p.id === r.project_id)
                const lc = r.level === 'critical' ? '#FF9090' : r.level === 'high' ? '#FFAA88' : r.level === 'medium' ? '#FFD080' : '#4DD8F0'
                const lb = r.level === 'critical' ? 'rgba(226,75,74,0.12)' : r.level === 'high' ? 'rgba(255,112,67,0.1)' : r.level === 'medium' ? 'rgba(245,166,35,0.1)' : 'rgba(26,171,204,0.1)'
                return (
                  <div key={r.id} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <div style={{ width: '56px', flexShrink: 0, paddingTop: '2px' }}>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', fontWeight: 700, padding: '3px 6px', borderRadius: '2px', background: lb, color: lc, letterSpacing: '0.1em' }}>{r.level?.toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textMid, marginBottom: '2px' }}>{r.title}</div>
                      {r.description && <div style={{ fontSize: '11px', color: textDim, lineHeight: '1.5' }}>{r.description}</div>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {proj && selectedProjectId === 'all' && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: '#E8C96A' }}>{proj.name}</div>}
                      {r.due_date && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textDim, marginTop: '3px' }}>By {fmtDate(r.due_date)}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {fr.length === 0 && <div style={{ fontSize: '12px', color: textDim }}>No risks logged.</div>}
          {noteBlock('risks')}
        </div>

        {/* ── Section 5: Time & Billing ── */}
        <div style={{ background: navyCard, border: `1px solid ${border}`, borderRadius: '6px', padding: '24px 28px', marginBottom: '14px' }}>
          {sectionHeader('5', 'TIME & BILLING SUMMARY', 'billing')}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: '10px', marginBottom: '16px' }}>
            {[
              { label: 'Total Hours', val: `${totalHours.toFixed(1)}h`, color: textMid },
              { label: 'Billable Value', val: `$${totalBillable.toLocaleString()}`, color: gold },
              { label: 'Avg Rate / Hr', val: `$${totalHours > 0 ? (totalBillable/totalHours).toFixed(0) : 0}`, color: textMid },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(8,20,44,0.5)', border: `1px solid rgba(201,153,58,0.1)`, borderRadius: '4px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: s.color, marginBottom: '4px' }}>{s.val}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: textDim, letterSpacing: '0.15em' }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
          {fp.map((p: Project) => {
            const pLogs = timeLogs.filter((l: TimeLog) => l.project_id === p.id)
            const pH = pLogs.reduce((s: number, l: TimeLog) => s + Number(l.hours), 0)
            const pB = pLogs.reduce((s: number, l: TimeLog) => s + Number(l.hours) * Number(l.rate), 0)
            if (pLogs.length === 0) return null
            const pPct = totalBillable > 0 ? (pB / totalBillable) * 100 : 0
            return (
              <div key={p.id} style={{ padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textMid }}>{p.name}</span>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textDim }}>{pH.toFixed(1)}h</span>
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '14px', color: gold }}>${pB.toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '3px', width: `${pPct}%`, background: `linear-gradient(90deg,${goldDim},${gold})`, borderRadius: '2px' }}/>
                </div>
              </div>
            )
          })}
          {noteBlock('billing')}
        </div>

        {/* ── Section 6: Executive Summary ── */}
        <div style={{ background: navyCard, border: `1px solid ${border}`, borderRadius: '6px', padding: '24px 28px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(201,153,58,0.15)', border: `1px solid ${borderMd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, color: gold }}>6</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: textBright }}>EXECUTIVE SUMMARY</div>
            </div>
            <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
              {execSummary && <button onClick={() => setEditingSummary(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: editingSummary ? gold : 'rgba(200,220,255,0.75)', letterSpacing: '0.1em' }}>{editingSummary ? 'DONE' : '✎ EDIT'}</button>}
            </div>
          </div>
          {!execSummary && !loadingAI && (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: '28px', opacity: 0.15, marginBottom: '10px' }}>✦</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', color: textMid, marginBottom: '6px' }}>No summary generated yet</div>
              <div style={{ fontSize: '11px', color: textDim }}>Click "✦ AI Summary" at the top to generate a professional client-ready narrative from your project data.</div>
            </div>
          )}
          {loadingAI && <div style={{ textAlign: 'center', padding: '24px', color: gold, fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', letterSpacing: '0.12em', animation: 'pulse 1.5s infinite' }}>✦ Generating executive summary...</div>}
          {execSummary && !editingSummary && <div style={{ fontSize: '13px', color: textMid, lineHeight: '1.8', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'pre-wrap' }}>{execSummary}</div>}
          {editingSummary && (
            <div>
              <textarea value={execSummary} onChange={e => setExecSummary(e.target.value)}
                style={{ width: '100%', background: 'rgba(8,20,44,0.8)', border: `1px solid ${borderMd}`, borderRadius: '3px', padding: '14px', color: textMid, fontFamily: 'DM Sans, sans-serif', fontSize: '13px', lineHeight: '1.8', resize: 'vertical', minHeight: '160px', outline: 'none' }}/>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={() => setEditingSummary(false)}
                  style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', background: `linear-gradient(135deg, #C9993A, #E8B84B)`, color: '#050D1A', border: 'none', padding: '8px 18px', borderRadius: '2px', cursor: 'pointer' }}>
                  Save Summary →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 7: Next Steps ── */}
        <div style={{ background: navyCard, border: `1px solid ${borderMd}`, borderRadius: '6px', padding: '24px 28px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(201,153,58,0.15)', border: `1px solid ${borderMd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, color: gold }}>7</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: textBright }}>NEXT STEPS & ACTIONS</div>
            </div>
            {!editingNextSteps && <button className="no-print" onClick={() => setEditingNextSteps(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(200,220,255,0.75)', letterSpacing: '0.1em' }}>
              ✎ EDIT
            </button>}
          </div>
          {editingNextSteps ? (
            <div>
              <textarea value={nextSteps} onChange={e => setNextSteps(e.target.value)}
                placeholder={`Enter next steps and actions for the client.\n\nExample:\n1. Client review meeting scheduled for [date]\n2. Final UAT sign-off required by [date]\n3. Outstanding deliverable: [name] due [date]`}
                style={{ width: '100%', background: 'rgba(8,20,44,0.8)', border: `1px solid ${borderMd}`, borderRadius: '3px', padding: '14px', color: textMid, fontFamily: 'DM Sans, sans-serif', fontSize: '13px', lineHeight: '1.8', resize: 'vertical', minHeight: '120px', outline: 'none' }}/>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={() => setEditingNextSteps(false)}
                  style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', background: `linear-gradient(135deg, #C9993A, #E8B84B)`, color: '#050D1A', border: 'none', padding: '8px 18px', borderRadius: '2px', cursor: 'pointer' }}>
                  Save Next Steps →
                </button>
              </div>
            </div>
          ) : nextSteps ? (
            <div style={{ fontSize: '13px', color: textMid, lineHeight: '1.8', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'pre-wrap' }}>{nextSteps}</div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '11px', color: textDim, marginBottom: '10px' }}>No next steps added yet. Click ✎ Edit to add actions for the client.</div>
            </div>
          )}
        </div>

        {/* Report footer */}
        <div style={{ textAlign: 'center', padding: '16px', borderTop: `1px solid ${border}`, marginTop: '8px' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: '#C9993A', letterSpacing: '0.2em' }}>GENERATED BY EMPIRE PM · pm.one-empire.com · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</div>
        </div>

      </div>
    </div>
  )
}
