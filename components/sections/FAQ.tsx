'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'

const faqs = [
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept Bitcoin (BTC), Ethereum (ETH), USDT, USDC, Solana (SOL), and many other cryptocurrencies. We also support Visa and Mastercard payments.',
  },
  {
    question: 'How fast is delivery?',
    answer: 'Most products are delivered instantly after payment confirmation. Gift card codes, eSIM QR codes, and virtual card details arrive within seconds. Scripts are available for immediate download.',
  },
  {
    question: 'Is it safe to buy here?',
    answer: 'Yes. All transactions are encrypted and processed through secure payment gateways. We never store your payment details, and all crypto payments are verified on-chain.',
  },
  {
    question: 'Can I get a refund?',
    answer: 'Digital products are non-refundable once delivered. However, if you receive a faulty code or experience a delivery issue, contact our support team and we will resolve it promptly.',
  },
  {
    question: 'Which countries do you support?',
    answer: 'We serve customers worldwide. Gift cards and phone refills are available for 190+ countries. eSIM plans cover most regions globally, and virtual numbers are available in select countries.',
  },
  {
    question: 'Do I need an account to purchase?',
    answer: 'You can browse products without an account, but you will need to create one to complete a purchase. This lets us deliver your products securely and keep your order history.',
  },
]

export default function FAQ({ config }: { config?: { title?: string; style?: Record<string, string> } } = {}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="mb-12">
      <h2 className={`${({ small: 'text-xl', large: 'text-3xl', xl: 'text-4xl' } as Record<string, string>)[config?.style?.headingSize || ''] || 'text-2xl'} ${({ normal: 'font-normal', semibold: 'font-semibold', extrabold: 'font-extrabold' } as Record<string, string>)[config?.style?.headingWeight || ''] || 'font-bold'} text-primary mb-8`}>
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