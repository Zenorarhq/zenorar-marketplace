'use client'

import Icon from '@/components/ui/Icon'

const steps = [
  {
    number: '01',
    title: 'Browse & Choose',
    description: 'Explore scripts, gift cards, eSIMs, virtual cards, and more — all in one place.',
    icon: 'search' as const,
    gradient: 'from-primary/20 to-emerald-500/10',
    iconColor: 'text-primary',
    items: [
      { icon: 'code' as const, label: 'Scripts' },
      { icon: 'gift' as const, label: 'Gift Cards' },
      { icon: 'sim-card' as const, label: 'eSIM' },
      { icon: 'credit-card' as const, label: 'Cards' },
      { icon: 'phone' as const, label: 'Refills' },
      { icon: 'globe' as const, label: 'Numbers' },
    ],
  },
  {
    number: '02',
    title: 'Pay with Crypto',
    description: 'Use any wallet. Bitcoin, Ethereum, USDT, Solana, and many more accepted.',
    icon: 'bitcoin' as const,
    gradient: 'from-orange-500/20 to-amber-500/10',
    iconColor: 'text-orange-400',
    items: [
      { icon: 'bitcoin' as const, label: 'BTC' },
      { icon: 'wallet' as const, label: 'ETH' },
      { icon: 'dollar' as const, label: 'USDT' },
      { icon: 'flash' as const, label: 'SOL' },
      { icon: 'shield' as const, label: 'USDC' },
      { icon: 'credit-card' as const, label: 'Card' },
    ],
  },
  {
    number: '03',
    title: 'Receive Instantly',
    description: 'Your product arrives in seconds — codes, keys, and activations delivered to your inbox.',
    icon: 'flash' as const,
    gradient: 'from-violet-500/20 to-purple-500/10',
    iconColor: 'text-violet-400',
    items: [
      { icon: 'mail' as const, label: 'Email' },
      { icon: 'download' as const, label: 'Download' },
      { icon: 'key' as const, label: 'Keys' },
      { icon: 'check-circle' as const, label: 'Instant' },
      { icon: 'shield' as const, label: 'Secure' },
      { icon: 'zap' as const, label: 'Fast' },
    ],
  },
]

export default function HowItWorks({ config }: { config?: { title?: string; style?: Record<string, string> } } = {}) {
  return (
    <section className="mb-12">
      <h2 className={`${({ small: 'text-xl', large: 'text-3xl', xl: 'text-4xl' } as Record<string, string>)[config?.style?.headingSize || ''] || 'text-2xl'} ${({ normal: 'font-normal', semibold: 'font-semibold', extrabold: 'font-extrabold' } as Record<string, string>)[config?.style?.headingWeight || ''] || 'font-bold'} text-white mb-8`}>
        {config?.title || 'How It Works'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {steps.map((step, i) => (
          <div
            key={step.number}
            className={`relative bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 transition-all hover:border-white/10 hover:bg-white/[0.05] ${
              i === 1 ? 'md:-translate-y-3' : ''
            }`}
          >
            {/* Number badge */}
            <span className="absolute top-4 right-4 text-[10px] font-bold text-white/20 tracking-widest">
              {step.number}
            </span>

            {/* Large icon */}
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-5 border border-white/[0.06]`}>
              <Icon name={step.icon} size={28} className={step.iconColor} />
            </div>

            {/* Title + description */}
            <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">{step.description}</p>

            {/* Mini icon grid */}
            <div className="grid grid-cols-3 gap-2">
              {step.items.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-1.5 py-2 px-1 rounded-lg bg-white/[0.03] border border-white/[0.04]"
                >
                  <Icon name={item.icon} size={16} className="text-slate-500" />
                  <span className="text-[10px] text-slate-500 font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}