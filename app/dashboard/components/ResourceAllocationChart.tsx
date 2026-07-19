'use client'
import { gold, goldDim, border, textDim, textMid, textBright } from './types'

export function ResourceAllocationChart({ teamMembers, tasks, projects }: { teamMembers: any[], tasks: any[], projects: any[] }) {
  if (teamMembers.length === 0) return null

  return (
    <div style={{ background: 'rgba(16,36,72,0.7)', border: `1px solid ${border}`, borderRadius: '4px', padding: '16px 18px', marginBottom: '12px' }}>
      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', color: goldDim, marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>RESOURCE ALLOCATION</span>
        <span style={{ fontWeight: 400, color: textDim }}>{teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}</span>
      </div>

      {teamMembers.map((m: any) => {
        const activeTasks = tasks.filter((t: any) => t.owner === m.name && t.status !== 'done').length
        const cap = m.capacity || 0
        const allocPct = Math.min(100, cap)
        const availPct = Math.max(0, 100 - allocPct)
        const isOverloaded = cap >= 100
        const isBusy = cap >= 70 && cap < 100
        const barColor = isOverloaded ? '#E24B4A' : isBusy ? '#EF9F27' : '#1D9E75'
        const labelColor = isOverloaded ? '#FF9090' : isBusy ? '#FFD080' : '#4DFFB4'
        const statusLabel = isOverloaded ? 'Overloaded' : isBusy ? 'Busy' : 'Available'
        const statusBg = isOverloaded ? 'rgba(226,75,74,0.12)' : isBusy ? 'rgba(245,166,35,0.1)' : 'rgba(34,201,144,0.1)'

        return (
          <div key={m.id} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '80px', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, color: textBright, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{m.name}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{m.role || 'No role'}</div>
              </div>
              <div style={{ flex: 1, height: '14px', borderRadius: '3px', overflow: 'hidden', display: 'flex', background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ width: `${allocPct}%`, height: '100%', background: barColor, transition: 'width 0.4s', flexShrink: 0 }}/>
                <div style={{ width: `${availPct}%`, height: '100%', background: 'rgba(192,221,151,0.25)', flexShrink: 0 }}/>
              </div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', color: labelColor, flexShrink: 0, minWidth: '90px', textAlign: 'right' as const }}>
                {activeTasks} task{activeTasks !== 1 ? 's' : ''} · {cap}%
              </div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em', padding: '2px 7px', borderRadius: '2px', background: statusBg, color: labelColor, flexShrink: 0, minWidth: '68px', textAlign: 'center' as const }}>
                {statusLabel.toUpperCase()}
              </div>
            </div>
          </div>
        )
      })}

      <div style={{ display: 'flex', gap: '14px', marginTop: '10px', paddingTop: '10px', borderTop: `1px solid rgba(201,153,58,0.1)`, flexWrap: 'wrap' as const }}>
        {[
          { color: '#E24B4A', label: 'Overloaded (100%+)' },
          { color: '#EF9F27', label: 'Allocated (70–99%)' },
          { color: '#1D9E75', label: 'Available (<70%)' },
          { color: 'rgba(192,221,151,0.4)', label: 'Free capacity' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: l.color, flexShrink: 0 }}/>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
