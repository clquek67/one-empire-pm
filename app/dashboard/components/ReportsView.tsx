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

export function ReportsView({ projects, tasks, risks, timeLogs, milestones, teamMembers, isMobile }: any) {
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


// ─── COMMUNICATION AGENT ─────────────────────────────────────────────────────

