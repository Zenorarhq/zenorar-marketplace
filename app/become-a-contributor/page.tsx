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
    title: 'Apply in Minutes',
    desc: 'Tell us about yourself, your expertise, and the kind of scripts you build. No portfolio required — just a clear description of what you bring to the table.',
  },
  {
    step: '02',
    title: 'Get Reviewed & Approved',
    desc: 'Our team personally reviews every application. Once approved, your commission rate is set and you can start submitting scripts immediately.',
  },
  {
    step: '03',
    title: 'Submit & Demo',
    desc: 'Upload your script with a working demo link. We review functionality, code quality, and market fit — then handle the rest.',
  },
  {
    step: '04',
    title: 'Earn on Every Sale',
    desc: 'Your script goes live on the marketplace. Every time it sells, your commission hits your balance automatically. No invoicing, no chasing payments.',
  },
]

const faqs = [
  {
    q: 'Who can apply to become a contributor?',
    a: 'Any developer who builds production-ready scripts, bots, or automation tools. Whether you\'re a solo freelancer or part of a team — if you build quality software, we want to hear from you.',
  },
  {
    q: 'How is my commission rate determined?',
    a: 'Contributors earn between 50% and 70% of net revenue (after a small platform fee). Your exact rate depends on script complexity, exclusivity, and market demand. The rate is agreed before your first script goes live.',
  },
  {
    q: 'Will buyers know who built the script?',
    a: 'No. All scripts are published under the Zenorar brand. Your identity stays private — you focus on building, we handle the storefront and customer relationships.',
  },
  {
    q: 'What happens after I submit a script?',
    a: 'We review functionality, security, and code quality. If needed, we polish the UI or documentation before listing. Once live, you earn commission on every sale for as long as the product stays in the store.',
  },
  {
    q: 'How and when do I get paid?',
    a: 'Request a payout anytime your balance reaches $100 or more. Payouts are processed via crypto (BTC, USDT, ETH, and more) — no bank delays, no intermediaries. Earnings are available immediately after each sale.',
  },
  {
    q: 'What if a buyer requests a refund?',
    a: 'If a refund is approved, the commission for that specific sale is reversed from your balance. You\'ll receive an email notification with full details.',
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
              You Build It.<br />We Sell It.
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Turn your scripts into recurring revenue. Submit your tools to Zenorar — we handle
              quality assurance, marketing, sales, and support. You earn up to 70% on every purchase.
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
                  Start Your Application
                </Link>
              )}
              <a
                href="#how-it-works"
                className="border border-border-dark text-slate-300 px-8 py-4 rounded-xl font-semibold text-lg hover:border-primary hover:text-primary transition-all"
              >
                See How It Works
              </a>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 border-b border-border-dark">
          <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { label: 'Contributor Share', value: '50–70%' },
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
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Four Steps to Passive Income</h2>
              <p className="text-slate-400 max-w-xl mx-auto">From application to your first payout — here is exactly how it works.</p>
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
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">What You Could Earn</h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                Commission is calculated from the net sale after a small platform fee. Your rate is agreed individually — here are example earnings at 50% and 70%.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-dark text-slate-400">
                    <th className="text-left py-3 px-4">Sale Price</th>
                    <th className="text-right py-3 px-4">Platform Fee (7.5%)</th>
                    <th className="text-right py-3 px-4">Net Amount</th>
                    <th className="text-right py-3 px-4">You Earn (50%)</th>
                    <th className="text-right py-3 px-4">You Earn (70%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark">
                  {[
                    { price: '$25', fee: '$1.88', net: '$23.12', low: '$11.56', high: '$16.19' },
                    { price: '$50', fee: '$3.75', net: '$46.25', low: '$23.13', high: '$32.38' },
                    { price: '$100', fee: '$7.50', net: '$92.50', low: '$46.25', high: '$64.75' },
                    { price: '$250', fee: '$18.75', net: '$231.25', low: '$115.63', high: '$161.88' },
                  ].map((row) => (
                    <tr key={row.price} className="text-slate-300">
                      <td className="py-3 px-4 font-medium">{row.price}</td>
                      <td className="py-3 px-4 text-right text-slate-400">{row.fee}</td>
                      <td className="py-3 px-4 text-right text-slate-400">{row.net}</td>
                      <td className="py-3 px-4 text-right text-slate-400">{row.low}</td>
                      <td className="py-3 px-4 text-right text-primary font-semibold">{row.high}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-slate-500 text-xs mt-4 text-center">
              Your exact commission rate is agreed during the approval process and displayed in your contributor dashboard.
            </p>
          </div>
        </section>

        {/* Requirements */}
        <section className="py-20 border-b border-border-dark">
          <div className="max-w-container mx-auto px-4 sm:px-8 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">What You Need</h2>
                <ul className="space-y-4">
                  {[
                    'A verified Zenorar account (free to create)',
                    'Your full name and country of residence',
                    'A short bio covering your development background',
                    'A description of the scripts or tools you plan to contribute',
                    'A working demo link when you submit your first script',
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
                <h2 className="text-3xl font-bold text-white mb-6">How the Programme Works</h2>
                <ul className="space-y-4">
                  {[
                    'Submitted scripts are reviewed and may be improved before listing',
                    'All products are published under the Zenorar brand — your identity stays private',
                    'Approved refunds reverse the commission for that specific sale',
                    'Payouts can be requested anytime your balance reaches $100+',
                    'Up to 3 crypto wallet addresses can be saved per account',
                    'Contributor access can be suspended for terms of service violations',
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
              Common Questions
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
              Ready to Turn Your Code into Revenue?
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              The application takes less than 5 minutes. Every submission is reviewed personally by our team.
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
                Start Your Application
              </Link>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
