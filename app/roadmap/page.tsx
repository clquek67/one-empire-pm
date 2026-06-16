export const metadata = {
  title: 'Product Roadmap · Empire PM',
  description: 'See what we have shipped, what we are building, and what is coming next for Empire PM.',
}

const gold = '#E8B84B'
const goldDim = '#C9993A'
const navy = '#050D1A'
const navyCard = 'rgba(16,36,72,0.7)'
const border = 'rgba(201,153,58,0.2)'
const borderMd = 'rgba(201,153,58,0.35)'
const textBright = '#F0F6FF'
const textMid = '#C8DCF4'
const textDim = '#A8C0DC'

// ── Roadmap data ──────────────────────────────────────────────────────────────

const shipped = [
  { title: 'Kanban Board View', desc: 'Drag-and-drop task board with To Do / In Progress / Blocked / Done columns and dependency guards.' },
  { title: 'AI Proposals & Estimates', desc: 'Generate full client proposals in seconds. Auto-fill budget, timeline, scope and deliverables using Claude AI.' },
  { title: 'Convert Proposal to Project', desc: 'Accept a proposal and instantly create a live project with AI-extracted tasks and calculated dates.' },
  { title: 'Recurring Retainer Invoices', desc: 'Set up monthly, quarterly or weekly retainers. Auto-send via n8n on schedule or fire manually with Send Now.' },
  { title: 'AI Reporting Agent', desc: 'Generate Weekly Status, End-of-Sprint, and Client-Ready reports from live project data in one click.' },
  { title: 'Live Timer & Time Logging', desc: 'Start/pause timer, log billable hours with 15-min rounding, and generate invoices directly from time logs.' },
  { title: 'Risk Radar + AI Scan', desc: 'Log and track project risks. AI scans all open risks and flags hidden conflicts, capacity clashes and deadline issues.' },
  { title: 'AI Planner + Auto-Populate', desc: 'Generate a full project plan from a brief and populate tasks, risks and milestones in one click.' },
  { title: 'Team Invitations', desc: 'Invite team members and clients via email. Role-based access — owners, team members, and read-only clients.' },
  { title: 'Project Timeline & Gantt', desc: 'Visual milestone tracker and Gantt chart with dependency arrows, today marker, and task status bars.' },
  { title: 'Professional Report Export', desc: 'Generate a 7-section PDF-ready project report with RAG status, milestone tracker, task summary, and AI executive summary.' },
  { title: 'Meeting Processor', desc: 'Paste raw meeting notes and get structured AI output: summary, decisions, action items, and risks raised.' },
]

const inProgress = [
  { title: 'Telegram Bot', desc: 'Get project alerts, task reminders, and risk notifications directly in Telegram. Reply to update statuses without opening the app.' },
  { title: 'Facebook Image Posting Fix', desc: 'Resolving branded image delivery in the weekly social content pipeline so images post correctly to the One Empire Facebook page.' },
  { title: 'ProductHunt Launch Prep', desc: 'Preparing assets, copy, and sequencing for the Empire PM ProductHunt launch. Targeting 4 weeks out.' },
]

const comingSoon = [
  { title: 'AI Communication Agent', desc: 'Automatically draft client update emails, meeting follow-ups, and stakeholder summaries based on project activity.' },
  { title: 'Client Approval Portal', desc: 'Send proposals and deliverables to clients for digital sign-off. Track approval status inside Empire PM.' },
  { title: 'Zapier / Make Integration', desc: 'Connect Empire PM to 1000+ apps. Trigger workflows when tasks complete, risks are logged, or invoices are sent.' },
  { title: 'Multi-Currency Invoicing', desc: 'Bill clients in USD, SGD, GBP, EUR and more. Auto-convert rates and display correct currency symbols on invoices.' },
  { title: 'Project Templates', desc: 'Save any project as a reusable template. Pre-load tasks, milestones and risks for common project types.' },
  { title: 'Public Client Portal', desc: 'Share a branded read-only project view with clients — progress, milestones, and updates without a login.' },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const columns = [
    {
      id: 'shipped',
      icon: '✅',
      label: 'Shipped',
      sublabel: `${shipped.length} features live`,
      color: '#22C990',
      bg: 'rgba(34,201,144,0.06)',
      bdr: 'rgba(34,201,144,0.25)',
      dot: '#22C990',
      items: shipped,
    },
    {
      id: 'progress',
      icon: '🔨',
      label: 'In Progress',
      sublabel: `${inProgress.length} in development`,
      color: gold,
      bg: 'rgba(201,153,58,0.06)',
      bdr: borderMd,
      dot: gold,
      items: inProgress,
    },
    {
      id: 'soon',
      icon: '🗓',
      label: 'Coming Soon',
      sublabel: `${comingSoon.length} planned`,
      color: '#4DD8F0',
      bg: 'rgba(26,171,204,0.06)',
      bdr: 'rgba(26,171,204,0.25)',
      dot: '#4DD8F0',
      items: comingSoon,
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: navy, fontFamily: 'DM Sans, sans-serif' }}>

      {/* Circuit BG */}
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', opacity: 0.08, pointerEvents: 'none', zIndex: 0 }}
        viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <g stroke="#C9993A" strokeWidth="0.8" fill="none">
          <polyline points="0,180 120,180 120,80 300,80 300,220 500,220"/>
          <polyline points="0,420 80,420 80,320 200,320 200,480 400,480 400,380 600,380"/>
          <polyline points="1440,200 1320,200 1320,100 1140,100 1140,250 940,250"/>
          <polyline points="1440,500 1360,500 1360,400 1200,400 1200,560 1000,560"/>
        </g>
        <g fill="#C9993A">
          <circle cx="300" cy="80" r="3"/><circle cx="200" cy="320" r="3"/>
          <circle cx="1140" cy="100" r="3"/>
        </g>
      </svg>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ borderBottom: `1px solid ${border}`, background: 'rgba(8,20,40,0.95)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a href="https://pm.one-empire.com" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <div style={{ width: '28px', height: '28px', background: 'rgba(201,153,58,0.1)', border: `1px solid ${borderMd}`, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <polygon points="10,1 1,16 4,13 10,18 16,13 19,16" stroke="#E8B84B" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
                  <line x1="1" y1="16" x2="19" y2="16" stroke="#E8B84B" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="10" cy="1" r="1.5" fill="#E8B84B"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', color: gold, textTransform: 'uppercase' }}>Empire PM</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim }}>One Empire</div>
              </div>
            </a>
            <a href="https://pm.one-empire.com/login"
              style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', background: `linear-gradient(135deg, ${goldDim}, ${gold})`, color: navy, border: 'none', padding: '8px 18px', borderRadius: '2px', cursor: 'pointer', textDecoration: 'none' }}>
              Start Free →
            </a>
          </div>
        </div>

        {/* ── Hero ── */}
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '64px 28px 48px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.3em', color: goldDim, marginBottom: '14px', textTransform: 'uppercase' }}>
            Product Roadmap
          </div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '48px', fontWeight: 400, color: textBright, margin: '0 0 16px', lineHeight: 1.2 }}>
            What we&apos;re <em style={{ color: gold, fontStyle: 'italic' }}>building</em>
          </h1>
          <p style={{ fontSize: '15px', color: textMid, maxWidth: '520px', margin: '0 auto 32px', lineHeight: 1.7 }}>
            Empire PM is built in public. Here&apos;s exactly what we&apos;ve shipped, what&apos;s in development, and what&apos;s coming next.
          </p>
          {/* Stats row */}
          <div style={{ display: 'inline-flex', gap: '0', background: 'rgba(201,153,58,0.05)', border: `1px solid ${border}`, borderRadius: '4px', overflow: 'hidden' }}>
            {[
              { val: shipped.length, label: 'Shipped' },
              { val: inProgress.length, label: 'In Progress' },
              { val: comingSoon.length, label: 'Coming Soon' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '14px 28px', borderRight: i < 2 ? `1px solid ${border}` : 'none', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', color: gold, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, letterSpacing: '0.18em', marginTop: '3px' }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Columns ── */}
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 28px 80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'start' }}>
            {columns.map(col => (
              <div key={col.id}>
                {/* Column header */}
                <div style={{ background: col.bg, border: `1px solid ${col.bdr}`, borderRadius: '4px 4px 0 0', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>{col.icon}</span>
                  <div>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', fontWeight: 700, color: col.color, letterSpacing: '0.06em' }}>{col.label}</div>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, letterSpacing: '0.1em' }}>{col.sublabel.toUpperCase()}</div>
                  </div>
                </div>
                {/* Items */}
                <div style={{ border: `1px solid ${col.bdr}`, borderTop: 'none', borderRadius: '0 0 4px 4px', overflow: 'hidden' }}>
                  {col.items.map((item, idx) => (
                    <div key={idx} style={{
                      padding: '14px 18px',
                      borderBottom: idx < col.items.length - 1 ? `1px solid rgba(201,153,58,0.08)` : 'none',
                      background: idx % 2 === 0 ? 'rgba(8,20,44,0.6)' : 'rgba(16,36,72,0.4)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: col.dot, flexShrink: 0, marginTop: '6px' }}/>
                        <div>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', fontWeight: 600, color: textBright, marginBottom: '4px', lineHeight: 1.3 }}>{item.title}</div>
                          <div style={{ fontSize: '12px', color: textDim, lineHeight: 1.6 }}>{item.desc}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <div style={{ borderTop: `1px solid ${border}`, background: 'rgba(8,20,40,0.95)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 28px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '30px', color: textBright, marginBottom: '10px' }}>
              Ready to run your agency <em style={{ color: gold }}>smarter</em>?
            </div>
            <div style={{ fontSize: '13px', color: textMid, marginBottom: '24px' }}>
              Plans from $17/mo · Cancel anytime · No free trial
            </div>
            <a href="https://pm.one-empire.com/pricing"
              style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', background: `linear-gradient(135deg, ${goldDim}, ${gold})`, color: navy, padding: '12px 28px', borderRadius: '2px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>
              View Plans →
            </a>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ borderTop: `1px solid ${border}`, padding: '16px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', color: textDim, letterSpacing: '0.15em' }}>
            EMPIRE PM · pm.one-empire.com · One Empire © 2026
          </div>
        </div>

      </div>
    </div>
  )
}
