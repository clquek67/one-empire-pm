'use client'

const gold = '#E8B84B'
const goldDim = '#C9993A'
const navy = '#050D1A'
const navyCard = 'rgba(16,36,72,0.7)'
const border = 'rgba(201,153,58,0.2)'
const borderMd = 'rgba(201,153,58,0.35)'
const textBright = '#F0F6FF'
const textMid = '#C8DCF4'
const textDim = '#A8C0DC'

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'active' ? '#4DD8F0' : status === 'completed' ? '#22C990' : status === 'on-hold' ? '#FFD080' : '#A8C0DC'
  return <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
}

function HealthBar({ value }: { value: number }) {
  const color = value >= 70 ? '#22C990' : value >= 40 ? '#FFD080' : '#FF9090'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: '3px' }} />
      </div>
      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color, fontWeight: 600 }}>{value}%</span>
    </div>
  )
}

export function PortfolioDashboard({ projects, tasks, risks, timeLogs, milestones, plan }: {
  projects: any[], tasks: any[], risks: any[], timeLogs: any[], milestones: any[], plan: string
}) {
  if (plan !== 'agency') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', maxWidth: '380px' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: textBright, marginBottom: '10px' }}>
            Portfolio <em style={{ color: gold }}>Dashboard</em>
          </div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textDim, letterSpacing: '0.08em', marginBottom: '20px', lineHeight: 1.7 }}>
            Get a single executive view across all your projects — health scores, budget tracking, risk counts, and milestone status at a glance.
          </div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', background: `linear-gradient(135deg, ${goldDim}, ${gold})`, color: navy, border: 'none', padding: '10px 22px', borderRadius: '2px', display: 'inline-block' }}>
            ⬆ AGENCY PLAN REQUIRED
          </div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: textDim, marginTop: '10px' }}>Plans from $67/mo · Cancel anytime</div>
        </div>
      </div>
    )
  }

  // KPI calculations
  const totalProjects = projects.length
  const activeProjects = projects.filter(p => p.status === 'active').length
  const atRiskProjects = projects.filter(p => p.health < 50).length
  const completedProjects = projects.filter(p => p.status === 'completed').length
  const totalTasks = tasks.length
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length
  const openRisks = risks.filter(r => r.status !== 'closed').length
  const criticalRisks = risks.filter(r => r.level === 'critical' && r.status !== 'closed').length
  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)
  const totalLogged = timeLogs.reduce((s, l) => s + Number(l.hours || 0), 0)
  const overdueMilestones = milestones.filter(m => m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed').length

  const kpis = [
    { val: totalProjects, sub: 'Total Projects', color: textBright },
    { val: activeProjects, sub: 'Active', color: '#4DD8F0' },
    { val: completedProjects, sub: 'Completed', color: '#22C990' },
    { val: atRiskProjects, sub: 'At Risk', color: '#FF9090' },
    { val: overdueTasks, sub: 'Overdue Tasks', color: overdueTasks > 0 ? '#FF9090' : '#22C990' },
    { val: openRisks, sub: 'Open Risks', color: openRisks > 0 ? '#FFD080' : '#22C990' },
    { val: criticalRisks, sub: 'Critical Risks', color: criticalRisks > 0 ? '#FF9090' : '#22C990' },
    { val: overdueMilestones, sub: 'Overdue Milestones', color: overdueMilestones > 0 ? '#FF9090' : '#22C990' },
  ]

  // Status donut data
  const statusCounts = {
    active: activeProjects,
    completed: completedProjects,
    'on-hold': projects.filter(p => p.status === 'on-hold').length,
    planning: projects.filter(p => p.status === 'planning').length,
  }
  const statusColors: Record<string, string> = { active: '#4DD8F0', completed: '#22C990', 'on-hold': '#FFD080', planning: '#A8C0DC' }

  // Donut SVG
  const donutSize = 120
  const radius = 46
  const circumference = 2 * Math.PI * radius
  let offset = 0
  const donutSegments = Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => {
      const pct = totalProjects > 0 ? count / totalProjects : 0
      const dash = pct * circumference
      const seg = { status, count, dash, offset }
      offset += dash
      return seg
    })

  return (
    <div>
      {/* Header */}
      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', color: textBright, marginBottom: '20px' }}>
        Portfolio <em style={{ color: gold, fontStyle: 'italic' }}>Dashboard</em>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: navyCard, border: `1px solid ${border}`, borderRadius: '4px', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: k.color, fontWeight: 700, lineHeight: 1 }}>{k.val}</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, letterSpacing: '0.12em', marginTop: '4px', textTransform: 'uppercase' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '14px' }}>

        {/* Status Donut */}
        <div style={{ background: navyCard, border: `1px solid ${border}`, borderRadius: '4px', padding: '16px 18px' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', color: goldDim, marginBottom: '14px' }}>PROJECT STATUS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <svg width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`} style={{ flexShrink: 0 }}>
              <circle cx={donutSize/2} cy={donutSize/2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="18" />
              {donutSegments.map(seg => (
                <circle key={seg.status} cx={donutSize/2} cy={donutSize/2} r={radius}
                  fill="none"
                  stroke={statusColors[seg.status]}
                  strokeWidth="18"
                  strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
                  strokeDashoffset={-seg.offset + circumference * 0.25}
                  style={{ transition: 'stroke-dasharray 0.4s' }}
                />
              ))}
              <text x={donutSize/2} y={donutSize/2 - 6} textAnchor="middle" fill={textBright} fontSize="20" fontFamily="Cormorant Garamond, serif" fontWeight="700">{totalProjects}</text>
              <text x={donutSize/2} y={donutSize/2 + 10} textAnchor="middle" fill={textDim} fontSize="8" fontFamily="Rajdhani, sans-serif" letterSpacing="1">PROJECTS</text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: statusColors[status], flexShrink: 0 }} />
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: textMid, textTransform: 'capitalize', flex: 1 }}>{status}</span>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textBright, fontWeight: 600 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Budget bar chart */}
        <div style={{ background: navyCard, border: `1px solid ${border}`, borderRadius: '4px', padding: '16px 18px' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', color: goldDim, marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
            <span>BUDGET OVERVIEW</span>
            <span style={{ fontWeight: 400, color: textDim }}>Total: ${totalBudget.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {projects.filter(p => p.budget && p.budget > 0).slice(0, 5).map(p => {
              const logged = timeLogs.filter(l => l.project_id === p.id).reduce((s: number, l: any) => s + Number(l.hours || 0) * Number(l.rate || 0), 0)
              const pct = Math.min(100, p.budget > 0 ? (logged / p.budget) * 100 : 0)
              const overBudget = logged > p.budget
              return (
                <div key={p.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textMid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{p.name}</span>
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: overBudget ? '#FF9090' : textDim }}>
                      ${logged.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ${p.budget.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: overBudget ? '#E24B4A' : pct > 75 ? '#FFD080' : gold, borderRadius: '3px', transition: 'width 0.4s' }} />
                  </div>
                </div>
              )
            })}
            {projects.filter(p => p.budget && p.budget > 0).length === 0 && (
              <div style={{ fontSize: '11px', color: textDim, textAlign: 'center', padding: '20px 0' }}>No budgets set — edit projects to add budget targets</div>
            )}
          </div>
        </div>
      </div>

      {/* Project table */}
      <div style={{ background: navyCard, border: `1px solid ${border}`, borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', color: goldDim, padding: '14px 18px 10px', borderBottom: `1px solid ${border}` }}>
          ALL PROJECTS — EXECUTIVE SUMMARY
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid rgba(201,153,58,0.1)` }}>
                {['Project', 'Client', 'Status', 'Health', 'Tasks', 'Risks', 'Milestones', 'Days Left', 'End Date'].map(h => (
                  <th key={h} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', fontWeight: 600, letterSpacing: '0.14em', color: goldDim, textAlign: 'left', padding: '8px 12px', whiteSpace: 'nowrap' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => {
                const pTasks = tasks.filter(t => t.project_id === p.id)
                const doneTasks = pTasks.filter(t => t.status === 'done').length
                const pRisks = risks.filter(r => r.project_id === p.id && r.status !== 'closed').length
                const critRisks = risks.filter(r => r.project_id === p.id && r.level === 'critical' && r.status !== 'closed').length
                const pMilestones = milestones.filter(m => m.project_id === p.id)
                const doneMilestones = pMilestones.filter(m => m.status === 'completed').length
                const overdueMiles = pMilestones.filter(m => m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed').length
                const daysLeft = p.end_date ? Math.ceil((new Date(p.end_date).getTime() - Date.now()) / 86400000) : null
                const isOverdue = daysLeft !== null && daysLeft < 0

                return (
                  <tr key={p.id} style={{ borderBottom: `1px solid rgba(201,153,58,0.06)`, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 600, color: textBright, whiteSpace: 'nowrap' }}>{p.name}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textDim, whiteSpace: 'nowrap' }}>{p.client_name || '—'}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <StatusDot status={p.status} />
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: textMid, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{p.status || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <HealthBar value={p.health || 0} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textMid }}>{doneTasks}/{pTasks.length}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: critRisks > 0 ? '#FF9090' : pRisks > 0 ? '#FFD080' : '#22C990' }}>
                        {pRisks}{critRisks > 0 ? ` (${critRisks} crit)` : ''}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: overdueMiles > 0 ? '#FF9090' : textMid }}>
                        {doneMilestones}/{pMilestones.length}{overdueMiles > 0 ? ` (${overdueMiles} late)` : ''}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {daysLeft !== null ? (
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, color: isOverdue ? '#FF9090' : daysLeft <= 7 ? '#FFD080' : '#22C990' }}>
                          {isOverdue ? `${Math.abs(daysLeft)}d over` : `${daysLeft}d`}
                        </span>
                      ) : <span style={{ color: textDim, fontSize: '11px' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textDim, whiteSpace: 'nowrap' }}>{fmtDate(p.end_date)}</span>
                    </td>
                  </tr>
                )
              })}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '24px', textAlign: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: textDim }}>
                    No projects yet — create your first project to see portfolio data here
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
