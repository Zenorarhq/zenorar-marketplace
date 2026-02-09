'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { pagesApi, Page } from '@/lib/cms/api'
import PageRenderer from '@/components/cms/PageRenderer'
import Icon from '@/components/ui/Icon'

export default function PreviewPage() {
  const params = useParams()
  const router = useRouter()
  const pageId = params.id as string

  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  useEffect(() => {
    async function loadPage() {
      try {
        const result = await pagesApi.getById(pageId)
        if (result.success && result.data) {
          setPage(result.data)
        } else {
          setError('Page not found')
        }
      } catch (err) {
        setError('Failed to load page')
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [pageId])

  const viewportWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Icon name="loading" size={40} className="text-primary animate-spin" />
      </div>
    )
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <Icon name="alert-circle" size={40} className="text-red-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Failed to load preview</p>
          <p className="text-slate-400 mb-4">{error}</p>
          <Link
            href={`/admin/frontend/${pageId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Icon name="arrow-left" size={16} />
            Back to Editor
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      {/* Preview Toolbar */}
      <header className="h-14 bg-[#111111] border-b border-[#2a2a2a] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/frontend/${pageId}`}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <Icon name="arrow-left" size={20} />
          </Link>
          <div>
            <h1 className="text-white font-medium text-sm">Preview: {page.title}</h1>
            <p className="text-slate-500 text-xs">/{page.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport Toggles */}
          <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1">
            <button
              onClick={() => setViewMode('desktop')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'desktop'
                  ? 'bg-primary text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Desktop"
            >
              <Icon name="monitor" size={18} />
            </button>
            <button
              onClick={() => setViewMode('tablet')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'tablet'
                  ? 'bg-primary text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Tablet"
            >
              <Icon name="tablet" size={18} />
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'mobile'
                  ? 'bg-primary text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mobile"
            >
              <Icon name="smartphone" size={18} />
            </button>
          </div>

          {/* Status Badge */}
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              page.status === 'PUBLISHED'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            }`}
          >
            {page.status}
          </span>

          {/* Edit Button */}
          <Link
            href={`/admin/frontend/${pageId}`}
            className="px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Edit Page
          </Link>
        </div>
      </header>

      {/* Preview Content */}
      <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
        <div
          className="bg-[#0a0a0a] shadow-2xl transition-all duration-300 overflow-auto"
          style={{
            width: viewportWidths[viewMode],
            maxWidth: '100%',
            minHeight: viewMode === 'desktop' ? 'auto' : '667px',
            borderRadius: viewMode !== 'desktop' ? '20px' : '0',
            border: viewMode !== 'desktop' ? '8px solid #2a2a2a' : 'none',
          }}
        >
          <PageRenderer page={page} />
        </div>
      </div>
    </div>
  )
}
