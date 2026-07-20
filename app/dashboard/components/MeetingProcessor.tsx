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

export function MeetingProcessor({ user, projects, tasks, risks, supabase, onSaved, onProcessed, isMobile }: any) {
  const [title, setTitle] = useState(''); const [notes, setNotes] = useState(''); const [projectId, setProjectId] = useState(''); const [result, setResult] = useState(''); const [loading, setLoading] = useState(false); const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0])
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
    if (onProcessed) onProcessed({ title, projectId, summary: text, meetingDate })
    setLoading(false)
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
        </div>
        <div style={{ marginBottom: '12px' }}><div style={s.label}>Notes / Transcript</div><textarea style={{ ...s.input, minHeight: '160px', resize: 'vertical' as const }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Paste raw meeting notes here..."/></div>
        <button style={{ ...s.btnGold, width: '100%' }} onClick={process} disabled={loading}>{loading ? 'Processing...' : '✦ Process with AI →'}</button>
        {result && (
          <>
            <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(result) }}/>
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
              <button onClick={() => navigator.clipboard.writeText(result)} style={{ ...s.btnGhost, fontSize: '9px', padding: '5px 12px' }}>⎘ Copy Output</button>
              <button onClick={() => { setTitle(''); setNotes(''); setResult('') }} style={{ ...s.btnGhost, fontSize: '9px', padding: '5px 12px' }}>↺ Clear</button>
            </div>
            <div style={{ marginTop: '8px', padding: '10px 14px', background: 'rgba(201,153,58,0.05)', border: '1px solid rgba(201,153,58,0.2)', borderRadius: '3px', fontSize: '11px', color: '#A8C0DC' }}>
              ✓ Meeting saved — go to <strong style={{ color: '#E8B84B', cursor: 'pointer' }} onClick={() => {}}>Comms Agent</strong> to send a follow-up email to attendees.
            </div>
          </>
        )}
      </div>
      <div style={s.card}>
        <div style={s.sectionTitle}>How It Works</div>
        <div style={{ fontSize: '12px', color: textDim, lineHeight: 1.8 }}>
          Paste your meeting notes and Empire AI will extract:<br/><br/>
          <span style={{ color: gold }}>▸</span> <strong style={{ color: textMid }}>Summary</strong> — concise overview<br/>
          <span style={{ color: gold }}>▸</span> <strong style={{ color: textMid }}>Key Decisions</strong> — what was agreed<br/>
          <span style={{ color: gold }}>▸</span> <strong style={{ color: textMid }}>Action Items</strong> — who does what by when<br/>
          <span style={{ color: gold }}>▸</span> <strong style={{ color: textMid }}>Follow-up Questions</strong><br/><br/>
          After processing, go to <strong style={{ color: gold }}>Comms Agent</strong> to send a polished follow-up email to attendees.
        </div>
      </div>
    </div>
  )
}

export function ClientUpdateForm({ ai, aiLoading, aiText, projects, isMobile }: any) {
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

