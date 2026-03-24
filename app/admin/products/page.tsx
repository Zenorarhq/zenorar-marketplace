'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { productsApi, Product } from '@/lib/api/products'
import { formatNumber } from '@/lib/formatNumber'
import { apiFetch } from '@/lib/api/client'
import ProductReviewsModal from '@/components/admin/ProductReviewsModal'
import Toast, { ToastState } from '@/components/ui/Toast'
import ConfirmModal, { ConfirmModalState } from '@/components/ui/ConfirmModal'

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory] = useState('scripts')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null)
  const [reviewProduct, setReviewProduct] = useState<{ id: string; name: string } | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const itemsPerPage = 10

  // Fetch products with React Query (cached for 5 minutes)
  const { data: products = [], isLoading: productsLoading, error: productsError, refetch } = useQuery<Product[]>({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const result = await productsApi.list({ limit: 1000 })
      if (result.success && result.data) {
        return result.data
      }
      throw new Error(result.error || 'Failed to load products')
    },
  })

  // Fetch staff pick IDs from local Next.js API
  const { data: staffPickIds = [] } = useQuery<string[]>({
    queryKey: ['admin-staff-picks'],
    queryFn: async () => {
      const data = await apiFetch<string[]>('/products/admin/staff-picks')
      return (data.success && data.data) ? data.data : []
    },
  })

  const loading = productsLoading
  const error = productsError ? String(productsError) : ''

  function handleDelete(productId: string) {
    setConfirmModal({
      title: 'Delete Product',
      description: 'Are you sure you want to delete this product?',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirmLoading(true)
        const result = await productsApi.delete(productId)
        setConfirmModal(null)
        setConfirmLoading(false)
        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ['admin-products'] })
        } else {
          setToast({ message: result.error || 'Failed to delete product', type: 'error' })
        }
      }
    })
  }

  async function handleStatusChange(productId: string, status: string) {
    const result = await productsApi.update(productId, { status } as any)
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    } else {
      setToast({ message: result.error || 'Failed to update status', type: 'error' })
    }
  }

  async function handleBulkAction(action: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'DELETE') {
    if (selectedIds.size === 0) return
    if (action === 'DELETE') {
      setConfirmModal({
        title: 'Delete Products',
        description: `Are you sure you want to delete ${selectedIds.size} product(s)?`,
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: async () => {
          setConfirmLoading(true)
          try {
            const promises = Array.from(selectedIds).map(id => productsApi.delete(id))
            await Promise.all(promises)
            setSelectedIds(new Set())
            queryClient.invalidateQueries({ queryKey: ['admin-products'] })
          } catch {
            setToast({ message: 'Some operations failed', type: 'error' })
          }
          setConfirmModal(null)
          setConfirmLoading(false)
        }
      })
      return
    }
    setBulkLoading(true)
    try {
      const promises = Array.from(selectedIds).map(id =>
        productsApi.update(id, { status: action } as any)
      )
      await Promise.all(promises)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    } catch {
      setToast({ message: 'Some operations failed', type: 'error' })
    }
    setBulkLoading(false)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const pageIds = paginatedProducts.map(p => p.id)
    const allSelected = pageIds.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      pageIds.forEach(id => allSelected ? next.delete(id) : next.add(id))
      return next
    })
  }

  async function handleToggleStaffPick(productId: string) {
    try {
      const data = await apiFetch(`/products/${productId}/staff-pick`, { method: 'PATCH' })
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['admin-staff-picks'] })
      }
    } catch {
      setToast({ message: 'Failed to update staff pick status', type: 'error' })
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || product.status.toLowerCase() === selectedStatus
    const matchesCategory = product.category?.slug === 'scripts'
    return matchesSearch && matchesCategory && matchesStatus
  })

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedStatus])

  // Calculate stats from scripts only
  const stats = {
    total: products.filter(p => p.category?.slug === 'scripts').length,
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-400">Loading products...</p>
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
          <p className="text-red-400 text-lg font-semibold mb-2">Error Loading Products</p>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => refetch()}
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
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Scripts</h1>
          <p className="text-slate-500 text-xs sm:text-sm">Manage your marketplace scripts</p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-primary hover:bg-primary/90 text-black text-xs sm:text-sm font-semibold px-2 sm:px-3 py-2 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 flex-shrink-0"
        >
          <Icon name="add" size={14} />
          <span className="hidden sm:inline">Add Script</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Scripts</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-blue-400">
              <Icon name="code" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatNumber(stats.total)}</p>
          <p className="text-xs">
            <span className="text-slate-500">products</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Search */}
          <div className="relative">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4 flex items-center justify-between">
          <p className="text-primary text-sm font-medium">{selectedIds.size} selected</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('ACTIVE')}
              disabled={bulkLoading}
              className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              Set Active
            </button>
            <button
              onClick={() => handleBulkAction('DRAFT')}
              disabled={bulkLoading}
              className="px-3 py-1.5 bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              Set Draft
            </button>
            <button
              onClick={() => handleBulkAction('ARCHIVED')}
              disabled={bulkLoading}
              className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              Archive
            </button>
            <button
              onClick={() => handleBulkAction('DELETE')}
              disabled={bulkLoading}
              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 hover:bg-white/10 text-slate-400 rounded-lg text-xs transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1f1f1f]">
                <th className="text-left px-5 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedIds.has(p.id))}
                    onChange={toggleSelectAll}
                    className="rounded border-[#2a2a2a] bg-[#1a1a1a] text-primary focus:ring-primary"
                  />
                </th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Product</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Category</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Price</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Status</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Type</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => (
                <tr key={product.id} className={`border-b border-[#1f1f1f] last:border-0 hover:bg-white/5 ${selectedIds.has(product.id) ? 'bg-primary/5' : ''}`}>
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="rounded border-[#2a2a2a] bg-[#1a1a1a] text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {product.images[0]?.url ? (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
                          <Icon name="image" size={16} className="text-slate-600" />
                        </div>
                      )}
                      <div>
                        <p className="text-white text-sm font-medium">{product.name}</p>
                        {product.sku && (
                          <p className="text-slate-500 text-xs">SKU: {product.sku}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-sm">
                    {product.category?.name || '-'}
                  </td>
                  <td className="px-5 py-3 text-white text-sm font-medium">
                    ${Number(product.price).toFixed(2)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="relative">
                      <button
                        onClick={() => setStatusMenuId(statusMenuId === product.id ? null : product.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          product.status === 'ACTIVE'
                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                            : product.status === 'DRAFT'
                            ? 'bg-slate-500/10 text-slate-400 hover:bg-slate-500/20'
                            : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        }`}
                      >
                        {product.status.charAt(0) + product.status.slice(1).toLowerCase()}
                        <Icon name="chevron-down" size={12} />
                      </button>
                      {statusMenuId === product.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setStatusMenuId(null)} />
                          <div className="absolute left-0 top-full mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-50 overflow-hidden min-w-[120px]">
                            {(['ACTIVE', 'DRAFT', 'ARCHIVED'] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() => { handleStatusChange(product.id, s); setStatusMenuId(null) }}
                                className={`block w-full text-left px-3 py-2 text-xs transition-colors ${
                                  product.status === s
                                    ? s === 'ACTIVE' ? 'bg-primary/10 text-primary' : s === 'DRAFT' ? 'bg-slate-500/10 text-slate-400' : 'bg-red-500/10 text-red-400'
                                    : 'text-slate-300 hover:bg-white/5'
                                }`}
                              >
                                {s.charAt(0) + s.slice(1).toLowerCase()}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-slate-400 text-sm">
                      {product.isDigital ? 'Digital' : 'Physical'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStaffPick(product.id)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        title={staffPickIds.includes(product.id) ? 'Remove from Staff Picks' : 'Add to Staff Picks'}
                      >
                        <Icon name="star" size={16} className={staffPickIds.includes(product.id) ? 'text-yellow-500 fill-yellow-500' : 'text-slate-600'} />
                      </button>
                      <button
                        onClick={() => setReviewProduct({ id: product.id, name: product.name })}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        title="Reviews"
                      >
                        <Icon name="chat" size={16} className="text-slate-400" />
                      </button>
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Icon name="edit" size={16} className="text-slate-400" />
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Icon name="delete" size={16} className="text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Icon name="search" size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No products found</p>
          </div>
        )}

        {/* Pagination */}
        {filteredProducts.length > 0 && totalPages > 1 && (
          <div className="border-t border-[#1f1f1f] px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {startIndex + 1} - {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 bg-surface-dark border border-border-dark rounded text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="chevron-left" size={14} />
                </button>
                <span className="text-xs text-slate-400 px-2">{currentPage} / {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 bg-surface-dark border border-border-dark rounded text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="chevron-right" size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reviews Modal */}
      <ProductReviewsModal
        isOpen={!!reviewProduct}
        onClose={() => setReviewProduct(null)}
        productId={reviewProduct?.id || ''}
        productName={reviewProduct?.name || ''}
      />

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      {confirmModal && <ConfirmModal modal={confirmModal} loading={confirmLoading} onClose={() => { setConfirmModal(null); setConfirmLoading(false) }} />}
    </AdminLayout>
  )
}
