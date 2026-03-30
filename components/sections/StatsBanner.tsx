'use client'

import Icon from '@/components/ui/Icon'

const stats = [
  { icon: 'store' as const, value: '10,000+', label: 'Digital Products', color: 'text-primary' },
  { icon: 'globe' as const, value: '190+', label: 'Countries Served', color: 'text-cyan-400' },
  { icon: 'flash' as const, value: 'Instant', label: 'Delivery', color: 'text-amber-400' },
  { icon: 'bitcoin' as const, value: 'Crypto', label: 'Payments Accepted', color: 'text-orange-400' },
]

export default function StatsBanner({ config }: { config?: { title?: string; style?: Record<string, string> } } = {}) {
  return (
    <section className="mb-12">
      <div className="bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-2xl p-6 lg:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                <Icon name={stat.icon} size={24} className={stat.color} />
              </div>
              <div>
                <p className="text-xl lg:text-2xl font-extrabold text-white leading-tight">{stat.value}</p>
                <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
