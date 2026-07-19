'use client'
import { Fragment } from 'react'

const gold = '#E8B84B'
const goldDim = '#C9993A'
const navy = '#050D1A'
const border = 'rgba(201,153,58,0.2)'
const textDim = '#A8C0DC'

const PROB_LEVELS = ['very_low', 'low', 'medium', 'high', 'very_high']
const IMPACT_LEVELS = ['very_low', 'low', 'medium', 'high', 'very_high']
const PROB_LABELS: Record<string, string> = { very_low: 'Very Low', low: 'Low', medium: 'Medium', high: 'High', very_high: 'Very High' }
const CATEGORY_COLORS: Record<string, string> = { schedule: '#4DD8F0', budget: '#E8B84B', scope: '#FF9090', resource: '#4DFFB4', client: '#C084FC' }

export function RiskHeatMap({ risks, projects, riskProjectId }: { risks: any[], projects: any[], riskProjectId: string }) {
  const filtered = risks.filter((r: any) =>
    r.status !== 'closed' && r.probability && r.impact &&
    (riskProjectId === 'all' || r.project_id === riskProjectId)
  )

  const cellColor = (probIdx: number, impIdx: number) => {
    const score = (probIdx + 1) * (impIdx + 1)
    if (score >= 16) return 'rgba(226,75,74,0.35)'
    if (score >= 9) return 'rgba(245,166,35,0.25)'
    if (score >= 4) return 'rgba(232,184,75,0.15)'
    return 'rgba(34,201,144,0.08)'
  }

  const getRisksAt = (prob: string, impact: string) =>
    filtered.filter((r: any) => r.probability === prob && r.impact === impact)

  if (filtered.length === 0) return null

  return (
    <div style={{ background: 'rgba(16,36,72,0.7)', border: `1px solid ${border}`, borderRadius: '4px', padding: '16px 18px', marginBottom: '12px' }}>
      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', color: goldDim, marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>RISK HEAT MAP</span>
        <span style={{ fontWeight: 400, color: textDim }}>{filtered.length} open risk{filtered.length !== 1 ? 's' : ''} plotted</span>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', flexShrink: 0 }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: textDim, letterSpacing: '0.15em', transform: 'rotate(-90deg)', whiteSpace: 'nowrap' as const }}>PROBABILITY</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(5, 1fr)', gap: '3px' }}>
            <div/>
            {IMPACT_LEVELS.map(imp => (
              <div key={imp} style={{ textAlign: 'center' as const, fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: textDim, padding: '0 2px 4px' }}>{PROB_LABELS[imp]}</div>
            ))}
            {[...PROB_LEVELS].reverse().map((prob) => (
              <Fragment key={prob}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '6px', fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: textDim, minHeight: '52px' }}>{PROB_LABELS[prob]}</div>
                {IMPACT_LEVELS.map((impact) => {
                  const cellRisks = getRisksAt(prob, impact)
                  return (
                    <div key={`${prob}-${impact}`} style={{ background: cellColor(PROB_LEVELS.indexOf(prob), IMPACT_LEVELS.indexOf(impact)), border: `1px solid rgba(201,153,58,0.12)`, borderRadius: '3px', minHeight: '52px', padding: '4px', display: 'flex', flexWrap: 'wrap' as const, gap: '3px', alignContent: 'flex-start' }}>
                      {cellRisks.map((r: any) => {
                        const dotColor = CATEGORY_COLORS[r.category] || gold
                        const proj = projects.find((p: any) => p.id === r.project_id)
                        return (
                          <div key={r.id} title={`${r.title}\n${proj?.name || ''}\nCategory: ${r.category || 'scope'}`}
                            style={{ width: '14px', height: '14px', borderRadius: '50%', background: dotColor, border: `1.5px solid ${navy}`, cursor: 'default', flexShrink: 0, boxShadow: `0 0 4px ${dotColor}55` }}/>
                        )
                      })}
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
          <div style={{ textAlign: 'center' as const, fontFamily: 'Rajdhani, sans-serif', fontSize: '8px', color: textDim, letterSpacing: '0.15em', marginTop: '6px', paddingLeft: '48px' }}>IMPACT</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '10px', marginTop: '12px', paddingTop: '10px', borderTop: `1px solid rgba(201,153,58,0.1)` }}>
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }}/>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, textTransform: 'capitalize' as const }}>{cat}</span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', alignItems: 'center' }}>
          {[{ color: 'rgba(34,201,144,0.35)', label: 'Low' }, { color: 'rgba(232,184,75,0.35)', label: 'Med' }, { color: 'rgba(245,166,35,0.45)', label: 'High' }, { color: 'rgba(226,75,74,0.55)', label: 'Critical' }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: l.color }}/>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
