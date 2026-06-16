import Link from 'next/link'

export const metadata = { title: 'Terms of Service — Stride' }

export default function TermsPage() {
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
        <h1 className="font-palatino text-3xl font-bold text-[#3D2B26] mb-2">Terms of Service</h1>
        <p className="text-sm text-[#8C7B75] mb-10">Last updated: June 15, 2026</p>

        <div className="space-y-8 text-[#5C4A45] text-[15px] leading-relaxed">

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">1. Introduction and Data Controller</h2>
            <p className="mb-3">
              Stride is operated by Dominika Dobranowska, located at: ul. Górskiego 6, 00-033 Warsaw, Poland.
              Contact:{' '}
              <a href="mailto:strideapp.contact@gmail.com" className="text-[#C8A7A1] underline hover:text-[#A38F86]">
                strideapp.contact@gmail.com
              </a>.
            </p>
            <p>
              By creating an account or using Stride, you agree to these Terms. If you do not agree, please do not use the service.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">2. Accounts</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must be at least 16 years old to create an account.</li>
              <li>You are responsible for keeping your login credentials confidential and providing accurate information.</li>
              <li>One account per person only — do not share accounts.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">3. Paid Plans (Stride Pro)</h2>
            <p className="mb-3">
              We offer a free tier and a Pro subscription (currently 39 PLN / month, VAT included).
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Free Trial:</strong> New subscribers receive a 14-day trial. Your card is required but will not be charged until the trial ends.</li>
              <li>Subscriptions renew automatically via Stripe unless cancelled. You can cancel at any time through the Account page. Access remains active until the end of the current billing period.</li>
              <li>We do not offer refunds for partial billing periods, except where required by applicable law.</li>
              <li>We reserve the right to change pricing with 30 days' notice to existing subscribers.</li>
              <li>If you have an active Pro subscription, please cancel it before deleting your account to avoid further charges. Deleting your account does not automatically cancel your Stripe subscription.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">4. Right of Withdrawal (EU Consumers)</h2>
            <p className="mb-3">
              EU consumers ordinarily have a 14-day right to withdraw from a distance contract.
            </p>
            <p>
              Exception: By starting your Pro trial and accessing digital content immediately, you explicitly request
              that the service begins before the withdrawal period expires. You acknowledge that once the digital
              content is delivered, your right of withdrawal is lost in accordance with Article 16(m) of
              Directive 2011/83/EU. You may still cancel before the trial ends to avoid being charged.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">5. Acceptable Use and AI Features</h2>
            <p className="mb-3">You agree not to use Stride for unlawful purposes, attempt to reverse-engineer the service, or upload content that infringes third-party rights.</p>
            <p>
              <strong>AI Summary:</strong> Text submitted for summaries is processed by Groq / OpenAI. You are
              responsible for ensuring you have the right to share any text you submit. These summaries are for
              informational purposes only; Stride does not guarantee their accuracy.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">6. Technical Requirements and Complaints</h2>
            <p className="mb-3">
              Use of the service requires an internet connection and an up-to-date web browser.
            </p>
            <p>
              Any complaints regarding the service should be sent to:{' '}
              <a href="mailto:strideapp.contact@gmail.com" className="text-[#C8A7A1] underline hover:text-[#A38F86]">
                strideapp.contact@gmail.com
              </a>. We will respond within 14 days.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">7. Intellectual Property and Liability</h2>
            <p className="mb-3">
              The Stride application and logo are our property. Content you create (exams, materials) remains yours.
            </p>
            <p className="mb-3">
              Stride is provided "as is." We do not guarantee specific academic results.
            </p>
            <p>
              To the maximum extent permitted by law, Stride shall not be liable for indirect damages, data loss, or missed academic deadlines.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">8. Termination and Governing Law</h2>
            <p className="mb-3">
              You may delete your account at any time, which permanently removes your data from our systems
              as described in our{' '}
              <Link href="/privacy" className="text-[#C8A7A1] underline hover:text-[#A38F86]">
                Privacy Policy
              </Link>.
              We may suspend or terminate accounts that violate these terms.
            </p>
            <p>
              These terms are governed by the laws of Poland. Disputes shall be subject to the jurisdiction
              of Polish courts, unless mandatory consumer protection laws in your country provide otherwise.
            </p>
          </section>

        </div>
      </div>
    </main>
  )
}
