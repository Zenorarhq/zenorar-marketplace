'use client'

import { useState, useEffect } from 'react'

import CategoryCard from '@/components/cards/CategoryCard'
import { apiFetch } from '@/lib/api/client'

interface DBCategory {
  id: string
  name: string
  slug: string
  icon: string
  productCount: number
}

export default function ScriptCategories({ config }: { config?: { title?: string; columns?: string; style?: Record<string, any> } } = {}) {
  const [categories, setCategories] = useState<DBCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/categories?type=scripts')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (!loading && !error && categories.length === 0) return null

  return (
    <section className="mb-12">
      <div className="mb-6">
        <h2 className={`${({ small: 'text-xl', large: 'text-3xl', xl: 'text-4xl' } as Record<string, string>)[config?.style?.headingSize] || 'text-2xl'} ${({ normal: 'font-normal', semibold: 'font-semibold', extrabold: 'font-extrabold' } as Record<string, string>)[config?.style?.headingWeight] || 'font-bold'} text-primary`}>{config?.title || 'Scripts Categories'}</h2>
      </div>

      {loading && (
        <div className={`grid grid-cols-2 ${({ '2': 'md:grid-cols-2', '3': 'md:grid-cols-3', '4': 'md:grid-cols-4' } as Record<string, string>)[config?.columns || '4'] || 'md:grid-cols-4'} gap-4`}>
          {Array.from({ length: Number(config?.columns || 4) }).map((_, i) => (
            <div key={i} className="bg-[#1a1a1a] rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-slate-500 text-sm text-center py-8">Unable to load categories. Please refresh the page.</p>
      )}

      {!loading && !error && <div className={`grid grid-cols-2 ${({ '2': 'md:grid-cols-2', '3': 'md:grid-cols-3', '4': 'md:grid-cols-4' } as Record<string, string>)[config?.columns || '4'] || 'md:grid-cols-4'} gap-4`}>
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={{ id: cat.id, name: cat.name, icon: cat.icon || 'code', href: `/scripts?category=${cat.slug}` }}
          />
        ))}
      </div>}
    </section>
  )
}
