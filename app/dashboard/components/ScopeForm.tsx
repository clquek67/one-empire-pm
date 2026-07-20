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

export function ScopeForm({ ai, aiLoading, aiText, projects, tasks, isMobile, user }: any) {
  const [desc, setDesc] = useState(''); const [projectId, setProjectId] = useState(''); const [by, setBy] = useState('')
  const [scopeSending, setScopeSending] = useState(false)

  const sendScopeReport = async () => {
    const emailEl = document.getElementById('scope-send-email') as HTMLInputElement
    const toEmail = emailEl?.value
    if (!toEmail) { alert('Please enter a recipient email'); return }
    setScopeSending(true)
    const pmName = user?.user_metadata?.full_name || 'Project Manager'
    const proj = projects.find((p: Project) => p.id === projectId)
    const cleaned = (aiText['scope'] || '')
      .split('**').join('')
      .split('\n').join('<br/>')
    const fullHtml = '<div style="background:#f8f9fa;border-left:4px solid #C9993A;padding:12px 16px;margin-bottom:20px;"><div style="font-size:10px;color:#C9993A;font-weight:700;letter-spacing:2px;margin-bottom:2px;">SCOPE CHANGE ASSESSMENT</div><div style="font-size:16px;color:#050D1A;font-weight:600;">' + (proj?.name || 'Project') + '</div><div style="font-size:12px;color:#666;margin-top:4px;">' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + '</div></div><div style="font-size:13px;line-height:1.8;color:#333;">' + cleaned + '</div><p style="margin:20px 0 0;font-size:12px;color:#999;border-top:1px solid #eee;padding-top:14px;">' + pmName + ' · ' + (user?.email || '') + '<br/>pm.one-empire.com</p>'
    try {
      const res = await fetch('https://n8n.one-empire.com/webhook/empire-pm-invoice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: proj?.client_name || 'Client', project: proj?.name || 'Project', clientEmail: toEmail, senderName: pmName, senderEmail: user?.email, invoiceDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), dueDate: '', lineItems: '', total: '', coverEmail: fullHtml })
      })
      if (!res.ok) { alert('Failed to send: ' + res.status); setScopeSending(false); return }
      alert('Scope decision sent to ' + toEmail)
      emailEl.value = ''
    } catch { alert('Network error — check n8n is running.') }
    setScopeSending(false)
  }
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
        {aiText['scope'] && (
          <>
            <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(aiText['scope']) }}/>
            <div style={{ marginTop: '12px', padding: '12px 14px', background: 'rgba(201,153,58,0.04)', border: '1px solid rgba(201,153,58,0.15)', borderRadius: '3px' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.16em', color: goldDim, marginBottom: '8px' }}>✉ SEND SCOPE DECISION TO CLIENT</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input id="scope-send-email" style={{ ...s.input, fontSize: '11px', padding: '7px 10px', flex: 1 }} placeholder="client@company.com" type="email"/>
                <button style={{ ...s.btnGold, fontSize: '9px', padding: '7px 14px', whiteSpace: 'nowrap' as const }} onClick={sendScopeReport} disabled={scopeSending}>{scopeSending ? 'Sending...' : '✉ Send →'}</button>
              </div>
              <button onClick={() => navigator.clipboard.writeText(aiText['scope'])} style={{ ...s.btnGhost, fontSize: '9px', padding: '5px 12px' }}>⎘ Copy Output</button>
            </div>
          </>
        )}
        {!aiText['scope'] && !aiLoading['scope'] && (
          <div style={{ fontSize: '12px', color: textDim, lineHeight: 1.7 }}>
            Log a scope change on the left and Empire AI will analyse the time, budget, and risk impact instantly.
          </div>
        )}
      </div>
    </div>
  )
}

