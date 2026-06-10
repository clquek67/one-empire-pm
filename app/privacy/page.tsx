export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#050D1A', padding: '60px 24px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <a href="/pricing" style={{ color: '#E8B84B', textDecoration: 'none', fontSize: '14px' }}>← Back to Pricing</a>
        <h1 style={{ color: '#F0F6FF', fontSize: '42px', marginTop: '32px' }}>Privacy Policy</h1>
        <p style={{ color: 'rgba(192,208,232,0.5)', fontSize: '14px' }}>Last updated: June 2026</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>1. Information We Collect</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>Account info (name, email via Google OAuth), project data you create, subscription status from Stripe. We do not store payment card details.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>2. How We Use It</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>To provide and operate the Service, process payments via Stripe, send transactional emails, power AI features via Anthropic API, and respond to support. We do not sell your data.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>3. Third-Party Services</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>Supabase (database), Stripe (payments), Anthropic Claude API (AI features), Resend (email), Vercel (hosting), n8n self-hosted (automations).</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>4. Security</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>Row-level security ensures users only access their own data. All data encrypted in transit and at rest. Google OAuth means no passwords stored by us.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>5. Data Retention</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>Data retained while your account is active. After cancellation, data kept 30 days then permanently deleted.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>6. Your Rights</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>You may request access, correction, deletion, or export of your data. Contact support@one-empire.com. We respond within 30 days.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>7. Cookies</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>Essential cookies only: authentication session and dashboard preferences. No advertising or tracking cookies. Empire PM is ad-free.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>8. Singapore PDPA</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>Empire PM complies with Singapore PDPA 2012. Contact support@one-empire.com for data protection enquiries.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>9. GDPR</h2>
        <p style={{ color: 'rgba(192,208,232,0.75)', fontSize: '14px', lineHeight: '1.8' }}>For EU/UK users: legal basis is contract performance and legitimate interests. You may lodge complaints with your local data protection authority.</p>

        <h2 style={{ color: '#E8B84B', fontSize: '20px', marginTop: '32px' }}>10. Contact</h2>
        <p style={{ color: '#D8E4F4', fontSize: '14px', lineHeight: '1.8' }}>One Empire · Singapore · support@one-empire.com · one-empire.com</p>

        <div style={{ borderTop: '1px solid rgba(201,153,58,0.15)', marginTop: '48px', paddingTop: '24px', display: 'flex', gap: '24px' }}>
          <a href="/terms" style={{ fontSize: '12px', color: 'rgba(201,153,58,0.7)', textDecoration: 'none' }}>Terms of Service</a>
          <a href="/pricing" style={{ fontSize: '12px', color: 'rgba(201,153,58,0.7)', textDecoration: 'none' }}>Pricing</a>
          <span style={{ fontSize: '12px', color: 'rgba(192,208,232,0.3)', marginLeft: 'auto' }}>2026 One Empire</span>
        </div>
      </div>
    </div>
  )
}
