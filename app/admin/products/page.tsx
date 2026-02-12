'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { productsApi, Product } from '@/lib/api/products'
import { categoriesApi, Category } from '@/lib/api/categories'
import { formatCurrency, formatNumber } from '@/lib/formatNumber'

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Fetch products with React Query (cached for 5 minutes)
  const { data: products = [], isLoading: productsLoading, error: productsError, refetch } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const result = await productsApi.list({ limit: 1000 })
      if (result.success && result.data) {
        return result.data
      }
      throw new Error(result.error || 'Failed to load products')
    },
  })

  // Fetch categories with React Query (cached)
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const result = await categoriesApi.list()
      if (result.success && result.data) {
        return result.data
      }
      return []
    },
  })

  // Fetch staff pick IDs from local DB
  const { data: staffPickIds = [] } = useQuery({
    queryKey: ['admin-staff-picks'],
    queryFn: async () => {
      const res = await fetch('/api/admin/products/staff-picks')
      const data = await res.json()
      return data.success ? data.data : []
    },
  })

  const loading = productsLoading
  const error = productsError ? String(productsError) : ''

  async function handleDelete(productId: string) {
    if (!confirm('Are you sure you want to delete this product?')) return

    const result = await productsApi.delete(productId)
    if (result.success) {
      // Invalidate cache to trigger refetch after CRUD operation
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    } else {
      alert(result.error || 'Failed to delete product')
    }
  }

  async function handleToggleStaffPick(productId: string) {
    try {
      const res = await fetch(`/api/admin/products/${productId}/staff-pick`, { method: 'PATCH' })
      const data = await res.json()
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['admin-staff-picks'] })
      }
    } catch {
      // silently fail
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory
    const matchesStatus = selectedStatus === 'all' || product.status.toLowerCase() === selectedStatus
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
  }, [searchQuery, selectedCategory, selectedStatus])

  // Calculate stats from all products
  const stats = {
    total: products.length,
    inventoryValue: products.reduce((sum, p) => sum + (Number(p.price) * p.stock), 0),
    totalCost: products.reduce((sum, p) => sum + ((p.costPrice ? Number(p.costPrice) : 0) * p.stock), 0),
    lowStock: products.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold).length,
    outOfStock: products.filter(p => p.stock === 0).length,
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
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Products</h1>
          <p className="text-slate-500 text-xs sm:text-sm">Manage your marketplace products</p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-primary hover:bg-primary/90 text-black text-xs sm:text-sm font-semibold px-2 sm:px-3 py-2 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 flex-shrink-0"
        >
          <Icon name="add" size={14} />
          <span className="hidden sm:inline">Add Product</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Total Products</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="code" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatNumber(stats.total)}</p>
          <p className="text-xs">
            <span className="text-slate-500">active items</span>
          </p>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Inventory Value</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="wallet" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatCurrency(stats.inventoryValue)}</p>
          <p className="text-xs">
            <span className="text-slate-500">total value</span>
          </p>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Total Cost</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Icon name="dollar" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatCurrency(stats.totalCost)}</p>
          <p className="text-xs">
            <span className="text-slate-500">cost investment</span>
          </p>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Low/Out Stock</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Icon name="alert" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatNumber(stats.lowStock + stats.outOfStock)}</p>
          <p className="text-xs">
            <span className="text-orange-400">{stats.lowStock}</span>
            <span className="text-slate-500 mx-1">low,</span>
            <span className="text-orange-400">{stats.outOfStock}</span>
            <span className="text-slate-500 ml-1">out</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

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

      {/* Products Table */}
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1f1f1f]">
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Product</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Category</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Price</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Stock</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Status</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Type</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => (
                <tr key={product.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-white/5">
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
                    <span className={`text-sm ${
                      product.stock <= product.lowStockThreshold
                        ? 'text-red-400'
                        : 'text-slate-400'
                    }`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      product.status === 'ACTIVE'
                        ? 'bg-primary/10 text-primary'
                        : product.status === 'DRAFT'
                        ? 'bg-slate-500/10 text-slate-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {product.status.charAt(0) + product.status.slice(1).toLowerCase()}
                    </span>
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
              <p className="text-slate-400 text-sm">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length}
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
      </div>
    </AdminLayout>
  )
}
