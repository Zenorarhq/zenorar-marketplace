'use client'

import Link from 'next/link'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Icon from '@/components/ui/Icon'
import { useAuth } from '@/contexts/AuthContext'

const steps = [
  {
    step: '01',
    title: 'Apply',
    desc: 'Fill out a short application describing yourself, your scripts, and your experience.',
  },
  {
    step: '02',
    title: 'Get Approved',
    desc: 'Our team reviews your application and gets back to you. Deals are discussed off-platform.',
  },
  {
    step: '03',
    title: 'Submit Your Script',
    desc: 'Submit a demo link. Once we review and approve the demo, the deal is finalised.',
  },
  {
    step: '04',
    title: 'Get Published & Earn',
    desc: 'We list the script, handle sales, and you earn a commission on every purchase.',
  },
]

const faqs = [
  {
    q: 'Who can become a contributor?',
    a: 'Developers who build high-quality scripts and want us to sell them. We handle the store, marketing, and customer support — you build the product.',
  },
  {
    q: 'How is my commission calculated?',
    a: 'We deduct a small platform fee from the sale price first. The remaining amount is split — your negotiated share goes to your balance, the rest stays with us. Default contributor share is 70%.',
  },
  {
    q: 'Will my name be shown publicly?',
    a: 'No. Contributor identity is kept anonymous to buyers. Scripts appear as Zenorar products.',
  },
  {
    q: 'What happens to my script after I submit it?',
    a: 'We inspect it, may improve it, then list it under our brand. Once LIVE, you earn commission on every sale permanently — as long as the product stays listed.',
  },
  {
    q: 'How do payouts work?',
    a: 'Payouts are processed bi-weekly via crypto (BTC, USDT, ETH, and more). Minimum payout is $100. No lock window — earnings are available immediately after a sale.',
  },
  {
    q: 'What if a buyer gets a refund?',
    a: 'If a refund is issued, your commission for that sale is reversed. You\'ll receive an email notification.',
  },
]

export default function BecomeAContributorPage() {
  const { user } = useAuth()
  const isContributor = (user as any)?.isContributor

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header />
      <CategoryNav />

      <main className="flex-grow">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 md:py-32 border-b border-border-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-12 text-center relative">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <Icon name="code" size={14} />
              Contributor Programme
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
              Sell Your Scripts.<br />We Handle the Rest.
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Submit your scripts to Zenorar. We inspect, improve, and sell them under our brand.
              You earn a commission on every sale — automatically.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isContributor ? (
                <Link
                  href="/profile/contributor"
                  className="bg-primary text-black px-8 py-4 rounded-xl font-bold text-lg hover:brightness-110 transition-all"
                >
                  Go to My Dashboard
                </Link>
              ) : (
                <Link
                  href="/become-a-contributor/apply"
                  className="bg-primary text-black px-8 py-4 rounded-xl font-bold text-lg hover:brightness-110 transition-all"
                >
                  Apply Now — It&apos;s Free
                </Link>
              )}
              <a
                href="#how-it-works"
                className="border border-border-dark text-slate-300 px-8 py-4 rounded-xl font-semibold text-lg hover:border-primary hover:text-primary transition-all"
              >
                How It Works
              </a>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 border-b border-border-dark">
          <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { label: 'Default Contributor Share', value: '70%' },
                { label: 'Payout Methods', value: 'Crypto Only' },
                { label: 'Lock Period', value: 'None' },
                { label: 'Minimum Payout', value: '$100' },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface-dark rounded-xl p-6 border border-border-dark">
                  <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                  <div className="text-slate-500 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 border-b border-border-dark">
          <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
              <p className="text-slate-400 max-w-xl mx-auto">From submission to passive income in four steps.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((s) => (
                <div key={s.step} className="bg-surface-dark rounded-2xl p-6 border border-border-dark relative">
                  <div className="text-5xl font-extrabold text-primary/20 mb-4">{s.step}</div>
                  <h3 className="text-white font-bold text-lg mb-2">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Example Earnings */}
        <section className="py-20 border-b border-border-dark bg-surface-dark/30">
          <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Example Earnings</h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                Commission is calculated from the net sale after platform fee. Default contributor share: 70%.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-dark text-slate-400">
                    <th className="text-left py-3 px-4">Script Sale Price</th>
                    <th className="text-right py-3 px-4">Platform Fee (10%)</th>
                    <th className="text-right py-3 px-4">Net Amount</th>
                    <th className="text-right py-3 px-4">You Earn (70%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark">
                  {[
                    { price: '$25', fee: '$2.50', net: '$22.50', earn: '$15.75' },
                    { price: '$50', fee: '$5.00', net: '$45.00', earn: '$31.50' },
                    { price: '$100', fee: '$10.00', net: '$90.00', earn: '$63.00' },
                    { price: '$250', fee: '$25.00', net: '$225.00', earn: '$157.50' },
                  ].map((row) => (
                    <tr key={row.price} className="text-slate-300">
                      <td className="py-3 px-4 font-medium">{row.price}</td>
                      <td className="py-3 px-4 text-right text-slate-400">{row.fee}</td>
                      <td className="py-3 px-4 text-right text-slate-400">{row.net}</td>
                      <td className="py-3 px-4 text-right text-primary font-semibold">{row.earn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-slate-500 text-xs mt-4 text-center">
              Estimates only. Actual commission rate is negotiated individually and shown in your dashboard after approval.
            </p>
          </div>
        </section>

        {/* Requirements */}
        <section className="py-20 border-b border-border-dark">
          <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">What You Need to Apply</h2>
                <ul className="space-y-4">
                  {[
                    'A verified Zenorar account',
                    'Your full name and country',
                    'A short bio about your experience',
                    'A description of the types of scripts you build',
                    'A demo link when you submit your first script',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                        <Icon name="check" size={12} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">Programme Rules</h2>
                <ul className="space-y-4">
                  {[
                    'Scripts are reviewed and may be improved before listing',
                    'Your identity is kept anonymous — scripts are sold under Zenorar',
                    'Refunded orders have their commission reversed',
                    'Payouts are bi-weekly — request when your balance is $100+',
                    'Maximum 3 saved payout wallets per account',
                    'Contributor status can be suspended for ToS violations',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-slate-400">
                      <div className="w-5 h-5 rounded-full bg-border-dark text-slate-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon name="info" size={12} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 border-b border-border-dark bg-surface-dark/30">
          <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq) => (
                <div key={faq.q} className="bg-surface-dark rounded-xl border border-border-dark p-6">
                  <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20">
          <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Share Your Scripts?
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              The application takes less than 5 minutes. Our team reviews and responds personally.
            </p>
            {isContributor ? (
              <Link
                href="/profile/contributor"
                className="bg-primary text-black px-10 py-4 rounded-xl font-bold text-lg hover:brightness-110 transition-all inline-block"
              >
                Go to My Dashboard
              </Link>
            ) : (
              <Link
                href="/become-a-contributor/apply"
                className="bg-primary text-black px-10 py-4 rounded-xl font-bold text-lg hover:brightness-110 transition-all inline-block"
              >
                Apply Now — It&apos;s Free
              </Link>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
