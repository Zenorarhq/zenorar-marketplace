'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import MediaPickerModal from '@/components/admin/MediaPickerModal'
import { productsApi } from '@/lib/api/products'
import { categoriesApi, Category } from '@/lib/api/categories'
import { apiFetch } from '@/lib/api/client'

export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showMediaPicker, setShowMediaPicker] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    shortDescription: '',
    price: '',
    comparePrice: '',
    costPrice: '',
    extendedPrice: '',
    proPrice: '',
    categoryId: '',
    status: 'DRAFT' as 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
    isDigital: true,
    isFeatured: false,
    isStaffPick: false,
    imageUrl: '',
    videoUrl: '',
    tags: '',
    demoUrl: '',
    demoInfo: '',
    features: [] as { icon: string; title: string; description: string }[],
    specs: [] as { label: string; value: string }[],
  })

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    const result = await categoriesApi.list()
    if (result.success && result.data) {
      setCategories(result.data)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  function generateSlug(name: string) {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate required fields
      if (!formData.name || !formData.name.trim()) {
        setError('Product name is required')
        setLoading(false)
        return
      }

      if (!formData.price || parseFloat(formData.price) <= 0) {
        setError('Valid price is required')
        setLoading(false)
        return
      }

      const productData = {
        name: formData.name.trim(),
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description && formData.description.trim() ? formData.description.trim() : undefined,
        shortDescription: formData.shortDescription && formData.shortDescription.trim() ? formData.shortDescription.trim() : undefined,
        price: parseFloat(formData.price),
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : undefined,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
        extendedPrice: formData.extendedPrice ? parseFloat(formData.extendedPrice) : undefined,
        proPrice: formData.proPrice ? parseFloat(formData.proPrice) : undefined,
        categoryId: formData.categoryId || undefined,
        status: formData.status,
        isDigital: formData.isDigital,
        isFeatured: formData.isFeatured,
        tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        demoUrl: formData.demoUrl.trim() || null,
        demoInfo: formData.demoInfo.trim() || null,
        features: formData.features.length > 0 ? formData.features : null,
        specs: formData.specs.length > 0 ? formData.specs : null,
      }

      const result = await productsApi.create(productData)

      if (result.success && result.data) {
        // Add image if provided
        if (formData.imageUrl && formData.imageUrl.trim()) {
          await productsApi.addImage(result.data.id, {
            url: formData.imageUrl,
            isPrimary: true,
          })
        }

        // Save video URL if provided
        if (formData.videoUrl && formData.videoUrl.trim()) {
          await fetch(`/api/products/${result.data.id}/video`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: formData.videoUrl.trim() }),
          }).catch(() => {})
        }

        // Set staff pick if checked
        if (formData.isStaffPick) {
          await apiFetch(`/products/${result.data.id}/staff-pick`, {
            method: 'PATCH',
            body: JSON.stringify({ value: true }),
          }).catch(() => {})
        }

        router.push('/admin/products')
      } else {
        const errorMsg = result.error || 'Failed to create product'
        console.error('Product creation failed:', errorMsg)
        setError(errorMsg)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred while creating the product'
      console.error('Product creation error:', err)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Icon name="arrow-left" size={20} className="text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Add New Product</h1>
            <p className="text-slate-400 text-sm">Create a new product for your marketplace</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleNameChange}
                  required
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ultimate CRM Script Pro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  URL Slug
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="ultimate-crm-script-pro"
                />
                <p className="text-xs text-slate-500 mt-1">Auto-generated from product name</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Short Description
                </label>
                <input
                  type="text"
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Brief one-line description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Detailed product description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Python, Automation, Bot (comma-separated)"
                />
                <p className="text-xs text-slate-500 mt-1">Comma-separated tags for filtering (e.g. programming languages, tools)</p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Pricing</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Price * ($)
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="49.99"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Compare at Price ($)
                </label>
                <input
                  type="number"
                  name="comparePrice"
                  value={formData.comparePrice}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="99.99"
                />
                <p className="text-xs text-slate-500 mt-1">Original price (for discounts)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Cost Price ($)
                </label>
                <input
                  type="number"
                  name="costPrice"
                  value={formData.costPrice}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="25.00"
                />
                <p className="text-xs text-slate-500 mt-1">Your cost (for profit tracking)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Extended License Price ($)
                </label>
                <input
                  type="number"
                  name="extendedPrice"
                  value={formData.extendedPrice}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-slate-500 mt-1">Leave empty to hide the license selector on the product page</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Pro License Price ($)
                </label>
                <input
                  type="number"
                  name="proPrice"
                  value={formData.proPrice}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-slate-500 mt-1">Leave empty to hide pro option on product page</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Category
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Product Image */}
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Product Image</h2>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Product Image
              </label>

              {formData.imageUrl ? (
                <div className="space-y-3">
                  <div className="relative w-48 h-48 rounded-lg border-2 border-[#2a2a2a] overflow-hidden group">
                    <img
                      src={formData.imageUrl}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowMediaPicker(true)}
                        className="p-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker(true)}
                    className="text-primary text-sm hover:underline"
                  >
                    Change Image
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="w-full border-2 border-dashed border-[#2a2a2a] rounded-lg p-8 hover:border-primary/50 transition-colors"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                      <Icon name="image" size={24} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Select from Library</p>
                      <p className="text-slate-500 text-sm">or upload a new image</p>
                    </div>
                  </div>
                </button>
              )}
              <p className="text-xs text-slate-500 mt-2">Recommended: 800x800px or larger</p>
            </div>
          </div>

          {/* Product Video */}
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Product Video</h2>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Video URL
              </label>
              <input
                type="text"
                name="videoUrl"
                value={formData.videoUrl}
                onChange={handleChange}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="https://youtube.com/watch?v=... or direct MP4 URL"
              />
              <p className="text-xs text-slate-500 mt-1">YouTube, Vimeo, or direct video URL (MP4). Leave empty if no video.</p>
            </div>
          </div>

          {/* Demo & Overview */}
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Demo & Overview</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Demo URL</label>
                <input type="text" name="demoUrl" value={formData.demoUrl} onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://demo.example.com" />
                <p className="text-xs text-slate-500 mt-1">Link for the demo button on the product page</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Demo Information</label>
                <textarea name="demoInfo" value={formData.demoInfo} onChange={handleChange} rows={3}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Description shown above the demo button..." />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-300">Key Features</label>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, features: [...prev.features, { icon: 'star', title: '', description: '' }] }))}
                    className="text-primary text-xs font-medium hover:underline">+ Add Feature</button>
                </div>
                {formData.features.map((f, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-start">
                    <input type="text" value={f.icon} placeholder="Icon"
                      onChange={(e) => { const updated = [...formData.features]; updated[i] = { ...f, icon: e.target.value }; setFormData(prev => ({ ...prev, features: updated })) }}
                      className="w-24 bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm" />
                    <input type="text" value={f.title} placeholder="Title"
                      onChange={(e) => { const updated = [...formData.features]; updated[i] = { ...f, title: e.target.value }; setFormData(prev => ({ ...prev, features: updated })) }}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm" />
                    <input type="text" value={f.description} placeholder="Description"
                      onChange={(e) => { const updated = [...formData.features]; updated[i] = { ...f, description: e.target.value }; setFormData(prev => ({ ...prev, features: updated })) }}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm" />
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, features: prev.features.filter((_, j) => j !== i) }))}
                      className="p-2 text-red-400 hover:text-red-300 text-sm">X</button>
                  </div>
                ))}
                {formData.features.length === 0 && <p className="text-xs text-slate-500">No features added yet.</p>}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-300">Technical Specs</label>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, specs: [...prev.specs, { label: '', value: '' }] }))}
                    className="text-primary text-xs font-medium hover:underline">+ Add Spec</button>
                </div>
                {formData.specs.map((s, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-start">
                    <input type="text" value={s.label} placeholder="Label (e.g. Language)"
                      onChange={(e) => { const updated = [...formData.specs]; updated[i] = { ...s, label: e.target.value }; setFormData(prev => ({ ...prev, specs: updated })) }}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm" />
                    <input type="text" value={s.value} placeholder="Value (e.g. Python 3.10+)"
                      onChange={(e) => { const updated = [...formData.specs]; updated[i] = { ...s, value: e.target.value }; setFormData(prev => ({ ...prev, specs: updated })) }}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm" />
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, specs: prev.specs.filter((_, j) => j !== i) }))}
                      className="p-2 text-red-400 hover:text-red-300 text-sm">X</button>
                  </div>
                ))}
                {formData.specs.length === 0 && <p className="text-xs text-slate-500">No specs added yet.</p>}
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Product Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDigital"
                  name="isDigital"
                  checked={formData.isDigital}
                  onChange={handleChange}
                  className="w-4 h-4 bg-[#1a1a1a] border-[#2a2a2a] rounded focus:ring-primary"
                />
                <label htmlFor="isDigital" className="text-sm text-slate-300">
                  Digital Product (no shipping required)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFeatured"
                  name="isFeatured"
                  checked={formData.isFeatured}
                  onChange={handleChange}
                  className="w-4 h-4 bg-[#1a1a1a] border-[#2a2a2a] rounded focus:ring-primary"
                />
                <label htmlFor="isFeatured" className="text-sm text-slate-300">
                  Featured Product (show on homepage)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isStaffPick"
                  name="isStaffPick"
                  checked={formData.isStaffPick}
                  onChange={handleChange}
                  className="w-4 h-4 bg-[#1a1a1a] border-[#2a2a2a] rounded focus:ring-primary"
                />
                <label htmlFor="isStaffPick" className="text-sm text-slate-300">
                  Staff Pick (show in Staff Picks section)
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Icon name="add" size={16} />
                  Create Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(file) => {
          setFormData(prev => ({ ...prev, imageUrl: file.url }))
          setShowMediaPicker(false)
        }}
        allowedTypes={['image']}
        title="Select Product Image"
      />
    </AdminLayout>
  )
}
