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

export function CommunicationAgent({ projects, tasks, risks, milestones, teamMembers, meetings, lastMeeting, user, isMobile }: any) {
  const gold = '#E8B84B'; const goldDim = '#C9993A'; const navy = '#050D1A'
  const navyCard = 'rgba(16,36,72,0.7)'; const border = 'rgba(201,153,54,0.2)'
  const borderMd = 'rgba(201,153,58,0.35)'; const textBright = '#F0F6FF'
  const textMid = '#C8DCF4'; const textDim = '#A8C0DC'

  const [commType, setCommType] = useState<'client-update' | 'deadline-reminder' | 'meeting-followup'>('client-update')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [extraNotes, setExtraNotes] = useState('')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [editingDraft, setEditingDraft] = useState(false)
  const [activeCard, setActiveCard] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  const todayStr = new Date().toISOString().split('T')[0]
  const in3Str = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  const pmName = user?.user_metadata?.full_name || 'Project Manager'
  const pmEmail = user?.email || ''

  // ── Helper: find client email for a project ──
  const getClientEmail = (projectId: string) => {
    const client = teamMembers.find((m: any) =>
      m.project_id === projectId &&
      (m.role === 'client' || m.role === 'Client') &&
      (m.invited_email || m.email)
    )
    return { email: client?.invited_email || client?.email || '', name: client?.name || '' }
  }

  // ── Helper: find owner email for a task ──
  const getOwnerEmail = (ownerName: string, projectId: string) => {
    const member = teamMembers.find((m: any) =>
      m.project_id === projectId &&
      m.name?.toLowerCase() === ownerName?.toLowerCase() &&
      (m.invited_email || m.email)
    )
    return { email: member?.invited_email || member?.email || '', name: member?.name || ownerName }
  }

  // ── Compute suggested actions ──
  const suggestions: {
    id: string
    type: 'client-update' | 'deadline-reminder' | 'meeting-followup'
    priority: 'critical' | 'warning' | 'info'
    title: string
    detail: string
    projectId: string
    recipientEmail: string
    recipientName: string
    context: string
  }[] = []

  // Trigger 1: Project health < 60%
  projects.forEach((p: any) => {
    if (p.health < 60 && p.status === 'active') {
      const { email, name } = getClientEmail(p.id)
      suggestions.push({
        id: `health-${p.id}`,
        type: 'client-update',
        priority: p.health < 40 ? 'critical' : 'warning',
        title: `Client update needed — ${p.name}`,
        detail: `Health at ${p.health}% — proactively update ${name || p.client_name || 'client'} before they ask`,
        projectId: p.id,
        recipientEmail: email,
        recipientName: name || p.client_name || '',
        context: `Project health is at ${p.health}%. Send a reassuring update covering current status and recovery plan.`,
      })
    }
  })

  // Trigger 2: Tasks overdue 2+ days with an owner who has an email
  tasks.forEach((t: any) => {
    if (t.status === 'done') return
    if (!t.due_date || t.due_date >= todayStr) return
    const daysOverdue = Math.ceil((new Date(todayStr).getTime() - new Date(t.due_date).getTime()) / 86400000)
    if (daysOverdue < 2) return
    const proj = projects.find((p: any) => p.id === t.project_id)
    if (t.owner) {
      const { email, name } = getOwnerEmail(t.owner, t.project_id)
      if (email) {
        suggestions.push({
          id: `overdue-task-${t.id}`,
          type: 'deadline-reminder',
          priority: daysOverdue >= 5 ? 'critical' : 'warning',
          title: `Chase ${t.owner} — "${t.name}"`,
          detail: `${daysOverdue} days overdue on ${proj?.name || 'project'} — send a reminder now`,
          projectId: t.project_id,
          recipientEmail: email,
          recipientName: name,
          context: `Task "${t.name}" is ${daysOverdue} days overdue. Owner: ${t.owner}. Project: ${proj?.name}. Due date was ${fmtDate(t.due_date)}.`,
        })
      }
    }
  })

  // Trigger 3: Milestone overdue — notify client
  milestones.forEach((m: any) => {
    if (m.status === 'completed') return
    if (!m.due_date || m.due_date >= todayStr) return
    const proj = projects.find((p: any) => p.id === m.project_id)
    const { email, name } = getClientEmail(m.project_id)
    if (email) {
      const daysOverdue = Math.ceil((new Date(todayStr).getTime() - new Date(m.due_date).getTime()) / 86400000)
      suggestions.push({
        id: `overdue-ms-${m.id}`,
        type: 'deadline-reminder',
        priority: 'critical',
        title: `Milestone overdue — notify client`,
        detail: `"${m.title}" on ${proj?.name || 'project'} is ${daysOverdue}d overdue — update ${name || 'client'} now`,
        projectId: m.project_id,
        recipientEmail: email,
        recipientName: name,
        context: `Milestone "${m.title}" was due ${fmtDate(m.due_date)} and is ${daysOverdue} days overdue. Project: ${proj?.name}. Explain status and revised date.`,
      })
    }
  })

  // Trigger 4: Unbilled hours > $500 on a project
  const unbilledByProject: Record<string, number> = {}
  tasks.forEach(() => {}) // just to keep consistent — using imported timeLogs indirectly via projects
  projects.forEach((p: any) => {
    // We don't have timeLogs here — skip this trigger silently
  })

  // Trigger 5: Tasks due in next 3 days — remind owner
  tasks.forEach((t: any) => {
    if (t.status === 'done') return
    if (!t.due_date || t.due_date < todayStr || t.due_date > in3Str) return
    const proj = projects.find((p: any) => p.id === t.project_id)
    if (t.owner) {
      const { email, name } = getOwnerEmail(t.owner, t.project_id)
      if (email) {
        const daysLeft = Math.ceil((new Date(t.due_date).getTime() - new Date(todayStr).getTime()) / 86400000)
        suggestions.push({
          id: `due-soon-${t.id}`,
          type: 'deadline-reminder',
          priority: 'info',
          title: `Due in ${daysLeft}d — remind ${t.owner}`,
          detail: `"${t.name}" on ${proj?.name || 'project'} is due ${fmtDate(t.due_date)}`,
          projectId: t.project_id,
          recipientEmail: email,
          recipientName: name,
          context: `Task "${t.name}" is due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} on ${fmtDate(t.due_date)}. Project: ${proj?.name}. Owner: ${t.owner}. Send a friendly heads-up.`,
        })
      }
    }
  })

  // Trigger 6: Recent meeting saved in last 24h — suggest follow-up to client
  const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  ;(meetings || []).forEach((m: any) => {
    if (!m.created_at || m.created_at < recentCutoff) return
    const proj = projects.find((p: any) => p.id === m.project_id)
    const { email, name } = getClientEmail(m.project_id)
    if (email) {
      suggestions.push({
        id: `meeting-${m.id}`,
        type: 'meeting-followup',
        priority: 'info',
        title: `Send follow-up — "${m.title}"`,
        detail: `Meeting processed for ${proj?.name || 'project'} — send summary to ${name || 'client'}`,
        projectId: m.project_id,
        recipientEmail: email,
        recipientName: name,
        context: `Meeting: "${m.title}" on ${fmtDate(m.meeting_date || m.created_at)}. Project: ${proj?.name}. Summary: ${m.summary?.slice(0, 300) || 'See meeting notes'}`,
      })
    }
  })

  // Sort: critical first, then warning, then info
  const priorityOrder = { critical: 0, warning: 1, info: 2 }
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  // ── Load a suggestion into the compose form ──
  const loadSuggestion = (s: typeof suggestions[0]) => {
    setCommType(s.type)
    setSelectedProjectId(s.projectId)
    setRecipientEmail(s.recipientEmail)
    setRecipientName(s.recipientName)
    setExtraNotes(s.context)
    setDraft('')
    setSent(false)
    setActiveCard(s.id)
    // Auto-generate immediately
    generateFromSuggestion(s)
  }

  const generateFromSuggestion = async (s: typeof suggestions[0]) => {
    setLoading(true)
    setDraft('')

    const project = projects.find((p: any) => p.id === s.projectId)
    const projTasks = tasks.filter((t: any) => t.project_id === s.projectId)
    const projRisks = risks.filter((r: any) => r.project_id === s.projectId && r.status !== 'closed')
    const projMilestones = milestones.filter((m: any) => m.project_id === s.projectId)
    const doneTasks = projTasks.filter((t: any) => t.status === 'done').length
    const activeTasks = projTasks.filter((t: any) => t.status === 'active')
    const upcomingMs = projMilestones.filter((m: any) => m.status !== 'completed' && m.due_date)

    let system = ''
    let prompt = ''

    if (s.type === 'client-update') {
      system = `You are ${pmName}, a professional project manager writing a client update email. Warm, confident, first-person prose. No markdown, no bullet points. 3-4 short paragraphs. Never mention internal issues. End with a clear next step.`
      prompt = `Write a professional client update email.

To: ${s.recipientName || 'Client'}
Project: ${project?.name} (Client: ${project?.client_name || 'Client'})
Health: ${project?.health}%
Timeline: ${project?.start_date || 'TBD'} → ${project?.end_date || 'TBD'}
Tasks: ${doneTasks}/${projTasks.length} complete
Active: ${activeTasks.map((t: any) => t.name).join(', ') || 'In progress'}
Upcoming milestones: ${upcomingMs.map((m: any) => `${m.title} due ${fmtDate(m.due_date)}`).join(', ') || 'None'}
Open risks: ${projRisks.length > 0 ? projRisks.map((r: any) => `${r.title} [${r.level}]`).join(', ') : 'None'}
Context: ${s.context}

Start with "Hi ${s.recipientName || 'there'}," — no subject line.`

    } else if (s.type === 'deadline-reminder') {
      system = `You are ${pmName}, a project manager sending a friendly but firm deadline reminder. Warm, direct first-person prose. No markdown, no bullet points. 2-3 short paragraphs. Professional but human tone.`
      prompt = `Write a deadline reminder email.

To: ${s.recipientName || 'Recipient'}
Context: ${s.context}
Project: ${project?.name || 'Project'}

Start with "Hi ${s.recipientName || 'there'}," — no subject line.`

    } else {
      system = `You are ${pmName}, a project manager sending a meeting follow-up. Warm, professional first-person prose. No markdown, no bullet points. 3 short paragraphs: thank-you + context, key outcomes, action items and next steps.`
      prompt = `Write a meeting follow-up email.

To: ${s.recipientName || 'Attendees'}
Project: ${project?.name} (Client: ${project?.client_name || 'Client'})
Active tasks / action items: ${activeTasks.slice(0, 5).map((t: any) => `"${t.name}" [${t.owner || 'unassigned'}${t.due_date ? `, due ${fmtDate(t.due_date)}` : ''}]`).join(', ') || 'See project board'}
Context: ${s.context}

Start with "Hi ${s.recipientName || 'there'}," — no subject line.`
    }

    const text = await callAI(system, prompt, 800)
    setDraft(text)
    setLoading(false)
  }

  const generate = async () => {
    setLoading(true)
    setDraft('')
    setSent(false)
    const project = projects.find((p: any) => p.id === selectedProjectId)
    const projTasks = tasks.filter((t: any) => t.project_id === selectedProjectId)
    const projRisks = risks.filter((r: any) => r.project_id === selectedProjectId && r.status !== 'closed')
    const projMilestones = milestones.filter((m: any) => m.project_id === selectedProjectId)
    const doneTasks = projTasks.filter((t: any) => t.status === 'done').length
    const activeTasks = projTasks.filter((t: any) => t.status === 'active')
    const overdueTasks = projTasks.filter((t: any) => t.due_date && t.due_date < todayStr && t.status !== 'done')
    const upcomingMs = projMilestones.filter((m: any) => m.status !== 'completed' && m.due_date)

    let system = ''; let prompt = ''

    if (commType === 'client-update') {
      system = `You are ${pmName}, a professional project manager writing a client update email. Warm, confident, first-person prose. No markdown, no bullet points. 3-4 short paragraphs. Never mention internal issues. End with a clear next step.`
      prompt = `Write a professional client update email.
To: ${recipientName || 'Client'}
Project: ${project?.name || 'Project'} (Client: ${project?.client_name || 'Client'})
Health: ${project?.health}% · Tasks: ${doneTasks}/${projTasks.length} complete
Active: ${activeTasks.map((t: any) => t.name).join(', ') || 'In progress'}
Overdue: ${overdueTasks.length > 0 ? overdueTasks.map((t: any) => t.name).join(', ') : 'None'}
Upcoming milestones: ${upcomingMs.map((m: any) => `${m.title} due ${fmtDate(m.due_date)}`).join(', ') || 'None'}
Open risks: ${projRisks.length > 0 ? projRisks.map((r: any) => `${r.title} [${r.level}]`).join(', ') : 'None'}
PM notes: ${extraNotes || 'General progress update'}
Start with "Hi ${recipientName || 'there'}," — no subject line.`

    } else if (commType === 'deadline-reminder') {
      const allOverdue = tasks.filter((t: any) => t.due_date && t.due_date < todayStr && t.status !== 'done')
      const allSoon = tasks.filter((t: any) => t.due_date && t.due_date >= todayStr && t.due_date <= in3Str && t.status !== 'done')
      system = `You are ${pmName}, a project manager sending a friendly but firm deadline reminder. Warm, direct first-person prose. No markdown, no bullet points. 2-3 paragraphs.`
      prompt = `Write a deadline reminder email.
To: ${recipientName || 'Recipient'}
Overdue: ${allOverdue.map((t: any) => { const p = projects.find((pr: any) => pr.id === t.project_id); return `"${t.name}" (${p?.name}, ${Math.ceil((new Date(todayStr).getTime()-new Date(t.due_date).getTime())/86400000)}d overdue)` }).join(', ') || 'None'}
Due soon: ${allSoon.map((t: any) => { const p = projects.find((pr: any) => pr.id === t.project_id); return `"${t.name}" (${p?.name}, due ${fmtDate(t.due_date)})` }).join(', ') || 'None'}
PM notes: ${extraNotes || 'Friendly reminder'}
Start with "Hi ${recipientName || 'there'}," — no subject line.`

    } else {
      system = `You are ${pmName}, a project manager sending a meeting follow-up. Warm, professional first-person prose. No markdown, no bullet points. 3 short paragraphs.`
      prompt = `Write a meeting follow-up email.
To: ${recipientName || 'Attendees'}
Project: ${project?.name || 'Project'}
Active tasks / action items: ${activeTasks.slice(0, 5).map((t: any) => `"${t.name}" [${t.owner || 'unassigned'}${t.due_date ? `, due ${fmtDate(t.due_date)}` : ''}]`).join(', ') || 'See project board'}
Open risks: ${projRisks.slice(0, 3).map((r: any) => r.title).join(', ') || 'None'}
Context: ${extraNotes || 'Follow-up from our recent meeting'}
Start with "Hi ${recipientName || 'there'}," — no subject line.`
    }

    const text = await callAI(system, prompt, 800)
    setDraft(text)
    setLoading(false)
  }

  const send = async (emailOverride?: string) => {
    const toEmail = emailOverride || emailRef.current?.value || recipientEmail
    if (!draft || !toEmail) return
    setSending(true)
    const project = projects.find((p: any) => p.id === selectedProjectId)
    const subjectMap: Record<string, string> = {
      'client-update': `Project Update — ${project?.name || 'Your Project'}`,
      'deadline-reminder': `Action Required — ${project?.name || 'Project'}`,
      'meeting-followup': `Meeting Follow-up — ${project?.name || 'Your Project'}`,
    }
    const bodyHtml = draft.split('\n\n').filter(Boolean).map((para: string) =>
      `<p style="margin:0 0 14px;font-size:14px;line-height:1.8;color:#333;font-family:Arial,sans-serif;">${para.replace(/\n/g, '<br/>')}</p>`
    ).join('')
    const fullHtml = `
<div style="background:#f8f9fa;border-left:4px solid #C9993A;padding:12px 16px;margin-bottom:20px;border-radius:0 4px 4px 0;">
  <div style="font-size:10px;color:#C9993A;font-weight:700;letter-spacing:2px;margin-bottom:2px;">EMPIRE PM</div>
  <div style="font-size:16px;color:#050D1A;font-weight:600;font-family:Arial,sans-serif;">${subjectMap[commType]}</div>
</div>
${bodyHtml}
<p style="margin:20px 0 0;font-size:12px;color:#999;font-family:Arial,sans-serif;border-top:1px solid #eee;padding-top:14px;">
  ${pmName} · ${pmEmail}<br/>pm.one-empire.com
</p>`
    try {
      const res = await fetch('https://n8n.one-empire.com/webhook/empire-pm-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: project?.client_name || recipientName || 'Recipient',
          project: project?.name || 'Project',
          clientEmail: toEmail,
          senderName: pmName,
          senderEmail: pmEmail,
          invoiceDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          dueDate: '', lineItems: '', total: '',
          coverEmail: fullHtml,
        })
      })
      if (!res.ok) { alert(`✗ Failed to send: ${res.status}`); setSending(false); return }
      setSent(true)
      setDraft(''); setExtraNotes(''); setActiveCard(null)
      setTimeout(() => { setSent(false); setRecipientEmail(''); setRecipientName('') }, 2000)
    } catch { alert('Network error — check n8n is running.') }
    setSending(false)
  }

  const priorityColor = (p: string) => p === 'critical' ? '#FF9090' : p === 'warning' ? '#FFD080' : '#4DD8F0'
  const priorityBg   = (p: string) => p === 'critical' ? 'rgba(226,75,74,0.08)' : p === 'warning' ? 'rgba(255,208,128,0.06)' : 'rgba(77,216,240,0.06)'
  const priorityBdr  = (p: string) => p === 'critical' ? 'rgba(226,75,74,0.3)' : p === 'warning' ? 'rgba(255,208,128,0.25)' : 'rgba(77,216,240,0.2)'

  const typeLabel = (t: string) => t === 'client-update' ? 'Client Update' : t === 'deadline-reminder' ? 'Deadline Reminder' : 'Meeting Follow-up'
  const typeIcon  = (t: string) => t === 'client-update' ? '◇' : t === 'deadline-reminder' ? '⚠' : '◎'

  const inputStyle = { width: '100%', background: 'rgba(16,36,72,0.8)', border: `1px solid ${border}`, borderRadius: '3px', padding: '9px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: textBright, outline: 'none' }
  const labelStyle = { fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600 as const, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '5px', display: 'block' }
  const btnGold  = { fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700 as const, letterSpacing: '0.14em', background: `linear-gradient(135deg, ${goldDim}, ${gold})`, color: navy, border: 'none', padding: '9px 16px', borderRadius: '2px', cursor: 'pointer' }
  const btnGhost = { fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 600 as const, letterSpacing: '0.12em', border: `1px solid ${borderMd}`, background: 'transparent', color: textMid, padding: '8px 14px', borderRadius: '2px', cursor: 'pointer' }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: textBright }}>
          ✉ Comms <em style={{ color: gold, fontStyle: 'italic' }}>Agent</em>
        </div>
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textMid, marginTop: '5px' }}>
          Auto-detects what needs sending — approve and send in one click
        </div>
      </div>

      {/* ── SUGGESTED ACTIONS ── */}
      {(suggestions.length > 0 || lastMeeting) && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', color: goldDim, marginBottom: '10px' }}>
            ✦ SUGGESTED ACTIONS · {suggestions.length + (lastMeeting ? 1 : 0)} detected
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '8px' }}>

            {/* Meeting follow-up card — appears when a meeting was just processed */}
            {lastMeeting && (() => {
              const meetingCardId = `meeting-processed-${lastMeeting.title}`
              const proj = projects.find((p: any) => p.id === lastMeeting.projectId)
              const { email: clientEmail, name: clientName } = (() => {
                const client = teamMembers.find((m: any) => m.project_id === lastMeeting.projectId && (m.role === 'client' || m.role === 'Client') && (m.invited_email || m.email))
                return { email: client?.invited_email || client?.email || '', name: client?.name || '' }
              })()
              return (
                <div
                  onClick={() => {
                    setCommType('meeting-followup')
                    setSelectedProjectId(lastMeeting.projectId || '')
                    setRecipientEmail(clientEmail)
                    setRecipientName(clientName)
                    setExtraNotes(`Meeting: ${lastMeeting.title}\n\nKey outcomes:\n${lastMeeting.summary ? lastMeeting.summary.slice(0, 500) : 'See meeting notes'}`)
                    setDraft('')
                    setSent(false)
                    setActiveCard(meetingCardId)
                  }}
                  style={{ background: activeCard === meetingCardId ? 'rgba(77,216,240,0.08)' : 'rgba(16,36,72,0.5)', border: `1px solid ${activeCard === meetingCardId ? '#4DD8F0' : 'rgba(77,216,240,0.2)'}`, borderRadius: '4px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (activeCard !== meetingCardId) e.currentTarget.style.borderColor = '#4DD8F0' }}
                  onMouseLeave={e => { if (activeCard !== meetingCardId) e.currentTarget.style.borderColor = 'rgba(77,216,240,0.2)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4DD8F0', flexShrink: 0, marginTop: '5px' }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: '#4DD8F0', marginBottom: '2px' }}>
                        Send follow-up — &quot;{lastMeeting.title}&quot;
                      </div>
                      <div style={{ fontSize: '11px', color: textDim, marginBottom: '6px', lineHeight: 1.5 }}>
                        Meeting just processed for {proj?.name || 'project'} — draft and send a follow-up now
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', fontWeight: 700, padding: '2px 6px', borderRadius: '2px', background: 'rgba(77,216,240,0.1)', color: '#4DD8F0', border: '1px solid rgba(77,216,240,0.25)' }}>
                          ◎ MEETING FOLLOW-UP
                        </span>
                        {clientEmail && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim }}>{clientEmail}</span>}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: activeCard === meetingCardId ? '#4DD8F0' : textDim, flexShrink: 0, marginTop: '2px' }}>
                      {activeCard === meetingCardId ? '✦ Active' : '→'}
                    </div>
                  </div>
                </div>
              )
            })()}

            {suggestions.map(s => (
              <div key={s.id}
                onClick={() => loadSuggestion(s)}
                style={{ background: activeCard === s.id ? `${priorityBg(s.priority)}` : 'rgba(16,36,72,0.5)', border: `1px solid ${activeCard === s.id ? priorityColor(s.priority) : priorityBdr(s.priority)}`, borderRadius: '4px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (activeCard !== s.id) e.currentTarget.style.borderColor = priorityColor(s.priority) }}
                onMouseLeave={e => { if (activeCard !== s.id) e.currentTarget.style.borderColor = priorityBdr(s.priority) }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: priorityColor(s.priority), flexShrink: 0, marginTop: '5px' }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: priorityColor(s.priority), marginBottom: '2px' }}>{s.title}</div>
                    <div style={{ fontSize: '11px', color: textDim, marginBottom: '6px', lineHeight: 1.5 }}>{s.detail}</div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', fontWeight: 700, padding: '2px 6px', borderRadius: '2px', background: 'rgba(201,153,58,0.1)', color: goldDim, border: `1px solid rgba(201,153,58,0.2)` }}>
                        {typeIcon(s.type)} {typeLabel(s.type).toUpperCase()}
                      </span>
                      {s.recipientEmail && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{s.recipientEmail}</span>}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: activeCard === s.id ? gold : textDim, flexShrink: 0, marginTop: '2px' }}>
                    {activeCard === s.id ? '✦ Active' : '→'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestions.length === 0 && !lastMeeting && (
        <div style={{ background: 'rgba(34,201,144,0.05)', border: '1px solid rgba(34,201,144,0.2)', borderRadius: '4px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ color: '#22C990', fontSize: '14px' }}>✓</span>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: '#4DFFB4' }}>No urgent communications detected — all projects look healthy</div>
        </div>
      )}

      {/* ── COMPOSE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.5fr', gap: '14px' }}>

        {/* Left — compose form */}
        <div>
          <div style={{ background: navyCard, border: `1px solid ${border}`, borderRadius: '4px', padding: '16px 18px', marginBottom: '12px' }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', color: goldDim, marginBottom: '12px' }}>COMPOSE MANUALLY</div>
            {/* Type selector */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              {(['client-update', 'deadline-reminder', 'meeting-followup'] as const).map(t => (
                <button key={t} onClick={() => { setCommType(t); setDraft(''); setSent(false); setActiveCard(null) }}
                  style={{ flex: 1, fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', padding: '7px 4px', borderRadius: '2px', border: `1px solid ${commType === t ? borderMd : border}`, background: commType === t ? 'rgba(201,153,58,0.1)' : 'transparent', color: commType === t ? gold : textDim, cursor: 'pointer', textAlign: 'center' as const, transition: 'all 0.15s' }}>
                  {t === 'client-update' ? '◇ Update' : t === 'deadline-reminder' ? '⚠ Reminder' : '◎ Follow-up'}
                </button>
              ))}
            </div>

            {commType !== 'deadline-reminder' && (
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Project</label>
                <select style={inputStyle} value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
                  <option value="">Select project...</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.client_name ? ` — ${p.client_name}` : ''}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div>
                <label style={labelStyle}>Recipient Name</label>
                <input style={inputStyle} value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="e.g. Sarah"/>
              </div>
              <div>
                <label style={labelStyle}>Recipient Email</label>
                <input style={inputStyle} value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="client@co.com" type="email"/>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>
                {commType === 'client-update' ? 'Key Points' : commType === 'deadline-reminder' ? 'Context' : 'Meeting Context'}
              </label>
              <textarea style={{ ...inputStyle, minHeight: '64px', resize: 'vertical' as const }}
                value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
                placeholder={commType === 'client-update' ? 'e.g. milestone reached, next phase starting...' : commType === 'deadline-reminder' ? 'e.g. blocking other tasks...' : 'e.g. client approved direction...'}/>
            </div>

            <button style={{ ...btnGold, width: '100%', opacity: loading ? 0.6 : 1 }} onClick={generate} disabled={loading}>
              {loading ? '✦ Drafting...' : '✦ Draft Message →'}
            </button>
          </div>
        </div>

        {/* Right — draft panel */}
        <div style={{ background: navyCard, border: `1px solid ${border}`, borderRadius: '4px', padding: '20px 22px' }}>
          {sent && (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>✓</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: '#4DFFB4', marginBottom: '6px' }}>Message sent</div>
              <div style={{ fontSize: '11px', color: textDim, marginBottom: '20px' }}>Delivered via Empire PM.</div>
              <button style={btnGhost} onClick={() => { setSent(false); setDraft(''); setActiveCard(null) }}>← Back to suggestions</button>
            </div>
          )}

          {!draft && !loading && !sent && (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ fontSize: '32px', opacity: 0.12, marginBottom: '12px' }}>✉</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: textMid, marginBottom: '6px' }}>
                {suggestions.length > 0 ? 'Click a suggestion above to auto-draft' : 'Draft will appear here'}
              </div>
              <div style={{ fontSize: '11px', color: textDim, lineHeight: 1.7, maxWidth: '280px', margin: '0 auto' }}>
                {suggestions.length > 0
                  ? 'Or compose manually on the left. Review the draft, edit if needed, then send.'
                  : 'Select a message type on the left and click Draft. Review, edit, then send.'}
              </div>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ fontSize: '28px', color: gold, animation: 'pulse 1.5s infinite', marginBottom: '14px' }}>✦</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: goldDim, letterSpacing: '0.15em' }}>WRITING YOUR MESSAGE...</div>
            </div>
          )}

          {draft && !sent && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '12px', borderBottom: `1px solid ${border}` }}>
                <div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.2em', color: goldDim, marginBottom: '2px' }}>
                    {typeLabel(commType).toUpperCase()}
                  </div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textMid }}>
                    To: {recipientName || 'Recipient'}{recipientEmail ? ` <${recipientEmail}>` : ''}
                  </div>
                </div>
                <button onClick={() => setEditingDraft(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: editingDraft ? gold : 'rgba(200,220,255,0.6)', letterSpacing: '0.1em' }}>
                  {editingDraft ? 'DONE' : '✎ EDIT'}
                </button>
              </div>

              {editingDraft ? (
                <textarea value={draft} onChange={e => setDraft(e.target.value)}
                  style={{ width: '100%', background: 'rgba(8,20,44,0.8)', border: `1px solid ${borderMd}`, borderRadius: '3px', padding: '14px', color: textMid, fontFamily: 'DM Sans, sans-serif', fontSize: '13px', lineHeight: '1.8', resize: 'vertical' as const, minHeight: '220px', outline: 'none' }}/>
              ) : (
                <div style={{ fontSize: '13px', color: textMid, lineHeight: '1.8', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'pre-wrap', marginBottom: '20px' }}>{draft}</div>
              )}

              <div style={{ borderTop: `1px solid ${border}`, paddingTop: '14px', marginTop: '14px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>Send To</label>
                  <input
                    ref={emailRef}
                    style={inputStyle}
                    value={recipientEmail}
                    onChange={e => setRecipientEmail(e.target.value)}
                    placeholder="recipient@company.com"
                    type="email"
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{ ...btnGold, flex: 1, opacity: (!recipientEmail || sending) ? 0.6 : 1 }}
                    onClick={() => send(emailRef.current?.value || recipientEmail)}
                    disabled={!recipientEmail || sending}>
                    {sending ? 'Sending...' : '✉ Send →'}
                  </button>
                  <button style={btnGhost} onClick={() => { setDraft(''); setSent(false) }}>↺ Redraft</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
