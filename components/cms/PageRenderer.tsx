'use client'

import { Page } from '@/lib/cms/api'
import SectionRenderer from './sections'

interface PageRendererProps {
  page: Page
}

export default function PageRenderer({ page }: PageRendererProps) {
  // Ensure content is an array (handle string/null/undefined cases)
  let content = page.content
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content)
    } catch {
      content = []
    }
  }
  if (!Array.isArray(content)) {
    content = []
  }

  if (content.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">{page.title}</h1>
          <p className="text-slate-500">This page has no content yet.</p>
        </div>
      </div>
    )
  }

  // Sort sections by order
  const sortedSections = [...content].sort((a, b) => a.order - b.order)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {sortedSections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </div>
  )
}
