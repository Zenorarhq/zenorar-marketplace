'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import BlogEditor from './BlogEditor'
import MediaPickerModal from './MediaPickerModal'
import Icon from '@/components/ui/Icon'
import { blogApi, BlogCategory, BlogTag } from '@/lib/api/blog'
import { MediaFile } from '@/lib/api/media'

interface BlogPostFormProps {
  postId?: string
}

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function BlogPostForm({ postId }: BlogPostFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEditing = !!postId

  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [coverImageAlt, setCoverImageAlt] = useState('')
  const [ogImageUrl, setOgImageUrl] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'SCHEDULED'>('DRAFT')
  const [publishedAt, setPublishedAt] = useState('')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [showCoverPicker, setShowCoverPicker] = useState(false)
  const [showOgPicker, setShowOgPicker] = useState(false)
  const [showSeo, setShowSeo] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch existing post data
  const { data: postData } = useQuery({
    queryKey: ['admin-blog-post', postId],
    queryFn: () => blogApi.admin.getById(postId!),
    enabled: isEditing,
  })

  // Fetch categories and tags
  const { data: categoriesData } = useQuery({
    queryKey: ['admin-blog-categories'],
    queryFn: () => blogApi.admin.listCategories(),
  })
  const { data: tagsData } = useQuery({
    queryKey: ['admin-blog-tags'],
    queryFn: () => blogApi.admin.listTags(),
  })

  const categories = categoriesData?.data || []
  const tags = tagsData?.data || []

  // Populate form when editing
  useEffect(() => {
    if (postData?.data) {
      const p = postData.data
      setTitle(p.title)
      setSlug(p.slug)
      setSlugManuallyEdited(true)
      setContent(p.content || '')
      setExcerpt(p.excerpt || '')
      setCoverImageUrl(p.cover_image_url || '')
      setCoverImageAlt(p.cover_image_alt || '')
      setOgImageUrl(p.og_image_url || '')
      setSeoTitle(p.seo_title || '')
      setSeoDescription(p.seo_description || '')
      setStatus(p.status)
      setPublishedAt(p.published_at ? new Date(p.published_at).toISOString().slice(0, 16) : '')
      setSelectedCategoryIds((p.categories || []).map((c: BlogCategory) => c.id))
      setSelectedTagIds((p.tags || []).map((t: BlogTag) => t.id))
    }
  }, [postData])

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(slugify(title))
    }
  }, [title, slugManuallyEdited])

  // Create category
  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => blogApi.admin.createCategory(name),
    onSuccess: (res) => {
      if (res.data) {
        setSelectedCategoryIds(prev => [...prev, res.data!.id])
        setNewCategoryName('')
        queryClient.invalidateQueries({ queryKey: ['admin-blog-categories'] })
      }
    },
  })

  // Create tag
  const createTagMutation = useMutation({
    mutationFn: (name: string) => blogApi.admin.createTag(name),
    onSuccess: (res) => {
      if (res.data) {
        setSelectedTagIds(prev => [...prev, res.data!.id])
        setNewTagName('')
        queryClient.invalidateQueries({ queryKey: ['admin-blog-tags'] })
      }
    },
  })

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      alert('Title is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title,
        slug,
        content,
        excerpt,
        cover_image_url: coverImageUrl || null,
        cover_image_alt: coverImageAlt || null,
        og_image_url: ogImageUrl || null,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        status,
        published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
        category_ids: selectedCategoryIds,
        tag_ids: selectedTagIds,
      }

      if (isEditing) {
        await blogApi.admin.update(postId, payload)
      } else {
        await blogApi.admin.create(payload)
      }

      queryClient.invalidateQueries({ queryKey: ['admin-blog'] })
      router.push('/admin/blog')
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save post')
    } finally {
      setSaving(false)
    }
  }, [title, slug, content, excerpt, coverImageUrl, coverImageAlt, ogImageUrl, seoTitle, seoDescription, status, publishedAt, selectedCategoryIds, selectedTagIds, isEditing, postId, router, queryClient])

  const handleCoverSelect = (file: MediaFile) => {
    setCoverImageUrl(file.url)
    setCoverImageAlt(file.alt || file.name)
    setShowCoverPicker(false)
  }

  const handleOgSelect = (file: MediaFile) => {
    setOgImageUrl(file.url)
    setShowOgPicker(false)
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin/blog')} className="text-slate-400 hover:text-white">
              <Icon name="arrow-left" size={20} />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">
                {isEditing ? 'Edit Post' : 'New Post'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/admin/blog')}
              className="px-4 py-2 text-slate-400 hover:text-white text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content — left 2/3 */}
          <div className="lg:col-span-2 space-y-4">
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {/* Slug */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">/blog/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => { setSlug(slugify(e.target.value)); setSlugManuallyEdited(true) }}
                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-slate-300 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Content editor */}
            <BlogEditor content={content} onChange={setContent} />

            {/* Excerpt */}
            <div>
              <label className="block text-slate-400 text-sm mb-1">Excerpt</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Short summary for listing cards and SEO fallback..."
                rows={3}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Sidebar — right 1/3 */}
          <div className="space-y-4">
            {/* Status & Publish */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
              <h3 className="text-white text-sm font-medium">Publish</h3>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="SCHEDULED">Scheduled</option>
              </select>

              {status === 'SCHEDULED' && (
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Publish Date</label>
                  <input
                    type="datetime-local"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            {/* Cover Image */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
              <h3 className="text-white text-sm font-medium">Cover Image</h3>
              {coverImageUrl ? (
                <div className="relative">
                  <img src={coverImageUrl} alt={coverImageAlt} className="w-full h-40 object-cover rounded-lg" />
                  <button
                    onClick={() => { setCoverImageUrl(''); setCoverImageAlt('') }}
                    className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCoverPicker(true)}
                  className="w-full h-32 border-2 border-dashed border-[#2a2a2a] rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-white hover:border-primary/50 transition-colors"
                >
                  <Icon name="image-01" size={24} />
                  <span className="text-xs">Select cover image</span>
                </button>
              )}
              {coverImageUrl && (
                <>
                  <input
                    type="text"
                    value={coverImageAlt}
                    onChange={(e) => setCoverImageAlt(e.target.value)}
                    placeholder="Alt text for SEO"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => setShowCoverPicker(true)}
                    className="text-primary text-xs hover:underline"
                  >
                    Change image
                  </button>
                </>
              )}
            </div>

            {/* Categories */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
              <h3 className="text-white text-sm font-medium">Categories</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {categories.map((cat: BlogCategory) => (
                  <label key={cat.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(cat.id)}
                      onChange={(e) => {
                        setSelectedCategoryIds(prev =>
                          e.target.checked ? [...prev, cat.id] : prev.filter(id => id !== cat.id)
                        )
                      }}
                      className="rounded border-[#2a2a2a] bg-[#1a1a1a] text-primary focus:ring-primary"
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category"
                  onKeyDown={(e) => { if (e.key === 'Enter' && newCategoryName.trim()) { e.preventDefault(); createCategoryMutation.mutate(newCategoryName.trim()) } }}
                  className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white px-2 py-1 rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => newCategoryName.trim() && createCategoryMutation.mutate(newCategoryName.trim())}
                  className="px-2 py-1 bg-primary/20 text-primary rounded text-xs hover:bg-primary/30"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 space-y-3">
              <h3 className="text-white text-sm font-medium">Tags</h3>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag: BlogTag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      setSelectedTagIds(prev =>
                        prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                      )
                    }}
                    className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                      selectedTagIds.includes(tag.id)
                        ? 'bg-primary/20 text-primary'
                        : 'bg-[#1a1a1a] text-slate-400 hover:text-white'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="New tag"
                  onKeyDown={(e) => { if (e.key === 'Enter' && newTagName.trim()) { e.preventDefault(); createTagMutation.mutate(newTagName.trim()) } }}
                  className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white px-2 py-1 rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => newTagName.trim() && createTagMutation.mutate(newTagName.trim())}
                  className="px-2 py-1 bg-primary/20 text-primary rounded text-xs hover:bg-primary/30"
                >
                  Add
                </button>
              </div>
            </div>

            {/* SEO Section */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
              <button
                onClick={() => setShowSeo(!showSeo)}
                className="w-full flex items-center justify-between p-4 text-white text-sm font-medium hover:bg-white/5"
              >
                <span>SEO Settings</span>
                <Icon name={showSeo ? 'arrow-up' : 'arrow-down'} size={16} />
              </button>
              {showSeo && (
                <div className="px-4 pb-4 space-y-3 border-t border-[#1f1f1f]">
                  <div>
                    <div className="flex justify-between">
                      <label className="text-slate-400 text-xs">SEO Title</label>
                      <span className="text-slate-500 text-xs">{(seoTitle || title).length}/60</span>
                    </div>
                    <input
                      type="text"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder={title || 'Custom SEO title...'}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-1.5 rounded-lg text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <label className="text-slate-400 text-xs">Meta Description</label>
                      <span className="text-slate-500 text-xs">{(seoDescription || excerpt).length}/160</span>
                    </div>
                    <textarea
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder={excerpt || 'Custom meta description...'}
                      rows={3}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-1.5 rounded-lg text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">OG Image</label>
                    {ogImageUrl ? (
                      <div className="relative">
                        <img src={ogImageUrl} alt="OG" className="w-full h-24 object-cover rounded-lg" />
                        <button onClick={() => setOgImageUrl('')} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white">
                          <Icon name="close" size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowOgPicker(true)}
                        className="w-full py-2 border border-dashed border-[#2a2a2a] rounded-lg text-slate-400 text-xs hover:text-white"
                      >
                        Select OG image (falls back to cover)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Media pickers */}
      <MediaPickerModal isOpen={showCoverPicker} onClose={() => setShowCoverPicker(false)} onSelect={handleCoverSelect} allowedTypes={['image']} title="Select Cover Image" />
      <MediaPickerModal isOpen={showOgPicker} onClose={() => setShowOgPicker(false)} onSelect={handleOgSelect} allowedTypes={['image']} title="Select OG Image" />
    </AdminLayout>
  )
}
