'use client'

import { useState, useEffect, useRef } from 'react'

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
    backgroundColor?: string
    textColor?: string
    numberColor?: string
    padding?: 'none' | 'small' | 'medium' | 'large'
    columns?: '2' | '3' | '4'
    alignment?: 'left' | 'center' | 'right'
    showDividers?: boolean
    hideOnMobile?: boolean
  }
}

export default function StatsCounterSection({ props }: StatsCounterSectionProps) {
  const {
    title,
    stats = [],
    backgroundColor,
    textColor,
    numberColor,
    padding = 'medium',
    columns = '4',
    alignment = 'center',
    showDividers,
    hideOnMobile,
  } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)
  const [animatedValues, setAnimatedValues] = useState<number[]>(() =>
    stats.map(() => 0)
  )

  useEffect(() => {
    if (hasAnimated || stats.length === 0) return

    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setHasAnimated(true)
        observer.disconnect()

        const targets = stats.map(s => {
          const num = parseFloat((s.number || '0').replace(/,/g, ''))
          return isNaN(num) ? 0 : num
        })

        const duration = 1500
        const steps = 40
        const stepTime = duration / steps
        let step = 0

        const timer = setInterval(() => {
          step++
          const progress = step / steps
          // Ease-out cubic
          const eased = 1 - Math.pow(1 - progress, 3)

          setAnimatedValues(targets.map(t => Math.round(t * eased)))

          if (step >= steps) {
            clearInterval(timer)
            setAnimatedValues(targets)
          }
        }, stepTime)
      },
      { threshold: 0.2 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasAnimated, stats])

  const paddingClasses: Record<string, string> = {
    none: 'py-4',
    small: 'py-6',
    medium: 'py-12',
    large: 'py-16 lg:py-20',
  }

  const alignClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }

  const gridColsClasses: Record<string, string> = {
    '2': 'grid-cols-2',
    '3': 'grid-cols-2 md:grid-cols-3',
    '4': 'grid-cols-2 md:grid-cols-4',
  }

  if (stats.length === 0) {
    return (
      <div className="py-8 px-4 text-center">
        <p className="text-slate-500 text-sm">Add statistics to display counters.</p>
      </div>
    )
  }

  const formatNumber = (num: number, original: string) => {
    // Preserve comma formatting from original
    if (original.includes(',')) {
      return num.toLocaleString()
    }
    return num.toString()
  }

  return (
    <div
      ref={containerRef}
      className={`${paddingClasses[padding]} px-4 ${hideOnMobile ? 'hidden md:block' : ''}`}
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      <div className="max-w-4xl mx-auto">
        {title && (
          <h2
            className="text-2xl font-bold text-white mb-8 text-center"
            style={{ color: textColor || undefined }}
          >
            {title}
          </h2>
        )}
        <div className={`grid ${gridColsClasses[columns] || gridColsClasses['4']} gap-6 ${showDividers ? 'divide-x divide-[#2a2a2a]' : ''}`}>
          {stats.map((stat, i) => (
            <div key={i} className={alignClasses[alignment]}>
              <p
                className="text-3xl md:text-4xl font-bold text-primary mb-1"
                style={{ color: numberColor || undefined }}
              >
                {stat.prefix || ''}
                {formatNumber(animatedValues[i] ?? 0, stat.number || '0')}
                {stat.suffix || ''}
              </p>
              {stat.label && (
                <p
                  className="text-slate-400 text-sm"
                  style={{ color: textColor || undefined }}
                >
                  {stat.label}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}