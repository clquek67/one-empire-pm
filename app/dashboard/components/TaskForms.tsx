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
    .replace(/\n/g, '<br/>')
  return DOMPurify.sanitize(html, { ADD_ATTR: ['style'] })
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

export function TaskForm({ user, projects, teamMembers, tasks, onCreated, supabase, isMobile }: any) {
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

export function RiskForm({ user, projects, onCreated, supabase, isMobile }: any) {
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

export function TimeLogForm({ user, projects, onCreated, supabase, isMobile }: any) {
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

