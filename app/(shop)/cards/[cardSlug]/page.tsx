'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { usePreferences } from '@/contexts/PreferencesContext'

const CARD_INFO: Record<string, {
  label: string
  tab: string
  description: string
  features: string[]
}> = {
  instant: {
    label: 'Instant Card',
    tab: 'instant',
    description: 'A physical-grade prepaid card delivered instantly. Load it with funds and use it anywhere Visa/Mastercard is accepted online.',
    features: ['Instant delivery', 'Use online worldwide', 'Fixed denomination', 'No monthly fees'],
  },
  virtual: {
    label: 'Virtual Card',
    tab: 'virtual',
    description: 'A fully virtual debit card you can top up anytime. Perfect for online purchases, subscriptions, and secure payments.',
    features: ['Virtual delivery', 'Reloadable balance', 'Use for subscriptions', 'Secure online payments'],
  },
  virtual_card: {
    label: 'Virtual Card',
    tab: 'virtual',
    description: 'A fully virtual debit card you can top up anytime. Perfect for online purchases, subscriptions, and secure payments.',
    features: ['Virtual delivery', 'Reloadable balance', 'Use for subscriptions', 'Secure online payments'],
  },
}

export default function CardTypePage() {
  const params = useParams()
  const cardSlug = params.cardSlug as string
  const { formatPrice } = usePreferences()

  // slug format is "instant-visa" or "virtual_card-visa"
  const parts = cardSlug.split('-')
  const cardBrand = parts[parts.length - 1]
  const cardType = parts.slice(0, -1).join('-').replace(/-/g, '_')

  const info = CARD_INFO[cardType] || CARD_INFO['virtual']
  const brandLabel = cardBrand ? cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1) : 'Visa'

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <Link href="/cards" className="hover:text-white transition-colors">Cards</Link>
        <span>/</span>
        <span className="text-white">{brandLabel} {info.label}</span>
      </nav>

      {/* Hero */}
      <div className="relative w-full h-48 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-border-dark overflow-hidden mb-6 flex items-center justify-center">
        <div className="text-center">
          <Icon name="credit-card" size={64} className="text-primary mx-auto mb-2" />
          <span className="text-white/50 text-sm uppercase tracking-widest font-bold">{brandLabel}</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      </div>

      <h1 className="text-2xl font-extrabold text-white mb-2">{brandLabel} {info.label}</h1>
      <p className="text-slate-400 mb-6">{info.description}</p>

      {/* Features */}
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 mb-6">
        <h2 className="text-white font-bold mb-4">What's included</h2>
        <div className="space-y-3">
          {info.features.map((feat, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Icon name="check" size={12} className="text-primary" />
              </div>
              <span className="text-slate-300">{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6">
        <Link
          href={`/cards?tab=${info.tab}`}
          className="block w-full text-center bg-primary text-black font-bold py-3 rounded-xl hover:brightness-105 transition-all mb-3"
        >
          Get a Card
        </Link>
        <Link
          href="/cards"
          className="block w-full text-center bg-transparent border border-border-dark text-white font-bold py-3 rounded-xl hover:border-primary/50 transition-all"
        >
          Browse All Cards
        </Link>
      </div>
    </div>
  )
}
