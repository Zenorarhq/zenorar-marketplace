'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { productsApi, Product } from '@/lib/api/products'
import { categoriesApi, Category } from '@/lib/api/categories'
import MediaPickerModal from '@/components/admin/MediaPickerModal'
import { apiFetch } from '@/lib/api/client'

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

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    shortDescription: '',
    price: '',
    comparePrice: '',
    costPrice: '',
    stock: '',
    lowStockThreshold: '',
    categoryId: '',
    status: 'DRAFT' as 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
    isDigital: true,
    isFeatured: false,
    isStaffPick: false,
  })

  useEffect(() => {
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

    // Fetch staff pick status from Railway
    let isStaffPick = false
    try {
      const spData = await apiFetch(`/products/${productId}/staff-pick`)
      if (spData.success) isStaffPick = (spData.data as any)?.isStaffPick ?? false
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
        stock: p.stock.toString(),
        lowStockThreshold: p.lowStockThreshold.toString(),
        categoryId: p.categoryId || '',
        status: p.status,
        isDigital: p.isDigital,
        isFeatured: p.isFeatured,
        isStaffPick,
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
        stock: parseInt(formData.stock) || 0,
        lowStockThreshold: parseInt(formData.lowStockThreshold) || 10,
        categoryId: formData.categoryId || null,
        status: formData.status,
        isDigital: formData.isDigital,
        isFeatured: formData.isFeatured,
      }

      const result = await productsApi.update(productId, productData)

      if (result.success) {
        // Save staff pick status via Railway
        await apiFetch(`/products/${productId}/staff-pick`, {
          method: 'PATCH',
          body: JSON.stringify({ value: formData.isStaffPick }),
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
