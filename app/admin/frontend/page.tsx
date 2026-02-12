'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { pagesApi, Page } from '@/lib/cms/api'
import { useTimezone } from '@/hooks/use-timezone'
import { formatDateShort } from '@/lib/date-utils'

type TabType = 'all' | 'published' | 'draft' | 'archived'

const SYSTEM_PAGES = [
  { id: 'home', name: 'Home Page', path: '/', sections: ['Hero Slider'], icon: 'home' as const },
]

export default function PageBuilderPage() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const loadPages = useCallback(async () => {
    setLoading(true)
    try {
      const status = activeTab === 'all' ? undefined : activeTab.toUpperCase()
      const result = await pagesApi.list({ status })
      if (result.success && result.data) {
        setPages(result.data)
      }
    } catch (error) {
      console.error('Failed to load pages:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    loadPages()
  }, [loadPages])

  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'all', label: 'All Pages', count: pages.length },
    { id: 'published', label: 'Published', count: pages.filter(p => p.status === 'PUBLISHED').length },
    { id: 'draft', label: 'Drafts', count: pages.filter(p => p.status === 'DRAFT').length },
    { id: 'archived', label: 'Archived', count: pages.filter(p => p.status === 'ARCHIVED').length },
  ]

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this page?')) return

    try {
      await pagesApi.delete(id)
      loadPages()
    } catch (error) {
      console.error('Failed to delete page:', error)
    }
  }

  async function handlePublish(id: string) {
    try {
      await pagesApi.publish(id)
      loadPages()
    } catch (error) {
      console.error('Failed to publish page:', error)
    }
  }

  async function handleUnpublish(id: string) {
    try {
      await pagesApi.unpublish(id)
      loadPages()
    } catch (error) {
      console.error('Failed to unpublish page:', error)
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const result = await pagesApi.duplicate(id)
      if (result.success) {
        loadPages()
      }
    } catch (error) {
      console.error('Failed to duplicate page:', error)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Published
          </span>
        )
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            Draft
          </span>
        )
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Archived
          </span>
        )
      default:
        return null
    }
  }

  const tz = useTimezone()

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Page Builder</h1>
          <p className="text-slate-500 text-xs sm:text-sm">Create and manage dynamic pages for your website</p>
        </div>
        <Link
          href="/admin/frontend/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-black rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Icon name="add" size={18} />
          New Page
        </Link>
      </div>

      {/* System Pages */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">System Pages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SYSTEM_PAGES.map((sp) => (
            <div key={sp.id} className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name={sp.icon} size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium text-sm">{sp.name}</h3>
                  <p className="text-slate-500 text-xs mt-0.5">{sp.path}</p>
                  <p className="text-slate-500 text-xs mt-1">{sp.sections.length} editable {sp.sections.length === 1 ? 'section' : 'sections'}</p>
                </div>
              </div>
              <Link
                href={`/admin/frontend/system/${sp.id}`}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-slate-300 rounded-lg text-xs font-medium hover:bg-[#222] hover:text-white transition-colors"
              >
                <Icon name="edit" size={14} />
                Edit Sections
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Pages */}
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Custom Pages</h2>

      {/* Tabs and Search */}
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-b border-[#1f1f1f]">
          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-black'
                    : 'bg-[#1a1a1a] text-slate-400 hover:text-white hover:bg-[#222]'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                    activeTab === tab.id ? 'bg-black/20' : 'bg-white/10'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {/* Pages List */}
        <div className="divide-y divide-[#1f1f1f]">
          {loading ? (
            <div className="p-12 text-center">
              <Icon name="loading" size={32} className="text-primary animate-spin mx-auto mb-3" />
              <p className="text-slate-500">Loading pages...</p>
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#1a1a1a] rounded-xl flex items-center justify-center">
                <Icon name="file" size={32} className="text-slate-600" />
              </div>
              <h3 className="text-white font-medium mb-2">No pages found</h3>
              <p className="text-slate-500 text-sm mb-4">
                {searchQuery ? 'Try a different search term' : 'Get started by creating your first page'}
              </p>
              {!searchQuery && (
                <Link
                  href="/admin/frontend/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  <Icon name="add" size={18} />
                  Create Page
                </Link>
              )}
            </div>
          ) : (
            filteredPages.map((page) => (
              <div
                key={page.id}
                className="p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Page Icon */}
                  <div className="w-12 h-12 bg-[#1a1a1a] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="file" size={24} className="text-slate-400" />
                  </div>

                  {/* Page Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Link
                        href={`/admin/frontend/${page.id}`}
                        className="text-white font-medium hover:text-primary transition-colors truncate"
                      >
                        {page.title}
                      </Link>
                      {getStatusBadge(page.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Icon name="link" size={14} />
                        /{page.slug}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="layers" size={14} />
                        {page.content?.length || 0} sections
                      </span>
                      <span className="hidden sm:flex items-center gap-1">
                        <Icon name="calendar" size={14} />
                        {formatDateShort(page.updatedAt, tz)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {page.status === 'PUBLISHED' ? (
                      <button
                        onClick={() => handleUnpublish(page.id)}
                        className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                        title="Unpublish"
                      >
                        <Icon name="visibility-off" size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePublish(page.id)}
                        className="p-2 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                        title="Publish"
                      >
                        <Icon name="check" size={18} />
                      </button>
                    )}
                    <Link
                      href={`/admin/frontend/${page.id}`}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Icon name="edit" size={18} />
                    </Link>
                    <a
                      href={`/p/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      title="Preview"
                    >
                      <Icon name="external-link" size={18} />
                    </a>
                    <button
                      onClick={() => handleDuplicate(page.id)}
                      className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors"
                      title="Duplicate"
                    >
                      <Icon name="copy" size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(page.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Icon name="delete" size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="file" size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-white text-xl font-bold">{pages.length}</p>
              <p className="text-slate-500 text-xs">Total Pages</p>
            </div>
          </div>
        </div>
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Icon name="check-circle" size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-white text-xl font-bold">{pages.filter(p => p.status === 'PUBLISHED').length}</p>
              <p className="text-slate-500 text-xs">Published</p>
            </div>
          </div>
        </div>
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <Icon name="edit" size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-white text-xl font-bold">{pages.filter(p => p.status === 'DRAFT').length}</p>
              <p className="text-slate-500 text-xs">Drafts</p>
            </div>
          </div>
        </div>
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Icon name="layers" size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-white text-xl font-bold">
                {pages.reduce((acc, p) => acc + (p.content?.length || 0), 0)}
              </p>
              <p className="text-slate-500 text-xs">Total Sections</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
