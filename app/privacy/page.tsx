'use client'

export default function PrivacyPage() {
  const gold = '#E8B84B'
  const navy = '#050D1A'
  const text = '#D8E4F4'
  const dim = 'rgba(192,208,232,0.75)'

  const s = {
    h2: { fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '12px', marginTop: '28px' } as React.CSSProperties,
    h3: { fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', color: text, marginBottom: '8px', marginTop: '16px' } as React.CSSProperties,
    p: { fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '12px' } as React.CSSProperties,
    li: { fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '6px' } as React.CSSProperties,
  }

  return (
    <div style={{ minHeight: '100vh', background: navy, fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
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

      {/* Content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(201,153,58,0.7)', marginBottom: '12px' }}>LEGAL</div>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '42px', fontWeight: 300, color: '#F0F6FF', marginBottom: '12px' }}>
            Privacy <em style={{ color: gold, fontStyle: 'italic' }}>Policy</em>
          </h1>
          <p style={{ ...s.p, color: 'rgba(192,208,232,0.5)' }}>Last updated: June 2026 · Effective: June 2026</p>
        </div>

        <p style={s.p}>
          This Privacy Policy describes how One Empire ("we", "us", or "our") collects, uses, and protects your personal information when you use Empire PM ("Service") at pm.one-empire.com. We are committed to protecting your privacy and handling your data transparently.
        </p>

        {/* 1 */}
        <h2 style={s.h2}>1. Information We Collect</h2>
        <h3 style={s.h3}>1.1 Account Information</h3>
        <p style={s.p}>When you sign in via Google OAuth, we receive your Google profile information including your name and email address. We store this to create and maintain your Empire PM account.</p>

        <h3 style={s.h3}>1.2 Project Data</h3>
        <p style={s.p}>We store the project data you create within Empire PM, including project details, tasks, risks, milestones, meeting notes, time logs, and team member information. This data is necessary to provide the Service.</p>

        <h3 style={s.h3}>1.3 Payment Information</h3>
        <p style={s.p}>Payment processing is handled entirely by Stripe. We do not collect or store your payment card details. We receive from Stripe only non-sensitive billing information such as your subscription status, plan type, and billing email.</p>

        <h3 style={s.h3}>1.4 Usage Data</h3>
        <p style={s.p}>We may collect information about how you use the Service, including features accessed, actions taken, and session duration. This helps us improve the Service and troubleshoot issues.</p>

        <h3 style={s.h3}>1.5 Communications</h3>
        <p style={s.p}>If you contact us for support or feedback, we retain that correspondence to assist you and improve our service.</p>

        {/* 2 */}
        <h2 style={s.h2}>2. How We Use Your Information</h2>
        <p style={s.p}>We use the information we collect to:</p>
        <ul style={{ paddingLeft: '24px', marginBottom: '12px' }}>
          {[
            'Provide, operate, and maintain the Service',
            'Process your subscription and manage billing via Stripe',
            'Send transactional emails such as invoice confirmations and team member invitations',
            'Provide AI-powered features by processing relevant project data through Anthropic\'s API',
            'Respond to support requests and technical issues',
            'Monitor and improve Service performance and security',
            'Comply with legal obligations',
            'Send product updates and announcements (you may opt out at any time)',
          ].map((item, i) => <li key={i} style={s.li}>{item}</li>)}
        </ul>
        <p style={s.p}>We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>

        {/* 3 */}
        <h2 style={s.h2}>3. Third-Party Services</h2>
        <p style={s.p}>Empire PM integrates with the following third-party services to deliver its functionality:</p>

        <div style={{ background: 'rgba(16,36,72,0.6)', border: '1px solid rgba(201,153,58,0.15)', borderRadius: '6px', padding: '20px', marginBottom: '16px' }}>
          {[
            { name: 'Supabase', purpose: 'Database and authentication infrastructure. Your project data is stored in Supabase\'s PostgreSQL database with row-level security.', link: 'supabase.com/privacy' },
            { name: 'Stripe', purpose: 'Payment processing. Handles all subscription billing and payment card data securely.', link: 'stripe.com/privacy' },
            { name: 'Anthropic (Claude API)', purpose: 'AI features. Project data relevant to your AI requests is processed by Anthropic\'s API. Not used for model training under current API terms.', link: 'anthropic.com/privacy' },
            { name: 'Resend', purpose: 'Transactional email delivery for invitation emails and system notifications.', link: 'resend.com/privacy' },
            { name: 'Vercel', purpose: 'Application hosting and serverless functions.', link: 'vercel.com/legal/privacy-policy' },
            { name: 'n8n', purpose: 'Workflow automation for meeting summary emails, invoice emails, and risk alert notifications. Self-hosted.', link: '' },
          ].map((svc, i) => (
            <div key={i} style={{ paddingBottom: i < 5 ? '14px' : '0', marginBottom: i < 5 ? '14px' : '0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '12px', fontWeight: 700, color: text, marginBottom: '4px' }}>{svc.name}</div>
              <div style={{ fontSize: '13px', color: dim }}>{svc.purpose}{svc.link && <> See <a href={`https://${svc.link}`} target="_blank" rel="noopener noreferrer" style={{ color: gold }}>{svc.link}</a></>}</div>
            </div>
          ))}
        </div>

        {/* 4 */}
        <h2 style={s.h2}>4. Data Storage & Security</h2>
        <h3 style={s.h3}>4.1 Where Data is Stored</h3>
        <p style={s.p}>Your data is stored in Supabase's cloud infrastructure. Supabase uses industry-standard security practices including encryption at rest and in transit. For specific data residency information, refer to Supabase's data processing documentation.</p>

        <h3 style={s.h3}>4.2 Security Measures</h3>
        <p style={s.p}>We implement the following security measures to protect your data:</p>
        <ul style={{ paddingLeft: '24px', marginBottom: '12px' }}>
          {[
            'Row-level security (RLS) — each user can only access their own data',
            'HTTPS encryption for all data in transit',
            'Google OAuth for authentication — no passwords stored by us',
            'Stripe for payment processing — no card data touches our servers',
            'Regular security reviews and dependency updates',
          ].map((item, i) => <li key={i} style={s.li}>{item}</li>)}
        </ul>

        <h3 style={s.h3}>4.3 Data Breach</h3>
        <p style={s.p}>In the event of a data breach that affects your personal information, we will notify affected users within 72 hours of becoming aware of the breach, in accordance with applicable data protection laws.</p>

        {/* 5 */}
        <h2 style={s.h2}>5. Data Retention</h2>
        <p style={s.p}>We retain your personal data for as long as your account is active or as needed to provide the Service. Specifically:</p>
        <ul style={{ paddingLeft: '24px', marginBottom: '12px' }}>
          {[
            'Active account data is retained for the duration of your subscription',
            'After account cancellation, data is retained for 30 days to allow for reactivation or export',
            'After 30 days post-cancellation, all personal data is permanently deleted',
            'Payment records may be retained longer as required by financial regulations',
            'Support correspondence is retained for up to 2 years',
          ].map((item, i) => <li key={i} style={s.li}>{item}</li>)}
        </ul>

        {/* 6 */}
        <h2 style={s.h2}>6. Your Rights</h2>
        <p style={s.p}>Depending on your location, you may have the following rights regarding your personal data:</p>

        <div style={{ background: 'rgba(16,36,72,0.6)', border: '1px solid rgba(201,153,58,0.15)', borderRadius: '6px', padding: '20px', marginBottom: '16px' }}>
          {[
            { right: 'Access', desc: 'Request a copy of the personal data we hold about you.' },
            { right: 'Correction', desc: 'Request correction of inaccurate or incomplete data.' },
            { right: 'Deletion', desc: 'Request deletion of your personal data ("right to be forgotten").' },
            { right: 'Portability', desc: 'Request your data in a structured, machine-readable format.' },
            { right: 'Objection', desc: 'Object to processing of your data for certain purposes.' },
            { right: 'Restriction', desc: 'Request restriction of processing in certain circumstances.' },
            { right: 'Withdrawal', desc: 'Withdraw consent for processing where consent is the legal basis.' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px', paddingBottom: i < 6 ? '10px' : '0', marginBottom: i < 6 ? '10px' : '0', borderBottom: i < 6 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700, color: gold, minWidth: '100px' }}>{item.right.toUpperCase()}</div>
              <div style={{ fontSize: '13px', color: dim }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <p style={s.p}>To exercise any of these rights, contact us at support@one-empire.com. We will respond within 30 days.</p>

        {/* 7 */}
        <h2 style={s.h2}>7. Cookies & Tracking</h2>
        <p style={s.p}>Empire PM uses minimal cookies necessary for the Service to function, specifically:</p>
        <ul style={{ paddingLeft: '24px', marginBottom: '12px' }}>
          {[
            'Authentication cookies — to maintain your login session (Supabase)',
            'Preference cookies — to remember your dashboard state',
          ].map((item, i) => <li key={i} style={s.li}>{item}</li>)}
        </ul>
        <p style={s.p}>We do not use advertising cookies, cross-site tracking, or third-party analytics that profile your behaviour. Empire PM products are ad-free.</p>

        {/* 8 */}
        <h2 style={s.h2}>8. Children's Privacy</h2>
        <p style={s.p}>Empire PM is not directed at children under 18. We do not knowingly collect personal information from anyone under 18. If you believe a minor has provided us with personal information, contact us at support@one-empire.com and we will delete it promptly.</p>

        {/* 9 */}
        <h2 style={s.h2}>9. International Data Transfers</h2>
        <p style={s.p}>Your data may be processed and stored in countries other than your own, including the United States, where our third-party service providers operate. By using Empire PM, you consent to the transfer of your data to these countries. We ensure that any such transfers are subject to appropriate safeguards in accordance with applicable data protection laws.</p>

        {/* 10 */}
        <h2 style={s.h2}>10. Singapore PDPA Compliance</h2>
        <p style={s.p}>Empire PM complies with the Singapore Personal Data Protection Act 2012 (PDPA). We collect, use, and disclose personal data only with your knowledge and consent, and only for purposes that a reasonable person would consider appropriate in the circumstances.</p>
        <p style={s.p}>For PDPA-related enquiries or to withdraw consent, contact our Data Protection Officer at support@one-empire.com.</p>

        {/* 11 */}
        <h2 style={s.h2}>11. GDPR (EU/UK Users)</h2>
        <p style={s.p}>If you are located in the European Economic Area or United Kingdom, the following applies:</p>
        <ul style={{ paddingLeft: '24px', marginBottom: '12px' }}>
          {[
            'Legal basis for processing: contract performance (providing the Service), legitimate interests (improving the Service), and consent (marketing communications)',
            'You have the right to lodge a complaint with your local data protection authority',
            'We do not make automated decisions that produce legal or similarly significant effects about you',
          ].map((item, i) => <li key={i} style={s.li}>{item}</li>)}
        </ul>

        {/* 12 */}
        <h2 style={s.h2}>12. Changes to This Policy</h2>
        <p style={s.p}>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through a notice in the Service at least 14 days before changes take effect. Your continued use of the Service after the effective date constitutes acceptance of the updated policy.</p>

        {/* 13 */}
        <h2 style={s.h2}>13. Contact Us</h2>
        <p style={s.p}>For privacy-related questions, requests, or concerns, contact us at:</p>
        <p style={{ ...s.p, color: text }}>
          One Empire — Data Protection Officer<br />
          Singapore<br />
          Email: support@one-empire.com<br />
          Website: one-empire.com
        </p>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(201,153,58,0.15)', marginTop: '48px', paddingTop: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' as const }}>
          <a href="/terms" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: 'rgba(201,153,58,0.7)', textDecoration: 'none' }}>Terms of Service</a>
          <a href="/pricing" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: 'rgba(201,153,58,0.7)', textDecoration: 'none' }}>Pricing</a>
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: 'rgba(192,208,232,0.3)', marginLeft: 'auto' }}>© 2026 One Empire · Empire PM</span>
        </div>
      </div>
    </div>
  )
}
