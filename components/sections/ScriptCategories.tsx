'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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

  useEffect(() => {
    apiFetch('/categories/public?includeProducts=true')
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data.filter((c: any) => c._count?.products > 0))
        }
      })
      .catch(() => {})
  }, [])

  if (categories.length === 0) return null

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`${({ small: 'text-xl', large: 'text-3xl', xl: 'text-4xl' } as Record<string, string>)[config?.style?.headingSize] || 'text-2xl'} ${({ normal: 'font-normal', semibold: 'font-semibold', extrabold: 'font-extrabold' } as Record<string, string>)[config?.style?.headingWeight] || 'font-bold'} text-primary`}>{config?.title || 'Scripts Categories'}</h2>
        <Link
          href="#"
          className="text-sm text-slate-400 hover:text-primary transition-colors"
        >
          See all
        </Link>
      </div>

      <div className={`grid grid-cols-2 ${({ '2': 'md:grid-cols-2', '3': 'md:grid-cols-3', '4': 'md:grid-cols-4' } as Record<string, string>)[config?.columns || '4'] || 'md:grid-cols-4'} gap-4`}>
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={{ id: cat.id, name: cat.name, icon: cat.icon || 'code', href: `/scripts?category=${cat.slug}` }}
          />
        ))}
      </div>
    </section>
  )
}
