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

export function WorkflowView({ tasks, projects, milestones, teamMembers, user, supabase, isMobile, onCreated, gold, goldDim, border, textBright, textDim, s }: any) {
  const STAGES = ['Drafted', 'Submitted', 'Reviewed', 'Approved', 'Executed']
  const [wfProject, setWfProject] = useState(projects[0]?.id || '')
  const [manualOverrides, setManualOverrides] = useState<Record<string, Record<string, boolean>>>({})
  const [loaded, setLoaded] = useState(false)

  const projTasks = tasks.filter((t: Task) => wfProject ? t.project_id === wfProject : true)

  // Load saved overrides from Supabase on mount
  useEffect(() => {
    const loadOverrides = async () => {
      const ids = tasks.map((t: Task) => t.id)
      if (!ids.length) return
      const { data } = await supabase.from('tasks').select('id, workflow_stages').in('id', ids)
      if (data) {
        const loaded: Record<string, Record<string, boolean>> = {}
        data.forEach((row: any) => { if (row.workflow_stages) loaded[row.id] = row.workflow_stages })
        setManualOverrides(loaded)
      }
      setLoaded(true)
    }
    loadOverrides()
  }, [tasks.length])

  // Auto-derive stages from task status + milestones
  const getAutoStages = (t: Task): Record<string, boolean> => {
    const taskMilestone = milestones?.find((m: any) => m.project_id === t.project_id)
    const milestoneReviewed = taskMilestone && (taskMilestone.status === 'pending' || taskMilestone.status === 'at_risk' || taskMilestone.status === 'completed')
    const milestoneApproved = taskMilestone && taskMilestone.status === 'completed'
    switch (t.status) {
      case 'todo':    return { Drafted: true,  Submitted: false, Reviewed: false,              Approved: false,              Executed: false }
      case 'active':  return { Drafted: true,  Submitted: true,  Reviewed: !!milestoneReviewed, Approved: !!milestoneApproved, Executed: false }
      case 'blocked': return { Drafted: true,  Submitted: true,  Reviewed: false,              Approved: false,              Executed: false }
      case 'done':    return { Drafted: true,  Submitted: true,  Reviewed: true,               Approved: true,               Executed: true  }
      default:        return { Drafted: false, Submitted: false, Reviewed: false,              Approved: false,              Executed: false }
    }
  }

  // Merge auto stages with manual overrides
  const getStages = (t: Task): Record<string, boolean> => {
    const auto = getAutoStages(t)
    const overrides = manualOverrides[t.id] || {}
    return { ...auto, ...overrides }
  }

  const toggleStage = async (taskId: string, stage: string) => {
    const task = tasks.find((t: Task) => t.id === taskId)
    if (!task) return
    const auto = getAutoStages(task)
    const currentOverrides = manualOverrides[taskId] || {}
    const currentVal = currentOverrides[stage] !== undefined ? currentOverrides[stage] : auto[stage]
    const newVal = !currentVal
    const newOverrides = { ...currentOverrides }
    if (newVal === auto[stage]) { delete newOverrides[stage] } else { newOverrides[stage] = newVal }
    setManualOverrides((prev: any) => ({ ...prev, [taskId]: newOverrides }))
    await supabase.from('tasks').update({ workflow_stages: newOverrides }).eq('id', taskId)
  }

  const getCompletion = (t: Task) => {
    const stages = getStages(t)
    const done = STAGES.filter(st => stages[st]).length
    return Math.round((done / STAGES.length) * 100)
  }

  return (
    <div>
      <div style={{ ...s.card, marginBottom: '16px' }}>
        <div style={s.sectionTitle}>Add New Task</div>
        <TaskForm user={user} projects={projects} teamMembers={teamMembers} tasks={tasks} onCreated={onCreated} supabase={supabase} isMobile={isMobile} />
      </div>
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', color: goldDim }}>WORKFLOW TRACKER</div>
            <div style={{ fontSize: '10px', color: textDim, marginTop: '2px' }}>Auto-synced with task status &amp; milestones · Click any stage to override</div>
          </div>
          <select value={wfProject} onChange={e => setWfProject(e.target.value)}
            style={{ background: 'rgba(16,36,72,0.8)', border: `1px solid ${border}`, borderRadius: '3px', padding: '5px 10px', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textBright, outline: 'none' }}>
            <option value="">All Projects</option>
            {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ background: 'rgba(5,13,26,0.6)' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.16em', color: goldDim, borderBottom: `1px solid ${border}` }}>TASK</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', color: goldDim, borderBottom: `1px solid ${border}`, width: '60px' }}>TO DO</th>
                <th style={{ textAlign: 'center', padding: '10px 8px', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', color: goldDim, borderBottom: `1px solid ${border}`, width: '60px' }}>DONE</th>
                {STAGES.map(stage => (
                  <th key={stage} style={{ textAlign: 'center', padding: '10px 8px', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: goldDim, borderBottom: `1px solid ${border}`, width: '80px' }}>{stage.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projTasks.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: textDim, fontSize: '12px' }}>No tasks found. Add tasks above to track them here.</td></tr>
              ) : projTasks.map((t: Task, idx: number) => {
                const pct = getCompletion(t)
                const stages = getStages(t)
                const autoStages = getAutoStages(t)
                const overrides = manualOverrides[t.id] || {}
                const isDone = t.status === 'done'
                const isTodo = t.status === 'todo'
                const rowBg = idx % 2 === 0 ? 'rgba(8,20,44,0.4)' : 'rgba(16,36,72,0.3)'
                return (
                  <tr key={t.id} style={{ background: rowBg }}>
                    <td style={{ padding: '10px 12px', borderBottom: `1px solid rgba(201,153,58,0.06)` }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: textBright, marginBottom: '5px' }}>{t.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#4DFFB4' : `linear-gradient(90deg, ${goldDim}, ${gold})`, transition: 'width 0.3s' }}/>
                        </div>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', fontWeight: 700, color: pct === 100 ? '#4DFFB4' : gold, minWidth: '36px', textAlign: 'right' as const }}>{pct}%</span>
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', fontWeight: 700, padding: '1px 6px', borderRadius: '2px',
                          background: t.status === 'done' ? 'rgba(34,201,144,0.12)' : t.status === 'active' ? 'rgba(77,216,240,0.12)' : t.status === 'blocked' ? 'rgba(226,75,74,0.12)' : 'rgba(240,246,255,0.08)',
                          color: t.status === 'done' ? '#4DFFB4' : t.status === 'active' ? '#4DD8F0' : t.status === 'blocked' ? '#FF9090' : textDim
                        }}>{t.status.toUpperCase()}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 8px', borderBottom: `1px solid rgba(201,153,58,0.06)` }}>
                      <span style={{ fontSize: '16px' }}>{isTodo ? '✅' : '⬜'}</span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 8px', borderBottom: `1px solid rgba(201,153,58,0.06)` }}>
                      <span style={{ fontSize: '16px' }}>{isDone ? '✅' : '⬜'}</span>
                    </td>
                    {STAGES.map(stage => {
                      const isAuto = overrides[stage] === undefined
                      const val = stages[stage]
                      return (
                        <td key={stage} style={{ textAlign: 'center', padding: '10px 8px', borderBottom: `1px solid rgba(201,153,58,0.06)` }}>
                          <button onClick={() => toggleStage(t.id, stage)}
                            title={isAuto ? `Auto from task status · Click to override` : `Manually overridden · Click to reset to auto`}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '17px', lineHeight: 1, padding: '2px', position: 'relative' as const }}>
                            {val ? '✅' : '❌'}
                            {!isAuto && <span style={{ position: 'absolute' as const, top: '-2px', right: '-4px', width: '5px', height: '5px', borderRadius: '50%', background: gold, display: 'block' }}/>}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', padding: '8px 0', borderTop: `1px solid ${border}`, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: '11px', color: textDim }}>✅ Complete &nbsp;❌ Incomplete &nbsp;⬜ Not applicable &nbsp;· Gold dot = manually overridden</span>
        </div>
      </div>
    </div>
  )
}

