'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

type Task = { id: string; name: string; status: string; priority: string; project_id: string; due_date?: string }
type Project = { id: string; name: string; client_name: string; status: string; health: number; end_date?: string; start_date?: string; user_id: string }
type Milestone = { id: string; title: string; due_date?: string; status: string; project_id: string }
type Risk = { id: string; title: string; level: string; description: string; project_id: string }

const gold = '#E8B84B'; const goldDim = '#C9993A'; const navy = '#050D1A'
const textBright = '#F0F6FF'; const textMid = '#E0ECFF'; const textDim = 'rgba(220,232,255,0.9)'
const border = 'rgba(201,153,58,0.3)'

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ClientDashboard() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUser(user); loadData(user) }
    })
  }, [])

  const loadData = async (u: any) => {
    setLoading(true)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    setProfile(prof)

    // Find projects via team_members (linked as client role)
    const { data: tmRecords } = await supabase
      .from('team_members')
      .select('project_id')
      .eq('linked_user_id', u.id)

    const projectIds = tmRecords?.map((tm: any) => tm.project_id) || []

    if (projectIds.length > 0) {
      const [pRes, tRes, msRes] = await Promise.all([
        supabase.from('projects').select('*').in('id', projectIds),
        supabase.from('tasks').select('*').in('project_id', projectIds),
        supabase.from('milestones').select('*').in('project_id', projectIds).order('due_date'),
      ])
      const projs = pRes.data || []
      setProjects(projs)
      setTasks(tRes.data || [])
      setMilestones(msRes.data || [])
      if (projs.length > 0) setSelectedProject(projs[0])
    }
    setLoading(false)
  }

  const signOut = async () => { await supabase.auth.signOut(); window.location.href = '/login' }

  const proj = selectedProject
  const projTasks = tasks.filter(t => t.project_id === proj?.id)
  const projMilestones = milestones.filter(m => m.project_id === proj?.id)
  const doneTasks = projTasks.filter(t => t.status === 'done').length
  const completionRate = projTasks.length > 0 ? Math.round((doneTasks / projTasks.length) * 100) : 0
  const completedMs = projMilestones.filter(m => m.status === 'completed').length

  if (loading) return (
    <div style={{ minHeight: '100vh', background: navy, display: 'flex', alignItems: 'center', justifyContent: 'center', color: gold, fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', letterSpacing: '0.15em' }}>
      ✦ Loading your project view...
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: navy, fontFamily: 'DM Sans, sans-serif' }}>
      {/* Top bar */}
      <div style={{ background: 'rgba(8,20,40,0.95)', borderBottom: `1px solid ${border}`, padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: textBright }}><em style={{ color: gold }}>Empire</em> PM</div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '2px' }}>CLIENT VIEW</div>
          {projects.length > 1 && (
            <select value={selectedProject?.id || ''} onChange={e => setSelectedProject(projects.find(p => p.id === e.target.value) || null)}
              style={{ background: 'rgba(16,36,72,0.8)', border: `1px solid ${border}`, borderRadius: '3px', padding: '5px 10px', fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: textBright, outline: 'none' }}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: textDim }}>{profile?.full_name || user?.email}</div>
          <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>⏻</button>
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>
        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: textDim }}>
            <div style={{ fontSize: '24px', opacity: 0.2, marginBottom: '12px' }}>◇</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '14px', color: textMid, marginBottom: '6px' }}>No projects yet</div>
            <div style={{ fontSize: '12px' }}>Your project manager hasn't linked any projects to your account yet.</div>
          </div>
        ) : proj ? (
          <>
            {/* Project header */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: textBright, marginBottom: '4px' }}>{proj.name}</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: '#C8D8F0', letterSpacing: '0.1em' }}>
                {proj.client_name} · {proj.start_date ? fmtDate(proj.start_date) : '—'} → {proj.end_date ? fmtDate(proj.end_date) : '—'}
              </div>
            </div>

            {/* RAG / Health */}
            <div style={{ background: proj.health >= 70 ? 'rgba(34,201,144,0.08)' : proj.health >= 40 ? 'rgba(245,166,35,0.08)' : 'rgba(226,75,74,0.08)', border: `1px solid ${proj.health >= 70 ? 'rgba(34,201,144,0.25)' : proj.health >= 40 ? 'rgba(245,166,35,0.25)' : 'rgba(226,75,74,0.25)'}`, borderRadius: '6px', padding: '20px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: proj.health >= 70 ? '#22C990' : proj.health >= 40 ? '#F5A623' : '#E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, color: navy, flexShrink: 0 }}>
                {proj.health >= 70 ? 'ON\nTRACK' : proj.health >= 40 ? 'AT\nRISK' : 'OFF\nTRACK'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', color: proj.health >= 70 ? '#22C990' : proj.health >= 40 ? '#FFD080' : '#FF9090', marginBottom: '4px' }}>
                  PROJECT STATUS · {proj.health}% HEALTH
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '6px', width: `${proj.health}%`, background: proj.health >= 70 ? 'linear-gradient(90deg,#1AABCC,#22C990)' : proj.health >= 40 ? 'linear-gradient(90deg,#C9993A,#E8B84B)' : 'linear-gradient(90deg,#E24B4A,#FF9090)', borderRadius: '3px' }}/>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '24px', flexShrink: 0 }}>
                {[
                  { val: `${completionRate}%`, sub: 'Tasks Done' },
                  { val: `${completedMs}/${projMilestones.length}`, sub: 'Milestones' },
                  { val: proj.status, sub: 'Status' },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: textBright }}>{s.val}</div>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: '#C8D8F0', letterSpacing: '0.12em' }}>{s.sub.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones */}
            <div style={{ background: 'rgba(20,44,88,0.85)', border: `1px solid ${border}`, borderRadius: '6px', padding: '20px 22px', marginBottom: '16px' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', color: gold, marginBottom: '14px' }}>MILESTONES</div>
              {projMilestones.length === 0 ? (
                <div style={{ fontSize: '12px', color: textDim }}>No milestones set yet.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: '8px' }}>
                  {projMilestones.map(m => {
                    const isCompleted = m.status === 'completed'
                    const isOverdue = m.due_date && new Date(m.due_date) < new Date() && !isCompleted
                    const c = isCompleted ? '#22C990' : isOverdue ? '#E24B4A' : gold
                    return (
                      <div key={m.id} style={{ background: 'rgba(8,20,44,0.5)', border: `1px solid ${isCompleted ? 'rgba(34,201,144,0.2)' : isOverdue ? 'rgba(226,75,74,0.2)' : border}`, borderRadius: '4px', padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                          {isCompleted && <span style={{ fontSize: '8px', color: c }}>✓</span>}
                        </div>
                        <div>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, color: isCompleted ? '#22C990' : isOverdue ? '#FF9090' : '#E8F0FF' }}>{m.title}</div>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(220,232,255,0.85)' }}>{fmtDate(m.due_date)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {projMilestones.length > 0 && (
                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(220,232,255,0.85)' }}>PROGRESS</span>
                  <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '4px', width: `${projMilestones.length > 0 ? (completedMs / projMilestones.length) * 100 : 0}%`, background: 'linear-gradient(90deg,#1AABCC,#22C990)', borderRadius: '2px' }}/>
                  </div>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: '#22C990' }}>{completedMs}/{projMilestones.length}</span>
                </div>
              )}
            </div>

            {/* Task summary — no individual task names for privacy */}
            <div style={{ background: 'rgba(20,44,88,0.85)', border: `1px solid ${border}`, borderRadius: '6px', padding: '20px 22px', marginBottom: '16px' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', color: gold, marginBottom: '14px' }}>DELIVERY PROGRESS</div>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: '#C8D8F0', letterSpacing: '0.1em' }}>TASK COMPLETION</span>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: completionRate >= 70 ? '#22C990' : completionRate >= 40 ? '#FFD080' : '#FF9090' }}>{completionRate}%</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '8px', width: `${completionRate}%`, background: completionRate >= 70 ? 'linear-gradient(90deg,#1AABCC,#22C990)' : 'linear-gradient(90deg,#C9993A,#E8B84B)', borderRadius: '4px' }}/>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(220,232,255,0.85)' }}>{doneTasks} COMPLETED</span>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(220,232,255,0.85)' }}>{projTasks.length - doneTasks} REMAINING</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginTop: '14px' }}>
                {[
                  { val: projTasks.filter(t => t.status === 'active').length, sub: 'In Progress', color: '#4DD8F0' },
                  { val: projTasks.filter(t => t.status === 'blocked').length, sub: 'Blocked', color: projTasks.filter(t => t.status === 'blocked').length > 0 ? '#FFD080' : textDim },
                  { val: doneTasks, sub: 'Done', color: '#22C990' },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'rgba(8,20,44,0.5)', border: `1px solid rgba(201,153,58,0.1)`, borderRadius: '4px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: s.color }}>{s.val}</div>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: '#C8D8F0', letterSpacing: '0.12em' }}>{s.sub.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', padding: '16px', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(201,168,80,0.7)', letterSpacing: '0.2em' }}>
              POWERED BY EMPIRE PM · pm.one-empire.com
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
