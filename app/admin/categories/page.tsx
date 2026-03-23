'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { categoriesApi, CategoryWithChildren } from '@/lib/api/categories'
import CategoryModal from '@/components/admin/CategoryModal'
import { formatNumber } from '@/lib/formatNumber'
import Toast, { ToastState } from '@/components/ui/Toast'
import ConfirmModal, { ConfirmModalState } from '@/components/ui/ConfirmModal'

// Icon mapping for categories
const getCategoryIcon = (name: string): string => {
  const nameL = name.toLowerCase()
  if (nameL.includes('script')) return 'code'
  if (nameL.includes('esim') || nameL.includes('sim')) return 'globe'
  if (nameL.includes('gift')) return 'gift'
  if (nameL.includes('number') || nameL.includes('phone')) return 'phone'
  return 'folder'
}

const getCategoryColor = (name: string): string => {
  const nameL = name.toLowerCase()
  if (nameL.includes('script')) return 'text-blue-400'
  if (nameL.includes('esim') || nameL.includes('sim')) return 'text-green-400'
  if (nameL.includes('gift')) return 'text-purple-400'
  if (nameL.includes('number') || nameL.includes('phone')) return 'text-orange-400'
  return 'text-yellow-400'
}

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithChildren | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<ToastState | null>(null)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const itemsPerPage = 12

  // Toggle category expand/collapse
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  // Fetch categories with React Query (cached for 5 minutes)
  const { data: categoriesTree = [], isLoading: loading, error: categoryError } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const result = await categoriesApi.getTree()
      if (result.success && result.data) {
        return result.data
      }
      throw new Error(result.error || 'Failed to load categories')
    },
  })

  // Flatten tree structure for table display
  const flattenCategories = (cats: CategoryWithChildren[], parentName: string | null = null, parentIdVal: string | null = null): Array<CategoryWithChildren & { level: number; parentName: string | null; childrenCount: number; parentId: string | null }> => {
    let flattened: Array<CategoryWithChildren & { level: number; parentName: string | null; childrenCount: number; parentId: string | null }> = []
    cats.forEach(cat => {
      const childrenCount = cat.children?.length || 0
      flattened.push({ ...cat, level: 0, parentName, childrenCount, parentId: parentIdVal })
      if (cat.children && cat.children.length > 0) {
        const children = cat.children.map(child => ({
          ...child,
          level: 1,
          parentName: cat.name,
          childrenCount: 0,
          parentId: cat.id
        }))
        flattened.push(...children)
      }
    })
    return flattened
  }

  const allCategories = flattenCategories(categoriesTree)
  const categories = allCategories.filter((item: any) => {
    if (item.level === 0) return true
    return item.parentId && expandedCategories.has(item.parentId)
  })

  const error = categoryError ? String(categoryError) : ''

  // Function to invalidate cache (called after CRUD operations)
  function loadCategories() {
    queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
  }

  function handleDelete(categoryId: string) {
    setConfirmModal({
      title: 'Delete Category',
      description: 'Are you sure you want to delete this category?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirmLoading(true)
        const result = await categoriesApi.delete(categoryId)
        setConfirmModal(null)
        setConfirmLoading(false)
        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
        } else {
          setToast({ message: result.error || 'Failed to delete category', type: 'error' })
        }
      },
    })
  }

  // Pagination for table view
  const totalPages = Math.ceil(categories.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCategories = categories.slice(startIndex, endIndex)

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-400">Loading categories...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <Icon name="alert" size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-lg font-semibold mb-2">Error Loading Categories</p>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={loadCategories}
            className="bg-primary hover:bg-primary/90 text-black font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Categories</h1>
          <p className="text-slate-500 text-xs sm:text-sm">Manage product categories</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary hover:bg-primary/90 text-black text-xs sm:text-sm font-semibold px-2 sm:px-3 py-2 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 flex-shrink-0"
        >
          <Icon name="add" size={14} />
          <span className="hidden sm:inline">Add Category</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Categories Grid - Dashboard Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        {categoriesTree.filter(cat => !cat.parentId).map((category) => {
          const icon = category.icon || getCategoryIcon(category.name)
          const color = getCategoryColor(category.name)
          return (
            <div key={category.id} className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-slate-400 text-xs lg:text-sm">{category.name}</p>
                <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center ${color}`}>
                  <Icon name={icon} size={16} />
                </div>
              </div>
              <p className="text-white text-lg lg:text-2xl font-bold mb-1">
                {formatNumber(category._count?.products || 0)}
              </p>
              <p className="text-xs mb-3">
                <span className="text-slate-500">products</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingCategory(category)}
                  className="flex-1 bg-[#1a1a1a] hover:bg-white/10 text-white text-xs py-1.5 rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="px-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                >
                  <Icon name="delete" size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#1f1f1f]">
          <h3 className="text-white font-semibold">All Categories</h3>
        </div>
        {categories.length > 0 ? (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Category</th>
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Parent</th>
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Slug</th>
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Products</th>
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCategories.map((category: any) => {
                  const icon = category.icon || getCategoryIcon(category.name)
                  const color = getCategoryColor(category.name)
                  const isSubcategory = category.level === 1
                  const hasChildren = category.level === 0 && category.childrenCount > 0
                  const isExpanded = expandedCategories.has(category.id)
                  return (
                    <tr
                      key={category.id}
                      onClick={() => {
                        if (hasChildren) {
                          toggleCategory(category.id)
                        }
                      }}
                      className={`border-b border-[#1f1f1f] last:border-0 hover:bg-white/5 ${
                        isSubcategory ? 'bg-[#0a0a0a]' : 'bg-[#0f0f0f]'
                      } ${hasChildren ? 'cursor-pointer' : ''}`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {hasChildren && (
                            <Icon
                              name={isExpanded ? 'chevron-down' : 'chevron-right'}
                              size={14}
                              className="text-slate-400"
                            />
                          )}
                          {isSubcategory && (
                            <span className="text-slate-600 text-sm ml-4">└─</span>
                          )}
                          <div className={`w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center ${color}`}>
                            <Icon name={icon} size={16} />
                          </div>
                          <span className={`${isSubcategory ? 'text-slate-300' : 'text-white font-semibold'}`}>
                            {category.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-sm">
                        {category.parentName ? (
                          <span className="text-slate-500 text-xs px-2 py-1 bg-[#1a1a1a] rounded-md">
                            {category.parentName}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-sm">{category.slug}</td>
                      <td className="px-5 py-3 text-slate-400 text-sm">
                        {category._count?.products || 0}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setEditingCategory(category)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <Icon name="edit" size={16} className="text-slate-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <Icon name="delete" size={16} className="text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {/* Pagination */}
            {categories.length > itemsPerPage && (
              <div className="border-t border-[#1f1f1f] px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-slate-400 text-sm">
                    Showing {startIndex + 1}-{Math.min(endIndex, categories.length)} of {categories.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                              currentPage === pageNum
                                ? 'bg-primary text-black font-semibold'
                                : 'bg-[#1a1a1a] hover:bg-white/10 text-slate-400'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Icon name="folder" size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No categories found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 bg-primary hover:bg-primary/90 text-black font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Create Your First Category
            </button>
          </div>
        )}
      </div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={showAddModal || editingCategory !== null}
        onClose={() => {
          setShowAddModal(false)
          setEditingCategory(null)
        }}
        category={editingCategory}
        onSuccess={loadCategories}
      />
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      {confirmModal && <ConfirmModal modal={confirmModal} loading={confirmLoading} onClose={() => { setConfirmModal(null); setConfirmLoading(false) }} />}
    </AdminLayout>
  )
}
