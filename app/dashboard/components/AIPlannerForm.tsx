'use client'
import { useState, useEffect, useRef, Fragment } from 'react'
import { createClient } from '@/lib/supabase-client'
import DOMPurify from 'isomorphic-dompurify'

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

export function AIPlannerForm({ ai, aiLoading, aiText, projects, tasks, risks, teamMembers, supabase, user, onPopulated, setTab, isMobile }: any) {
  const [name, setName] = useState(''); const [brief, setBrief] = useState(''); const [timeline, setTimeline] = useState('8 weeks'); const [team, setTeam] = useState('2–3 people')
  const [targetProjectId, setTargetProjectId] = useState('')
  const [populating, setPopulating] = useState(false)
  const [populateResult, setPopulateResult] = useState<{tasks: number, risks: number, milestones: number} | null>(null)
  const [plannerSending, setPlannerSending] = useState(false)

  const gold = '#E8B84B'; const goldDim = '#C9993A'

  const sendPlannerReport = async () => {
    const emailEl = document.getElementById('planner-send-email') as HTMLInputElement
    const toEmail = emailEl?.value
    if (!toEmail) { alert('Please enter a recipient email'); return }
    setPlannerSending(true)
    const pmName = user?.user_metadata?.full_name || 'Project Manager'
    const raw = aiText['planner'] || ''

    // Convert raw plan text to rich HTML — uses tables for email-safe alignment
    const toHtml = (text: string) => {
      const lines = text.split('\n')
      let html = ''
      let currentSection = ''
      let tableRows = ''

      const flushTable = () => {
        if (!tableRows) return
        if (currentSection === 'tasks') {
          html += '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;margin-bottom:8px;">'
          html += '<tr style="background:#f8f9fa;"><th align="left" style="padding:6px 8px;color:#C9993A;font-size:10px;letter-spacing:1px;border-bottom:2px solid #E8B84B;">TASK</th><th align="left" style="padding:6px 8px;color:#C9993A;font-size:10px;letter-spacing:1px;border-bottom:2px solid #E8B84B;width:70px;">PRIORITY</th><th align="left" style="padding:6px 8px;color:#C9993A;font-size:10px;letter-spacing:1px;border-bottom:2px solid #E8B84B;width:90px;">OWNER</th><th align="left" style="padding:6px 8px;color:#C9993A;font-size:10px;letter-spacing:1px;border-bottom:2px solid #E8B84B;width:100px;">DUE DATE</th></tr>'
        } else if (currentSection === 'risks') {
          html += '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;margin-bottom:8px;">'
          html += '<tr style="background:#f8f9fa;"><th align="left" style="padding:6px 8px;color:#C9993A;font-size:10px;letter-spacing:1px;border-bottom:2px solid #E8B84B;">RISK</th><th align="left" style="padding:6px 8px;color:#C9993A;font-size:10px;letter-spacing:1px;border-bottom:2px solid #E8B84B;width:70px;">LEVEL</th><th align="left" style="padding:6px 8px;color:#C9993A;font-size:10px;letter-spacing:1px;border-bottom:2px solid #E8B84B;">DESCRIPTION</th></tr>'
        } else if (currentSection === 'milestones') {
          html += '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;margin-bottom:8px;">'
          html += '<tr style="background:#f8f9fa;"><th align="left" style="padding:6px 8px;color:#C9993A;font-size:10px;letter-spacing:1px;border-bottom:2px solid #E8B84B;">MILESTONE</th><th align="left" style="padding:6px 8px;color:#C9993A;font-size:10px;letter-spacing:1px;border-bottom:2px solid #E8B84B;width:110px;">DUE DATE</th></tr>'
        } else if (currentSection === 'phases') {
          html += '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;margin-bottom:8px;">'
          html += '<tr style="background:#f8f9fa;"><th align="left" style="padding:6px 8px;color:#C9993A;font-size:10px;letter-spacing:1px;border-bottom:2px solid #E8B84B;">PHASE</th><th align="left" style="padding:6px 8px;color:#C9993A;font-size:10px;letter-spacing:1px;border-bottom:2px solid #E8B84B;width:140px;">DATES</th><th align="left" style="padding:6px 8px;color:#C9993A;font-size:10px;letter-spacing:1px;border-bottom:2px solid #E8B84B;">DELIVERABLE</th></tr>'
        }
        html += tableRows + '</table>'
        tableRows = ''
      }

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        if (/^##\s/.test(trimmed)) {
          flushTable()
          const heading = trimmed.replace(/^##\s*/, '').replace(/:/g, '').trim()
          if (/^TASKS/i.test(heading)) currentSection = 'tasks'
          else if (/^RISKS/i.test(heading)) currentSection = 'risks'
          else if (/^MILESTONES/i.test(heading)) currentSection = 'milestones'
          else if (/^PHASES/i.test(heading)) currentSection = 'phases'
          else currentSection = 'other'
          html += '<h2 style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#C9993A;letter-spacing:2px;text-transform:uppercase;margin:24px 0 8px;padding-bottom:5px;border-bottom:2px solid #E8B84B;">' + heading + '</h2>'
        } else if (/^#\s/.test(trimmed)) {
          flushTable()
          currentSection = ''
          html += '<h1 style="font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:#050D1A;margin:0 0 16px;">' + trimmed.replace(/^#\s*/, '') + '</h1>'
        } else if (/^[-\u25b8]\s/.test(trimmed)) {
          const lineContent = trimmed.replace(/^[-\u25b8]\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          const parts = lineContent.split('|').map((p: string) => p.trim())

          if (currentSection === 'tasks' && parts.length >= 3) {
            const pc = parts[1]?.toLowerCase() === 'high' ? '#e53e3e' : parts[1]?.toLowerCase() === 'medium' ? '#d69e2e' : '#38a169'
            tableRows += '<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:7px 8px;color:#333;font-size:12px;vertical-align:top;">' + parts[0] + '</td><td style="padding:7px 8px;color:' + pc + ';font-weight:700;font-size:10px;text-transform:uppercase;vertical-align:top;">' + (parts[1]||'') + '</td><td style="padding:7px 8px;color:#555;font-size:12px;vertical-align:top;">' + (parts[2]||'') + '</td><td style="padding:7px 8px;color:#888;font-size:11px;vertical-align:top;">' + (parts[3]||'') + '</td></tr>'
          } else if (currentSection === 'risks' && parts.length >= 2) {
            const rc = parts[1]?.toLowerCase() === 'high' || parts[1]?.toLowerCase() === 'critical' ? '#e53e3e' : parts[1]?.toLowerCase() === 'medium' ? '#d69e2e' : '#38a169'
            tableRows += '<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:7px 8px;color:#333;font-size:12px;font-weight:500;vertical-align:top;">' + parts[0] + '</td><td style="padding:7px 8px;color:' + rc + ';font-weight:700;font-size:10px;text-transform:uppercase;vertical-align:top;">' + (parts[1]||'') + '</td><td style="padding:7px 8px;color:#555;font-size:12px;vertical-align:top;">' + (parts[2]||'') + '</td></tr>'
          } else if (currentSection === 'milestones' && parts.length >= 2) {
            tableRows += '<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:7px 8px;color:#333;font-size:12px;vertical-align:top;">' + parts[0] + '</td><td style="padding:7px 8px;color:#888;font-size:11px;vertical-align:top;">' + (parts[1]||'') + '</td></tr>'
          } else if (currentSection === 'phases' && parts.length >= 2) {
            tableRows += '<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:7px 8px;color:#333;font-size:12px;font-weight:500;vertical-align:top;">' + parts[0] + '</td><td style="padding:7px 8px;color:#888;font-size:11px;vertical-align:top;">' + (parts[1]||'') + '</td><td style="padding:7px 8px;color:#555;font-size:12px;vertical-align:top;">' + (parts[2]||'') + '</td></tr>'
          } else {
            flushTable()
            html += '<table width="100%" cellpadding="0" cellspacing="0" style="margin:3px 0;"><tr><td width="16" valign="top" style="color:#C9993A;font-size:12px;padding-top:1px;">&#9656;</td><td style="font-family:Arial,sans-serif;font-size:12px;color:#333;line-height:1.6;padding-bottom:4px;">' + lineContent + '</td></tr></table>'
          }
        } else if (trimmed) {
          flushTable()
          html += '<p style="font-family:Arial,sans-serif;font-size:13px;color:#444;margin:6px 0;line-height:1.7;">' + trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') + '</p>'
        }
      }
      flushTable()
      return html
    }

    const bodyHtml = toHtml(raw)
    const fullHtml = '<div style="max-width:640px;margin:0 auto;font-family:Arial,sans-serif;">' +
      '<div style="background:linear-gradient(135deg,#050D1A,#0a1f3d);padding:24px 28px;margin-bottom:0;">' +
      '<div style="font-size:10px;color:#C9993A;font-weight:700;letter-spacing:3px;margin-bottom:6px;">EMPIRE PM · PROJECT PLAN</div>' +
      '<div style="font-size:22px;color:#F0F6FF;font-weight:600;">' + (name || 'New Project') + '</div>' +
      '<div style="font-size:12px;color:#8FA8C8;margin-top:4px;">' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' · Generated by ' + pmName + '</div>' +
      '</div>' +
      '<div style="background:#ffffff;padding:24px 28px;border:1px solid #e8e8e8;">' + bodyHtml + '</div>' +
      '<div style="background:#f8f9fa;padding:14px 28px;border-top:1px solid #e8e8e8;font-size:11px;color:#999;">' +
      pmName + ' · ' + (user?.email || '') + ' · pm.one-empire.com</div></div>'

    try {
      const res = await fetch('https://n8n.one-empire.com/webhook/empire-pm-invoice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: 'Team', project: name || 'Project Plan', clientEmail: toEmail, senderName: pmName, senderEmail: user?.email, invoiceDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), dueDate: '', lineItems: '', total: '', coverEmail: fullHtml })
      })
      if (!res.ok) { alert('Failed to send: ' + res.status); setPlannerSending(false); return }
      alert('Project plan sent to ' + toEmail)
      emailEl.value = ''
    } catch { alert('Network error — check n8n is running.') }
    setPlannerSending(false)
  }

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
    const tasksMatch = raw.match(/TASKS[^\n]*\n([\s\S]*?)(?=\n(?:RISKS|MILESTONES|SUMMARY|PHASES|KPIS|[A-Z]{3,})[:\s]|$)/i)
    const tasksRaw = tasksMatch ? tasksMatch[1] : ''
    const taskLines = tasksRaw.split('\n').filter((l: string) => l.trim().startsWith('-') || l.trim().startsWith('\u25b8')).map((l: string) => l.replace(/^[-\u25b8]\s*/, '').trim())

    // Parse RISKS section
    const risksMatch = raw.match(/RISKS[^\n]*\n([\s\S]*?)(?=\n(?:MILESTONES|SUMMARY|PHASES|KPIS|[A-Z]{3,})[:\s]|$)/i)
    const risksRaw = risksMatch ? risksMatch[1] : ''
    const riskLines = risksRaw.split('\n').filter((l: string) => l.trim().startsWith('-') || l.trim().startsWith('\u25b8')).map((l: string) => l.replace(/^[-\u25b8]\s*/, '').trim())

    // Parse MILESTONES section
    const msMatch = raw.match(/MILESTONES[^\n]*\n([\s\S]*?)(?=\n(?:SUMMARY|PHASES|KPIS|[A-Z]{3,})[:\s]|$)/i)
    const msRaw = msMatch ? msMatch[1] : ''
    const msLines = msRaw.split('\n').filter((l: string) => l.trim().startsWith('-') || l.trim().startsWith('\u25b8')).map((l: string) => l.replace(/^[-\u25b8]\s*/, '').trim())


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
            <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: goldDim, letterSpacing: '0.12em' }}>Don&apos;t see your project?</div>
              <button onClick={() => { if (onPopulated) onPopulated() }} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em', background: 'transparent', border: `1px solid rgba(201,153,58,0.25)`, color: goldDim, padding: '3px 10px', borderRadius: '2px', cursor: 'pointer' }}>↺ Refresh list</button>
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
        {aiText['planner'] && (
          <>
            <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(aiText['planner']) }}/>
            <div style={{ marginTop: '12px', padding: '12px 14px', background: 'rgba(201,153,58,0.04)', border: '1px solid rgba(201,153,58,0.15)', borderRadius: '3px' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.16em', color: goldDim, marginBottom: '8px' }}>✉ SHARE PROJECT PLAN</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input id="planner-send-email" style={{ flex: 1, background: 'rgba(16,36,72,0.8)', border: '1px solid rgba(201,153,58,0.2)', borderRadius: '3px', padding: '7px 10px', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#F0F6FF', outline: 'none' }} placeholder="recipient@company.com" type="email"/>
                <button style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', background: 'linear-gradient(135deg, #C9993A, #E8B84B)', color: '#050D1A', border: 'none', padding: '7px 14px', borderRadius: '2px', cursor: 'pointer', whiteSpace: 'nowrap' as const, opacity: plannerSending ? 0.6 : 1 }} onClick={sendPlannerReport} disabled={plannerSending}>{plannerSending ? 'Sending...' : '✉ Send →'}</button>
              </div>
              <button onClick={() => navigator.clipboard.writeText(aiText['planner'])} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em', border: '1px solid rgba(201,153,58,0.35)', background: 'transparent', color: '#C8DCF4', padding: '5px 12px', borderRadius: '2px', cursor: 'pointer' }}>⎘ Copy Plan</button>
            </div>
          </>
        )}
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

