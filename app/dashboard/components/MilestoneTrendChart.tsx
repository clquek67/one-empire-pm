'use client'

const navy = '#050D1A'
const border = 'rgba(201,153,58,0.2)'
const textDim = '#A8C0DC'
const textMid = '#C8DCF4'
const goldDim = '#C9993A'

export function MilestoneTrendChart({ milestones, project }: { milestones: any[], project: any }) {
  const relevant = milestones.filter((m: any) => m.due_date)
  if (relevant.length === 0) return null

  const projectStart = project?.start_date ? new Date(project.start_date).getTime() : Math.min(...relevant.map((m: any) => new Date(m.due_date).getTime()))
  const projectEnd = project?.end_date ? new Date(project.end_date).getTime() : Math.max(...relevant.map((m: any) => new Date(m.due_date).getTime()))
  const span = Math.max(projectEnd - projectStart, 7 * 86400000)
  const today = Date.now()

  const toPercent = (dateStr: string) => {
    const t = new Date(dateStr).getTime()
    return Math.min(110, Math.max(0, ((t - projectStart) / span) * 100))
  }

  const todayPct = Math.min(100, Math.max(0, ((today - projectStart) / span) * 100))

  const statusColor = (m: any) => {
    if (m.status === 'completed') return '#22C990'
    if (m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed') return '#E24B4A'
    if (m.status === 'in-progress') return '#4DD8F0'
    return '#E8B84B'
  }

  const statusLabel = (m: any) => {
    if (m.status === 'completed') return 'Done'
    if (m.due_date && new Date(m.due_date) < new Date()) return 'Overdue'
    if (m.status === 'in-progress') return 'In Progress'
    return 'Pending'
  }

  const drift = (m: any) => {
    if (!project?.end_date || !m.due_date) return null
    return Math.ceil((new Date(m.due_date).getTime() - new Date(project.end_date).getTime()) / 86400000)
  }

  return (
    <div style={{ background: 'rgba(16,36,72,0.7)', border: `1px solid ${border}`, borderRadius: '4px', padding: '16px 18px', marginTop: '14px' }}>
      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', color: goldDim, marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>MILESTONE TREND ANALYSIS</span>
        <span style={{ fontWeight: 400, color: textDim }}>{relevant.length} milestone{relevant.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ fontSize: '10px', color: textDim, marginBottom: '16px' }}>
        Bars show each milestone relative to project timeline — drift right of project end date indicates schedule slip
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '140px', marginBottom: '6px' }}>
        {[0, 25, 50, 75, 100].map(pct => {
          const d = new Date(projectStart + (pct / 100) * span)
          return <span key={pct} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: textDim }}>{d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        })}
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: `calc(140px + ${todayPct}% * (100% - 140px) / 100)`, top: 0, bottom: 0, width: '1px', background: 'rgba(232,184,75,0.5)', zIndex: 2, pointerEvents: 'none' as const }}/>
        {project?.end_date && (
          <div style={{ position: 'absolute', left: `calc(140px + 100% * (100% - 140px) / 100)`, top: 0, bottom: 0, width: '1px', background: 'rgba(200,220,255,0.2)', zIndex: 1, pointerEvents: 'none' as const }}/>
        )}

        {relevant.map((m: any) => {
          const barPct = toPercent(m.due_date)
          const color = statusColor(m)
          const label = statusLabel(m)
          const mDrift = drift(m)
          const isOverdue = m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed'
          const isCompleted = m.status === 'completed'

          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', minHeight: '32px' }}>
              <div style={{ width: '132px', flexShrink: 0, paddingRight: '8px' }}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, color: isOverdue ? '#FF9090' : isCompleted ? '#4DFFB4' : textMid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{m.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }}/>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: color }}>{label.toUpperCase()}</span>
                </div>
              </div>

              <div style={{ flex: 1, position: 'relative', height: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, width: `${Math.min(100, barPct)}%`, top: '4px', height: '16px', background: isCompleted ? 'rgba(34,201,144,0.2)' : isOverdue ? 'rgba(226,75,74,0.2)' : 'rgba(201,153,58,0.15)', borderRadius: '2px', transition: 'width 0.4s' }}/>
                <div style={{ position: 'absolute', left: `${Math.min(99, barPct)}%`, top: '50%', transform: 'translate(-50%, -50%) rotate(45deg)', width: '10px', height: '10px', background: color, border: `2px solid ${navy}`, boxShadow: `0 0 6px ${color}55`, flexShrink: 0 }}/>
                <div style={{ position: 'absolute', left: `${Math.min(99, barPct)}%`, top: '2px', transform: 'translateX(-50%)', fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: color, whiteSpace: 'nowrap' as const, marginTop: '-14px', pointerEvents: 'none' as const }}>
                  {new Date(m.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
              </div>

              <div style={{ width: '64px', flexShrink: 0, textAlign: 'right' as const }}>
                {mDrift !== null && !isCompleted && (
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, color: mDrift > 7 ? '#FF9090' : mDrift > 0 ? '#FFD080' : '#4DFFB4' }}>
                    {mDrift > 0 ? `+${mDrift}d` : mDrift === 0 ? 'On track' : `${mDrift}d`}
                  </span>
                )}
                {isCompleted && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: '#4DFFB4' }}>✓</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '14px', marginTop: '10px', paddingTop: '10px', borderTop: `1px solid rgba(201,153,58,0.1)`, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        {[
          { color: '#4DFFB4', label: 'Completed' },
          { color: '#4DD8F0', label: 'In Progress' },
          { color: '#E8B84B', label: 'Pending' },
          { color: '#E24B4A', label: 'Overdue' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', transform: 'rotate(45deg)', background: l.color, flexShrink: 0 }}/>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim }}>{l.label}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '1px', background: 'rgba(232,184,75,0.5)' }}/>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim }}>Today</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: '#4DFFB4' }}>+Nd</span>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim }}>= days past project end</span>
          </div>
        </div>
      </div>
    </div>
  )
}
