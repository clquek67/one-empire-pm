'use client'
import { useState, useEffect, useRef, Fragment } from 'react'
import { MilestoneTrendChart } from './MilestoneTrendChart'
import { MilestoneForm } from './MilestoneForm'
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

export function TimelineView({ projects, tasks, milestones, user, supabase, onSaved, editingId, editFields, startEdit, cancelEdit, saveEdit, deleteRow, editBtn, deleteBtn, inlineInput, inlineSelect, saveBtnInline, isMobile }: any) {
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

      <MilestoneTrendChart milestones={milestones.filter((m: Milestone) => m.project_id === project?.id)} project={project} />

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

