'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'

type Task = { id: string; name: string; status: string; priority: string; owner: string; project_id: string; due_date?: string; depends_on?: string }
type Project = { id: string; name: string; client_name: string; status: string; health: number; end_date?: string; start_date?: string }
type TimeLog = { id: string; description: string; hours: number; rate: number; project_id: string; log_date?: string }
type Risk = { id: string; title: string; level: string; status: string; project_id: string }

const gold = '#E8B84B'; const goldDim = '#C9993A'; const navy = '#050D1A'
const textBright = '#E8F0FF'; const textMid = '#D8E4F4'; const textDim = 'rgba(192,208,232,0.75)'
const border = 'rgba(201,153,58,0.2)'; const borderMd = 'rgba(201,153,58,0.35)'

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TeamDashboard() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [myProjects, setMyProjects] = useState<Project[]>([])
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [tab, setTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  // Time log form
  const [logDesc, setLogDesc] = useState(''); const [logHours, setLogHours] = useState(''); const [logProjectId, setLogProjectId] = useState(''); const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUser(user); loadData(user) }
    })
  }, [])

  const loadData = async (u: any) => {
    setLoading(true)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    setProfile(prof)

    // Find linked team_member records
    const { data: tmRecords } = await supabase
      .from('team_members')
      .select('project_id, name')
      .eq('linked_user_id', u.id)

    const projectIds = tmRecords?.map((tm: any) => tm.project_id) || []
    const memberName = prof?.full_name || u.email

    if (projectIds.length > 0) {
      const [pRes, tRes, tlRes, rRes] = await Promise.all([
        supabase.from('projects').select('*').in('id', projectIds),
        supabase.from('tasks').select('*').in('project_id', projectIds),
        supabase.from('time_logs').select('*').eq('user_id', u.id),
        supabase.from('risks').select('*').in('project_id', projectIds).neq('status', 'closed'),
      ])
      setMyProjects(pRes.data || [])
      // Show tasks assigned to this team member
      setMyTasks((tRes.data || []).filter((t: Task) => t.owner === memberName || t.owner === u.email))
      setTimeLogs(tlRes.data || [])
      setRisks(rRes.data || [])
    }
    setLoading(false)
  }

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    if (user) loadData(user)
  }

  const logTime = async () => {
    if (!logDesc || !logHours || !logProjectId) return
    await supabase.from('time_logs').insert({
      user_id: user.id, project_id: logProjectId,
      description: logDesc, hours: parseFloat(logHours),
      rate: 0, billed: false, log_date: logDate
    })
    setLogDesc(''); setLogHours(''); loadData(user)
  }

  const signOut = async () => { await supabase.auth.signOut(); window.location.href = '/login' }

  const s = {
    card: { background: 'rgba(16,36,72,0.7)', border: `1px solid ${border}`, borderRadius: '6px', padding: '20px 22px', marginBottom: '14px' } as React.CSSProperties,
    input: { width: '100%', background: 'rgba(16,36,72,0.8)', border: `1px solid ${border}`, borderRadius: '3px', padding: '9px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: textBright, outline: 'none' } as React.CSSProperties,
    label: { fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: goldDim, marginBottom: '5px', display: 'block' },
    badge: (bg: string, color: string) => ({ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', padding: '2px 6px', borderRadius: '2px', background: bg, color, flexShrink: 0 } as React.CSSProperties),
  }

  const doneTasks = myTasks.filter(t => t.status === 'done').length
  const overdueTasks = myTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done')
  const totalHours = timeLogs.reduce((s, l) => s + Number(l.hours), 0)

  const navItems = [
    { id: 'dashboard', icon: '◈', label: 'My Dashboard' },
    { id: 'tasks', icon: '✓', label: 'My Tasks' },
    { id: 'projects', icon: '◻', label: 'My Projects' },
    { id: 'time', icon: '◷', label: 'Log Time' },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', background: navy, display: 'flex', alignItems: 'center', justifyContent: 'center', color: gold, fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', letterSpacing: '0.15em' }}>
      ✦ Loading your workspace...
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100dvh', background: navy, fontFamily: 'DM Sans, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: '200px', flexShrink: 0, background: 'rgba(8,20,40,0.95)', borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: `1px solid ${border}` }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', letterSpacing: '0.25em', color: goldDim, marginBottom: '4px' }}>ONE EMPIRE</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: textBright }}><em style={{ color: gold }}>Empire</em> PM</div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', letterSpacing: '0.1em' }}>TEAM MEMBER</div>
        </div>
        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px' }}>
          {navItems.map(item => (
            <div key={item.id} onClick={() => setTab(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '3px', cursor: 'pointer', marginBottom: '1px', borderLeft: tab === item.id ? `2px solid ${gold}` : '2px solid transparent', background: tab === item.id ? 'rgba(201,153,58,0.08)' : 'transparent', color: tab === item.id ? gold : 'rgba(216,228,244,0.8)', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 500 }}>
              <span style={{ fontSize: '13px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        {/* User footer */}
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `linear-gradient(135deg,${goldDim},${gold})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, color: navy }}>
            {(profile?.full_name || user?.email || 'T')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 600, color: textMid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || user?.email}</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: textDim }}>Team Member</div>
          </div>
          <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '14px' }} title="Sign Out">⏻</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: textBright, marginBottom: '6px' }}>
              Welcome back, <em style={{ color: gold }}>{profile?.full_name?.split(' ')[0] || 'Team Member'}</em>
            </div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: textDim, letterSpacing: '0.1em', marginBottom: '24px' }}>
              TEAM MEMBER DASHBOARD · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { val: myTasks.length, sub: 'Assigned Tasks', color: textMid },
                { val: doneTasks, sub: 'Completed', color: '#22C990' },
                { val: overdueTasks.length, sub: 'Overdue', color: overdueTasks.length > 0 ? '#FF9090' : textMid },
                { val: `${totalHours.toFixed(1)}h`, sub: 'Hours Logged', color: gold },
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(16,36,72,0.7)', border: `1px solid ${border}`, borderRadius: '6px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: s.color, marginBottom: '4px' }}>{s.val}</div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, letterSpacing: '0.12em' }}>{s.sub.toUpperCase()}</div>
                </div>
              ))}
            </div>

            {/* My active tasks */}
            <div style={s.card}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', color: goldDim, marginBottom: '14px' }}>MY ACTIVE TASKS</div>
              {myTasks.filter(t => t.status !== 'done').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: textDim }}>No active tasks — you're all caught up! ✓</div>
              ) : myTasks.filter(t => t.status !== 'done').slice(0, 5).map(t => {
                const proj = myProjects.find(p => p.id === t.project_id)
                const isOverdue = t.due_date && new Date(t.due_date) < new Date()
                return (
                  <div key={t.id} style={{ padding: '10px 0', borderBottom: `1px solid rgba(201,153,58,0.08)` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: textMid, marginBottom: '3px' }}>{t.name}</div>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(201,168,80,0.75)' }}>{proj?.name || '—'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {t.due_date && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: isOverdue ? '#FF9090' : textDim }}>{fmtDate(t.due_date)}</span>}
                        <select value={t.status} onChange={e => updateTaskStatus(t.id, e.target.value)}
                          style={{ ...s.input, width: 'auto', padding: '3px 6px', fontSize: '10px', cursor: 'pointer' }}>
                          <option value="todo">Todo</option>
                          <option value="active">Active</option>
                          <option value="blocked">Blocked</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Overdue alert */}
            {overdueTasks.length > 0 && (
              <div style={{ background: 'rgba(226,75,74,0.08)', border: '1px solid rgba(226,75,74,0.25)', borderRadius: '6px', padding: '16px 20px' }}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, color: '#FF9090', letterSpacing: '0.18em', marginBottom: '8px' }}>⚠ OVERDUE TASKS</div>
                {overdueTasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                    <span style={{ color: textMid }}>{t.name}</span>
                    <span style={{ color: '#FF9090', fontFamily: 'Rajdhani, sans-serif', fontSize: '10px' }}>{fmtDate(t.due_date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Tasks */}
        {tab === 'tasks' && (
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: textBright, marginBottom: '22px' }}>My <em style={{ color: gold }}>Tasks</em></div>
            <div style={s.card}>
              {myTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: textDim, fontSize: '12px' }}>No tasks assigned to you yet.</div>
              ) : myTasks.map(t => {
                const proj = myProjects.find(p => p.id === t.project_id)
                const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
                return (
                  <div key={t.id} style={{ padding: '12px 0', borderBottom: `1px solid rgba(201,153,58,0.08)` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={s.badge(t.status === 'done' ? 'rgba(34,201,144,0.12)' : t.status === 'active' ? 'rgba(26,171,204,0.12)' : t.status === 'blocked' ? 'rgba(226,75,74,0.12)' : 'rgba(255,255,255,0.05)', t.status === 'done' ? '#4DFFB4' : t.status === 'active' ? '#4DD8F0' : t.status === 'blocked' ? '#FF9090' : 'rgba(240,246,255,0.55)')}>{t.status}</span>
                      <span style={s.badge(t.priority === 'high' ? 'rgba(226,75,74,0.08)' : 'rgba(26,171,204,0.08)', t.priority === 'high' ? '#FFAAAA' : '#4DD8F0')}>{t.priority}</span>
                      <span style={{ flex: 1, fontSize: '12px', color: textMid }}>{t.name}</span>
                      <select value={t.status} onChange={e => updateTaskStatus(t.id, e.target.value)}
                        style={{ ...s.input, width: 'auto', padding: '4px 8px', fontSize: '10px' }}>
                        <option value="todo">Todo</option>
                        <option value="active">Active</option>
                        <option value="blocked">Blocked</option>
                        <option value="done">Done ✓</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px' }}>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(201,168,80,0.75)' }}>{proj?.name || '—'}</span>
                      {t.due_date && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: isOverdue ? '#FF9090' : textDim }}>
                        {isOverdue ? '⚠ Overdue · ' : 'Due '}{fmtDate(t.due_date)}
                      </span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* My Projects */}
        {tab === 'projects' && (
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: textBright, marginBottom: '22px' }}>My <em style={{ color: gold }}>Projects</em></div>
            {myProjects.length === 0 ? (
              <div style={{ ...s.card, textAlign: 'center', padding: '40px', color: textDim }}>You haven't been assigned to any projects yet.</div>
            ) : myProjects.map(p => {
              const pTasks = myTasks.filter(t => t.project_id === p.id)
              const pDone = pTasks.filter(t => t.status === 'done').length
              const isOverdue = p.end_date && new Date(p.end_date) < new Date()
              return (
                <div key={p.id} style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '14px', fontWeight: 700, color: textBright, marginBottom: '2px' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: textDim }}>{p.client_name || 'Internal'} · {p.status}</div>
                    </div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: p.health >= 70 ? '#22C990' : p.health >= 40 ? '#FFD080' : '#FF9090' }}>{p.health}%</div>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                    <div style={{ height: '6px', width: `${p.health}%`, background: p.health >= 70 ? 'linear-gradient(90deg,#1AABCC,#22C990)' : 'linear-gradient(90deg,#C9993A,#E8B84B)', borderRadius: '3px' }}/>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Rajdhani, sans-serif', fontSize: '10px' }}>
                    <span style={{ color: textDim }}>My tasks: {pDone}/{pTasks.length} done</span>
                    {p.end_date && <span style={{ color: isOverdue ? '#FF9090' : textDim }}>Due {fmtDate(p.end_date)}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Log Time */}
        {tab === 'time' && (
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: textBright, marginBottom: '22px' }}>Log <em style={{ color: gold }}>Time</em></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={s.card}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', color: goldDim, marginBottom: '14px' }}>ADD TIME ENTRY</div>
                <div style={{ marginBottom: '10px' }}><label style={s.label}>Project</label>
                  <select style={s.input} value={logProjectId} onChange={e => setLogProjectId(e.target.value)}>
                    <option value="">Select project...</option>
                    {myProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '10px' }}><label style={s.label}>Description</label>
                  <input style={s.input} value={logDesc} onChange={e => setLogDesc(e.target.value)} placeholder="What did you work on?"/>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div><label style={s.label}>Hours</label>
                    <input style={s.input} value={logHours} onChange={e => setLogHours(e.target.value)} type="number" step="0.5" placeholder="e.g. 2.5"/>
                  </div>
                  <div><label style={s.label}>Date</label>
                    <input style={s.input} value={logDate} onChange={e => setLogDate(e.target.value)} type="date"/>
                  </div>
                </div>
                <button style={{ width: '100%', background: `linear-gradient(135deg,${goldDim},${gold})`, color: navy, border: 'none', padding: '11px', borderRadius: '3px', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', cursor: 'pointer' }} onClick={logTime}>
                  Log Time →
                </button>
              </div>
              <div style={s.card}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', color: goldDim, marginBottom: '14px' }}>MY TIME LOGS</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: gold, marginBottom: '4px' }}>{totalHours.toFixed(1)}h</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, marginBottom: '16px', letterSpacing: '0.12em' }}>TOTAL HOURS LOGGED</div>
                {timeLogs.slice(0, 8).map(l => {
                  const proj = myProjects.find(p => p.id === l.project_id)
                  return (
                    <div key={l.id} style={{ padding: '8px 0', borderBottom: `1px solid rgba(201,153,58,0.08)` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span style={{ color: textMid, flex: 1 }}>{l.description}</span>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', color: gold, marginLeft: '8px' }}>{l.hours}h</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: 'rgba(201,168,80,0.75)' }}>{proj?.name || '—'}</span>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim }}>{fmtDate(l.log_date)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
