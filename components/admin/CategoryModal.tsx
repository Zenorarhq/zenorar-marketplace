'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import { categoriesApi, CategoryWithChildren } from '@/lib/api/categories'
import MediaPickerModal from './MediaPickerModal'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  category?: CategoryWithChildren | null
  onSuccess: () => void
}

const ICON_OPTIONS = [
  'home', 'cart', 'code', 'api', 'terminal', 'database', 'server', 'cloud',
  'shield', 'lock', 'key', 'globe', 'smartphone', 'laptop', 'bitcoin', 'wallet',
  'credit-card', 'chart', 'analytics', 'rocket', 'sparkles', 'flash', 'fire',
  'diamond', 'trophy', 'crown', 'star', 'heart', 'gift', 'tag', 'discount',
  'store', 'package', 'delivery', 'image', 'video', 'music', 'camera', 'mail',
  'message', 'call', 'location', 'map', 'compass', 'calendar', 'clock',
  'user-group', 'library', 'file', 'folder', 'bug', 'layers', 'airplane',
  'building', 'sim-card', 'wifi', 'headphones',
]

export default function CategoryModal({ isOpen, onClose, category, onSuccess }: CategoryModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [iconSearch, setIconSearch] = useState('')
  const [isMainCategory, setIsMainCategory] = useState(true)
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    icon: 'code',
  })

  // Fetch main categories for parent dropdown
  const { data: mainCategories = [] } = useQuery({
    queryKey: ['main-categories'],
    queryFn: async () => {
      const result = await categoriesApi.getMainCategories()
      return result.success && result.data ? result.data : []
    },
    enabled: isOpen,
  })

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        image: category.image || '',
        icon: category.icon || 'code',
      })
      // Set parent category state
      const hasParent = !!category.parentId
      setIsMainCategory(!hasParent)
      setParentCategoryId(hasParent ? category.parentId! : null)
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        image: '',
        icon: 'code',
      })
      setIsMainCategory(true)
      setParentCategoryId(null)
    }
    setError('')
    setShowIconPicker(false)
    setIconSearch('')
  }, [category, isOpen])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
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
        setError('Category name is required')
        setLoading(false)
        return
      }

      const categoryData = {
        name: formData.name.trim(),
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description && formData.description.trim() ? formData.description.trim() : undefined,
        image: formData.image && formData.image.trim() ? formData.image.trim() : undefined,
        icon: formData.icon || 'code',
        parentId: isMainCategory ? null : parentCategoryId,
      }

      const result = category
        ? await categoriesApi.update(category.id, categoryData)
        : await categoriesApi.create(categoryData)

      if (result.success) {
        onSuccess()
        onClose()
      } else {
        const errorMsg = result.error || 'Failed to save category'
        console.error('Category save failed:', errorMsg)
        setError(errorMsg)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred while saving the category'
      console.error('Category save error:', err)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1f1f1f]">
          <h2 className="text-xl font-bold text-white">
            {category ? 'Edit Category' : 'Add New Category'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Icon name="close" size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Category Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleNameChange}
              required
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Scripts"
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
              placeholder="e.g., scripts"
            />
            <p className="text-xs text-slate-500 mt-1">Auto-generated from category name</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Brief description of this category"
            />
          </div>

          {/* Parent Category Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isMainCategory"
                checked={isMainCategory}
                onChange={(e) => {
                  setIsMainCategory(e.target.checked)
                  if (e.target.checked) {
                    setParentCategoryId(null)
                  }
                }}
                className="w-4 h-4 rounded border-[#2a2a2a] bg-[#1a1a1a] text-primary focus:ring-2 focus:ring-primary accent-primary"
              />
              <label htmlFor="isMainCategory" className="text-sm font-medium text-slate-300 cursor-pointer">
                Is this a main category?
              </label>
            </div>

            {!isMainCategory && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Parent Category *
                </label>
                <select
                  value={parentCategoryId || ''}
                  onChange={(e) => setParentCategoryId(e.target.value || null)}
                  required={!isMainCategory}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a parent category...</option>
                  {mainCategories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Select which main category this belongs under
                </p>
              </div>
            )}
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Category Icon
            </label>
            <button
              type="button"
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] hover:border-primary/50 rounded-lg px-4 py-3 flex items-center gap-3 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon name={formData.icon} size={18} className="text-primary" />
              </div>
              <span className="text-white text-sm font-medium">{formData.icon}</span>
              <Icon name={showIconPicker ? 'chevron-up' : 'chevron-down'} size={14} className="text-slate-400 ml-auto" />
            </button>

            {showIconPicker && (
              <div className="mt-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                <input
                  type="text"
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  placeholder="Search icons..."
                  className="w-full bg-[#141414] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="grid grid-cols-8 gap-1.5 max-h-[200px] overflow-y-auto">
                  {ICON_OPTIONS.filter(name => name.includes(iconSearch.toLowerCase())).map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, icon: name }))
                        setShowIconPicker(false)
                        setIconSearch('')
                      }}
                      title={name}
                      className={`w-full aspect-square rounded-lg flex items-center justify-center transition-colors ${
                        formData.icon === name
                          ? 'bg-primary/20 border border-primary'
                          : 'bg-[#141414] border border-transparent hover:border-white/20'
                      }`}
                    >
                      <Icon name={name} size={18} className={formData.icon === name ? 'text-primary' : 'text-slate-400'} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Category Image
            </label>

            {formData.image ? (
              <div className="space-y-3">
                <div className="relative">
                  <img
                    src={formData.image}
                    alt="Category image"
                    className="w-full h-48 object-cover rounded-lg border border-[#2a2a2a]"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="w-full py-2 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg transition-colors text-sm"
                >
                  Change Image
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="w-full py-3 bg-[#1a1a1a] border-2 border-dashed border-[#2a2a2a] hover:border-primary/50 text-slate-400 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Icon name="image" size={20} />
                <span>Select Image from Library</span>
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#1f1f1f]">
            <button
              type="button"
              onClick={onClose}
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
                  Saving...
                </>
              ) : (
                <>
                  <Icon name={category ? 'save' : 'add'} size={16} />
                  {category ? 'Save Changes' : 'Create Category'}
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
          setFormData(prev => ({ ...prev, image: file.url }))
          setShowMediaPicker(false)
        }}
        allowedTypes={['image']}
        title="Select Category Image"
      />
    </div>
  )
}
