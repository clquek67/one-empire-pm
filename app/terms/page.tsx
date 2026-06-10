'use client'

export default function TermsPage() {
  const gold = '#E8B84B'
  const navy = '#050D1A'
  const text = '#D8E4F4'
  const dim = 'rgba(192,208,232,0.75)'

  return (
    <div style={{ minHeight: '100vh', background: navy, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ background: 'rgba(8,20,40,0.95)', borderBottom: '1px solid rgba(201,153,58,0.2)', padding: '20px 0' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', color: '#F0F6FF' }}>
              <em style={{ color: gold }}>Empire</em> PM
            </div>
          </a>
          <a href="/pricing" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', color: gold, textDecoration: 'none' }}>← Back to Pricing</a>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(201,153,58,0.7)', marginBottom: '12px' }}>LEGAL</div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '42px', fontWeight: 300, color: '#F0F6FF', marginBottom: '12px' }}>
            Terms of <em style={{ color: gold, fontStyle: 'italic' }}>Service</em>
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(192,208,232,0.5)', lineHeight: '1.8' }}>Last updated: June 2026 · Effective: June 2026</p>
        </div>

        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '16px' }}>These Terms of Service ("Terms") govern your access to and use of Empire PM, operated by One Empire ("we", "us", or "our"). By accessing or using the Service, you agree to be bound by these Terms.</p>

        {[
          { title: '1. Acceptance of Terms', content: 'By creating an account or using Empire PM, you confirm that you are at least 18 years of age, have the legal capacity to enter into these Terms, and agree to be bound by them. If you are using the Service on behalf of an organisation, you represent that you have authority to bind that organisation to these Terms.' },
          { title: '2. Description of Service', content: 'Empire PM is a cloud-based project management platform providing tools for project tracking, task management, risk monitoring, team collaboration, time billing, client reporting, and AI-assisted planning. The Service is accessible via web browser at pm.one-empire.com.' },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: '28px' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>{section.title}</h2>
            <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8' }}>{section.content}</p>
          </div>
        ))}

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>3. Account Registration</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>Empire PM uses Google OAuth exclusively for authentication. You must have a valid Google account to use the Service. You are responsible for all activity that occurs under your account and must notify us immediately at support@one-empire.com if you suspect unauthorised use.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>4. Subscription Plans & Payment</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>Empire PM offers three tiers: Starter ($17/mo), Pro ($37/mo), and Agency ($67/mo). Subscriptions bill in advance on monthly, quarterly, or yearly cycles via Stripe. Subscriptions auto-renew unless cancelled before the renewal date.</p>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}><strong style={{ color: text }}>Refund Policy:</strong> We offer a 7-day refund for new subscriptions. Contact support@one-empire.com within 7 days of your initial subscription for a full refund. No refunds after 7 days or for partial periods.</p>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>We may change prices with 30 days written notice. Continued use after a price change constitutes acceptance.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>5. Acceptable Use</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>You agree to use Empire PM only for lawful purposes. You must not: use the Service for illegal purposes; upload viruses or harmful code; attempt unauthorised access to any system; scrape or harvest data; send unsolicited communications; impersonate others; reverse engineer the Service; or use the Service in a manner that disrupts other users.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>6. Your Data & Content</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>You retain full ownership of all project data and content you create in Empire PM. We claim no intellectual property rights over your content. By using the Service, you grant us a limited licence to store and process your content solely to provide the Service.</p>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}><strong style={{ color: text }}>AI Processing:</strong> When you use AI features, relevant project data is sent to Anthropic&apos;s Claude API. This data is used only to generate the requested output and is not stored for training purposes under current API terms.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>7. Multi-User Access</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>Pro and Agency subscribers may invite team members and clients. As account owner, you are responsible for all activity by users you invite and for ensuring they comply with these Terms.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>8. Service Availability</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>We aim for 99.5% uptime but do not guarantee uninterrupted access. We are not liable for losses resulting from Service unavailability.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>9. Intellectual Property</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>Empire PM, including its design, features, code, and branding, is owned by One Empire and protected by intellectual property laws. You may not copy, modify, or create derivative works without our written permission.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>10. Termination</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>You may cancel at any time via Settings — access continues until period end. We may suspend or terminate accounts for Terms breaches. Upon termination, data is retained for 30 days then permanently deleted.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>11. Limitation of Liability</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>To the maximum extent permitted by law, One Empire is not liable for indirect, incidental, or consequential damages. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>12. Disclaimer of Warranties</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>The Service is provided &quot;as is&quot; without warranties of any kind. We do not warrant that the Service will be error-free or that AI-generated content will be accurate.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>13. Governing Law</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>These Terms are governed by the laws of Singapore. Disputes shall be subject to the exclusive jurisdiction of the courts of Singapore.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>14. Changes to Terms</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>We may update these Terms with 14 days notice by email or in-app notice. Continued use after the effective date constitutes acceptance.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>15. Contact</h2>
        <p style={{ fontSize: '14px', color: text, lineHeight: '1.8', marginBottom: '10px' }}>
          One Empire · Singapore<br/>
          Email: support@one-empire.com<br/>
          Website: one-empire.com
        </p>

        <div style={{ borderTop: '1px solid rgba(201,153,58,0.15)', marginTop: '48px', paddingTop: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <a href="/privacy" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: 'rgba(201,153,58,0.7)', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/pricing" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: 'rgba(201,153,58,0.7)', textDecoration: 'none' }}>Pricing</a>
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: 'rgba(192,208,232,0.3)', marginLeft: 'auto' }}>© 2026 One Empire · Empire PM</span>
        </div>
      </div>
    </div>
  )
}
