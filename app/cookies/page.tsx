import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'

export default function CookiesPage() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header />

      <main className="flex-grow max-w-4xl mx-auto px-8 py-12">
        <Breadcrumbs className="mb-6" />
        <div className="mb-12">
          <h1 className="text-4xl font-extrabold text-white mb-4">Cookie Policy</h1>
          <p className="text-slate-400">Last updated: January {currentYear}</p>
        </div>

        <div className="prose prose-invert prose-slate max-w-none">
          <div className="space-y-8 text-slate-300">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">What Are Cookies</h2>
              <p>
                Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide information to website owners.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">How We Use Cookies</h2>
              <p className="mb-4">Marketplace uses cookies for several purposes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for the website to function properly. They enable basic features like page navigation and access to secure areas.</li>
                <li><strong>Authentication Cookies:</strong> Used to recognize you when you return to our website and keep you logged in.</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences, such as language and display options.</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website by collecting and reporting information anonymously.</li>
                <li><strong>Marketing Cookies:</strong> Used to track visitors across websites to display relevant advertisements.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Types of Cookies We Use</h2>

              <div className="bg-surface-dark rounded-xl border border-border-dark overflow-hidden mb-6">
                <table className="w-full">
                  <thead className="bg-charcoal">
                    <tr>
                      <th className="text-left p-4 text-white font-bold">Cookie Name</th>
                      <th className="text-left p-4 text-white font-bold">Purpose</th>
                      <th className="text-left p-4 text-white font-bold">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark">
                    <tr>
                      <td className="p-4 text-primary font-mono">session_id</td>
                      <td className="p-4">Maintains user session state</td>
                      <td className="p-4">Session</td>
                    </tr>
                    <tr>
                      <td className="p-4 text-primary font-mono">auth_token</td>
                      <td className="p-4">Authentication and login status</td>
                      <td className="p-4">30 days</td>
                    </tr>
                    <tr>
                      <td className="p-4 text-primary font-mono">preferences</td>
                      <td className="p-4">Stores user preferences</td>
                      <td className="p-4">1 year</td>
                    </tr>
                    <tr>
                      <td className="p-4 text-primary font-mono">_ga</td>
                      <td className="p-4">Google Analytics tracking</td>
                      <td className="p-4">2 years</td>
                    </tr>
                    <tr>
                      <td className="p-4 text-primary font-mono">cart_items</td>
                      <td className="p-4">Shopping cart contents</td>
                      <td className="p-4">7 days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Third-Party Cookies</h2>
              <p className="mb-4">
                We may use third-party services that set their own cookies. These include:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Google Analytics:</strong> For understanding website usage and performance.</li>
                <li><strong>Stripe:</strong> For secure payment processing.</li>
                <li><strong>Intercom:</strong> For customer support chat functionality.</li>
              </ul>
              <p className="mt-4">
                These third parties have their own privacy policies governing their use of cookies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Managing Cookies</h2>
              <p className="mb-4">
                You can control and manage cookies in several ways:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Browser Settings:</strong> Most browsers allow you to block or delete cookies through their settings menu.</li>
                <li><strong>Opt-Out Tools:</strong> You can use tools like the Google Analytics Opt-out Browser Add-on.</li>
                <li><strong>Our Cookie Banner:</strong> Use our cookie consent banner to manage your preferences when you first visit our site.</li>
              </ul>
              <p className="mt-4">
                Please note that blocking certain cookies may impact the functionality of our website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Browser-Specific Instructions</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Icon name="link-external-01" size={20} className="text-primary" />
                  <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Google Chrome Cookie Settings
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Icon name="link-external-01" size={20} className="text-primary" />
                  <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Mozilla Firefox Cookie Settings
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Icon name="link-external-01" size={20} className="text-primary" />
                  <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Safari Cookie Settings
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Icon name="link-external-01" size={20} className="text-primary" />
                  <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Microsoft Edge Cookie Settings
                  </a>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Updates to This Policy</h2>
              <p>
                We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated revision date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
              <p>
                If you have any questions about our use of cookies, please contact us:
              </p>
              <div className="mt-4 p-4 bg-surface-dark rounded-xl border border-border-dark">
                <p className="mb-2"><strong>Email:</strong> <a href="mailto:privacy@marketplace.com" className="text-primary hover:underline">privacy@marketplace.com</a></p>
                <p>See also our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for more information about how we handle your data.</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
