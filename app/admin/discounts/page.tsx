'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { formatNumber, formatCurrency } from '@/lib/formatNumber'
import { discountsApi, Discount } from '@/lib/api/discounts'

export default function DiscountsPage() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    value: '',
    usageLimit: '',
    minOrderValue: '',
    maxDiscountValue: '',
    expiresAt: '',
    isActive: true,
  })

  // Fetch discounts
  const { data: discounts = [], isLoading } = useQuery({
    queryKey: ['admin-discounts'],
    queryFn: async () => {
      const result = await discountsApi.list()
      if (result.success && result.data) {
        return result.data
      }
      return []
    },
  })

  // Fetch stats
  const { data: stats = null } = useQuery({
    queryKey: ['admin-discount-stats'],
    queryFn: async () => {
      const result = await discountsApi.getStats()
      if (result.success && result.data) {
        return result.data
      }
      return null
    },
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => discountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discounts'] })
      queryClient.invalidateQueries({ queryKey: ['admin-discount-stats'] })
      setShowAddModal(false)
      resetForm()
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => discountsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discounts'] })
      queryClient.invalidateQueries({ queryKey: ['admin-discount-stats'] })
      setEditingDiscount(null)
      resetForm()
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => discountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discounts'] })
      queryClient.invalidateQueries({ queryKey: ['admin-discount-stats'] })
    },
  })

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'PERCENTAGE',
      value: '',
      usageLimit: '',
      minOrderValue: '',
      maxDiscountValue: '',
      expiresAt: '',
      isActive: true,
    })
  }

  const handleOpenEdit = (discount: Discount) => {
    setEditingDiscount(discount)
    setFormData({
      code: discount.code,
      type: discount.type,
      value: discount.value.toString(),
      usageLimit: discount.usageLimit?.toString() || '',
      minOrderValue: discount.minOrderValue?.toString() || '',
      maxDiscountValue: discount.maxDiscountValue?.toString() || '',
      expiresAt: discount.expiresAt ? new Date(discount.expiresAt).toISOString().split('T')[0] : '',
      isActive: discount.isActive,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      code: formData.code.toUpperCase(),
      type: formData.type,
      value: parseFloat(formData.value),
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
      minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : undefined,
      maxDiscountValue: formData.maxDiscountValue ? parseFloat(formData.maxDiscountValue) : undefined,
      expiresAt: formData.expiresAt || undefined,
      isActive: formData.isActive,
    }

    if (editingDiscount) {
      await updateMutation.mutateAsync({ id: editingDiscount.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  const handleDelete = async (id: string, code: string) => {
    if (confirm(`Are you sure you want to delete discount code "${code}"?`)) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <AdminLayout>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Discounts</h1>
          <p className="text-slate-500 text-xs sm:text-sm">Manage discount codes and promotions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary hover:bg-primary/90 text-black text-xs sm:text-sm font-semibold px-2 sm:px-3 py-2 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 flex-shrink-0"
        >
          <Icon name="add" size={14} />
          <span className="hidden sm:inline">Create Discount</span>
          <span className="sm:hidden">Create</span>
        </button>
      </div>

      {/* Stats Grid - Dashboard Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Total Codes</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Icon name="ticket" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">
            {formatNumber(stats?.totalCodes || 0)}
          </p>
          <p className="text-xs">
            <span className="text-slate-500">discount codes</span>
          </p>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Active</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="check" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">
            {formatNumber(stats?.activeCodes || 0)}
          </p>
          <p className="text-xs">
            <span className="text-primary">
              {stats?.totalCodes
                ? Math.round((stats.activeCodes / stats.totalCodes) * 100)
                : 0}
              %
            </span>
            <span className="text-slate-500 ml-1">active codes</span>
          </p>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Total Usage</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Icon name="shopping-cart" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">
            {formatNumber(stats?.totalUsage || 0)}
          </p>
          <p className="text-xs">
            <span className="text-slate-500">times redeemed</span>
          </p>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Savings Given</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
              <Icon name="wallet" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">
            {formatCurrency(stats?.totalSavings || 0)}
          </p>
          <p className="text-xs">
            <span className="text-slate-500">customer discounts</span>
          </p>
        </div>
      </div>

      {/* Discounts Table */}
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-slate-400">Loading discounts...</p>
            </div>
          </div>
        ) : discounts.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="ticket" size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No discount codes yet</p>
            <p className="text-slate-500 text-sm">Create your first discount code to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1f1f1f]">
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Code</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Type</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Value</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Usage</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Expires</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Status</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((discount) => {
                const expired = isExpired(discount.expiresAt)
                const status = !discount.isActive || expired ? 'inactive' : 'active'

                return (
                  <tr
                    key={discount.id}
                    className="border-b border-[#1f1f1f] last:border-0 hover:bg-white/5"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Icon name="ticket" size={16} className="text-primary" />
                        <span className="text-white font-mono font-semibold">{discount.code}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-sm capitalize">
                      {discount.type.toLowerCase()}
                    </td>
                    <td className="px-5 py-3 text-white font-medium">
                      {discount.type === 'PERCENTAGE' ? `${discount.value}%` : formatCurrency(discount.value)}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-sm">
                      {discount.usageCount || 0}
                      {discount.usageLimit ? ` / ${discount.usageLimit}` : ''}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-sm">
                      {discount.expiresAt
                        ? new Date(discount.expiresAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Never'}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          status === 'active'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {status === 'active' ? 'Active' : expired ? 'Expired' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(discount)}
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Icon name="edit" size={16} className="text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(discount.id, discount.code)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
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
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showAddModal || editingDiscount) && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#1f1f1f]">
              <h3 className="text-white font-semibold text-lg">
                {editingDiscount ? 'Edit Discount Code' : 'Create Discount Code'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingDiscount(null)
                  resetForm()
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Discount Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  placeholder="SUMMER2024"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-primary/50 font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Code will be automatically converted to uppercase
                </p>
              </div>

              {/* Type and Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as 'PERCENTAGE' | 'FIXED' })
                    }
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-primary/50"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Value * {formData.type === 'PERCENTAGE' ? '(%)' : '($)'}
                  </label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    required
                    min="0"
                    step={formData.type === 'PERCENTAGE' ? '1' : '0.01'}
                    max={formData.type === 'PERCENTAGE' ? '100' : undefined}
                    placeholder={formData.type === 'PERCENTAGE' ? '20' : '50.00'}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              {/* Usage Limit and Min Order Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    min="0"
                    placeholder="Unlimited"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-primary/50"
                  />
                  <p className="text-xs text-slate-500 mt-1">Leave empty for unlimited</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Minimum Order ($)
                  </label>
                  <input
                    type="number"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                    min="0"
                    step="0.01"
                    placeholder="No minimum"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              {/* Max Discount Value and Expiry Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Discount ($)
                  </label>
                  <input
                    type="number"
                    value={formData.maxDiscountValue}
                    onChange={(e) =>
                      setFormData({ ...formData, maxDiscountValue: e.target.value })
                    }
                    min="0"
                    step="0.01"
                    placeholder="No maximum"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-primary/50"
                    disabled={formData.type === 'FIXED'}
                  />
                  <p className="text-xs text-slate-500 mt-1">For percentage discounts only</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Expires On
                  </label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-primary/50"
                  />
                  <p className="text-xs text-slate-500 mt-1">Leave empty for no expiry</p>
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-[#2a2a2a] bg-[#0a0a0a] text-primary focus:ring-2 focus:ring-primary"
                />
                <label htmlFor="isActive" className="text-white text-sm cursor-pointer">
                  Active (customers can use this discount code)
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1f1f1f]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingDiscount(null)
                    resetForm()
                  }}
                  className="px-5 py-2.5 bg-[#1a1a1a] text-white rounded-lg font-medium text-sm hover:bg-[#222] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                      {editingDiscount ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Icon name={editingDiscount ? 'check' : 'add'} size={18} />
                      {editingDiscount ? 'Update Discount' : 'Create Discount'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
