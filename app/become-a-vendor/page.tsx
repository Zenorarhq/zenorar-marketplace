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
    desc: 'Fill out a short application with your business name, country, and a copy of your ID.',
  },
  {
    step: '02',
    title: 'Get Approved',
    desc: 'Our team reviews your application and notifies you by email within 1–3 business days.',
  },
  {
    step: '03',
    title: 'Shop & Earn',
    desc: 'Once approved, every order you place earns commission from our markup profit.',
  },
  {
    step: '04',
    title: 'Withdraw',
    desc: 'Request a payout to your BTC or USDT wallet once commissions unlock after 7 days.',
  },
]

const faqs = [
  {
    q: 'Who can become a vendor?',
    a: 'Anyone who purchases from Zenorar to resell — freelancers, agencies, resellers, and entrepreneurs. You just need a valid ID and a business name.',
  },
  {
    q: 'How is commission calculated?',
    a: 'You earn a percentage of Zenorar\'s markup profit on every order you place — not the full product price. Your commission rate is shown in your profile once approved.',
  },
  {
    q: 'Why is there a 7-day lock period?',
    a: 'Commissions lock for 7 days to cover the refund window. If an order is refunded within 7 days, the commission is reversed. After 7 days, it becomes available to withdraw.',
  },
  {
    q: 'What payout methods are available?',
    a: 'Bitcoin (BTC), USDT on TRC20, USDT on ERC20, and USDT on BEP20. Network fees are deducted from your payout amount.',
  },
  {
    q: 'Is there a minimum payout amount?',
    a: 'Yes. The minimum payout threshold is set by the admin and shown in your Commissions dashboard.',
  },
  {
    q: 'Can my vendor status be revoked?',
    a: 'Yes. Accounts that violate our terms or engage in fraudulent activity may be suspended. You will be notified by email if this happens.',
  },
]

export default function BecomeAVendorPage() {
  const { user } = useAuth()

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
              <Icon name="trending-up" size={14} />
              Vendor Partner Programme
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
              Earn While You Buy
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Become a Zenorar vendor and earn commission on every order you place.
              Shop our products, resell to your clients, and get paid — automatically.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user?.isVendor ? (
                <Link
                  href="/profile/commissions"
                  className="bg-primary text-black px-8 py-4 rounded-xl font-bold text-lg hover:brightness-110 transition-all"
                >
                  View My Commissions
                </Link>
              ) : (
                <Link
                  href="/become-a-vendor/apply"
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
                { label: 'Commission on Markup', value: 'Up to 30%' },
                { label: 'Payout Methods', value: '4 Options' },
                { label: 'Lock Period', value: '7 Days' },
                { label: 'Min. Payout', value: 'Set by Admin' },
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
              <p className="text-slate-400 max-w-xl mx-auto">Four simple steps from application to your first payout.</p>
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
                Commission is earned on Zenorar&apos;s markup profit — not the full product price.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-dark text-slate-400">
                    <th className="text-left py-3 px-4">Monthly Order Volume</th>
                    <th className="text-right py-3 px-4">Avg. Markup Profit</th>
                    <th className="text-right py-3 px-4">Commission @ 15%</th>
                    <th className="text-right py-3 px-4">Commission @ 25%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark">
                  {[
                    { volume: '$500', markup: '$75', c15: '$11.25', c25: '$18.75' },
                    { volume: '$2,000', markup: '$300', c15: '$45.00', c25: '$75.00' },
                    { volume: '$5,000', markup: '$750', c15: '$112.50', c25: '$187.50' },
                    { volume: '$10,000', markup: '$1,500', c15: '$225.00', c25: '$375.00' },
                  ].map((row) => (
                    <tr key={row.volume} className="text-slate-300">
                      <td className="py-3 px-4 font-medium">{row.volume}</td>
                      <td className="py-3 px-4 text-right text-slate-400">{row.markup}</td>
                      <td className="py-3 px-4 text-right text-primary">{row.c15}</td>
                      <td className="py-3 px-4 text-right text-primary font-semibold">{row.c25}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-slate-500 text-xs mt-4 text-center">
              Estimates only. Actual commission rate is set by admin and shown in your dashboard after approval.
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
                    'Full legal name',
                    'Business or trade name',
                    'Country of operation',
                    'Government-issued ID (front photo)',
                    'Estimated average monthly order volume',
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
                    'Commissions lock for 7 days per order (covers refund window)',
                    'Refunded orders have their commission reversed',
                    'Payouts are manual — request when ready',
                    'Network fees are deducted from payout amounts',
                    'Maximum 3 saved payout wallets per account',
                    'Vendor status can be suspended for ToS violations',
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
              Ready to Start Earning?
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              The application takes less than 5 minutes. Our team reviews within 1–3 business days.
            </p>
            {user?.isVendor ? (
              <Link
                href="/profile/commissions"
                className="bg-primary text-black px-10 py-4 rounded-xl font-bold text-lg hover:brightness-110 transition-all inline-block"
              >
                Go to My Commissions
              </Link>
            ) : (
              <Link
                href="/become-a-vendor/apply"
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