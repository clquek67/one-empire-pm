'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'

type User = { id: string; email: string; user_metadata: { full_name?: string; avatar_url?: string } }
type Project = { id: string; name: string; client_name: string; status: string; health: number }
type Task = { id: string; name: string; status: string; priority: string; owner: string; project_id: string }
type Risk = { id: string; title: string; description: string; level: string; status: string; project_id: string }
type TeamMember = { id: string; name: string; email: string; role: string; capacity: number; project_id: string }
type TimeLog = { id: string; description: string; hours: number; rate: number; billed: boolean; project_id: string; created_at: string }

const gold = '#E8B84B'
const goldDim = '#C9993A'
const navy = '#050D1A'
const navyCard = 'rgba(16,36,72,0.7)'
const border = 'rgba(201,153,58,0.2)'
const borderMd = 'rgba(201,153,58,0.35)'
const textBright = '#E8F0FF'
const textMid = '#C0D0E8'
const textDim = 'rgba(192,208,232,0.55)'
const whiteFaint = 'rgba(240,246,255,0.35)'

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
  return text
    .replace(/\*\*(.*?)\*\*/g, `<strong style="color:${gold}">$1</strong>`)
    .replace(/^## (.+)$/gm, `<div style="font-family:Cormorant Garamond,serif;font-size:15px;color:${textBright};margin:16px 0 6px;border-bottom:1px solid ${border};padding-bottom:4px">$1</div>`)
    .replace(/^### (.+)$/gm, `<div style="font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${gold};margin:14px 0 6px">$1</div>`)
    .replace(/^[-•] (.+)$/gm, `<div style="display:flex;gap:8px;margin:4px 0;padding-left:4px"><span style="color:${goldDim};flex-shrink:0">▸</span><span>$1</span></div>`)
    .replace(/^\d+\. (.+)$/gm, `<div style="display:flex;gap:8px;margin:4px 0;padding-left:4px"><span style="color:${goldDim};flex-shrink:0">▸</span><span>$1</span></div>`)
    .replace(/^---+$/gm, `<hr style="border:none;border-top:1px solid ${border};margin:12px 0">`)
    .replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')
}

async function callAI(system: string, content: string): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system, messages: [{ role: 'user', content }] })
  })
  const data = await res.json()
  return data.content?.[0]?.text || 'Unable to generate response.'
}

export default function Dashboard() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [tab, setTab] = useState('dashboard')
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [aiText, setAiText] = useState<Record<string, string>>({})
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({})
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUser(user as User); loadData(user.id) }
    })
  }, [])

  const loadData = async (userId: string) => {
    const [p, t, r, tm, tl] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', userId),
      supabase.from('tasks').select('*').eq('user_id', userId),
      supabase.from('risks').select('*').eq('user_id', userId),
      supabase.from('team_members').select('*').eq('user_id', userId),
      supabase.from('time_logs').select('*').eq('user_id', userId).eq('billed', false),
    ])
    if (p.data) setProjects(p.data)
    if (t.data) setTasks(t.data)
    if (r.data) setRisks(r.data)
    if (tm.data) setTeamMembers(tm.data)
    if (tl.data) setTimeLogs(tl.data)
  }

  const ai = async (key: string, system: string, content: string) => {
    setAiLoading(prev => ({ ...prev, [key]: true }))
    setAiText(prev => ({ ...prev, [key]: '' }))
    const text = await callAI(system, content)
    setAiText(prev => ({ ...prev, [key]: text }))
    setAiLoading(prev => ({ ...prev, [key]: false }))
  }

  const signOut = async () => { await supabase.auth.signOut(); window.location.href = '/login' }

  const toggleTimer = () => {
    if (timerRunning) {
      if (timerRef.current) clearInterval(timerRef.current)
      setTimerRunning(false)
    } else {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000)
      setTimerRunning(true)
    }
  }

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerRunning(false); setTimerSeconds(0)
  }

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0')
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${h}:${m}:${sec}`
  }

  const unbilledTotal = timeLogs.reduce((sum, l) => sum + l.hours * l.rate, 0)
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const activeProjects = projects.filter(p => p.status === 'active').length
  const activeTasks = tasks.filter(t => t.status === 'active').length
  const openRisks = risks.filter(r => r.status !== 'closed').length

  const navItems = [
    { id: 'dashboard', icon: '◈', label: 'Dashboard', section: 'Overview' },
    { id: 'projects', icon: '◻', label: 'Projects', section: 'Manage' },
    { id: 'tasks', icon: '✓', label: 'Tasks', section: null },
    { id: 'scope', icon: '⊕', label: 'Scope Control', section: null },
    { id: 'risks', icon: '⚠', label: 'Risk Radar', section: null, badge: openRisks > 0 ? openRisks : null },
    { id: 'meetings', icon: '◎', label: 'Meetings', section: null },
    { id: 'clients', icon: '◈', label: 'Client Portal', section: 'Clients' },
    { id: 'workload', icon: '⊞', label: 'Workload', section: null },
    { id: 'billing', icon: '◷', label: 'Time & Billing', section: 'Revenue' },
    { id: 'planner', icon: '✦', label: 'AI Planner', section: 'AI Tools', gold: true },
    { id: 'settings', icon: '⚙', label: 'Settings', section: 'Account' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: navy, overflow: 'hidden' }}>

      {/* Circuit BG */}
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', opacity: 0.1, pointerEvents: 'none', zIndex: 0 }}
        viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <g stroke="#C9993A" strokeWidth="0.8" fill="none">
          <polyline points="0,180 120,180 120,80 300,80 300,220 500,220"/>
          <polyline points="0,420 80,420 80,320 200,320 200,480 400,480 400,380 600,380"/>
          <polyline points="1440,200 1320,200 1320,100 1140,100 1140,250 940,250"/>
          <polyline points="1440,500 1360,500 1360,400 1200,400 1200,560 1000,560"/>
          <polyline points="600,0 600,150 700,150 700,50 860,50"/>
        </g>
        <g fill="#C9993A">
          <circle cx="300" cy="80" r="3"/><circle cx="200" cy="320" r="3"/>
          <circle cx="1140" cy="100" r="3"/><circle cx="860" cy="50" r="3"/>
        </g>
      </svg>

      {/* NAV */}
      <nav style={{
        position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 24px', height: '54px',
        borderBottom: `1px solid ${border}`, background: 'rgba(5,13,26,0.95)',
        backdropFilter: 'blur(12px)', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: `linear-gradient(135deg, ${goldDim}, ${gold})`, color: navy, fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: '10px', letterSpacing: '0.14em', padding: '4px 10px', borderRadius: '2px' }}>ONE EMPIRE</div>
          <div style={{ color: whiteFaint, fontSize: '18px' }}>/</div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 500, fontSize: '13px', color: 'rgba(240,246,255,0.6)' }}>
            <em style={{ color: gold, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: '16px' }}>Empire</em> PM
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34,201,144,0.08)', border: '1px solid rgba(34,201,144,0.25)', borderRadius: '20px', padding: '4px 12px', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, color: '#4DFFB4' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C990', animation: 'pulse 2s infinite' }}/>
            {activeProjects} Active Projects
          </div>
          {user?.user_metadata?.avatar_url && (
            <img src={user.user_metadata.avatar_url} style={{ width: '30px', height: '30px', borderRadius: '50%', border: `1px solid ${border}` }} alt="avatar"/>
          )}
          <button onClick={signOut} style={{ ...s.btnGhost, fontSize: '9px', padding: '5px 12px' }}>Sign Out</button>
        </div>
      </nav>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* SIDEBAR */}
        <aside style={{ width: '220px', flexShrink: 0, background: 'rgba(8,20,40,0.9)', borderRight: `1px solid ${border}`, padding: '16px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {navItems.map((item, i) => (
            <div key={item.id}>
              {item.section && (
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(201,153,58,0.5)', padding: '10px 8px 4px', marginTop: i > 0 ? '4px' : 0 }}>
                  {item.section}
                </div>
              )}
              <div onClick={() => setTab(item.id)} style={{
                display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px',
                borderRadius: '3px', fontFamily: 'Rajdhani, sans-serif', fontSize: '12px',
                fontWeight: 500, letterSpacing: '0.06em', cursor: 'pointer',
                border: '1px solid transparent', transition: 'all 0.15s',
                background: tab === item.id ? 'rgba(201,153,58,0.08)' : 'transparent',
                color: tab === item.id ? gold : item.gold ? 'rgba(232,184,75,0.6)' : whiteFaint,
                borderColor: tab === item.id ? 'rgba(201,153,58,0.25)' : 'transparent',
              }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
                {item.label}
                {item.badge && (
                  <span style={{ marginLeft: 'auto', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', background: 'rgba(226,75,74,0.2)', color: '#FFB0B0', fontWeight: 700 }}>
                    {item.badge}
                  </span>
                )}
              </div>
            </div>
          ))}
        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* ═══ DASHBOARD ═══ */}
          {tab === 'dashboard' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '22px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: 400, color: '#F0F6FF' }}>
                    Good morning, <em style={{ fontStyle: 'italic', color: gold }}>{firstName}</em> ✦
                  </div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: whiteFaint, marginTop: '5px', letterSpacing: '0.08em' }}>
                    {activeProjects} active projects · {openRisks} open risks · ${unbilledTotal.toLocaleString()} unbilled
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={s.btnGhost} onClick={() => setTab('tasks')}>+ New Task</button>
                  <button style={s.btnGold} onClick={() => setTab('planner')}>✦ AI Planner</button>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
                {[
                  { label: 'Active Projects', val: activeProjects, color: textBright },
                  { label: 'Active Tasks', val: activeTasks, color: '#4DD8F0' },
                  { label: 'Open Risks', val: openRisks, color: '#FF9090' },
                  { label: 'Unbilled', val: `$${unbilledTotal.toLocaleString()}`, color: gold },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(201,153,58,0.05)', border: `1px solid ${borderMd}`, borderRadius: '4px', padding: '14px 16px' }}>
                    <div style={s.label}>{m.label}</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', fontWeight: 500, color: m.color, lineHeight: 1 }}>{m.val}</div>
                  </div>
                ))}
              </div>

              {/* AI Insight */}
              <div style={{ background: 'rgba(201,153,58,0.05)', border: `1px solid ${borderMd}`, borderRadius: '4px', padding: '14px 16px', display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(201,153,58,0.1)', border: `1px solid ${borderMd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0, color: gold }}>✦</div>
                <div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: gold, marginBottom: '4px' }}>Empire AI · Daily Insight</div>
                  <div style={{ fontSize: '12px', color: textMid, lineHeight: 1.65 }}>
                    {projects.length === 0 ? 'Welcome to Empire PM! Start by creating your first project.' :
                      `You have ${activeProjects} active project${activeProjects !== 1 ? 's' : ''} and ${openRisks} open risk${openRisks !== 1 ? 's' : ''}. ${unbilledTotal > 0 ? `$${unbilledTotal.toLocaleString()} is ready to invoice.` : ''}`}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Recent Tasks <span style={{ fontSize: '9px', color: gold, cursor: 'pointer', fontWeight: 400 }} onClick={() => setTab('tasks')}>View all →</span></div>
                    {tasks.slice(0, 5).map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: `1px solid rgba(201,153,58,0.1)`, fontSize: '11px' }}>
                        <span style={s.badge(t.status === 'done' ? 'rgba(34,201,144,0.12)' : t.status === 'active' ? 'rgba(26,171,204,0.12)' : t.status === 'blocked' ? 'rgba(226,75,74,0.12)' : 'rgba(240,246,255,0.05)', t.status === 'done' ? '#4DFFB4' : t.status === 'active' ? '#4DD8F0' : t.status === 'blocked' ? '#FF9090' : whiteFaint, t.status === 'done' ? 'rgba(34,201,144,0.28)' : t.status === 'active' ? 'rgba(26,171,204,0.28)' : t.status === 'blocked' ? 'rgba(226,75,74,0.28)' : 'rgba(240,246,255,0.1)')}>{t.status}</span>
                        <span style={s.badge(t.priority === 'high' ? 'rgba(226,75,74,0.08)' : 'rgba(26,171,204,0.08)', t.priority === 'high' ? '#FFAAAA' : '#4DD8F0', t.priority === 'high' ? 'rgba(226,75,74,0.18)' : 'rgba(26,171,204,0.18)')}>{t.priority}</span>
                        <span style={{ flex: 1, color: textMid }}>{t.name}</span>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: whiteFaint }}>{t.owner}</span>
                      </div>
                    ))}
                    {tasks.length === 0 && <div style={{ color: textDim, fontSize: '12px' }}>No tasks yet — add one in the Tasks tab</div>}
                  </div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Project Health</div>
                    {projects.slice(0, 4).map(p => (
                      <div key={p.id} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px' }}>
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, color: textMid }}>{p.name}</span>
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', color: whiteFaint, fontSize: '10px' }}>{p.health}%</span>
                        </div>
                        <div style={{ height: '3px', background: 'rgba(240,246,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '3px', width: `${p.health}%`, background: `linear-gradient(90deg, ${goldDim}, ${gold})`, borderRadius: '2px' }}/>
                        </div>
                      </div>
                    ))}
                    {projects.length === 0 && <div style={{ color: textDim, fontSize: '12px' }}>No projects yet — create one in the Projects tab</div>}
                  </div>
                </div>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Top Risks <span style={{ fontSize: '9px', color: gold, cursor: 'pointer', fontWeight: 400 }} onClick={() => setTab('risks')}>View all →</span></div>
                    {risks.filter(r => r.status !== 'closed').slice(0, 3).map(r => (
                      <div key={r.id} style={{ borderLeft: `3px solid ${r.level === 'critical' || r.level === 'high' ? '#E24B4A' : r.level === 'medium' ? '#F5A623' : '#22C990'}`, padding: '10px 12px', marginBottom: '8px', background: 'rgba(16,36,72,0.5)', borderRadius: '0 3px 3px 0' }}>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textBright, marginBottom: '3px' }}>{r.title}</div>
                        <div style={{ fontSize: '11px', color: textDim }}>{r.description}</div>
                      </div>
                    ))}
                    {risks.length === 0 && <div style={{ color: textDim, fontSize: '12px' }}>No risks logged yet</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ PROJECTS ═══ */}
          {tab === 'projects' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>Your <em style={{ color: gold, fontStyle: 'italic' }}>Projects</em></div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: whiteFaint, marginTop: '5px' }}>Manage projects and team members</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Create New Project</div>
                    <ProjectForm user={user} onCreated={() => user && loadData(user.id)} supabase={supabase} />
                  </div>
                </div>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Active Projects</div>
                    {projects.map(p => (
                      <div key={p.id} style={{ padding: '12px 0', borderBottom: `1px solid rgba(201,153,58,0.1)` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, fontSize: '13px', color: textBright }}>{p.name}</span>
                          <span style={s.badge('rgba(201,153,58,0.08)', gold, 'rgba(201,153,58,0.25)')}>{p.status}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: textDim }}>{p.client_name}</div>
                        <div style={{ height: '2px', background: 'rgba(240,246,255,0.07)', borderRadius: '1px', marginTop: '8px', overflow: 'hidden' }}>
                          <div style={{ height: '2px', width: `${p.health}%`, background: `linear-gradient(90deg, ${goldDim}, ${gold})` }}/>
                        </div>
                      </div>
                    ))}
                    {projects.length === 0 && <div style={{ color: textDim, fontSize: '12px' }}>No projects yet</div>}
                  </div>
                </div>
              </div>
              {/* Team Members */}
              <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={s.card}>
                  <div style={s.sectionTitle}>Add Team Member</div>
                  <TeamMemberForm user={user} projects={projects} onCreated={() => user && loadData(user.id)} supabase={supabase} />
                </div>
                <div style={s.card}>
                  <div style={s.sectionTitle}>Team Members</div>
                  {teamMembers.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: `1px solid rgba(201,153,58,0.1)` }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(201,153,58,0.12)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700, color: gold, flexShrink: 0 }}>
                        {m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textMid }}>{m.name}</div>
                        <div style={{ fontSize: '10px', color: textDim }}>{m.email} · {m.role}</div>
                      </div>
                      <div style={{ width: '80px', height: '3px', background: 'rgba(240,246,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '3px', width: `${m.capacity}%`, background: m.capacity > 80 ? 'linear-gradient(90deg,#E24B4A,#FF9090)' : `linear-gradient(90deg,#1AABCC,#4DD8F0)` }}/>
                      </div>
                    </div>
                  ))}
                  {teamMembers.length === 0 && <div style={{ color: textDim, fontSize: '12px' }}>No team members yet</div>}
                </div>
              </div>
            </div>
          )}

          {/* ═══ TASKS ═══ */}
          {tab === 'tasks' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF', marginBottom: '22px' }}>
                Task <em style={{ color: gold, fontStyle: 'italic' }}>Manager</em>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={s.card}>
                  <div style={s.sectionTitle}>Add New Task</div>
                  <TaskForm user={user} projects={projects} teamMembers={teamMembers} onCreated={() => user && loadData(user.id)} supabase={supabase} />
                </div>
                <div style={s.card}>
                  <div style={s.sectionTitle}>All Tasks</div>
                  {tasks.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: `1px solid rgba(201,153,58,0.1)`, fontSize: '11px' }}>
                      <span style={s.badge(t.status === 'done' ? 'rgba(34,201,144,0.12)' : t.status === 'active' ? 'rgba(26,171,204,0.12)' : t.status === 'blocked' ? 'rgba(226,75,74,0.12)' : 'rgba(240,246,255,0.05)', t.status === 'done' ? '#4DFFB4' : t.status === 'active' ? '#4DD8F0' : t.status === 'blocked' ? '#FF9090' : whiteFaint, t.status === 'done' ? 'rgba(34,201,144,0.28)' : 'rgba(26,171,204,0.28)')}>{t.status}</span>
                      <span style={s.badge(t.priority === 'high' ? 'rgba(226,75,74,0.08)' : 'rgba(26,171,204,0.08)', t.priority === 'high' ? '#FFAAAA' : '#4DD8F0', 'rgba(26,171,204,0.18)')}>{t.priority}</span>
                      <span style={{ flex: 1, color: textMid }}>{t.name}</span>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: whiteFaint }}>{t.owner}</span>
                    </div>
                  ))}
                  {tasks.length === 0 && <div style={{ color: textDim, fontSize: '12px' }}>No tasks yet</div>}
                </div>
              </div>
            </div>
          )}

          {/* ═══ RISKS ═══ */}
          {tab === 'risks' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>Risk <em style={{ color: gold, fontStyle: 'italic' }}>Radar</em></div>
                <button style={s.btnGold} onClick={() => ai('risks', 'You are an expert risk manager. Identify hidden project risks and provide mitigation strategies.', `Projects: ${projects.map(p => p.name).join(', ')}. Team size: ${teamMembers.length}. Open risks: ${risks.filter(r => r.status !== 'closed').length}`)}>✦ AI Risk Scan</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Log New Risk</div>
                    <RiskForm user={user} projects={projects} onCreated={() => user && loadData(user.id)} supabase={supabase} />
                  </div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Active Risks</div>
                    {risks.filter(r => r.status !== 'closed').map(r => (
                      <div key={r.id} style={{ borderLeft: `3px solid ${r.level === 'critical' || r.level === 'high' ? '#E24B4A' : r.level === 'medium' ? '#F5A623' : '#22C990'}`, padding: '10px 12px', marginBottom: '10px', background: 'rgba(16,36,72,0.5)', borderRadius: '0 3px 3px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textBright }}>{r.title}</div>
                          <span style={s.badge(r.level === 'critical' ? 'rgba(226,75,74,0.15)' : 'rgba(245,166,35,0.12)', r.level === 'critical' ? '#FF9090' : '#FFD080', r.level === 'critical' ? 'rgba(226,75,74,0.3)' : 'rgba(245,166,35,0.28)')}>{r.level}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: textDim }}>{r.description}</div>
                      </div>
                    ))}
                    {risks.length === 0 && <div style={{ color: textDim, fontSize: '12px' }}>No risks logged yet</div>}
                  </div>
                </div>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>✦ AI Risk Analysis</div>
                    {aiLoading['risks'] && <div style={{ color: textDim, fontSize: '12px' }}>Scanning for hidden risks...</div>}
                    {aiText['risks'] && <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(aiText['risks']) }}/>}
                    {!aiLoading['risks'] && !aiText['risks'] && (
                      <div style={{ fontSize: '11px', color: textDim, lineHeight: 1.7 }}>
                        Click <strong style={{ color: gold }}>AI Risk Scan</strong> to identify hidden risks across your projects.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ MEETINGS ═══ */}
          {tab === 'meetings' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF', marginBottom: '22px' }}>
                Meeting <em style={{ color: gold, fontStyle: 'italic' }}>Processor</em>
              </div>
              <MeetingProcessor user={user} projects={projects} supabase={supabase} onSaved={() => user && loadData(user.id)} />
            </div>
          )}

          {/* ═══ CLIENTS ═══ */}
          {tab === 'clients' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>Client <em style={{ color: gold, fontStyle: 'italic' }}>Portal</em></div>
                <button style={s.btnGold} onClick={() => ai('client', 'You are a professional PM writing client updates. Write clear professional updates that build confidence.', 'Generate a general project progress update for all active projects.')}>✦ Generate Update</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>
                <div style={s.card}>
                  <div style={s.sectionTitle}>Generate Client Update</div>
                  <ClientUpdateForm ai={ai} aiLoading={aiLoading} aiText={aiText} projects={projects} />
                </div>
                <div>
                  {projects.map(p => (
                    <div key={p.id} style={{ ...s.card, marginBottom: '10px' }}>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', color: textBright, marginBottom: '4px' }}>{p.client_name || p.name}</div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: whiteFaint }}>{p.name} · {p.health}% complete</div>
                      <div style={{ marginTop: '8px' }}>
                        <span style={s.badge('rgba(201,153,58,0.08)', gold, border)}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ WORKLOAD ═══ */}
          {tab === 'workload' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>Team <em style={{ color: gold, fontStyle: 'italic' }}>Workload</em></div>
                <button style={s.btnGold} onClick={() => ai('workload', 'You are an expert resource manager. Analyse team workload and provide specific rebalancing recommendations.', `Team: ${teamMembers.map(m => `${m.name} (${m.capacity}% capacity)`).join(', ')}. Tasks: ${tasks.filter(t => t.status === 'active').length} active.`)}>✦ AI Rebalance</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={s.card}>
                  <div style={s.sectionTitle}>Team Capacity</div>
                  {teamMembers.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `1px solid rgba(201,153,58,0.1)` }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(201,153,58,0.12)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700, color: gold, flexShrink: 0 }}>
                        {m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span style={{ flex: 1, fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textMid }}>{m.name}</span>
                      <div style={{ width: '120px', height: '4px', background: 'rgba(240,246,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '4px', width: `${m.capacity}%`, background: m.capacity > 80 ? 'linear-gradient(90deg,#E24B4A,#FF9090)' : 'linear-gradient(90deg,#1AABCC,#4DD8F0)', borderRadius: '2px' }}/>
                      </div>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: whiteFaint, width: '80px', textAlign: 'right' }}>{m.capacity}% · {m.capacity > 80 ? 'Busy' : 'Available'}</span>
                    </div>
                  ))}
                  {teamMembers.length === 0 && <div style={{ color: textDim, fontSize: '12px' }}>Add team members in the Projects tab</div>}
                </div>
                <div style={s.card}>
                  <div style={s.sectionTitle}>✦ AI Rebalancing</div>
                  {aiLoading['workload'] && <div style={{ color: textDim, fontSize: '12px' }}>Analysing workload...</div>}
                  {aiText['workload'] && <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(aiText['workload']) }}/>}
                  {!aiLoading['workload'] && !aiText['workload'] && (
                    <div style={{ fontSize: '11px', color: textDim, lineHeight: 1.7 }}>Click <strong style={{ color: gold }}>AI Rebalance</strong> for recommendations based on your team capacity.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ BILLING ═══ */}
          {tab === 'billing' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF' }}>Time &amp; <em style={{ color: gold, fontStyle: 'italic' }}>Billing</em></div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: whiteFaint, marginTop: '5px' }}>${unbilledTotal.toLocaleString()} unbilled · ready to invoice</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    id="invoice-client-email"
                    style={{ ...s.input, width: '220px', fontSize: '11px', padding: '7px 10px' }}
                    placeholder="Client email to send invoice..."
                    type="email"
                  />
                  <button style={s.btnGold} onClick={async () => {
                    const clientEmail = (document.getElementById('invoice-client-email') as HTMLInputElement)?.value
                    const items = timeLogs.map(l => `${l.description} (${l.hours}h @ $${l.rate}/hr)`).join(', ')
                    await ai('invoice', 'You are a professional billing assistant. Generate a professional invoice covering email with itemised billing and payment instructions.', `Unbilled items: ${items}. Total: $${unbilledTotal.toLocaleString()}. Client email: ${clientEmail || 'Not provided'}`)
                    if (clientEmail) {
                      const project = projects[0]
                      await fetch('https://n8n.one-empire.com/webhook/empire-pm-invoice', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          client: project?.client_name || 'Client',
                          project: project?.name || 'Project',
                          clientEmail,
                          items,
                          total: `$${unbilledTotal.toLocaleString()}`,
                          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                          senderName: user?.user_metadata?.full_name,
                          senderEmail: user?.email
                        })
                      }).catch(() => {})
                    }
                  }}>✦ Generate Invoice</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Live Timer</div>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '48px', fontWeight: 400, color: gold, textAlign: 'center', padding: '20px 0' }}>{formatTime(timerSeconds)}</div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '16px' }}>
                      <button style={s.btnGold} onClick={toggleTimer}>{timerRunning ? '⏸ Pause' : '▶ Start'}</button>
                      <button style={s.btnGhost} onClick={resetTimer}>↺ Reset</button>
                    </div>
                  </div>
                  <div style={s.card}>
                    <div style={s.sectionTitle}>Log Time</div>
                    <TimeLogForm user={user} projects={projects} onCreated={() => user && loadData(user.id)} supabase={supabase} />
                  </div>
                </div>
                <div style={s.card}>
                  <div style={s.sectionTitle}>Unbilled Hours</div>
                  {timeLogs.map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: `1px solid rgba(201,153,58,0.1)`, fontSize: '11px' }}>
                      <span style={{ flex: 1, color: textMid }}>{l.description}</span>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', color: whiteFaint, width: '35px', textAlign: 'right' }}>{l.hours}h</span>
                      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '14px', color: gold, width: '70px', textAlign: 'right' }}>${(l.hours * l.rate).toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: `1px solid ${borderMd}`, marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 600, color: goldDim }}>TOTAL UNBILLED</span>
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: gold }}>${unbilledTotal.toLocaleString()}</span>
                  </div>
                  {aiText['invoice'] && <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(aiText['invoice']) }}/>}
                </div>
              </div>
            </div>
          )}

          {/* ═══ AI PLANNER ═══ */}
          {tab === 'planner' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF', marginBottom: '22px' }}>
                ✦ AI <em style={{ color: gold, fontStyle: 'italic' }}>Planner</em>
              </div>
              <AIPlannerForm ai={ai} aiLoading={aiLoading} aiText={aiText} />
            </div>
          )}

          {/* ═══ SCOPE ═══ */}
          {tab === 'scope' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF', marginBottom: '22px' }}>
                Scope <em style={{ color: gold, fontStyle: 'italic' }}>Control</em>
              </div>
              <ScopeForm ai={ai} aiLoading={aiLoading} aiText={aiText} projects={projects} />
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {tab === 'settings' && (
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: '#F0F6FF', marginBottom: '22px' }}>
                Account <em style={{ color: gold, fontStyle: 'italic' }}>Settings</em>
              </div>
              <SettingsForm user={user} supabase={supabase} />
            </div>
          )}

        </main>
      </div>

      {/* STATUS BAR */}
      <div style={{ height: '28px', background: 'rgba(5,13,26,0.97)', borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: '20px', flexShrink: 0, position: 'relative', zIndex: 10 }}>
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em', color: whiteFaint, display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C990' }}/>All systems live
        </div>
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: whiteFaint }}>pm.one-empire.com</div>
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: whiteFaint }}>Empire PM v2.0</div>
        <div style={{ marginLeft: 'auto', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: whiteFaint }}>One Empire © 2025</div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  )
}

// ─── SUB-COMPONENTS ───

function ProjectForm({ user, onCreated, supabase }: any) {
  const [name, setName] = useState(''); const [client, setClient] = useState(''); const [budget, setBudget] = useState('')
  const submit = async () => {
    if (!name || !user) return
    await supabase.from('projects').insert({ user_id: user.id, name, client_name: client, budget: budget ? parseFloat(budget) : null })
    setName(''); setClient(''); setBudget(''); onCreated()
  }
  return (
    <div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Project Name</div><input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Enterprise CRM"/></div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Client Name</div><input style={s.input} value={client} onChange={e => setClient(e.target.value)} placeholder="e.g. Acme Corp"/></div>
      <div style={{ marginBottom: '12px' }}><div style={s.label}>Budget ($)</div><input style={s.input} value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. 50000" type="number"/></div>
      <button style={{ ...s.btnGold, width: '100%' }} onClick={submit}>Create Project →</button>
    </div>
  )
}

function TeamMemberForm({ user, projects, onCreated, supabase }: any) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [role, setRole] = useState(''); const [projectId, setProjectId] = useState(''); const [capacity, setCapacity] = useState('100')
  const submit = async () => {
    if (!name || !email || !projectId || !user) return
    await supabase.from('team_members').insert({ user_id: user.id, project_id: projectId, name, email, role, capacity: parseInt(capacity) })
    setName(''); setEmail(''); setRole(''); onCreated()
  }
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div><div style={s.label}>Name</div><input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Full name"/></div>
        <div><div style={s.label}>Email</div><input style={s.input} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@company.com" type="email"/></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div><div style={s.label}>Role</div><input style={s.input} value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Developer"/></div>
        <div><div style={s.label}>Capacity %</div><input style={s.input} value={capacity} onChange={e => setCapacity(e.target.value)} type="number" min="0" max="100"/></div>
      </div>
      <div style={{ marginBottom: '12px' }}>
        <div style={s.label}>Project</div>
        <select style={s.input} value={projectId} onChange={e => setProjectId(e.target.value)}>
          <option value="">Select project...</option>
          {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <button style={{ ...s.btnGold, width: '100%' }} onClick={submit}>Add Team Member →</button>
    </div>
  )
}

function TaskForm({ user, projects, teamMembers, onCreated, supabase }: any) {
  const [name, setName] = useState(''); const [status, setStatus] = useState('todo'); const [priority, setPriority] = useState('medium'); const [owner, setOwner] = useState(''); const [projectId, setProjectId] = useState(''); const [dueDate, setDueDate] = useState('')
  const submit = async () => {
    if (!name || !projectId || !user) return
    await supabase.from('tasks').insert({ user_id: user.id, project_id: projectId, name, status, priority, owner, due_date: dueDate || null })
    setName(''); setOwner(''); setDueDate(''); onCreated()
  }
  return (
    <div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Task Name</div><input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="What needs to be done?"/></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div><div style={s.label}>Project</div>
          <select style={s.input} value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">Select...</option>
            {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div><div style={s.label}>Priority</div>
          <select style={s.input} value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div><div style={s.label}>Owner</div>
          <select style={s.input} value={owner} onChange={e => setOwner(e.target.value)}>
            <option value="">Select...</option>
            {teamMembers.map((m: TeamMember) => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>
        </div>
        <div><div style={s.label}>Due Date</div><input style={s.input} value={dueDate} onChange={e => setDueDate(e.target.value)} type="date"/></div>
      </div>
      <button style={{ ...s.btnGold, width: '100%' }} onClick={submit}>Add Task →</button>
    </div>
  )
}

function RiskForm({ user, projects, onCreated, supabase }: any) {
  const [title, setTitle] = useState(''); const [desc, setDesc] = useState(''); const [level, setLevel] = useState('medium'); const [projectId, setProjectId] = useState('')
  const submit = async () => {
    if (!title || !projectId || !user) return
    await supabase.from('risks').insert({ user_id: user.id, project_id: projectId, title, description: desc, level })
    setTitle(''); setDesc(''); onCreated()
  }
  return (
    <div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Risk Title</div><input style={s.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Security audit delay"/></div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Description</div><textarea style={{ ...s.input, minHeight: '70px', resize: 'vertical' as const }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the risk and potential impact..."/></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div><div style={s.label}>Project</div>
          <select style={s.input} value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">Select...</option>
            {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div><div style={s.label}>Level</div>
          <select style={s.input} value={level} onChange={e => setLevel(e.target.value)}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <button style={{ ...s.btnGold, width: '100%' }} onClick={submit}>Log Risk →</button>
    </div>
  )
}

function TimeLogForm({ user, projects, onCreated, supabase }: any) {
  const [desc, setDesc] = useState(''); const [hours, setHours] = useState(''); const [rate, setRate] = useState('250'); const [projectId, setProjectId] = useState('')
  const submit = async () => {
    if (!desc || !hours || !projectId || !user) return
    await supabase.from('time_logs').insert({ user_id: user.id, project_id: projectId, description: desc, hours: parseFloat(hours), rate: parseFloat(rate) })
    setDesc(''); setHours(''); onCreated()
  }
  return (
    <div>
      <div style={{ marginBottom: '10px' }}><div style={s.label}>Description</div><input style={s.input} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Task description"/></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div><div style={s.label}>Project</div>
          <select style={s.input} value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">Select...</option>
            {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div><div style={s.label}>Hours</div><input style={s.input} value={hours} onChange={e => setHours(e.target.value)} type="number" step="0.5" placeholder="e.g. 2.5"/></div>
        <div><div style={s.label}>Rate ($/hr)</div><input style={s.input} value={rate} onChange={e => setRate(e.target.value)} type="number" placeholder="250"/></div>
      </div>
      <button style={{ ...s.btnGold, width: '100%' }} onClick={submit}>Log Time →</button>
    </div>
  )
}

function MeetingProcessor({ user, projects, supabase, onSaved }: any) {
  const [title, setTitle] = useState(''); const [notes, setNotes] = useState(''); const [email, setEmail] = useState(''); const [projectId, setProjectId] = useState(''); const [result, setResult] = useState(''); const [loading, setLoading] = useState(false)
  const process = async () => {
    if (!notes) return
    setLoading(true); setResult('')
    const text = await callAI('You are an expert meeting facilitator. Extract: 1. Summary, 2. Key Decisions, 3. Action Items with owners, 4. Follow-up Questions.', `Meeting: ${title}\n\nNotes:\n${notes}`)
    setResult(text)
    if (user && projectId) {
      await supabase.from('meetings').insert({ user_id: user.id, project_id: projectId, title, notes, summary: text })
      onSaved()
    }
    if (email) {
      await fetch('https://n8n.one-empire.com/webhook/empire-pm-meeting', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, notes, email, senderName: user?.user_metadata?.full_name, senderEmail: user?.email })
      }).catch(() => {})
    }
    setLoading(false)
    setTimeout(() => { setTitle(''); setNotes(''); setEmail(''); setResult('') }, 5000)
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
      <div style={s.card}>
        <div style={s.sectionTitle}>Process Meeting Notes</div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Meeting Title</div><input style={s.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Alpha Sprint Review"/></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div><div style={s.label}>Project</div>
            <select style={s.input} value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">Select...</option>
              {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><div style={s.label}>Send Summary To</div><input style={s.input} value={email} onChange={e => setEmail(e.target.value)} placeholder="team@client.com" type="email"/></div>
        </div>
        <div style={{ marginBottom: '12px' }}><div style={s.label}>Notes / Transcript</div><textarea style={{ ...s.input, minHeight: '160px', resize: 'vertical' as const }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Paste raw meeting notes here..."/></div>
        <button style={{ ...s.btnGold, width: '100%' }} onClick={process} disabled={loading}>{loading ? 'Processing...' : '✦ Process with AI →'}</button>
        {result && <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(result) }}/>}
      </div>
      <div style={s.card}>
        <div style={s.sectionTitle}>How It Works</div>
        <div style={{ fontSize: '12px', color: textDim, lineHeight: 1.8 }}>
          Paste your meeting notes and Empire AI will extract:<br/><br/>
          <span style={{ color: gold }}>▸</span> <strong style={{ color: textMid }}>Summary</strong> — concise overview<br/>
          <span style={{ color: gold }}>▸</span> <strong style={{ color: textMid }}>Key Decisions</strong> — what was agreed<br/>
          <span style={{ color: gold }}>▸</span> <strong style={{ color: textMid }}>Action Items</strong> — who does what by when<br/>
          <span style={{ color: gold }}>▸</span> <strong style={{ color: textMid }}>Follow-up Questions</strong><br/><br/>
          Add an email address to automatically send the summary to your team via n8n.
        </div>
      </div>
    </div>
  )
}

function ClientUpdateForm({ ai, aiLoading, aiText, projects }: any) {
  const [projectId, setProjectId] = useState(''); const [tone, setTone] = useState('Professional'); const [notes, setNotes] = useState('')
  const generate = () => {
    const project = projects.find((p: Project) => p.id === projectId)
    ai('client', 'You are a professional PM writing client updates. Write clear professional updates that build confidence. Never reveal internal issues unless explicitly included.', `Project: ${project?.name || 'General update'}\nClient: ${project?.client_name || 'Client'}\nTone: ${tone}\nKey points: ${notes || 'General progress update — project on track'}\n\nWrite a professional client status update email.`)
  }
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
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

function AIPlannerForm({ ai, aiLoading, aiText }: any) {
  const [name, setName] = useState(''); const [brief, setBrief] = useState(''); const [timeline, setTimeline] = useState('8 weeks'); const [team, setTeam] = useState('2–3 people')
  const generate = () => {
    if (!brief) return
    ai('planner', 'You are an expert PM. Generate comprehensive project plans. Include: Phase Breakdown with milestones, Key Tasks with owners/priorities, Risk Register, KPIs, Budget considerations.', `Project: ${name || 'New Project'}\nTimeline: ${timeline}\nTeam: ${team}\n\nBrief:\n${brief}`)
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
      <div style={s.card}>
        <div style={s.sectionTitle}>Project Brief</div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Project Name</div><input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Customer Portal v2"/></div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Brief Description</div><textarea style={{ ...s.input, minHeight: '120px', resize: 'vertical' as const }} value={brief} onChange={e => setBrief(e.target.value)} placeholder="Describe your project, goals, constraints..."/></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
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
        <button style={{ ...s.btnGold, width: '100%' }} onClick={generate}>{aiLoading['planner'] ? 'Generating...' : '✦ Generate Full Project Plan →'}</button>
      </div>
      <div style={s.card}>
        {aiLoading['planner'] && <div style={{ color: textDim, fontSize: '12px' }}>Generating your project plan...</div>}
        {aiText['planner'] && <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(aiText['planner']) }}/>}
        {!aiLoading['planner'] && !aiText['planner'] && (
          <div>
            <div style={s.sectionTitle}>How It Works</div>
            <div style={{ fontSize: '12px', color: textDim, lineHeight: 1.8 }}>
              Fill in your brief and Empire AI generates:<br/><br/>
              <span style={{ color: gold }}>▸</span> Phase breakdown with milestones<br/>
              <span style={{ color: gold }}>▸</span> Task list with owners and priorities<br/>
              <span style={{ color: gold }}>▸</span> Risk register with mitigation<br/>
              <span style={{ color: gold }}>▸</span> KPIs to measure success<br/>
              <span style={{ color: gold }}>▸</span> Budget considerations
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ScopeForm({ ai, aiLoading, aiText, projects }: any) {
  const [desc, setDesc] = useState(''); const [projectId, setProjectId] = useState(''); const [by, setBy] = useState('')
  const analyse = () => {
    if (!desc) return
    const project = projects.find((p: Project) => p.id === projectId)
    ai('scope', 'You are an expert PM. Analyse scope changes and provide impact assessments. Format: Impact Summary, Time Impact, Budget Impact, Risk Level, Recommendation.', `Project: ${project?.name || 'Unknown'}\nRequested by: ${by || 'Unknown'}\nScope change: ${desc}`)
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
      <div style={s.card}>
        <div style={s.sectionTitle}>Log Scope Change</div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Change Description</div><textarea style={{ ...s.input, minHeight: '100px', resize: 'vertical' as const }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the scope change requested..."/></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
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
        {aiText['scope'] && <div style={s.aiResponse} dangerouslySetInnerHTML={{ __html: formatAI(aiText['scope']) }}/>}
        {!aiText['scope'] && !aiLoading['scope'] && (
          <div style={{ fontSize: '12px', color: textDim, lineHeight: 1.7 }}>
            Log a scope change on the left and Empire AI will analyse the time, budget, and risk impact instantly.
          </div>
        )}
      </div>
    </div>
  )
}

function SettingsForm({ user, supabase }: any) {
  const [company, setCompany] = useState(''); const [phone, setPhone] = useState(''); const [saved, setSaved] = useState(false)
  const save = async () => {
    if (!user) return
    await supabase.from('profiles').update({ company_name: company, phone }).eq('id', user.id)
    setSaved(true); setTimeout(() => setSaved(false), 3000)
  }
  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={s.card}>
        <div style={s.sectionTitle}>Profile</div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Full Name</div><input style={{ ...s.input, opacity: 0.6 }} value={user?.user_metadata?.full_name || ''} disabled/></div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Email (from Google)</div><input style={{ ...s.input, opacity: 0.6 }} value={user?.email || ''} disabled/></div>
        <div style={{ marginBottom: '10px' }}><div style={s.label}>Company Name</div><input style={s.input} value={company} onChange={e => setCompany(e.target.value)} placeholder="Your company or consultancy name"/></div>
        <div style={{ marginBottom: '14px' }}><div style={s.label}>Phone</div><input style={s.input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+65 9123 4567"/></div>
        <button style={{ ...s.btnGold, width: '100%' }} onClick={save}>{saved ? '✓ Saved!' : 'Save Changes →'}</button>
      </div>
      <div style={{ ...s.card, marginTop: '14px' }}>
        <div style={s.sectionTitle}>Subscription</div>
        <div style={{ fontSize: '12px', color: textDim, marginBottom: '12px' }}>Manage your Empire PM subscription</div>
        <a href="/pricing" style={{ ...s.btnGhost, textDecoration: 'none', display: 'inline-block' }}>View Plans →</a>
      </div>
    </div>
  )
}
