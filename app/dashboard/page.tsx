'use client'
import { useState, useEffect, useRef, Fragment } from 'react'
import { createClient } from '@/lib/supabase-client'
import DOMPurify from 'isomorphic-dompurify'
import { PLANS } from '@/lib/plans'
import ProjectBrief from './project-brief'
import { RiskHeatMap } from './components/RiskHeatMap'
import { ResourceAllocationChart } from './components/ResourceAllocationChart'
import { PortfolioDashboard } from './components/PortfolioDashboard'
import { ProjectForm, TeamMemberForm } from './components/Forms'
import { TaskForm, RiskForm, TimeLogForm } from './components/TaskForms'
import { WorkflowView } from './components/WorkflowView'
import { MeetingProcessor, ClientUpdateForm } from './components/MeetingProcessor'
import { AIPlannerForm } from './components/AIPlannerForm'
import { ScopeForm } from './components/ScopeForm'
import { SettingsForm } from './components/SettingsForm'
import { TimelineView } from './components/TimelineView'
import { MilestoneForm } from './components/MilestoneForm'
import { ProposalForm } from './components/ProposalForm'
import { RecurringInvoiceForm } from './components/RecurringInvoiceForm'
import { AIReportsView } from './components/AIReportsView'
import { ReportsView } from './components/ReportsView'
import { CommunicationAgent } from './components/CommunicationAgent'

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
    .replace(/^### (.+)$/gm, `<div style="font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${gold};margin:14px 0 6px">$1</div>`)
    .replace(/^[-•] (.+)$/gm, `<div style="display:flex;gap:8px;margin:4px 0;padding-left:4px"><span style="color:${goldDim};flex-shrink:0">▸</span><span>$1</span></div>`)
    .replace(/^\d+\. (.+)$/gm, `<div style="display:flex;gap:8px;margin:4px 0;padding-left:4px"><span style="color:${goldDim};flex-shrink:0">▸</span><span>$1</span></div>`)
    .replace(/^---+$/gm, `<hr style="border:none;border-top:1px solid ${border};margin:12px 0">`)
    .replace(/\n\n/g, '<br>').replace(/\n/g, '')
    .replace(/<\/div><br>/g, '</div>')
  return DOMPurify.sanitize(html)
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function callAI(system: string, content: string, _maxTokens = 1000): Promise<string> {
  try {
    // model and max_tokens are pinned server-side in /api/chat — do not send from client
    const res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages: [{ role: 'user', content }] })
    })
    const data = await res.json()
    if (data.content?.[0]?.text) return data.content[0].text
    console.error('AI API error:', res.status, JSON.stringify(data))
    return `API error: ${data.error?.message || data.error?.type || res.status}`
  } catch (err) {
    console.error('callAI fetch error:', err)
    return 'Network error — please try again.'
  }
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
  const [meetings, setMeetings] = useState<any[]>([])
  const [lastMeeting, setLastMeeting] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [aiText, setAiText] = useState<Record<string, string>>({})
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({})
  const [workloadSending, setWorkloadSending] = useState(false)
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
  const [taskView, setTaskView] = useState<'list' | 'kanban' | 'workflow'>('list')
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<Record<string, any>>({})

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUser(user as User); loadData(user.id) }
    })
  }, [])

  const loadData = async (userId: string) => {
    const [p, t, r, tm, tl, profile, ms, subData, pr, ri, mt] = await Promise.all([
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
      supabase.from('meetings').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    ])
    if (p.data) setProjects(p.data)
    if (t.data) setTasks(t.data)
    if (r.data) setRisks(r.data)
    if (tm.data) setTeamMembers(tm.data)
    if (tl.data) setTimeLogs(tl.data)
    if (ms.data) setMilestones(ms.data)
    if (pr.data) setProposals(pr.data)
    if (ri.data) setRecurringInvoices(ri.data)
    if (mt.data) setMeetings(mt.data)
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

  const sendWorkloadReport = async () => {
    const emailEl = document.getElementById('workload-send-email') as HTMLInputElement
    const toEmail = emailEl?.value
    if (!toEmail) { alert('Please enter a recipient email'); return }
    setWorkloadSending(true)
    const pmName = user?.user_metadata?.full_name || 'Project Manager'
    const cleaned = (aiText['workload'] || '')
      .split('**').join('')
      .split('\n').join('<br/>')
    const fullHtml = '<div style="background:#f8f9fa;border-left:4px solid #C9993A;padding:12px 16px;margin-bottom:20px;"><div style="font-size:10px;color:#C9993A;font-weight:700;letter-spacing:2px;margin-bottom:2px;">WORKLOAD ANALYSIS</div><div style="font-size:16px;color:#050D1A;font-weight:600;">Team Capacity Report</div><div style="font-size:12px;color:#666;margin-top:4px;">' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + '</div></div><div style="font-size:13px;line-height:1.8;color:#333;">' + cleaned + '</div><p style="margin:20px 0 0;font-size:12px;color:#999;border-top:1px solid #eee;padding-top:14px;">' + pmName + ' · ' + (user?.email || '') + '<br/>pm.one-empire.com</p>'
    try {
      const res = await fetch('https://n8n.one-empire.com/webhook/empire-pm-invoice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: 'Team', project: 'Workload Report', clientEmail: toEmail, senderName: pmName, senderEmail: user?.email, invoiceDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), dueDate: '', lineItems: '', total: '', coverEmail: fullHtml })
      })
      if (!res.ok) { alert('Failed to send: ' + res.status); setWorkloadSending(false); return }
      alert('Workload report sent to ' + toEmail)
      emailEl.value = ''
    } catch { alert('Network error — check n8n is running.') }
    setWorkloadSending(false)
  }

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

  // ── Plan Limits — sourced from lib/plans.ts (single source of truth) ──
  const plan = subscription?.plan || 'starter'
  const limits = PLANS[plan as keyof typeof PLANS] || PLANS.starter
  const activeProjectCount = projects.filter((p: Project) => p.status !== 'completed').length
  const canAddProject = activeProjectCount < limits.projects
  const uniqueTeamSeats = new Set(teamMembers.map((m: TeamMember) => m.email.toLowerCase())).size
  const canAddTeamMember = () => {
    if (limits.teamMembers === 0) return false
    return uniqueTeamSeats < limits.teamMembers
  }
  const hasAIFeature = (feature: string) => limits.aiFeatures.includes(feature)

  const navItems = [
    { id: 'dashboard', icon: '◈', label: 'Dashboard', section: 'Command' },
    { id: 'projects', icon: '◻', label: 'Projects', section: null, badge: activeProjects > 0 ? activeProjects : null },
    { id: 'tasks', icon: '✓', label: 'Tasks', section: null, badge: activeTasks > 0 ? activeTasks : null },
    { id: 'proposals', icon: '◇', label: 'Proposals', section: null, ai: true, locked: !hasAIFeature('proposals') },
    { id: 'planner', icon: '✦', label: 'AI Planner', section: null, gold: true, ai: true, locked: !hasAIFeature('planner') },
    { id: 'meetings', icon: '◎', label: 'Meetings', section: 'Operations', ai: true, locked: !hasAIFeature('meetings') },
    { id: 'risks', icon: '⚠', label: 'Risk Radar', section: null, badge: openRisks > 0 ? openRisks : null, ai: true },
    { id: 'scope', icon: '⊕', label: 'Scope Control', section: null, ai: true, locked: !hasAIFeature('scope') },
    { id: 'clients', icon: '◈', label: 'Client Portal', section: null, ai: true, locked: !hasAIFeature('clients') },
    { id: 'workload', icon: '⊞', label: 'Workload', section: null, ai: true, locked: !hasAIFeature('workload') },
    { id: 'timeline', icon: '▷', label: 'Timeline', section: null },
    { id: 'reports', icon: '◈', label: 'Reports', section: null, locked: !hasAIFeature('reports') },
    { id: 'ai-reports', icon: '✦', label: 'AI Reports', section: null, ai: true, locked: !hasAIFeature('ai-reports') },
    { id: 'billing', icon: '◷', label: 'Time & Billing', section: null },
    { id: 'brief', icon: '◫', label: 'Project Brief', section: null, ai: true, locked: !hasAIFeature('planner') },
    { id: 'retainers', icon: '◷', label: 'Retainers', section: null, locked: !hasAIFeature('retainers') },
    { id: 'portfolio', icon: '⊟', label: 'Portfolio', section: null, locked: plan !== 'agency' },
    { id: 'communication', icon: '✉', label: 'Comms Agent', section: null, ai: true, locked: !hasAIFeature('communication') },
    { id: 'settings', icon: '⚙', label: 'Settings', section: 'Account' },
  ]

  const pageLabels: Record<string,string> = { dashboard:'Dashboard', projects:'Projects', tasks:'Tasks', proposals:'Proposals', planner:'AI Planner', meetings:'Meetings', risks:'Risk Radar', scope:'Scope Control', clients:'Client Portal', workload:'Workload', timeline:'Timeline', reports:'Reports', 'ai-reports':'AI Reports', billing:'Time & Billing', brief:'Project Brief', retainers:'Retainers', communication:'Comms Agent', settings:'Settings' }
  const pageCrumbs: Record<string,string> = { dashboard:'/ Overview', projects:'/ All Projects', tasks:'/ All Tasks', proposals:'/ Estimates & Proposals', planner:'/ Generate Plan', meetings:'/ Process Notes', risks:'/ Risk Register', scope:'/ Change Log', clients:'/ Email Generator', workload:'/ Capacity', timeline:'/ Milestones & Gantt', reports:'/ Project Report', 'ai-reports':'/ AI Reporting Agent', billing:'/ Timer & Invoices', brief:'/ Intelligence Profile', retainers:'/ Recurring Invoices', communication:'/ Communication Agent', settings:'/ Account' }

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
                      const isPro = plan === 'pro'
                      const upgradeMessages: Record<string, string> = {
                        proposals: `⬆ Upgrade to Pro\n\nProposals & Estimates requires the Pro plan ($37/mo).\n\nGenerate AI-written client proposals, set budgets and timelines, and convert accepted proposals into live projects.`,
                        planner: `⬆ Upgrade to Pro\n\nAI Planner requires the Pro plan ($37/mo).\n\nGenerate full project plans with tasks, risks and milestones from a brief — populated in one click.`,
                        meetings: `⬆ Upgrade to Pro\n\nMeeting Processor requires the Pro plan ($37/mo).\n\nPaste raw meeting notes and get structured summaries, action items and decisions automatically.`,
                        scope: `⬆ Upgrade to Pro\n\nScope Control requires the Pro plan ($37/mo).\n\nLog scope changes and get instant AI analysis of time, budget and risk impact.`,
                        reports: `⬆ Upgrade to Pro\n\nReports requires the Pro plan ($37/mo).\n\nGenerate professional project status reports with RAG indicators, milestone tracking and executive summaries.`,
                        'ai-reports': `⬆ Upgrade to Pro\n\nAI Reports requires the Pro plan ($37/mo).\n\nGenerate Weekly Status reports from live project data in one click and send directly to clients.`,
                        communication: `⬆ Upgrade to Pro\n\nComms Agent requires the Pro plan ($37/mo).\n\nAuto-draft client update emails, deadline reminders, and meeting follow-ups from live project data.`,
                        clients: isPro
                          ? `⬆ Upgrade to Agency\n\nClient Portal requires the Agency plan ($67/mo).\n\nYou're on Pro — upgrade to Agency to unlock client logins, client-facing project views, and Client-Ready AI reports.`
                          : `⬆ Upgrade to Agency\n\nClient Portal requires the Agency plan ($67/mo).\n\nGive clients a professional view of project progress with their own login and AI-generated status updates.`,
                        workload: isPro
                          ? `⬆ Upgrade to Agency\n\nWorkload AI requires the Agency plan ($67/mo).\n\nYou're on Pro — upgrade to Agency to unlock team capacity analysis, AI rebalancing suggestions, and burnout prevention tools.`
                          : `⬆ Upgrade to Agency\n\nWorkload AI requires the Agency plan ($67/mo).\n\nSee team capacity across all projects and get AI recommendations to rebalance tasks and prevent burnout.`,
                        retainers: isPro
                          ? `⬆ Upgrade to Agency\n\nRecurring Retainers requires the Agency plan ($67/mo).\n\nYou're on Pro — upgrade to Agency to set up monthly, quarterly or weekly retainer invoices that auto-send via n8n.`
                          : `⬆ Upgrade to Agency\n\nRecurring Retainers requires the Agency plan ($67/mo).\n\nSet up monthly, quarterly or weekly retainer invoices that auto-send via n8n — no manual chasing.`,
                      }
                      const msg = upgradeMessages[item.id] || `⬆ Upgrade Required\n\n${item.label} is not available on your ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan.\n\nUpgrade to unlock this feature.`
                      alert(msg)
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
                    {(() => {
                      if (projects.length === 0) return 'Welcome to Empire PM! Start by creating your first project.'
                      const todayStr = new Date().toISOString().split('T')[0]
                      // Priority 1: Critical/high overdue risks
                      const criticalRisk = risks.find(r => (r.level === 'critical' || r.level === 'high') && r.status === 'open' && r.due_date && r.due_date < todayStr)
                      if (criticalRisk) {
                        const proj = projects.find(p => p.id === criticalRisk.project_id)
                        const days = Math.ceil((new Date(todayStr).getTime() - new Date(criticalRisk.due_date!).getTime()) / (1000*60*60*24))
                        return `⚡ "${criticalRisk.title}" is ${days}d overdue on ${proj?.name || 'a project'} — this is a ${criticalRisk.level} risk. Address it today before it impacts your timeline.`
                      }
                      // Priority 2: Overdue tasks
                      const overdueTasks = tasks.filter(t => t.due_date && t.due_date < todayStr && t.status !== 'done')
                      if (overdueTasks.length > 0) {
                        const oldest = overdueTasks.sort((a, b) => a.due_date! < b.due_date! ? -1 : 1)[0]
                        const proj = projects.find(p => p.id === oldest.project_id)
                        const days = Math.ceil((new Date(todayStr).getTime() - new Date(oldest.due_date!).getTime()) / (1000*60*60*24))
                        return `⚡ "${oldest.name}" on ${proj?.name || 'a project'} is ${days}d overdue — ${overdueTasks.length > 1 ? `along with ${overdueTasks.length - 1} other task${overdueTasks.length > 2 ? 's' : ''}. ` : ''}Move it forward or update the due date today.`
                      }
                      // Priority 3: Unbilled hours
                      if (unbilledTotal > 0) {
                        const oldestLog = timeLogs.sort((a: any, b: any) => (a.log_date || a.created_at) < (b.log_date || b.created_at) ? -1 : 1)[0]
                        const logDate = oldestLog?.log_date || oldestLog?.created_at
                        const daysOld = logDate ? Math.ceil((new Date(todayStr).getTime() - new Date(logDate).getTime()) / (1000*60*60*24)) : null
                        return `⚡ $${unbilledTotal.toLocaleString()} in unbilled hours${daysOld && daysOld > 7 ? ` — oldest entry is ${daysOld} days old` : ''}. Send an invoice today before it gets delayed further.`
                      }
                      // Priority 4: Milestones due soon
                      const soonMilestone = milestones.find((m: any) => m.status !== 'completed' && m.due_date && m.due_date >= todayStr && Math.ceil((new Date(m.due_date as string).getTime() - new Date(todayStr).getTime()) / (1000*60*60*24)) <= 7)
                      if (soonMilestone) {
                        const proj = projects.find(p => p.id === soonMilestone.project_id)
                        const days = Math.ceil((new Date(soonMilestone.due_date as string).getTime() - new Date(todayStr).getTime()) / (1000*60*60*24))
                        return `⚡ Milestone "${soonMilestone.title}" on ${proj?.name || 'a project'} is due in ${days} day${days !== 1 ? 's' : ''}. Make sure it&apos;s on track.`
                      }
                      // Priority 5: All clear
                      return `✅ No overdue tasks or critical risks today. ${activeProjects} project${activeProjects !== 1 ? 's' : ''} running smoothly — good time to review upcoming milestones or send a client update.`
                    })()}
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

            {/* ── Workflow Pipeline Summary ── */}
            {tasks.length > 0 && (() => {
              const STAGES = ['Drafted', 'Submitted', 'Reviewed', 'Approved', 'Executed']
              const getAutoStage = (t: Task): string => {
                switch (t.status) {
                  case 'todo':    return 'Drafted'
                  case 'active':  return 'Submitted'
                  case 'blocked': return 'Submitted'
                  case 'done':    return 'Executed'
                  default:        return 'Drafted'
                }
              }
              const stageCounts = STAGES.map(stage => ({
                stage,
                count: tasks.filter((t: Task) => getAutoStage(t) === stage).length
              }))
              const total = tasks.length
              return (
                <div style={{ ...s.card, marginTop: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={s.sectionTitle}>Workflow Pipeline</div>
                    <button onClick={() => setTab('tasks')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: gold, letterSpacing: '0.08em' }}>
                      View Full Workflow →
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                    {stageCounts.map(({ stage, count }) => {
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0
                      const stageColor = stage === 'Executed' ? '#4DFFB4' : stage === 'Approved' ? '#4DD8F0' : stage === 'Reviewed' ? gold : stage === 'Submitted' ? '#C8DCF4' : 'rgba(240,246,255,0.4)'
                      return (
                        <div key={stage} style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 400, color: count > 0 ? stageColor : 'rgba(255,255,255,0.1)', lineHeight: 1, marginBottom: '6px' }}>
                            {count}
                          </div>
                          <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', marginBottom: '6px' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: count > 0 ? stageColor : 'transparent', borderRadius: '2px', transition: 'width 0.4s' }}/>
                          </div>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', color: count > 0 ? stageColor : 'rgba(255,255,255,0.2)' }}>
                            {stage.toUpperCase()}
                          </div>
                          {count > 0 && (
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                              {pct}%
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${border}` }}>
                    {STAGES.map((stage, i) => (
                      <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em' }}>{stage}</div>
                        {i < STAGES.length - 1 && <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.15)' }}>→</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
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
                  <TeamMemberForm user={user} projects={projects} onCreated={() => user && loadData(user.id)} supabase={supabase} isMobile={isMobile} canAddTeamMember={canAddTeamMember} limits={limits} plan={plan} uniqueTeamSeats={uniqueTeamSeats} />
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
                    {(['list', 'kanban', 'workflow'] as const).map(v => (
                      <button key={v} onClick={() => setTaskView(v)} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', padding: '6px 14px', border: 'none', cursor: 'pointer', background: taskView === v ? `linear-gradient(135deg, ${goldDim}, ${gold})` : 'transparent', color: taskView === v ? navy : textDim, transition: 'all 0.15s', textTransform: 'uppercase' as const }}>
                        {v === 'list' ? '☰ List' : v === 'kanban' ? '⊞ Kanban' : '◫ Workflow'}
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

                {/* WORKFLOW VIEW */}
                {taskView === 'workflow' && (
                  <WorkflowView tasks={tasks} projects={projects} milestones={milestones} teamMembers={teamMembers} user={user} supabase={supabase} isMobile={isMobile} onCreated={() => user && loadData(user.id)} gold={gold} goldDim={goldDim} border={border} textBright={textBright} textDim={textDim} s={s} />
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
                      'You are an expert risk manager with 20 years PM experience. Analyse this specific project data. Be highly specific — reference actual task names, owners, and dates. Never give generic advice. Use bullet points only. Structure: 1. CRITICAL RISKS, 2. HIDDEN RISKS NOT YET LOGGED, 3. CAPACITY & DEADLINE CONFLICTS, 4. RECOMMENDED ACTIONS (with owner and deadline).\n\nAfter your analysis, append this on its own line with no markdown fences:\nRISK_JSON:[{"title":"risk title","probability":"low|medium|high|very_high","impact":"low|medium|high|very_high","category":"schedule|budget|scope|resource|client","level":"low|medium|high|critical"}]',
                      'Risk analysis for: ' + (riskProjectId === 'all' ? 'Full Portfolio' : (selectedProjects[0]?.name || 'Project')) + '\n\n' + projectContext
                    ).then(async (result: string) => {
                      const jsonMatch = result.match(/RISK_JSON:(\[[\s\S]*?\])/)
                      if (jsonMatch && user) {
                        try {
                          const parsed: any[] = JSON.parse(jsonMatch[1])
                          const projectId = riskProjectId === 'all' ? (selectedProjects[0]?.id || null) : riskProjectId
                          if (projectId) {
                            for (const r of parsed) {
                              const existing = risks.find((ex: Risk) => ex.title?.toLowerCase() === r.title?.toLowerCase() && ex.project_id === projectId)
                              if (existing) {
                                await supabase.from('risks').update({ probability: r.probability, impact: r.impact, category: r.category }).eq('id', existing.id)
                              } else {
                                await supabase.from('risks').insert({ user_id: user.id, project_id: projectId, title: r.title, description: '', level: r.level || 'medium', status: 'open', probability: r.probability, impact: r.impact, category: r.category })
                              }
                            }
                            loadData(user.id)
                          }
                        } catch {}
                      }
                    })
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
                  <RiskHeatMap risks={risks} projects={projects} riskProjectId={riskProjectId} />
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
              <MeetingProcessor user={user} projects={projects} tasks={tasks} risks={risks} supabase={supabase} onSaved={() => user && loadData(user.id)} onProcessed={(m: any) => setLastMeeting(m)} isMobile={isMobile} />
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
              <ResourceAllocationChart teamMembers={teamMembers} tasks={tasks} projects={projects} />
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
                  {aiText['workload'] && (
                    <>
                      <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(aiText['workload']) }}/>
                      <div style={{ marginTop: '12px', padding: '12px 14px', background: 'rgba(201,153,58,0.04)', border: '1px solid rgba(201,153,58,0.15)', borderRadius: '3px' }}>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.16em', color: goldDim, marginBottom: '8px' }}>✉ SEND WORKLOAD REPORT</div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <input id="workload-send-email" style={{ ...s.input, fontSize: '11px', padding: '7px 10px', flex: 1 }} placeholder="recipient@company.com" type="email"/>
                          <button style={{ ...s.btnGold, fontSize: '9px', padding: '7px 14px', whiteSpace: 'nowrap' as const }} onClick={sendWorkloadReport} disabled={workloadSending}>{workloadSending ? 'Sending...' : '✉ Send →'}</button>
                        </div>
                        <button onClick={() => navigator.clipboard.writeText(aiText['workload'])} style={{ ...s.btnGhost, fontSize: '9px', padding: '5px 12px' }}>⎘ Copy Output</button>
                      </div>
                    </>
                  )}
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

          {/* ═══ AI REPORTS ═══ */}
          {tab === 'ai-reports' && (
            <AIReportsView
              projects={projects}
              tasks={tasks}
              risks={risks}
              timeLogs={timeLogs}
              milestones={milestones}
              teamMembers={teamMembers}
              user={user}
              isMobile={isMobile}
              plan={plan}
            />
          )}

          {/* ═══ PROJECT BRIEF ═══ */}
          {tab === 'brief' && (
  <div style={{ padding: '24px', maxWidth: '760px', margin: '0 auto' }}>
    {projects.filter((p: Project) => p.status !== 'completed').length === 0 ? (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ color: '#8FA8C8', fontSize: '14px', marginBottom: '16px' }}>No active projects yet. Create a project first.</p>
        <button style={s.btnGold} onClick={() => setTab('projects')}>+ New Project</button>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {projects.filter((p: Project) => p.status !== 'completed').map((p: Project) => (
          <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#C9A84C', letterSpacing: '0.06em', marginBottom: '20px', textTransform: 'uppercase' as const }}>
              {p.name}
            </div>
            <ProjectBrief projectId={p.id} projectName={p.name} planId={plan} />
          </div>
        ))}
      </div>
    )}
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
              <ScopeForm ai={ai} aiLoading={aiLoading} aiText={aiText} projects={projects} tasks={tasks} isMobile={isMobile} user={user} />
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

                                  // 2 — Create the project via server-side API (enforces plan limits)
                                  const projRes = await fetch('/api/projects', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      name: prop.title,
                                      client_name: prop.client_name,
                                      budget: prop.budget || null,
                                      start_date: startDate,
                                      end_date: endDate,
                                    })
                                  })
                                  if (!projRes.ok) {
                                    const projErr = await projRes.json()
                                    alert(projErr.message || projErr.error || 'Failed to create project — plan limit may have been reached.')
                                    return
                                  }
                                  const { project: newProject } = await projRes.json()

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

          {tab === 'portfolio' && (
            <PortfolioDashboard
              projects={projects}
              tasks={tasks}
              risks={risks}
              timeLogs={timeLogs}
              milestones={milestones}
              plan={plan}
            />
          )}

          {tab === 'communication' && (
            <CommunicationAgent
              projects={projects}
              tasks={tasks}
              risks={risks}
              milestones={milestones}
              teamMembers={teamMembers}
              meetings={meetings}
              lastMeeting={lastMeeting}
              user={user}
              isMobile={isMobile}
            />
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
                  <TeamMemberForm user={user} projects={projects} onCreated={() => { if (user) loadData(user.id); setWizardStep(3) }} supabase={supabase} isMobile={isMobile} canAddTeamMember={canAddTeamMember} limits={limits} plan={plan} uniqueTeamSeats={uniqueTeamSeats} />
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
