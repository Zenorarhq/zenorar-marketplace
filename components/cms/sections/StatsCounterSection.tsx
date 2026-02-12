'use client'

interface Stat {
  number?: string
  label?: string
  prefix?: string
  suffix?: string
}

interface StatsCounterSectionProps {
  props: {
    title?: string
    stats?: Stat[]
  }
}

export default function StatsCounterSection({ props }: StatsCounterSectionProps) {
  const { title, stats = [] } = props

  if (stats.length === 0) {
    return (
      <div className="py-8 px-4 text-center">
        <p className="text-slate-500 text-sm">Add statistics to display counters.</p>
      </div>
    )
  }

  const gridCols = stats.length <= 2 ? 'grid-cols-2' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'

  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {title && <h2 className="text-2xl font-bold text-white mb-8 text-center">{title}</h2>}
        <div className={`grid ${gridCols} gap-6`}>
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-primary mb-1">
                {stat.prefix || ''}{stat.number || '0'}{stat.suffix || ''}
              </p>
              {stat.label && <p className="text-slate-400 text-sm">{stat.label}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
