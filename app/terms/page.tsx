import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Review the terms and conditions for using Zenorar Marketplace. Understand your rights and responsibilities.',
}

export default function TermsPage() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header />

      <main className="flex-grow max-w-4xl mx-auto px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-extrabold text-white mb-4">Terms of Service</h1>
          <p className="text-slate-400">Last updated: January {currentYear}</p>
        </div>

        <div className="prose prose-invert prose-slate max-w-none">
          <div className="space-y-8 text-slate-300">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using Marketplace (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
              <p>
                Marketplace is an online platform that connects buyers with sellers of digital products including scripts, software tools, eSIMs, virtual numbers, and other digital assets. We facilitate transactions but are not a party to any agreement between buyers and sellers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. User Accounts</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>You must be at least 18 years old to create an account.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You are responsible for all activities that occur under your account.</li>
                <li>You must provide accurate and complete information when creating your account.</li>
                <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Purchases and Payments</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>All prices are listed in USD unless otherwise specified.</li>
                <li>Payment is due at the time of purchase.</li>
                <li>We accept major credit cards, PayPal, and cryptocurrency payments.</li>
                <li>You agree to pay all charges incurred by your account at the prices in effect when incurred.</li>
                <li>Sales tax may be applied based on your location.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Licenses</h2>
              <p className="mb-4">Products on Marketplace are sold under specific license types:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Standard License:</strong> Grants you the right to use the product for personal and commercial projects. Limited to a single end product.</li>
                <li><strong>Extended License:</strong> Grants you broader rights including use in multiple projects and redistribution as part of a larger product.</li>
              </ul>
              <p className="mt-4">
                Specific license terms are provided with each product. Please review the license carefully before purchasing.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Refund Policy</h2>
              <p className="mb-4">We offer a 30-day money-back guarantee under the following conditions:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The product does not work as described in the listing.</li>
                <li>The product contains significant bugs that make it unusable.</li>
                <li>You have not downloaded or used the product extensively.</li>
              </ul>
              <p className="mt-4">
                Refund requests must be submitted through our <Link href="/contact" className="text-primary hover:underline">Contact page</Link> with a detailed explanation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Prohibited Conduct</h2>
              <p className="mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the Service for any illegal purpose or in violation of any laws.</li>
                <li>Upload or distribute malicious code, viruses, or harmful software.</li>
                <li>Infringe on the intellectual property rights of others.</li>
                <li>Harass, abuse, or harm other users.</li>
                <li>Attempt to gain unauthorized access to our systems.</li>
                <li>Use automated systems or bots to access the Service.</li>
                <li>Resell or redistribute products without proper licensing.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Intellectual Property</h2>
              <p>
                All content on Marketplace, including but not limited to text, graphics, logos, and software, is the property of Marketplace or its content suppliers and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written consent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Disclaimer of Warranties</h2>
              <p>
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, MARKETPLACE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATING TO YOUR USE OF THE SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page. Your continued use of the Service after changes are posted constitutes your acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Contact Information</h2>
              <p>
                If you have any questions about these Terms, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-surface-dark rounded-xl border border-border-dark">
                <p className="mb-2"><strong>Email:</strong> <a href="mailto:legal@marketplace.com" className="text-primary hover:underline">legal@marketplace.com</a></p>
                <p><strong>Address:</strong> 123 Market Street, San Francisco, CA 94102</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
