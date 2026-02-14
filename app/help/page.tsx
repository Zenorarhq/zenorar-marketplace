'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'

const helpCategories = [
  {
    icon: 'rocket',
    title: 'Getting Started',
    description: 'New to Marketplace? Learn the basics of buying, downloading, and setting up your account.',
    href: '/help/getting-started',
  },
  {
    icon: 'security',
    title: 'Account & Security',
    description: 'Manage your profile, password resets, 2FA settings, and account verification.',
    href: '/help/account-security',
  },
  {
    icon: 'code',
    title: 'Scripts & Tools',
    description: 'Installation guides, compatibility checks, and troubleshooting for premium scripts.',
    href: '/help/scripts-tools',
  },
  {
    icon: 'sim-card',
    title: 'eSIM & Connectivity',
    description: 'Activation instructions, APN settings, and troubleshooting data connectivity.',
    href: '/help/esim-connectivity',
  },
  {
    icon: 'wallet',
    title: 'Payments',
    description: 'Billing inquiries, crypto payment guides, refunds, and invoice management.',
    href: '/help/payments',
  },
  {
    icon: 'store',
    title: 'Selling on Marketplace',
    description: 'Guides for developers and sellers to list products, manage orders, and withdraw earnings.',
    href: '/help/selling',
  },
]

const faqs = [
  {
    question: 'How do I download my purchased script?',
    answer: 'After your payment is confirmed, go to your Account Dashboard and navigate to the "Downloads" section. You will find a download button next to your purchased item. If you paid with crypto, please allow up to 30 minutes for network confirmation.',
  },
  {
    question: "Can I get a refund if the product doesn't work?",
    answer: 'We offer refunds within 7 days of purchase if the product is technically defective and our support team cannot resolve the issue. Please refer to our Refund Policy for specific terms regarding digital goods.',
  },
  {
    question: 'How do I activate my eSIM?',
    answer: "Upon purchase, you will receive a QR code via email. Go to your phone's Settings > Cellular > Add eSIM, and scan the QR code. Ensure your device is unlocked and compatible with eSIM technology before purchasing.",
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept major credit cards, PayPal, and a variety of cryptocurrencies including Bitcoin (BTC), Ethereum (ETH), USDT, and Litecoin (LTC). Crypto payments are processed via a secure gateway.',
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header />
      <CategoryNav />

      <main className="flex-grow max-w-container mx-auto px-8 lg:px-12 w-full">
        {/* Breadcrumbs */}
        <div className="py-4">
          <Breadcrumbs className="mb-0" />
        </div>

        {/* Hero Section */}
        <section className="relative bg-surface-dark border border-border-dark rounded-3xl py-16 px-8 lg:px-12 text-center overflow-hidden mb-12">
          {/* Circuit Pattern Background */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(#43D678 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background-dark/50 pointer-events-none"></div>

          <div className="relative z-10 max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
              How can we help you?
            </h1>
            <div className="relative max-w-2xl mx-auto">
              <Icon name="search" size={24} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/50 border border-slate-700 rounded-xl py-4 pl-12 pr-6 text-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-slate-500 shadow-xl"
                placeholder="Search for answers, topics, or articles..."
              />
            </div>
          </div>
        </section>

        <div className="relative z-20">
          {/* Help Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {helpCategories.map((category) => (
              <Link
                key={category.title}
                href={category.href}
                className="bg-surface-dark border border-border-dark p-8 rounded-2xl hover:border-primary transition-all group hover:-translate-y-1 duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Icon name={category.icon} size={28} className="text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{category.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{category.description}</p>
              </Link>
            ))}
          </div>

          {/* Quick Support Section */}
          <div className="mb-20">
            <h2 className="text-2xl font-bold text-white mb-8">Quick Support</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="https://discord.gg/marketplace"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/5 border border-white/10 p-6 rounded-xl flex items-center gap-4 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Icon name="forum" size={24} className="text-primary" />
                <div>
                  <h4 className="font-bold text-white">Community Forum</h4>
                  <p className="text-xs text-slate-400">Discuss with other users</p>
                </div>
                <Icon name="arrow-right" size={20} className="text-slate-500 ml-auto" />
              </Link>

              <button
                onClick={() => {
                  // Trigger live chat
                  const chatButton = document.querySelector('[aria-label="Open live chat"]') as HTMLButtonElement
                  if (chatButton) chatButton.click()
                }}
                className="bg-white/5 border border-white/10 p-6 rounded-xl flex items-center gap-4 hover:bg-white/10 transition-colors cursor-pointer text-left"
              >
                <Icon name="chat" size={24} className="text-primary" />
                <div>
                  <h4 className="font-bold text-white">Live Chat</h4>
                  <p className="text-xs text-slate-400">Chat with an agent</p>
                </div>
                <Icon name="arrow-right" size={20} className="text-slate-500 ml-auto" />
              </button>

              <Link
                href="/contact"
                className="bg-white/5 border border-white/10 p-6 rounded-xl flex items-center gap-4 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Icon name="ticket" size={24} className="text-primary" />
                <div>
                  <h4 className="font-bold text-white">Submit a Ticket</h4>
                  <p className="text-xs text-slate-400">Get email support</p>
                </div>
                <Icon name="arrow-right" size={20} className="text-slate-500 ml-auto" />
              </Link>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto pb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex justify-between items-center p-6 cursor-pointer text-white font-medium hover:text-primary transition-colors text-left"
                  >
                    <span>{faq.question}</span>
                    <Icon
                      name="chevron-down"
                      size={20}
                      className={`text-slate-500 transition-transform ${
                        openFaq === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-6 text-slate-400 text-sm leading-relaxed border-t border-border-dark pt-4">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
