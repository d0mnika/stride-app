import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — Stride' }

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F5F1EB]">
      <nav className="sticky top-0 z-30 w-full bg-[#F5F1EB]/95 backdrop-blur-sm border-b border-[#EDEAE3]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-palatino text-[22px] font-bold text-[#3D2B26] tracking-tight hover:text-[#5C4A45] transition">
            Stride
          </Link>
          <Link href="/dashboard" className="text-xs font-medium text-[#8C7B75] hover:text-[#3D2B26] transition">
            ← Back to app
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-10 pb-16">
        <h1 className="font-palatino text-3xl font-bold text-[#3D2B26] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#8C7B75] mb-10">Last updated: May 2026</p>

        <div className="space-y-8 text-[#5C4A45] text-[15px] leading-relaxed">

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">1. Who we are</h2>
            <p>
              Stride is a study planning application operated by an individual developer.
              If you have any questions about this policy, you can contact us at{' '}
              <a href="mailto:dominikadobranowska@gmail.com" className="text-[#C8A7A1] underline hover:text-[#A38F86]">
                dominikadobranowska@gmail.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">2. What data we collect</h2>
            <p className="mb-3">We collect the following personal data when you use Stride:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account data:</strong> your email address and optional display name, provided at sign-up.</li>
              <li><strong>Study data:</strong> exams, study materials, schedule slots, and study sessions you create inside the app.</li>
              <li><strong>Usage preferences:</strong> settings such as your nightly study window, session length, and daily study goal.</li>
              <li><strong>Payment data:</strong> if you subscribe to Stride Pro, payment is processed by Stripe. We store only your Stripe customer ID and subscription ID — we never see or store your card details.</li>
              <li><strong>AI-generated content:</strong> if you use the AI summary feature, the text you submit is sent to a third-party AI provider (Groq / OpenAI) and the resulting summary is stored in your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">3. How we use your data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and operate the Stride service.</li>
              <li>To generate and recalculate your study schedule.</li>
              <li>To process subscription payments via Stripe.</li>
              <li>To improve the application (aggregated, anonymous usage patterns only).</li>
              <li>To contact you about your account or service-related updates.</li>
            </ul>
            <p className="mt-3">We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">4. Legal basis for processing (GDPR)</h2>
            <p>If you are located in the EU or EEA, we process your data on the following legal bases:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Contract:</strong> processing necessary to provide the service you signed up for.</li>
              <li><strong>Legitimate interests:</strong> improving the app and preventing fraud.</li>
              <li><strong>Consent:</strong> for any optional features (e.g. AI summaries) where you explicitly submit data.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">5. Data storage and security</h2>
            <p>
              Your data is stored in Supabase (PostgreSQL database hosted on AWS). All data is encrypted in
              transit (HTTPS) and at rest. Access is protected by row-level security policies — you can only
              read your own data.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">6. Third-party services</h2>
            <p className="mb-3">Stride uses the following third-party services:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Supabase</strong> — database and authentication.</li>
              <li><strong>Stripe</strong> — payment processing. Subject to Stripe's own privacy policy.</li>
              <li><strong>Groq / OpenAI</strong> — AI summaries (only when you use the feature). Text you submit is subject to their data policies.</li>
              <li><strong>Vercel</strong> — hosting and edge functions.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">7. Cookies</h2>
            <p>
              Stride uses a single authentication session cookie set by Supabase to keep you logged in.
              We do not use advertising or tracking cookies. No third-party tracking scripts are loaded on our pages.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">8. Your rights</h2>
            <p className="mb-3">Under GDPR and applicable privacy laws, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access the personal data we hold about you.</li>
              <li>Correct inaccurate data.</li>
              <li>Delete your account and all associated data — you can do this directly from the Account page at any time.</li>
              <li>Export your data in a portable format.</li>
              <li>Object to or restrict processing in certain circumstances.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email us at{' '}
              <a href="mailto:dominikadobranowska@gmail.com" className="text-[#C8A7A1] underline hover:text-[#A38F86]">
                dominikadobranowska@gmail.com
              </a>. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">9. Data retention</h2>
            <p className="mb-3">
              We retain your data for as long as your account is active. If you delete your account
              (via the Account page or by contacting us), all personal data — including your exams,
              materials, sessions, and profile — is deleted immediately from our systems.
            </p>
            <p>
              We may retain billing-related records (e.g. Stripe transaction IDs) for up to 7 years
              to comply with financial record-keeping obligations under Polish law. These records contain
              no study data and are held solely for tax and legal compliance purposes.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">10. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. Significant changes will be communicated
              via email or an in-app notice. Continued use of Stride after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

        </div>
      </div>
    </main>
  )
}
