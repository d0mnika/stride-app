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
        <p className="text-sm text-[#8C7B75] mb-10">Last updated: May 2026</p>

        <div className="space-y-8 text-[#5C4A45] text-[15px] leading-relaxed">

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">1. Acceptance of terms</h2>
            <p>
              By creating an account or using Stride, you agree to these Terms of Service.
              If you do not agree, please do not use the service.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">2. Description of service</h2>
            <p>
              Stride is a study planning tool that helps students organise their study workload, track
              progress, and automatically adapt their schedule. It is provided as a web application
              with optional paid features (Stride Pro).
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">3. Accounts</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must be at least 16 years old to create an account.</li>
              <li>You are responsible for keeping your login credentials confidential.</li>
              <li>You must provide accurate information when signing up.</li>
              <li>One account per person — do not share accounts.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">4. Free and paid plans</h2>
            <p className="mb-3">
              Stride offers a free tier and a paid Pro subscription (currently 39 zł / month, VAT included).
              The features included in each tier are described within the app.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Free trial:</strong> new subscribers receive a 14-day free trial. Your card is required at sign-up but will not be charged until the trial period ends.</li>
              <li>Subscriptions automatically renew monthly via Stripe unless cancelled before the renewal date.</li>
              <li>You can cancel your subscription at any time through the Account page. Cancellation takes effect at the end of the current billing period — you keep access until then.</li>
              <li>We do not offer refunds for partial billing periods, except where required by applicable law.</li>
              <li>We reserve the right to change pricing with 30 days' notice to existing subscribers.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">5. Right of withdrawal (EU consumers)</h2>
            <p className="mb-3">
              If you are a consumer in the European Union, you ordinarily have a 14-day right to withdraw
              from a distance contract without giving a reason.
            </p>
            <p>
              However, by starting your free trial and accessing Stride Pro features immediately, you
              explicitly request that the service begins before the withdrawal period expires. You
              acknowledge that once you have used Pro features during the trial, your right of withdrawal
              is lost in respect of those features already delivered, in accordance with Article 16(m)
              of Directive 2011/83/EU. You may still cancel your subscription at any time before the
              trial ends to avoid being charged.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">6. Acceptable use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use Stride for any unlawful purpose.</li>
              <li>Attempt to reverse-engineer, scrape, or overload the service.</li>
              <li>Share access to your account with others.</li>
              <li>Upload content that infringes third-party intellectual property rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">7. AI features</h2>
            <p>
              Stride's AI summary feature sends text you explicitly submit to third-party AI providers
              (Groq / OpenAI) for processing. You are responsible for ensuring you have the right to
              share any text you submit. AI-generated summaries are provided for informational purposes
              only — Stride does not guarantee their accuracy.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">8. Intellectual property</h2>
            <p>
              The Stride application, logo, and content created by us remain our intellectual property.
              Content you create in the app (your exams, materials, notes) remains yours.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">9. Disclaimer of warranties</h2>
            <p>
              Stride is provided "as is" without warranties of any kind. We do not guarantee that the
              service will be error-free, uninterrupted, or that generated study schedules will lead to
              any particular academic result. Use the service at your own judgement.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">10. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, Stride and its operator shall not be liable for
              any indirect, incidental, or consequential damages arising from use of the service,
              including but not limited to loss of data or missed academic deadlines.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">11. Termination and account deletion</h2>
            <p className="mb-3">
              We may suspend or terminate your account if you violate these terms or if we discontinue
              the service. You may delete your account at any time directly from the Account page — this
              permanently removes all your data from our systems. On termination, your data will be deleted
              as described in our Privacy Policy.
            </p>
            <p>
              If you have an active Pro subscription, please cancel it before deleting your account to
              avoid further charges. Deleting your account does not automatically cancel your Stripe subscription.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">12. Governing law</h2>
            <p>
              These terms are governed by the laws of Poland. Any disputes shall be subject to the
              jurisdiction of Polish courts, unless mandatory consumer protection laws in your country
              provide otherwise.
            </p>
          </section>

          <section>
            <h2 className="font-palatino text-xl font-bold text-[#3D2B26] mb-3">13. Contact</h2>
            <p>
              For any questions about these terms, contact us at{' '}
              <a href="mailto:strideapp.contact@gmail.com" className="text-[#C8A7A1] underline hover:text-[#A38F86]">
                strideapp.contact@gmail.com
              </a>.
            </p>
          </section>

        </div>
      </div>
    </main>
  )
}
