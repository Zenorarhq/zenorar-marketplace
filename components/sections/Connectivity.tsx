'use client'

import { useState, useEffect } from 'react'
import ConnectivityCard from '@/components/cards/ConnectivityCard'

interface ConnectivityItem {
  id: string
  name: string
  slug: string
  icon: string
  href: string
}

export default function Connectivity({ config }: { config?: { title?: string; columns?: string; style?: Record<string, any> } } = {}) {
  const [options, setOptions] = useState<ConnectivityItem[]>([])

  useEffect(() => {
    fetch('/api/categories?type=connectivity')
      .then(res => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setOptions(data.data)
        }
      })
      .catch(() => {})
  }, [])

  if (options.length === 0) return null

  return (
    <section className="mb-12">
      <div className="mb-6">
        <h2 className={`${({ small: 'text-xl', large: 'text-3xl', xl: 'text-4xl' } as Record<string, string>)[config?.style?.headingSize] || 'text-2xl'} ${({ normal: 'font-normal', semibold: 'font-semibold', extrabold: 'font-extrabold' } as Record<string, string>)[config?.style?.headingWeight] || 'font-bold'} text-primary`}>{config?.title || 'Connectivity'}</h2>
      </div>

      <div className={`grid grid-cols-2 ${({ '2': 'md:grid-cols-2', '3': 'md:grid-cols-3', '4': 'md:grid-cols-4' } as Record<string, string>)[config?.columns || '4'] || 'md:grid-cols-4'} gap-4`}>
        {options.map((option) => (
          <ConnectivityCard key={option.id} option={option} />
        ))}
      </div>
    </section>
  )
}
