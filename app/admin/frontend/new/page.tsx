'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { pagesApi } from '@/lib/cms/api'

export default function NewPagePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
  })

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const title = e.target.value
    setFormData({
      ...formData,
      title,
      // Only auto-generate slug if user hasn't manually edited it
      slug: slugManuallyEdited ? formData.slug : generateSlug(title),
    })
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugManuallyEdited(true)
    setFormData({ ...formData, slug: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await pagesApi.create({
        title: formData.title,
        slug: formData.slug,
        description: formData.description || undefined,
        content: [],
      })

      if (result.success && result.data) {
        router.push(`/admin/frontend/${result.data.id}`)
      } else {
        setError(result.error || 'Failed to create page')
      }
    } catch (err) {
      setError('An error occurred while creating the page')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Create New Page</h1>
        <p className="text-slate-500 text-xs sm:text-sm">Enter the basic details for your new page</p>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
              <Icon name="alert-circle" size={20} className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Title */}
          <div className="mb-5">
            <label htmlFor="title" className="block text-sm font-medium text-white mb-2">
              Page Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={handleTitleChange}
              placeholder="e.g., About Us, Contact, Products"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Slug */}
          <div className="mb-5">
            <label htmlFor="slug" className="block text-sm font-medium text-white mb-2">
              URL Slug <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center">
              <span className="bg-[#0a0a0a] border border-[#2a2a2a] border-r-0 rounded-l-lg px-4 py-3 text-slate-500 text-sm">
                /p/
              </span>
              <input
                type="text"
                id="slug"
                required
                value={formData.slug}
                onChange={handleSlugChange}
                placeholder="page-url"
                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-r-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              This will be the URL path for your page. Use lowercase letters, numbers, and hyphens only.
            </p>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the page content..."
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 transition-colors resize-none"
            />
            <p className="mt-2 text-xs text-slate-500">
              This description is for internal reference and SEO purposes.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-[#1f1f1f]">
            <button
              type="submit"
              disabled={loading || !formData.title || !formData.slug}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Icon name="loading" size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Icon name="add" size={18} />
                  Create Page
                </>
              )}
            </button>
            <Link
              href="/admin/frontend"
              className="px-5 py-2.5 bg-[#1a1a1a] text-white rounded-lg font-medium text-sm hover:bg-[#222] transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <div className="flex gap-3">
            <Icon name="info-circle" size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-white font-medium text-sm mb-1">What&apos;s next?</h4>
              <p className="text-slate-400 text-sm">
                After creating the page, you&apos;ll be taken to the page editor where you can add sections,
                customize content, and preview your page before publishing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
