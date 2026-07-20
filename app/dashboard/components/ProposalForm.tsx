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
    .replace(/\n/g, '<br/>')
  return DOMPurify.sanitize(html, { ADD_ATTR: ['style'] })
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

export function ProposalForm({ user, projects, supabase, onCreated, setTab, isMobile }: any) {
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

