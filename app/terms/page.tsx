export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#050D1A', padding: '60px 24px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <a href="/pricing" style={{ color: '#E8B84B', textDecoration: 'none', fontSize: '14px' }}>← Back to Pricing</a>
        <h1 style={{ color: '#F0F6FF', fontSize: '42px', marginTop: '32px' }}>Terms of Service</h1>
        <p style={{ color: 'rgba(192,208,232,0.5)', fontSize: '14px' }}>Last updated: June 2026</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>1. Acceptance of Terms</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>By creating an account or using Empire PM, you confirm that you are at least 18 years of age and agree to be bound by these Terms.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>2. Description of Service</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>Empire PM is a cloud-based project management platform providing AI-assisted project tracking, task management, risk monitoring, team collaboration, time billing, and client reporting at pm.one-empire.com.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>3. Account Registration</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>Empire PM uses Google OAuth exclusively. You are responsible for all activity under your account. Notify us at support@one-empire.com if you suspect unauthorised use.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>4. Subscription and Payment</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>Plans: Starter ($17/mo), Pro ($37/mo), Agency ($67/mo). Billed in advance via Stripe. Auto-renews unless cancelled. 7-day refund for new subscriptions — contact support@one-empire.com within 7 days.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>5. Acceptable Use</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>You must not use Empire PM for illegal purposes, upload harmful code, attempt unauthorised access, scrape data, send spam, or reverse engineer the Service.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>6. Your Data</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>You retain full ownership of your project data. AI features send relevant data to Anthropic API for processing only — not for training. We claim no IP rights over your content.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>7. Multi-User Access</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>Pro and Agency subscribers may invite team members and clients. Account owners are responsible for all invited user activity.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>8. Termination</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>Cancel anytime via Settings. Access continues until period end. Data retained 30 days after termination then permanently deleted.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>9. Limitation of Liability</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>One Empire is not liable for indirect or consequential damages. Total liability capped at fees paid in the 12 months preceding any claim.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>10. Governing Law</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>These Terms are governed by the laws of Singapore.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>11. Contact</h2>
        <p style={{ color: '#D8E4F4', fontSize: '14px', lineHeight: '1.8' }}>One Empire · Singapore · support@one-empire.com · one-empire.com</p>

        <div style={{ borderTop: '1px solid rgba(201,153,58,0.15)', marginTop: '48px', paddingTop: '24px', display: 'flex', gap: '24px' }}>
          <a href="/privacy" style={{ fontSize: '12px', color: 'rgba(201,153,58,0.7)', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/pricing" style={{ fontSize: '12px', color: 'rgba(201,153,58,0.7)', textDecoration: 'none' }}>Pricing</a>
          <span style={{ fontSize: '12px', color: 'rgba(192,208,232,0.3)', marginLeft: 'auto' }}>2026 One Empire</span>
        </div>
      </div>
    </div>
  )
}
