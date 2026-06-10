'use client'

export default function TermsPage() {
  const gold = '#E8B84B'
  const navy = '#050D1A'
  const text = '#D8E4F4'
  const dim = 'rgba(192,208,232,0.75)'

  const s = {
    section: { marginBottom: '32px' },
    h2: { fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: gold, marginBottom: '12px', marginTop: '28px' },
    h3: { fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', color: text, marginBottom: '8px', marginTop: '16px' },
    p: { fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '12px' },
    li: { fontSize: '14px', color: dim, lineHeight: '1.8', marginBottom: '6px', paddingLeft: '16px' },
  }

  return (
    <div style={{ minHeight: '100vh', background: navy, fontFamily: 'DM Sans, sans-serif', padding: '0' }}>
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
            Terms of <em style={{ color: gold, fontStyle: 'italic' }}>Service</em>
          </h1>
          <p style={{ ...s.p, color: 'rgba(192,208,232,0.5)' }}>Last updated: June 2026 · Effective: June 2026</p>
        </div>

        <p style={s.p}>
          These Terms of Service ("Terms") govern your access to and use of Empire PM, a project management software service ("Service") operated by One Empire ("we", "us", or "our"). By accessing or using the Service, you agree to be bound by these Terms.
        </p>

        {/* 1 */}
        <h2 style={s.h2}>1. Acceptance of Terms</h2>
        <p style={s.p}>By creating an account or using Empire PM, you confirm that you are at least 18 years of age, have the legal capacity to enter into these Terms, and agree to be bound by them. If you are using the Service on behalf of an organisation, you represent that you have authority to bind that organisation to these Terms.</p>

        {/* 2 */}
        <h2 style={s.h2}>2. Description of Service</h2>
        <p style={s.p}>Empire PM is a cloud-based project management platform that provides tools for project tracking, task management, risk monitoring, team collaboration, time billing, client reporting, and AI-assisted planning and analysis. The Service is accessible via web browser at pm.one-empire.com.</p>

        {/* 3 */}
        <h2 style={s.h2}>3. Account Registration</h2>
        <h3 style={s.h3}>3.1 Google OAuth</h3>
        <p style={s.p}>Empire PM uses Google OAuth exclusively for authentication. You must have a valid Google account to use the Service. You are responsible for maintaining the security of your Google account credentials.</p>
        <h3 style={s.h3}>3.2 Account Accuracy</h3>
        <p style={s.p}>You agree to provide accurate information when registering and to keep your account information current. You are responsible for all activity that occurs under your account.</p>
        <h3 style={s.h3}>3.3 Account Security</h3>
        <p style={s.p}>You must notify us immediately at support@one-empire.com if you suspect any unauthorised use of your account. We are not liable for any loss or damage arising from unauthorised account access resulting from your failure to maintain account security.</p>

        {/* 4 */}
        <h2 style={s.h2}>4. Subscription Plans & Payment</h2>
        <h3 style={s.h3}>4.1 Plans</h3>
        <p style={s.p}>Empire PM offers three subscription tiers: Starter ($17/month), Pro ($37/month), and Agency ($67/month). Features and limits vary by plan as described on the pricing page at pm.one-empire.com/pricing.</p>
        <h3 style={s.h3}>4.2 Billing</h3>
        <p style={s.p}>Subscriptions are billed in advance on a monthly, quarterly, or yearly basis depending on your selected billing period. All payments are processed securely by Stripe. We do not store payment card details.</p>
        <h3 style={s.h3}>4.3 Automatic Renewal</h3>
        <p style={s.p}>Your subscription will automatically renew at the end of each billing period unless you cancel prior to the renewal date. You can manage or cancel your subscription at any time through the Settings tab in your dashboard.</p>
        <h3 style={s.h3}>4.4 Refunds</h3>
        <p style={s.p}>We offer a 7-day refund policy for new subscriptions. If you are not satisfied with the Service within the first 7 days of your initial subscription, contact us at support@one-empire.com for a full refund. No refunds are issued after 7 days or for partial billing periods.</p>
        <h3 style={s.h3}>4.5 Price Changes</h3>
        <p style={s.p}>We reserve the right to change subscription prices with 30 days written notice to your registered email address. Continued use of the Service after a price change constitutes acceptance of the new pricing.</p>

        {/* 5 */}
        <h2 style={s.h2}>5. Acceptable Use</h2>
        <p style={s.p}>You agree to use Empire PM only for lawful purposes and in accordance with these Terms. You must not:</p>
        <ul style={{ paddingLeft: '24px', marginBottom: '12px' }}>
          {[
            'Use the Service for any illegal or unauthorised purpose',
            'Upload or transmit viruses, malware, or any harmful code',
            'Attempt to gain unauthorised access to any part of the Service or its systems',
            'Scrape, harvest, or systematically collect data from the Service',
            'Use the Service to send unsolicited communications (spam)',
            'Impersonate any person or entity or misrepresent your affiliation',
            'Use the Service in a manner that exceeds reasonable usage or disrupts service for other users',
            'Reverse engineer, decompile, or attempt to extract the source code of the Service',
          ].map((item, i) => <li key={i} style={s.li}>{item}</li>)}
        </ul>

        {/* 6 */}
        <h2 style={s.h2}>6. Your Data & Content</h2>
        <h3 style={s.h3}>6.1 Ownership</h3>
        <p style={s.p}>You retain full ownership of all project data, task information, documents, and other content you create or upload to Empire PM ("Your Content"). We claim no intellectual property rights over Your Content.</p>
        <h3 style={s.h3}>6.2 Licence to Us</h3>
        <p style={s.p}>By using the Service, you grant us a limited, non-exclusive licence to store, process, and transmit Your Content solely for the purpose of providing the Service to you.</p>
        <h3 style={s.h3}>6.3 Data Responsibility</h3>
        <p style={s.p}>You are responsible for ensuring that any data you upload to Empire PM complies with applicable laws, including data protection laws, and that you have the right to use and share that data within the Service.</p>
        <h3 style={s.h3}>6.4 AI Processing</h3>
        <p style={s.p}>Empire PM uses AI features powered by Anthropic's Claude API. When you use AI features, relevant project data is sent to Anthropic's API for processing. This data is used solely for generating the requested AI output and is not stored by Anthropic for training purposes under their current API terms.</p>

        {/* 7 */}
        <h2 style={s.h2}>7. Multi-User Access</h2>
        <p style={s.p}>Pro and Agency plan subscribers may invite team members and clients to access the Service. As the account owner, you are responsible for all activity by users you invite, ensuring invitees comply with these Terms, and managing access permissions appropriately. You must remove access for users who should no longer have it.</p>

        {/* 8 */}
        <h2 style={s.h2}>8. Service Availability</h2>
        <p style={s.p}>We aim to provide 99.5% uptime but do not guarantee uninterrupted access to the Service. Scheduled maintenance will be communicated in advance where possible. We are not liable for any losses resulting from Service unavailability.</p>

        {/* 9 */}
        <h2 style={s.h2}>9. Intellectual Property</h2>
        <p style={s.p}>Empire PM, including its design, features, AI models integration, code, and branding, is owned by One Empire and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the Service without our express written permission.</p>

        {/* 10 */}
        <h2 style={s.h2}>10. Termination</h2>
        <h3 style={s.h3}>10.1 By You</h3>
        <p style={s.p}>You may cancel your subscription at any time through the Settings tab. Your access will continue until the end of the current billing period.</p>
        <h3 style={s.h3}>10.2 By Us</h3>
        <p style={s.p}>We reserve the right to suspend or terminate your account immediately if you breach these Terms, engage in fraudulent activity, or use the Service in a manner harmful to other users or our systems. We will provide notice where practicable.</p>
        <h3 style={s.h3}>10.3 Effect of Termination</h3>
        <p style={s.p}>Upon termination, your access to the Service will cease. We will retain your data for 30 days after termination, during which you may request an export. After 30 days, your data will be permanently deleted.</p>

        {/* 11 */}
        <h2 style={s.h2}>11. Limitation of Liability</h2>
        <p style={s.p}>To the maximum extent permitted by applicable law, One Empire shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use the Service.</p>
        <p style={s.p}>Our total liability to you for any claim arising from these Terms or the Service shall not exceed the amount you paid us in the 12 months preceding the claim.</p>

        {/* 12 */}
        <h2 style={s.h2}>12. Disclaimer of Warranties</h2>
        <p style={s.p}>The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be error-free or that AI-generated content will be accurate or complete.</p>

        {/* 13 */}
        <h2 style={s.h2}>13. Governing Law</h2>
        <p style={s.p}>These Terms are governed by the laws of Singapore. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Singapore.</p>

        {/* 14 */}
        <h2 style={s.h2}>14. Changes to Terms</h2>
        <p style={s.p}>We may update these Terms from time to time. We will notify you of material changes by email or through a notice in the Service at least 14 days before the changes take effect. Your continued use of the Service after the effective date constitutes acceptance of the updated Terms.</p>

        {/* 15 */}
        <h2 style={s.h2}>15. Contact</h2>
        <p style={s.p}>For questions about these Terms, contact us at:</p>
        <p style={{ ...s.p, color: text }}>
          One Empire<br/>
          Singapore<br/>
          Email: support@one-empire.com<br/>
          Website: one-empire.com
        </p>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(201,153,58,0.15)', marginTop: '48px', paddingTop: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' as 'wrap' }}>
          <a href="/privacy" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: 'rgba(201,153,58,0.7)', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/pricing" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: 'rgba(201,153,58,0.7)', textDecoration: 'none' }}>Pricing</a>
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', color: 'rgba(192,208,232,0.3)', marginLeft: 'auto' }}>© 2026 One Empire · Empire PM</span>
        </div>
      </div>
    </div>
  )
}
