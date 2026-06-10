'use client'

export default function PrivacyPage() {
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
            Privacy <em style={{ color: gold, fontStyle: 'italic' }}>Policy</em>
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(192,208,232,0.5)', lineHeight: '1.8' }}>Last updated: June 2026 · Effective: June 2026</p>
        </div>

        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '16px' }}>This Privacy Policy describes how One Empire collects, uses, and protects your personal information when you use Empire PM at pm.one-empire.com.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>1. Information We Collect</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}><strong style={{ color: text }}>Account Information:</strong> When you sign in via Google OAuth, we receive your name and email address to create your Empire PM account.</p>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}><strong style={{ color: text }}>Project Data:</strong> We store project details, tasks, risks, milestones, meeting notes, time logs, and team member information you create in Empire PM.</p>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}><strong style={{ color: text }}>Payment Information:</strong> Payment processing is handled entirely by Stripe. We do not collect or store your payment card details.</p>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}><strong style={{ color: text }}>Usage Data:</strong> We may collect information about features accessed and session duration to improve the Service.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>2. How We Use Your Information</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>We use your information to: provide and operate the Service; process subscriptions via Stripe; send transactional emails (invoices, invitations); power AI features via Anthropic&apos;s API; respond to support requests; and comply with legal obligations. We do not sell, rent, or share your data with third parties for marketing.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>3. Third-Party Services</h2>
        <div style={{ background: 'rgba(16,36,72,0.6)', border: '1px solid rgba(201,153,58,0.15)', borderRadius: '6px', padding: '20px', marginBottom: '16px' }}>
          {[
            { name: 'Supabase', desc: 'Database and authentication. Your data stored with row-level security.' },
            { name: 'Stripe', desc: 'Payment processing. Handles all billing and card data.' },
            { name: 'Anthropic (Claude API)', desc: 'AI features. Project data processed only to generate AI output, not for training.' },
            { name: 'Resend', desc: 'Transactional email delivery for invitations and notifications.' },
            { name: 'Vercel', desc: 'Application hosting and serverless functions.' },
            { name: 'n8n (self-hosted)', desc: 'Workflow automation for meeting summaries, invoices, and risk alerts.' },
          ].map((svc, i) => (
            <div key={i} style={{ paddingBottom: i < 5 ? '12px' : '0', marginBottom: i < 5 ? '12px' : '0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 700, color: text, marginBottom: '3px' }}>{svc.name}</div>
              <div style={{ fontSize: '13px', color: dim }}>{svc.desc}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>4. Data Storage & Security</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>Your data is stored in Supabase&apos;s cloud infrastructure with encryption at rest and in transit. We implement row-level security (RLS) so each user can only access their own data. Google OAuth means no passwords are stored by us. Stripe handles all payment data.</p>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>In the event of a data breach affecting your personal information, we will notify affected users within 72 hours of becoming aware.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>5. Data Retention</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>Active account data is retained for the duration of your subscription. After cancellation, data is retained for 30 days then permanently deleted. Payment records may be retained longer as required by financial regulations.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>6. Your Rights</h2>
        <div style={{ background: 'rgba(16,36,72,0.6)', border: '1px solid rgba(201,153,58,0.15)', borderRadius: '6px', padding: '20px', marginBottom: '16px' }}>
          {[
            { right: 'ACCESS', desc: 'Request a copy of the personal data we hold about you.' },
            { right: 'CORRECTION', desc: 'Request correction of inaccurate or incomplete data.' },
            { right: 'DELETION', desc: 'Request deletion of your personal data.' },
            { right: 'PORTABILITY', desc: 'Request your data in a structured, machine-readable format.' },
            { right: 'OBJECTION', desc: 'Object to processing of your data for certain purposes.' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px', paddingBottom: i < 4 ? '10px' : '0', marginBottom: i < 4 ? '10px' : '0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, color: gold, minWidth: '90px', paddingTop: '2px' }}>{item.right}</div>
              <div style={{ fontSize: '13px', color: dim }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>To exercise these rights, contact us at support@one-empire.com. We will respond within 30 days.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>7. Cookies</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>We use only essential cookies: authentication cookies to maintain your login session (Supabase), and preference cookies to remember your dashboard state. We do not use advertising cookies, cross-site tracking, or third-party analytics. Empire PM products are ad-free.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>8. Children&apos;s Privacy</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>Empire PM is not directed at children under 18. We do not knowingly collect personal information from minors. Contact support@one-empire.com if you believe a minor has provided us with data.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>9. Singapore PDPA Compliance</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>Empire PM complies with the Singapore Personal Data Protection Act 2012 (PDPA). We collect and use personal data only with your knowledge and consent, and only for purposes a reasonable person would consider appropriate. Contact our Data Protection Officer at support@one-empire.com for PDPA enquiries.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>10. GDPR (EU/UK Users)</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>For users in the EEA or UK: our legal basis for processing is contract performance, legitimate interests, and consent. You have the right to lodge a complaint with your local data protection authority. We do not make automated decisions with legal effects about you.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>11. International Data Transfers</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>Your data may be processed in countries other than your own, including the United States where our service providers operate. By using Empire PM, you consent to such transfers subject to appropriate safeguards.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>12. Changes to This Policy</h2>
        <p style={{ fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '10px' }}>We may update this policy with 14 days notice by email or in-app notice. Continued use after the effective date constitutes acceptance.</p>

        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '10px', marginTop: '28px' }}>13. Contact</h2>
        <p style={{ fontSize: '14px', color: text, lineHeight: '1.8', marginBottom: '10px' }}>
          One Empire — Data Protection Officer<br/>
          Singapore<br/>
          Email: support@one-empire.com<br/>
          Website: one-empire.com
        </p>

        <div style={{ borderTop: '1px solid rgba(201,153,58,0.15)', marginTop: '48px', paddingTop: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <a href="/terms" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: 'rgba(201,153,58,0.7)', textDecoration: 'none' }}>Terms of Service</a>
          <a href="/pricing" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: 'rgba(201,153,58,0.7)', textDecoration: 'none' }}>Pricing</a>
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: 'rgba(192,208,232,0.3)', marginLeft: 'auto' }}>© 2026 One Empire · Empire PM</span>
        </div>
      </div>
    </div>
  )
}
