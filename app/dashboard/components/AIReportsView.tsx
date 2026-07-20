'use client'
import { useState, useEffect, useRef, Fragment } from 'react'
import { createClient } from '@/lib/supabase-client'
import DOMPurify from 'isomorphic-dompurify'
import { callAI } from './callAI'

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

export function AIReportsView({ projects, tasks, risks, timeLogs, milestones, teamMembers, user, isMobile, plan }: any) {
  const hasAIFeature = (feature: string) => {
    const agencyFeatures = ['clients', 'workload', 'retainers', 'ai-reports-full']
    const proFeatures = ['planner', 'meetings', 'scope', 'reports', 'ai-reports', 'proposals']
    if (agencyFeatures.includes(feature)) return plan === 'agency'
    if (proFeatures.includes(feature)) return plan === 'pro' || plan === 'agency'
    return true // starter features always available
  }
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [reportType, setReportType] = useState<'weekly' | 'sprint' | 'client'>('weekly')
  const [dateRange, setDateRange] = useState('7')
  const [reportOutput, setReportOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sendEmail, setSendEmail] = useState('')
  const [sending, setSending] = useState(false)

  const reportTypes = [
    { id: 'weekly', label: 'Weekly Status', icon: '◷', desc: 'Progress this week, blockers, next steps' },
    { id: 'sprint', label: 'End of Sprint', icon: '◈', desc: 'Sprint summary, velocity, what shipped' },
    { id: 'client', label: 'Client-Ready', icon: '◇', desc: 'Professional client update, no internal notes' },
  ]

  const generate = async () => {
    if (!selectedProjectId) { alert('Please select a project first.'); return }
    setLoading(true)
    setReportOutput('')

    const project = projects.find((p: Project) => p.id === selectedProjectId)
    if (!project) { setLoading(false); return }

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - parseInt(dateRange))
    const cutoffStr = cutoff.toISOString().split('T')[0]
    const todayStr = new Date().toISOString().split('T')[0]

    // Gather live data
    const projTasks = tasks.filter((t: Task) => t.project_id === selectedProjectId)
    const projRisks = risks.filter((r: Risk) => r.project_id === selectedProjectId && r.status !== 'closed')
    const projLogs = timeLogs.filter((l: TimeLog) => l.project_id === selectedProjectId)
    const projMilestones = milestones.filter((m: Milestone) => m.project_id === selectedProjectId)
    const projTeam = teamMembers.filter((tm: TeamMember) => tm.project_id === selectedProjectId)

    const doneTasks = projTasks.filter((t: Task) => t.status === 'done')
    const activeTasks = projTasks.filter((t: Task) => t.status === 'active')
    const blockedTasks = projTasks.filter((t: Task) => t.status === 'blocked')
    const overdueTasks = projTasks.filter((t: Task) => t.due_date && t.due_date < todayStr && t.status !== 'done')
    const recentlyDone = doneTasks.filter((t: Task) => t.created_at && t.created_at >= cutoffStr)
    const totalHours = projLogs.reduce((s: number, l: TimeLog) => s + Number(l.hours), 0)
    const totalBillable = projLogs.reduce((s: number, l: TimeLog) => s + Number(l.hours) * Number(l.rate), 0)
    const upcomingMs = projMilestones.filter((m: Milestone) => m.status !== 'completed' && m.due_date)
    const completedMs = projMilestones.filter((m: Milestone) => m.status === 'completed')

    const dataContext = `
PROJECT: ${project.name}
Client: ${project.client_name || 'Internal'}
Health: ${project.health}%
Timeline: ${project.start_date || 'TBD'} → ${project.end_date || 'TBD'}
Budget: ${project.budget ? '$' + Number(project.budget).toLocaleString() : 'Not set'}

TASKS SUMMARY:
- Total tasks: ${projTasks.length}
- Done: ${doneTasks.length} (${projTasks.length > 0 ? Math.round((doneTasks.length / projTasks.length) * 100) : 0}% complete)
- Active: ${activeTasks.length} (${activeTasks.map((t: Task) => `"${t.name}" [owner: ${t.owner || 'unassigned'}]`).join(', ') || 'none'})
- Blocked: ${blockedTasks.length} (${blockedTasks.map((t: Task) => `"${t.name}"`).join(', ') || 'none'})
- Overdue: ${overdueTasks.length} (${overdueTasks.map((t: Task) => `"${t.name}" due ${t.due_date}`).join(', ') || 'none'})
- Recently completed (last ${dateRange} days): ${recentlyDone.length} tasks

RISKS: ${projRisks.length > 0 ? projRisks.map((r: Risk) => `"${r.title}" [${r.level}]`).join(', ') : 'No open risks'}

MILESTONES:
- Completed: ${completedMs.map((m: Milestone) => m.title).join(', ') || 'None'}
- Upcoming: ${upcomingMs.map((m: Milestone) => `"${m.title}" due ${m.due_date}`).join(', ') || 'None'}

TIME & BILLING:
- Total hours logged: ${totalHours.toFixed(1)}h
- Billable value: $${totalBillable.toLocaleString()}

TEAM: ${projTeam.length > 0 ? projTeam.map((tm: TeamMember) => `${tm.name} (${tm.role || 'No role'}, ${tm.capacity}% capacity)`).join(', ') : 'No team members assigned'}

Report period: Last ${dateRange} days (${cutoffStr} to ${todayStr})`

    const pmName = user?.user_metadata?.full_name || 'Project Manager'

    const systemPrompts: Record<string, string> = {
      weekly: `You are ${pmName}, an expert project manager writing a weekly status report. Write in professional first-person PM voice. Structure: 1. THIS WEEK'S HIGHLIGHTS (what was completed), 2. IN PROGRESS (what's active now with owners), 3. BLOCKERS & RISKS (what needs attention), 4. NEXT WEEK'S FOCUS (top 3 priorities). Use bullet points. Be specific — reference actual task names, owner names, and dates from the data provided. Never be generic.`,
      sprint: `You are ${pmName}, an expert project manager writing an end-of-sprint summary. Structure: 1. SPRINT SUMMARY (2-sentence overview), 2. SHIPPED THIS SPRINT (completed work), 3. VELOCITY & METRICS (tasks done, hours, completion rate), 4. CARRY-OVER (what didn't make it and why), 5. NEXT SPRINT GOALS. Use bullet points. Reference actual task names and numbers from the data.`,
      client: `You are ${pmName}, a professional project manager writing a client-facing status update. Write in confident, reassuring language. NEVER mention internal blockers, team capacity issues, or negative internal details unless critical. Structure: 1. PROJECT STATUS (overall health, brief positive summary), 2. KEY ACHIEVEMENTS (what's been delivered), 3. CURRENT PHASE (what's in progress), 4. UPCOMING MILESTONES (next key dates), 5. NEXT STEPS (clear client actions if any). Professional tone only. No internal jargon.`,
    }

    try {
      const text = await callAI(systemPrompts[reportType], `Generate a ${reportType === 'weekly' ? 'weekly status' : reportType === 'sprint' ? 'end-of-sprint' : 'client-ready'} report using this live project data:\n${dataContext}`, 2000)
      setReportOutput(text)
    } catch {
      setReportOutput('Failed to generate report. Please try again.')
    }
    setLoading(false)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reportOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sendToClient = async () => {
    if (!sendEmail) { alert('Please enter a client email address.'); return }
    if (!reportOutput) { alert('Generate a report first.'); return }
    setSending(true)
    const project = projects.find((p: Project) => p.id === selectedProjectId)
    const reportTitle = reportType === 'client' ? 'Project Update' : reportType === 'weekly' ? 'Weekly Status Report' : 'Sprint Summary'
    const pmName = user?.user_metadata?.full_name || 'Project Manager'

    // Convert markdown report to clean HTML for email
    const reportHtml = reportOutput
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^## (.+)$/gm, '<h2 style="font-size:15px;color:#050D1A;margin:20px 0 8px;padding-bottom:6px;border-bottom:2px solid #C9993A;font-family:Arial,sans-serif;">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 style="font-size:12px;color:#C9993A;margin:14px 0 6px;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">$1</h3>')
      .replace(/^[-•] (.+)$/gm, '<li style="margin:4px 0;padding-left:4px;color:#333;font-size:13px;line-height:1.7;">$1</li>')
      .replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>')
      .replace(/\n\n/g, '</p><p style="margin:8px 0;color:#333;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">')
      .replace(/\n/g, '<br/>')

    const fullHtml = `<div style="background:#f8f9fa;border-left:4px solid #C9993A;padding:14px 18px;margin-bottom:24px;border-radius:0 4px 4px 0;">
  <div style="font-size:11px;color:#C9993A;font-weight:700;letter-spacing:2px;margin-bottom:4px;">${reportTitle.toUpperCase()}</div>
  <div style="font-size:18px;color:#050D1A;font-weight:600;font-family:Arial,sans-serif;">${project?.name || 'Project'}</div>
  <div style="font-size:12px;color:#666;margin-top:4px;font-family:Arial,sans-serif;">${project?.client_name || ''} · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
</div>
<p style="margin:8px 0;color:#333;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">${reportHtml}</p>`

    try {
      const res = await fetch('https://n8n.one-empire.com/webhook/empire-pm-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: project?.client_name || project?.name || 'Client',
          project: project?.name || 'Project',
          clientEmail: sendEmail,
          senderName: pmName,
          senderEmail: user?.email,
          invoiceDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          dueDate: '',
          lineItems: `${reportTitle} | ${project?.name || 'Project'} | - | -`,
          total: '',
          coverEmail: fullHtml,
        })
      })
      if (!res.ok) {
        alert(`✗ Failed to send: ${res.status}`)
        setSending(false)
        return
      }
      alert(`✓ Report sent to ${sendEmail}`)
      setSendEmail('')
    } catch {
      alert('Failed to send. Check n8n is active.')
    }
    setSending(false)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
        <div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>
            ✦ AI <em style={{ color: gold, fontStyle: 'italic' }}>Reporting Agent</em>
          </div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: whiteFaint, marginTop: '5px' }}>
            Select a project and report type — the agent pulls live data and writes the report
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.6fr', gap: '14px' }}>
        {/* Left — Controls */}
        <div>
          <div style={s.card}>
            <div style={s.sectionTitle}>Report Settings</div>

            {/* Project selector */}
            <div style={{ marginBottom: '14px' }}>
              <div style={s.label}>Project</div>
              <select style={s.input} value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
                <option value="">Select project...</option>
                {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name} — {p.client_name || 'Internal'}</option>)}
              </select>
            </div>

            {/* Report type */}
            <div style={{ marginBottom: '14px' }}>
              <div style={s.label}>Report Type</div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
                {reportTypes.map(rt => {
                  const isAgencyOnly = rt.id === 'sprint' || rt.id === 'client'
                  const isLocked = isAgencyOnly && !hasAIFeature('ai-reports-full')
                  return (
                    <div key={rt.id} onClick={() => {
                      if (isLocked) {
                        alert(`⬆ Upgrade to Agency\n\n${rt.label} reports require the Agency plan ($67/mo).\n\nAgency plan includes End-of-Sprint and Client-Ready reports — perfect for teams delivering to multiple clients.`)
                        return
                      }
                      setReportType(rt.id as any)
                    }}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '3px', cursor: isLocked ? 'not-allowed' : 'pointer', border: `1px solid ${reportType === rt.id ? 'rgba(201,153,58,0.5)' : border}`, background: reportType === rt.id ? 'rgba(201,153,58,0.08)' : 'rgba(16,36,72,0.4)', transition: 'all 0.15s', opacity: isLocked ? 0.5 : 1 }}>
                      <span style={{ fontSize: '16px', color: isLocked ? textDim : reportType === rt.id ? gold : textDim, flexShrink: 0 }}>{isLocked ? '🔒' : rt.icon}</span>
                      <div>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: isLocked ? textDim : reportType === rt.id ? gold : textMid }}>
                          {rt.label}
                          {isAgencyOnly && <span style={{ marginLeft: '6px', fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', color: '#4DD8F0', background: 'rgba(77,216,240,0.1)', border: '1px solid rgba(77,216,240,0.25)', borderRadius: '2px', padding: '1px 5px' }}>AGENCY</span>}
                        </div>
                        <div style={{ fontSize: '10px', color: textDim, marginTop: '1px' }}>{rt.desc}</div>
                      </div>
                      {!isLocked && reportType === rt.id && <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: gold, flexShrink: 0 }}/>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Date range */}
            <div style={{ marginBottom: '16px' }}>
              <div style={s.label}>Period Covered</div>
              <select style={s.input} value={dateRange} onChange={e => setDateRange(e.target.value)}>
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>

            <button style={{ ...s.btnGold, width: '100%', opacity: (!selectedProjectId || loading) ? 0.6 : 1 }}
              onClick={generate} disabled={!selectedProjectId || loading}>
              {loading ? '✦ Generating Report...' : '✦ Generate Report →'}
            </button>

            {loading && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: gold, animation: 'pulse 1.2s infinite' }}/>
                <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: goldDim, letterSpacing: '0.1em' }}>Pulling live data and writing report...</span>
              </div>
            )}
          </div>

          {/* Send / Export — only show when report is ready */}
          {reportOutput && (
            <div style={s.card}>
              <div style={s.sectionTitle}>Export & Send</div>
              <button onClick={copyToClipboard}
                style={{ ...s.btnGhost, width: '100%', marginBottom: '8px' }}>
                {copied ? '✓ Copied!' : '⎘ Copy Report Text'}
              </button>
              <div style={{ marginBottom: '8px' }}>
                <div style={s.label}>Send to Client (Email)</div>
                <input style={s.input} value={sendEmail} onChange={e => setSendEmail(e.target.value)}
                  placeholder="client@company.com" type="email"/>
              </div>
              <button onClick={sendToClient} disabled={sending || !sendEmail}
                style={{ ...s.btnGold, width: '100%', opacity: (!sendEmail || sending) ? 0.6 : 1 }}>
                {sending ? 'Sending...' : '✉ Send to Client →'}
              </button>
              <div style={{ marginTop: '8px', fontSize: '10px', color: textDim, lineHeight: 1.6 }}>
                Sends via your empire-pm-invoice n8n workflow.
              </div>
            </div>
          )}
        </div>

        {/* Right — Report Output */}
        <div style={s.card}>
          {!reportOutput && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ fontSize: '36px', opacity: 0.15, marginBottom: '14px' }}>✦</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: textMid, marginBottom: '8px' }}>Your report will appear here</div>
              <div style={{ fontSize: '11px', color: textDim, lineHeight: 1.7, maxWidth: '320px', margin: '0 auto' }}>
                Select a project and report type, then click Generate. The AI pulls live task, risk, milestone, and billing data — no manual input needed.
              </div>
              <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { icon: '✓', label: 'Live task data' },
                  { icon: '⚠', label: 'Risk status' },
                  { icon: '◷', label: 'Hours & billing' },
                ].map((f, i) => (
                  <div key={i} style={{ padding: '10px', background: 'rgba(201,153,58,0.04)', border: `1px solid ${border}`, borderRadius: '3px', textAlign: 'center' as const }}>
                    <div style={{ fontSize: '16px', color: goldDim, marginBottom: '4px' }}>{f.icon}</div>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, letterSpacing: '0.1em' }}>{f.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ fontSize: '28px', color: gold, animation: 'pulse 1.5s infinite', marginBottom: '14px' }}>✦</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: goldDim, letterSpacing: '0.15em' }}>ANALYSING PROJECT DATA...</div>
            </div>
          )}

          {reportOutput && !loading && (
            <div>
              {/* Report header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', paddingBottom: '12px', borderBottom: `1px solid ${border}` }}>
                <div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.2em', color: goldDim, marginBottom: '3px' }}>
                    {reportType === 'weekly' ? 'WEEKLY STATUS REPORT' : reportType === 'sprint' ? 'END OF SPRINT REPORT' : 'CLIENT STATUS UPDATE'}
                  </div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: textBright }}>
                    {projects.find((p: Project) => p.id === selectedProjectId)?.name || 'Project'}
                  </div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: textDim, marginTop: '2px' }}>
                    {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · Last {dateRange} days
                  </div>
                </div>
                <span style={{ ...s.badge(reportType === 'client' ? 'rgba(34,201,144,0.1)' : 'rgba(201,153,58,0.08)', reportType === 'client' ? '#4DFFB4' : gold, reportType === 'client' ? 'rgba(34,201,144,0.3)' : border) }}>
                  {reportType === 'client' ? 'CLIENT-READY' : reportType === 'weekly' ? 'WEEKLY' : 'SPRINT'}
                </span>
              </div>
              {/* Report body */}
              <div style={{ ...s.aiResponse, marginTop: 0 }} dangerouslySetInnerHTML={{ __html: formatAI(reportOutput) }}/>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── REPORTS VIEW (v2 — Professional PM Report) ──────────────────────────────

