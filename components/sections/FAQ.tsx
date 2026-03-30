'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'

const faqs = [
  {
    question: 'How do I pay with crypto?',
    answer: 'Choose your product, pick your preferred coin at checkout — Bitcoin, Ethereum, USDT, USDC, Solana, or 50+ other cryptocurrencies — and send the payment. Once confirmed on-chain, your product is delivered automatically. We also accept Visa and Mastercard if you prefer to pay by card.',
  },
  {
    question: 'How quickly will I receive my product?',
    answer: 'Seconds, not minutes. Gift card codes, eSIM activation QR codes, virtual card details, and phone refills all arrive instantly after payment confirmation. Scripts and tools are available for immediate download. No waiting, no manual processing.',
  },
  {
    question: 'Is my payment secure?',
    answer: 'Every transaction is encrypted end-to-end. Card payments are processed through Stripe — we never see or store your card details. Crypto payments are verified directly on-chain. Your funds go straight to the purchase with no intermediaries holding your data.',
  },
  {
    question: 'What happens if something goes wrong with my order?',
    answer: 'If you receive a faulty code or your delivery does not arrive, our support team will fix it. Open a ticket from your account and we will investigate and resolve the issue. Digital products are non-refundable once successfully delivered, but we stand behind every order.',
  },
  {
    question: 'Which countries can I buy from?',
    answer: 'Zenorar serves customers in 190+ countries. Gift cards and phone refills cover major brands worldwide. eSIM plans work across most regions — from the US and Europe to Asia and Africa. Virtual numbers and payment cards are available in select countries with more being added regularly.',
  },
  {
    question: 'What products does Zenorar sell?',
    answer: 'Everything digital. 8,000+ gift cards from brands like Amazon, Google Play, and Steam. eSIM data plans for 190+ countries. Instant and virtual Mastercard and Visa cards. Phone refills for major carriers. Plus scripts, tools, and automation software for developers.',
  },
]

export default function FAQ({ config }: { config?: { title?: string; style?: Record<string, string> } } = {}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="mb-12">
      <h2 className={`${({ small: 'text-xl', large: 'text-3xl', xl: 'text-4xl' } as Record<string, string>)[config?.style?.headingSize || ''] || 'text-2xl'} ${({ normal: 'font-normal', semibold: 'font-semibold', extrabold: 'font-extrabold' } as Record<string, string>)[config?.style?.headingWeight || ''] || 'font-bold'} text-primary flex items-center gap-2 mb-8`}>
        <Icon name="help-circle" size={24} />
        {config?.title || 'Frequently Asked Questions'}
      </h2>

      <div className="space-y-2">
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i
          return (
            <div
              key={i}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-sm font-semibold text-white">{faq.question}</span>
                <Icon
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  className="text-slate-500 flex-shrink-0"
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 -mt-1">
                  <p className="text-sm text-slate-400 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}