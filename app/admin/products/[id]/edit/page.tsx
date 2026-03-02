'use client'

import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { productsApi, Product } from '@/lib/api/products'
import { categoriesApi, Category } from '@/lib/api/categories'
import MediaPickerModal from '@/components/admin/MediaPickerModal'
import { apiFetch } from '@/lib/api/client'
import { downloadsApi, ProductFile } from '@/lib/api/downloads'

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [product, setProduct] = useState<Product | null>(null)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [addingImage, setAddingImage] = useState(false)
  // File management state
  const [productFiles, setProductFiles] = useState<ProductFile[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [fileVersion, setFileVersion] = useState('1.0.0')
  const [fileIsLatest, setFileIsLatest] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)

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
    stock: '',
    lowStockThreshold: '',
    categoryId: '',
    status: 'DRAFT' as 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
    isDigital: true,
    isFeatured: false,
    isStaffPick: false,
    licenseGate: true,
    videoUrl: '',
    tags: '',
    demoUrl: '',
    demoInfo: '',
    features: [] as { icon: string; title: string; description: string }[],
    specs: [] as { label: string; value: string }[],
  })

  useEffect(() => {
    // Load product files
    downloadsApi.adminListFiles(productId).then(res => {
      if (res.success && res.data) setProductFiles(res.data)
    })
    loadData()
  }, [productId])

  async function loadData() {
    setLoading(true)
    const [productResult, categoriesResult] = await Promise.all([
      productsApi.getById(productId),
      categoriesApi.list(),
    ])

    if (categoriesResult.success && categoriesResult.data) {
      setCategories(categoriesResult.data)
    }

    // Fetch staff pick status and video URL
    let isStaffPick = false
    let videoUrl = ''
    try {
      const spData = await apiFetch(`/products/${productId}/staff-pick`)
      if (spData.success) isStaffPick = (spData.data as any)?.isStaffPick ?? false
    } catch {}
    try {
      const videoRes = await fetch(`/api/products/${productId}/video`)
      const videoData = await videoRes.json()
      if (videoData.success && videoData.data?.videoUrl) videoUrl = videoData.data.videoUrl
    } catch {}

    if (productResult.success && productResult.data) {
      const p = productResult.data
      setProduct(p)
      setFormData({
        name: p.name,
        slug: p.slug,
        description: p.description || '',
        shortDescription: p.shortDescription || '',
        price: p.price.toString(),
        comparePrice: p.comparePrice?.toString() || '',
        costPrice: p.costPrice?.toString() || '',
        extendedPrice: (p as any).extendedPrice?.toString() || '',
        proPrice: (p as any).proPrice?.toString() || '',
        stock: p.stock.toString(),
        lowStockThreshold: p.lowStockThreshold.toString(),
        categoryId: p.categoryId || '',
        status: p.status,
        isDigital: p.isDigital,
        isFeatured: p.isFeatured,
        isStaffPick,
        licenseGate: (p as any).licenseGate !== false,
        videoUrl,
        tags: (p as any).tags?.join(', ') || '',
        demoUrl: (p as any).demoUrl || '',
        demoInfo: (p as any).demoInfo || '',
        features: (p as any).features || [],
        specs: (p as any).specs || [],
      })
    } else {
      setError(productResult.error || 'Product not found')
    }

    setLoading(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  async function handleAddImage(imageUrl: string) {
    setAddingImage(true)
    const result = await productsApi.addImage(productId, {
      url: imageUrl,
      isPrimary: product?.images?.length === 0,
    })

    if (result.success) {
      await loadData() // Reload product to show new image
    } else {
      setError(result.error || 'Failed to add image')
    }
    setAddingImage(false)
  }

  async function handleDeleteImage(imageId: string) {
    if (!confirm('Are you sure you want to delete this image?')) return

    const result = await productsApi.deleteImage(productId, imageId)
    if (result.success) {
      await loadData() // Reload product
    } else {
      alert(result.error || 'Failed to delete image')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const productData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        shortDescription: formData.shortDescription || null,
        price: parseFloat(formData.price),
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        extendedPrice: formData.extendedPrice ? parseFloat(formData.extendedPrice) : null,
        proPrice: formData.proPrice ? parseFloat(formData.proPrice) : null,
        stock: parseInt(formData.stock) || 0,
        lowStockThreshold: parseInt(formData.lowStockThreshold) || 10,
        categoryId: formData.categoryId || null,
        status: formData.status,
        isDigital: formData.isDigital,
        isFeatured: formData.isFeatured,
        licenseGate: formData.licenseGate,
        tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        demoUrl: formData.demoUrl.trim() || null,
        demoInfo: formData.demoInfo.trim() || null,
        features: formData.features.length > 0 ? formData.features : null,
        specs: formData.specs.length > 0 ? formData.specs : null,
      }

      const result = await productsApi.update(productId, productData)

      if (result.success) {
        // Save staff pick status via Railway
        await apiFetch(`/products/${productId}/staff-pick`, {
          method: 'PATCH',
          body: JSON.stringify({ value: formData.isStaffPick }),
        }).catch(() => {})
        // Save video URL
        await fetch(`/api/products/${productId}/video`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: formData.videoUrl.trim() || null }),
        }).catch(() => {})
        router.push('/admin/products')
      } else {
        setError(result.error || 'Failed to update product')
      }
    } catch (err) {
      setError('An error occurred while updating the product')
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return
    setUploadingFile(true)
    const form = new FormData()
    form.append('file', selectedFile)
    form.append('version', fileVersion)
    form.append('isLatest', String(fileIsLatest))
    const res = await downloadsApi.adminUpload(productId, form)
    setUploadingFile(false)
    if (res.success && res.data) {
      setProductFiles(prev => fileIsLatest
        ? [res.data!, ...prev.map(f => ({ ...f, is_latest: false }))]
        : [...prev, res.data!]
      )
      setSelectedFile(null)
      setFileVersion('1.0.0')
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Permanently delete this file from storage?')) return
    setDeletingFileId(fileId)
    const res = await downloadsApi.adminDeleteFile(productId, fileId)
    if (res.success) {
      setProductFiles(prev => prev.filter(f => f.id !== fileId))
    } else {
      alert(res.error || 'Failed to delete file')
    }
    setDeletingFileId(null)
  }

  const handleSetLatest = async (fileId: string) => {
    await downloadsApi.adminSetLatest(productId, fileId)
    setProductFiles(prev => prev.map(f => ({ ...f, is_latest: f.id === fileId })))
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-400">Loading product...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error && !product) {
    return (
      <AdminLayout>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <Icon name="alert" size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-lg font-semibold mb-2">Error Loading Product</p>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-primary hover:bg-primary/90 text-black font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </AdminLayout>
    )
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
            <h1 className="text-2xl font-bold text-white">Edit Product</h1>
            <p className="text-slate-400 text-sm">Update product information</p>
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
                  onChange={handleChange}
                  required
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                />
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

          {/* Pricing & Inventory */}
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Pricing & Inventory</h2>

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
                />
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
                />
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
                  Stock Quantity
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  min="0"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Low Stock Alert
                </label>
                <input
                  type="number"
                  name="lowStockThreshold"
                  value={formData.lowStockThreshold}
                  onChange={handleChange}
                  min="0"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
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

          {/* Product Images */}
          {product && (
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Product Images</h2>
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  disabled={addingImage}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  <Icon name="add" size={16} />
                  Add Image
                </button>
              </div>

              {product.images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {product.images.map(img => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.url}
                        alt={img.alt || product.name}
                        className="w-full h-32 object-cover rounded-lg border border-[#2a2a2a]"
                      />
                      {img.isPrimary && (
                        <span className="absolute top-2 left-2 bg-primary text-black text-xs px-2 py-1 rounded">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Icon name="delete" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-3 bg-[#1a1a1a] rounded-xl flex items-center justify-center">
                    <Icon name="image" size={32} className="text-slate-600" />
                  </div>
                  <p className="text-slate-400 text-sm mb-3">No images added yet</p>
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker(true)}
                    className="text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    Add your first image
                  </button>
                </div>
              )}
            </div>
          )}

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
                  Digital Product
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
                  Featured Product
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

              <div className="flex items-start gap-2 pt-2 border-t border-[#2a2a2a]">
                <input
                  type="checkbox"
                  id="licenseGate"
                  name="licenseGate"
                  checked={formData.licenseGate}
                  onChange={handleChange}
                  className="w-4 h-4 mt-0.5 bg-[#1a1a1a] border-[#2a2a2a] rounded focus:ring-primary"
                />
                <div>
                  <label htmlFor="licenseGate" className="text-sm text-slate-300 font-medium cursor-pointer">
                    License Gate Protection
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Inject a forced license activation page into uploaded scripts. Buyers must enter their license key before the script works.
                  </p>
                </div>
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
              disabled={saving}
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Icon name="save" size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>

          {/* Downloadable Files */}
          <div className="bg-[#111] rounded-xl border border-[#2a2a2a] p-6">
            <h2 className="text-lg font-semibold text-white mb-1">Downloadable Files</h2>
            <p className="text-slate-500 text-sm mb-5">Upload script files to Cloudflare R2 secure storage. Buyers receive time-limited download links.</p>

            {/* Upload area */}
            <div className="border border-dashed border-[#2a2a2a] rounded-lg p-5 mb-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-medium text-slate-300">Select File</label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-medium hover:file:bg-primary/20"
                  />
                  {selectedFile && <p className="text-xs text-slate-500">{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-300">Version</label>
                  <input
                    type="text"
                    value={fileVersion}
                    onChange={(e) => setFileVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="w-28 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <input
                    id="isLatest"
                    type="checkbox"
                    checked={fileIsLatest}
                    onChange={(e) => setFileIsLatest(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <label htmlFor="isLatest" className="text-sm text-slate-300">Mark as latest</label>
                </div>
                <button
                  type="button"
                  onClick={handleFileUpload}
                  disabled={!selectedFile || uploadingFile}
                  className="bg-primary hover:bg-primary/90 disabled:opacity-40 text-black text-sm font-semibold px-5 py-2 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <Icon name={uploadingFile ? 'loader' : 'upload'} size={14} className={uploadingFile ? 'animate-spin' : ''} />
                  {uploadingFile ? 'Uploading...' : 'Upload to R2'}
                </button>
              </div>
            </div>

            {/* Files list */}
            {productFiles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2a2a2a] text-slate-500 text-left">
                      <th className="pb-2 font-medium">Filename</th>
                      <th className="pb-2 font-medium">Version</th>
                      <th className="pb-2 font-medium">Size</th>
                      <th className="pb-2 font-medium">Hash (SHA-256)</th>
                      <th className="pb-2 font-medium">Downloads</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Protection</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]">
                    {productFiles.map(file => (
                      <Fragment key={file.id}>
                      <tr className="py-2">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <Icon name="file" size={14} className="text-slate-400 shrink-0" />
                            <span className="text-white truncate max-w-[180px]" title={file.file_name}>{file.file_name}</span>
                            {file.isLegacy && <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-500/15 text-yellow-400">Legacy</span>}
                          </div>
                        </td>
                        <td className="py-2 pr-4 text-slate-300">{file.version || '—'}</td>
                        <td className="py-2 pr-4 text-slate-400">
                          {file.file_size ? (file.file_size / 1024 / 1024).toFixed(2) + ' MB' : '—'}
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs text-slate-500" title={file.file_hash || ''}>
                          {file.file_hash ? file.file_hash.slice(0, 16) + '…' : '—'}
                        </td>
                        <td className="py-2 pr-4 text-slate-400">{file.downloadCount ?? 0}</td>
                        <td className="py-2 pr-4">
                          {file.is_latest
                            ? <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/15 text-green-400">Latest</span>
                            : <span className="text-slate-600 text-xs">—</span>
                          }
                        </td>
                        <td className="py-2 pr-4">
                          {file.obfuscation_level
                            ? <button type="button" onClick={() => file.obfuscation_report && setExpandedReportId(expandedReportId === file.id ? null : file.id)} className={`px-2 py-0.5 rounded-full text-xs ${
                                file.obfuscation_level === 'HEAVY' ? 'bg-red-500/15 text-red-400' :
                                file.obfuscation_level === 'MEDIUM' ? 'bg-yellow-500/15 text-yellow-400' :
                                'bg-blue-500/15 text-blue-400'
                              } ${file.obfuscation_report ? 'cursor-pointer hover:opacity-80' : ''}`}>{file.obfuscation_level}</button>
                            : <span className="text-slate-600 text-xs">—</span>
                          }
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            {!file.is_latest && (
                              <button
                                type="button"
                                onClick={() => handleSetLatest(file.id)}
                                className="text-xs text-primary hover:underline"
                              >
                                Set latest
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteFile(file.id)}
                              disabled={deletingFileId === file.id}
                              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
                            >
                              {deletingFileId === file.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedReportId === file.id && file.obfuscation_report && (
                        <tr>
                          <td colSpan={8} className="py-2 px-4 bg-[#111]">
                            <div className="grid grid-cols-4 gap-4 text-xs">
                              <div><span className="text-slate-500">Total Files:</span> <span className="text-white">{file.obfuscation_report.totalFiles}</span></div>
                              <div><span className="text-slate-500">Obfuscated:</span> <span className="text-green-400">{file.obfuscation_report.obfuscatedFiles}</span></div>
                              <div><span className="text-slate-500">Skipped:</span> <span className="text-yellow-400">{file.obfuscation_report.skippedFiles}</span></div>
                              <div><span className="text-slate-500">Failed:</span> <span className="text-red-400">{file.obfuscation_report.failedFiles}</span></div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">No files uploaded yet</p>
            )}
          </div>
        </form>
      </div>

      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(file) => {
          handleAddImage(file.url)
          setShowMediaPicker(false)
        }}
        allowedTypes={['image']}
        title="Select Product Image"
      />
    </AdminLayout>
  )
}
