'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'

interface Step {
  title: string
  content: string
}

interface Section {
  title: string
  steps: Step[]
}

interface Faq {
  question: string
  answer: string
}

interface HelpArticlePageProps {
  title: string
  icon: string
  description: string
  sections: Section[]
  faqs: Faq[]
}

export default function HelpArticlePage({ title, icon, description, sections, faqs }: HelpArticlePageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header />
      <CategoryNav />

      <main className="flex-grow max-w-container mx-auto px-8 lg:px-12 w-full">
        {/* Breadcrumbs */}
        <div className="py-4">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Help Center', href: '/help' },
              { label: title },
            ]}
            className="mb-0"
          />
        </div>

        {/* Hero */}
        <section className="relative bg-surface-dark border border-border-dark rounded-3xl py-14 px-8 lg:px-12 overflow-hidden mb-12">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(#43D678 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background-dark/50 pointer-events-none" />
          <div className="relative z-10 flex items-start gap-6 max-w-3xl">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon name={icon} size={32} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{title}</h1>
              <p className="text-slate-400 text-lg leading-relaxed">{description}</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-20">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-12">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <h2 className="text-xl font-bold text-white mb-6 pb-3 border-b border-border-dark">
                  {section.title}
                </h2>
                <div className="space-y-6">
                  {section.steps.map((step, stepIndex) => (
                    <div key={stepIndex} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm">
                        {stepIndex + 1}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold mb-1">{step.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">{step.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* FAQs */}
            <div>
              <h2 className="text-xl font-bold text-white mb-6 pb-3 border-b border-border-dark">
                Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full flex justify-between items-center p-5 cursor-pointer text-white font-medium hover:text-primary transition-colors text-left gap-4"
                    >
                      <span>{faq.question}</span>
                      <Icon
                        name="chevron-down"
                        size={18}
                        className={`text-slate-500 transition-transform flex-shrink-0 ${openFaq === index ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {openFaq === index && (
                      <div className="px-5 pb-5 text-slate-400 text-sm leading-relaxed border-t border-border-dark pt-4">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Still need help */}
            <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 sticky top-24">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Icon name="support-agent" size={24} className="text-primary" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Still need help?</h3>
              <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                Can&apos;t find what you&apos;re looking for? Our support team is ready to help you.
              </p>
              <Link
                href="/contact"
                className="block w-full bg-primary text-black font-bold py-3 rounded-xl hover:brightness-105 transition-all text-center text-sm"
              >
                Submit a Ticket
              </Link>
              <Link
                href="/help"
                className="block w-full text-center text-slate-400 hover:text-white text-sm mt-3 transition-colors"
              >
                ← Back to Help Center
              </Link>
            </div>

            {/* Other categories */}
            <div className="bg-surface-dark border border-border-dark rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Other Topics</h3>
              <div className="space-y-2">
                {[
                  { label: 'Getting Started', href: '/help/getting-started', icon: 'rocket' },
                  { label: 'Account & Security', href: '/help/account-security', icon: 'security' },
                  { label: 'Scripts & Tools', href: '/help/scripts-tools', icon: 'code' },
                  { label: 'eSIM & Connectivity', href: '/help/esim-connectivity', icon: 'sim-card' },
                  { label: 'Payments', href: '/help/payments', icon: 'wallet' },
                  { label: 'Selling on Marketplace', href: '/help/selling', icon: 'store' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm"
                  >
                    <Icon name={item.icon} size={16} className="text-primary" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
