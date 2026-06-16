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
        <p className="text-sm text-[#8C7B75] mb-2">APP &amp; WEBSITE</p>
        <p className="text-sm text-[#8C7B75] mb-10">Last updated: June 15, 2026</p>

        <div className="space-y-8 text-[#5C4A45] text-[15px] leading-relaxed">

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">1. Data Controller</h2>
            <p>
              The controller of your personal data is Dominika Dobranowska, located at: ul. Górskiego 6, 00-033 Warsaw, Poland.
              Contact:{' '}
              <a href="mailto:strideapp.contact@gmail.com" className="text-[#C8A7A1] underline hover:text-[#A38F86]">
                strideapp.contact@gmail.com
              </a>. No Data Protection Officer has been appointed.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">2. Purposes and Legal Bases</h2>
            <p className="mb-3">We process your data to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Provide Stride Services:</strong> Account management and study schedules (Basis: Art. 6(1)(b) GDPR – contract performance). Providing an email is a contractual requirement; an account cannot be created without it.</li>
              <li><strong>Operate the Marketing Website:</strong> Ensuring correct display and security of the site (Basis: Art. 6(1)(f) GDPR – legitimate interest).</li>
              <li><strong>Process Payments:</strong> Stripe Pro subscriptions (Basis: Art. 6(1)(b) GDPR).</li>
              <li><strong>AI Features:</strong> Summaries (Basis: Art. 6(1)(a) GDPR – your consent via feature use).</li>
              <li><strong>Legal Obligations:</strong> Financial record-keeping (Basis: Art. 6(1)(c) GDPR).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">3. Categories of Collected Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>App Users:</strong> Email, display name, study data (exams, materials), preferences, payment identifiers, AI-submitted text.</li>
              <li><strong>Website Visitors:</strong> Technical data in server logs, such as IP addresses and timestamps (processed automatically for technical maintenance and security).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">4. Data Recipients and International Transfers</h2>
            <p className="mb-3">We use: Supabase (database), Stripe (payments), Groq/OpenAI (AI), and Vercel (hosting). Data is transferred to the USA based on:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>An Adequacy Decision (EU-U.S. Data Privacy Framework), or</li>
              <li>Standard Contractual Clauses (SCCs) approved by the European Commission.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">5. Data Retention</h2>
            <p>
              Account data is kept until you delete your account. Billing records are retained for 7 years to comply with Polish tax laws.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">6. Your Rights</h2>
            <p className="mb-3">
              You have the right to: access, rectify, or erase ("right to be forgotten") your data, restrict processing,
              data portability, and the right to object. Consent for AI features can be withdrawn at any time.
            </p>
            <p>
              Email:{' '}
              <a href="mailto:strideapp.contact@gmail.com" className="text-[#C8A7A1] underline hover:text-[#A38F86]">
                strideapp.contact@gmail.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">7. Right to Complain</h2>
            <p>
              You may lodge a complaint with the President of the Personal Data Protection Office (UODO) in Poland.
              Website:{' '}
              <a href="https://uodo.gov.pl/" target="_blank" rel="noopener noreferrer" className="text-[#C8A7A1] underline hover:text-[#A38F86]">
                https://uodo.gov.pl/
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">8. Cookies</h2>
            <p>
              We use a single authentication cookie set by Supabase to keep you logged in.
              We do not use advertising, analytics, or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">9. Automated Decision-Making</h2>
            <p>
              Our study plan algorithm analyzes data to optimize schedules. This does not produce legal effects
              or significantly affect you under Art. 22 GDPR.
            </p>
          </section>

        </div>
      </div>
    </main>
  )
}
