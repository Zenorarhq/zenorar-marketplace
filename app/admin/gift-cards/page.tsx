'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { formatNumber } from '@/lib/formatNumber'
import { GIFT_CARD_CATEGORIES } from '@/lib/gift-cards/types'

interface GiftCard {
  id: string
  brand: string
  slug: string
  category: string
  description: string
  imageUrl: string
  denominations: number[]
  discountPercent: number
  isActive: boolean
  isFeatured: boolean
  provider: string | null
  providerProductId: string | null
  sortPriority: number | null
  inventory: {
    available: number
    sold: number
    reserved: number
    expired: number
  }
}

interface InventoryStats {
  giftCardId: string
  brand: string
  denomination: number
  available: number
  reserved: number
  sold: number
  expired: number
}

export default function AdminGiftCardsPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'inventory' | 'import'>('overview')
  const [selectedGiftCard, setSelectedGiftCard] = useState<string>('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCard, setEditingCard] = useState<GiftCard | null>(null)
  const [importData, setImportData] = useState('')
  const [importError, setImportError] = useState('')
  const [formError, setFormError] = useState('')

  // Refresh provider status when window gains focus (e.g., after changing settings)
  useEffect(() => {
    const handleFocus = () => {
      queryClient.invalidateQueries({ queryKey: ['reloadly-status'] })
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [queryClient])

  // Form state
  const [formData, setFormData] = useState({
    brand: '',
    slug: '',
    category: 'gaming',
    description: '',
    imageUrl: '',
    denominations: '25, 50, 100',
    discountPercent: 0,
    isActive: true,
    isFeatured: false,
    provider: '',
    providerProductId: '',
    sortPriority: '' as string | number
  })

  // Fetch gift cards
  const { data: giftCardsData, isLoading } = useQuery({
    queryKey: ['admin-gift-cards'],
    queryFn: async () => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch('/api/admin/gift-cards?stats=true', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return data
    }
  })

  // Fetch inventory stats
  const { data: inventoryStats, isLoading: loadingInventory } = useQuery<InventoryStats[]>({
    queryKey: ['admin-gift-cards-inventory', selectedGiftCard],
    queryFn: async () => {
      const token = localStorage.getItem('admin_auth_token')
      const params = new URLSearchParams()
      params.append('stats', 'true')
      if (selectedGiftCard) params.append('giftCardId', selectedGiftCard)
      const res = await fetch(`/api/admin/gift-cards/inventory?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return data.stats
    },
    enabled: activeTab === 'inventory' || activeTab === 'overview'
  })

  // Test Reloadly connection
  const { data: reloadlyStatus } = useQuery({
    queryKey: ['reloadly-status'],
    queryFn: async () => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch('/api/admin/gift-cards/sync', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      return data
    }
  })

  // Create/update gift card mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('admin_auth_token')
      const url = editingCard
        ? `/api/admin/gift-cards/${editingCard.id}`
        : '/api/admin/gift-cards'
      const method = editingCard ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gift-cards'] })
      setShowAddModal(false)
      setEditingCard(null)
      resetForm()
    },
    onError: (error: any) => {
      setFormError(error.message)
    }
  })

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch(`/api/admin/gift-cards/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gift-cards'] })
    }
  })

  // Import codes mutation
  const importMutation = useMutation({
    mutationFn: async (data: { giftCardId: string; codes: any[] }) => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch('/api/admin/gift-cards/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-gift-cards'] })
      queryClient.invalidateQueries({ queryKey: ['admin-gift-cards-inventory'] })
      setImportData('')
      setSelectedGiftCard('')
      alert(`Import complete: ${data.successCount} imported, ${data.failureCount} failed`)
    },
    onError: (error: any) => {
      setImportError(error.message)
    }
  })

  // Sync from Reloadly mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch('/api/admin/gift-cards/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ countryCode: 'US' })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-gift-cards'] })
      queryClient.invalidateQueries({ queryKey: ['reloadly-status'] })
      alert(`Sync complete: ${data.totalSynced} new products, ${data.totalUpdated} updated`)
    },
    onError: (error: any) => {
      alert(`Sync failed: ${error.message}`)
    }
  })

  const resetForm = () => {
    setFormData({
      brand: '',
      slug: '',
      category: 'gaming',
      description: '',
      imageUrl: '',
      denominations: '25, 50, 100',
      discountPercent: 0,
      isActive: true,
      isFeatured: false,
      provider: '',
      providerProductId: '',
      sortPriority: ''
    })
    setFormError('')
  }

  const handleEdit = (card: GiftCard) => {
    setEditingCard(card)
    setFormData({
      brand: card.brand,
      slug: card.slug,
      category: card.category,
      description: card.description || '',
      imageUrl: card.imageUrl || '',
      denominations: card.denominations.join(', '),
      discountPercent: card.discountPercent,
      isActive: card.isActive,
      isFeatured: card.isFeatured,
      provider: card.provider || '',
      providerProductId: card.providerProductId || '',
      sortPriority: card.sortPriority ?? ''
    })
    setShowAddModal(true)
  }

  const handleSave = () => {
    setFormError('')

    if (!formData.brand || !formData.slug || !formData.category) {
      setFormError('Brand, slug, and category are required')
      return
    }

    const denominations = formData.denominations
      .split(',')
      .map(d => parseFloat(d.trim()))
      .filter(d => !isNaN(d) && d > 0)

    saveMutation.mutate({
      brand: formData.brand,
      slug: formData.slug,
      category: formData.category,
      description: formData.description || undefined,
      imageUrl: formData.imageUrl || undefined,
      denominations,
      discountPercent: formData.discountPercent,
      isActive: formData.isActive,
      isFeatured: formData.isFeatured,
      provider: formData.provider || undefined,
      providerProductId: formData.providerProductId || undefined,
      sortPriority: formData.sortPriority === '' ? null : Number(formData.sortPriority)
    })
  }

  const handleImport = () => {
    setImportError('')

    if (!selectedGiftCard) {
      setImportError('Please select a gift card')
      return
    }

    if (!importData.trim()) {
      setImportError('Please enter code data')
      return
    }

    const lines = importData.trim().split('\n')
    const codes = []

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim())
      if (parts.length >= 2) {
        codes.push({
          denomination: parseFloat(parts[0]),
          code: parts[1],
          pin: parts[2] || null,
          costPrice: parts[3] ? parseFloat(parts[3]) : null,
          expiresAt: parts[4] || null
        })
      }
    }

    if (codes.length === 0) {
      setImportError('No valid data found. Format: denomination,code,pin,costPrice,expiresAt')
      return
    }

    importMutation.mutate({ giftCardId: selectedGiftCard, codes })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setImportData(text)
    }
    reader.readAsText(file)
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive
      ? <span className="px-2 py-1 text-xs rounded-full bg-green-900/30 text-green-400 border border-green-500/20">Active</span>
      : <span className="px-2 py-1 text-xs rounded-full bg-red-900/30 text-red-400 border border-red-500/20">Inactive</span>
  }

  const giftCards: GiftCard[] = giftCardsData?.giftCards || []
  const stats = giftCardsData?.stats

  // Calculate totals from inventory
  const totalAvailable = inventoryStats?.reduce((sum, s) => sum + s.available, 0) || 0
  const totalSold = inventoryStats?.reduce((sum, s) => sum + s.sold, 0) || 0
  const totalReserved = inventoryStats?.reduce((sum, s) => sum + s.reserved, 0) || 0

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Gift Cards</h1>
            <p className="text-slate-400">Manage gift card products and inventory</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Icon name="refresh-cw" size={18} className={syncMutation.isPending ? 'animate-spin' : ''} />
              Sync Providers
            </button>
            <button
              onClick={() => { resetForm(); setEditingCard(null); setShowAddModal(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all"
            >
              <Icon name="plus" size={18} />
              Add Gift Card
            </button>
          </div>
        </div>

        {/* Provider Status */}
        {reloadlyStatus && (
          <div className="mb-4 space-y-2">
            {reloadlyStatus.connections && Object.entries(reloadlyStatus.connections).map(([provider, status]: [string, any]) => (
              <div key={provider} className={`p-3 rounded-lg border ${
                status.success
                  ? 'bg-green-900/20 border-green-500/20 text-green-400'
                  : 'bg-yellow-900/20 border-yellow-500/20 text-yellow-400'
              }`}>
                <div className="flex items-center gap-2 text-sm">
                  <Icon name={status.success ? 'check-circle' : 'alert'} size={16} />
                  {status.success
                    ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} connected (${status.mode || 'live'} mode)`
                    : `${provider.charAt(0).toUpperCase() + provider.slice(1)}: ${status.error || 'Not configured'}`
                  }
                </div>
              </div>
            ))}
            {(!reloadlyStatus.connections || Object.keys(reloadlyStatus.connections).length === 0) && (
              <div className="p-3 rounded-lg border bg-yellow-900/20 border-yellow-500/20 text-yellow-400">
                <div className="flex items-center gap-2 text-sm">
                  <Icon name="alert" size={16} />
                  No gift card providers configured
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: 'chart' },
            { id: 'products', label: 'Products', icon: 'box' },
            { id: 'inventory', label: 'Inventory', icon: 'list' },
            { id: 'import', label: 'Import', icon: 'upload' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-black'
                  : 'bg-surface-dark text-slate-400 hover:text-white'
              }`}
            >
              <Icon name={tab.icon} size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="box" size={16} />
                  Total Products
                </div>
                <p className="text-2xl font-bold text-white">{formatNumber(stats?.totalProducts || 0)}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="check-circle" size={16} />
                  Active
                </div>
                <p className="text-2xl font-bold text-green-400">{formatNumber(stats?.activeProducts || 0)}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="package" size={16} />
                  Available Codes
                </div>
                <p className="text-2xl font-bold text-blue-400">{formatNumber(totalAvailable)}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="clock" size={16} />
                  Reserved
                </div>
                <p className="text-2xl font-bold text-yellow-400">{formatNumber(totalReserved)}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="shopping-cart" size={16} />
                  Sold
                </div>
                <p className="text-2xl font-bold text-purple-400">{formatNumber(totalSold)}</p>
              </div>
            </div>

            {/* Low Stock Alert */}
            {giftCards.filter(c => c.inventory.available === 0 && !c.provider).length > 0 && (
              <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-4 mb-6">
                <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                  <Icon name="alert" size={18} />
                  Out of Stock (No API Fallback)
                </h3>
                <div className="space-y-2">
                  {giftCards.filter(c => c.inventory.available === 0 && !c.provider).map(card => (
                    <div key={card.id} className="flex items-center justify-between text-sm">
                      <span className="text-white">{card.brand}</span>
                      <span className="text-red-400 font-medium">0 codes available</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stock by Product */}
            <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border-dark">
                <h3 className="text-white font-bold">Stock by Product</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-dark text-left">
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Product</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Category</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Provider</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400 text-center">Available</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400 text-center">Reserved</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400 text-center">Sold</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td>
                      </tr>
                    ) : giftCards.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          No gift cards found. Add one or sync from Reloadly.
                        </td>
                      </tr>
                    ) : (
                      giftCards.map(card => (
                        <tr key={card.id} className="border-b border-border-dark hover:bg-white/5">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {card.imageUrl && (
                                <img src={card.imageUrl} alt={card.brand} className="w-8 h-8 rounded object-cover" />
                              )}
                              <span className="text-white font-medium">{card.brand}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400 capitalize">{card.category}</td>
                          <td className="px-4 py-3">
                            {card.provider ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-900/30 text-blue-400 border border-blue-500/20">
                                {card.provider}
                              </span>
                            ) : (
                              <span className="text-slate-500">Bulk only</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-medium ${card.inventory.available === 0 && !card.provider ? 'text-red-400' : 'text-green-400'}`}>
                              {card.inventory.available}
                              {card.provider && <span className="text-slate-500 text-xs ml-1">+ API</span>}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-yellow-400">{card.inventory.reserved}</td>
                          <td className="px-4 py-3 text-center text-purple-400">{card.inventory.sold}</td>
                          <td className="px-4 py-3">{getStatusBadge(card.isActive)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-dark text-left">
                    <th className="px-4 py-3 text-sm font-medium text-slate-400">Brand</th>
                    <th className="px-4 py-3 text-sm font-medium text-slate-400">Category</th>
                    <th className="px-4 py-3 text-sm font-medium text-slate-400">Denominations</th>
                    <th className="px-4 py-3 text-sm font-medium text-slate-400">Discount</th>
                    <th className="px-4 py-3 text-sm font-medium text-slate-400">Provider</th>
                    <th className="px-4 py-3 text-sm font-medium text-slate-400">Status</th>
                    <th className="px-4 py-3 text-sm font-medium text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td>
                    </tr>
                  ) : giftCards.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No gift cards found.
                      </td>
                    </tr>
                  ) : (
                    giftCards.map(card => (
                      <tr key={card.id} className="border-b border-border-dark hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {card.imageUrl && (
                              <img src={card.imageUrl} alt={card.brand} className="w-10 h-10 rounded object-cover" />
                            )}
                            <div>
                              <p className="text-white font-medium">{card.brand}</p>
                              <p className="text-sm text-slate-500">{card.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 capitalize">{card.category}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {card.denominations.slice(0, 3).map(d => `$${d}`).join(', ')}
                          {card.denominations.length > 3 && ` +${card.denominations.length - 3}`}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {card.discountPercent > 0 ? `${card.discountPercent}%` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {card.provider ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-900/30 text-blue-400 border border-blue-500/20">
                              {card.provider}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleActiveMutation.mutate({ id: card.id, isActive: !card.isActive })}
                            disabled={toggleActiveMutation.isPending}
                          >
                            {getStatusBadge(card.isActive)}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleEdit(card)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <Icon name="edit" size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={selectedGiftCard}
                onChange={(e) => setSelectedGiftCard(e.target.value)}
                className="px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-white text-sm"
              >
                <option value="">All Gift Cards</option>
                {giftCards.map(card => (
                  <option key={card.id} value={card.id}>{card.brand}</option>
                ))}
              </select>
            </div>

            <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-dark text-left">
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Brand</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Denomination</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400 text-center">Available</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400 text-center">Reserved</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400 text-center">Sold</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400 text-center">Expired</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingInventory ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td>
                      </tr>
                    ) : !inventoryStats || inventoryStats.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No inventory data. Import codes to see stats.
                        </td>
                      </tr>
                    ) : (
                      inventoryStats.map((stat, i) => (
                        <tr key={i} className="border-b border-border-dark hover:bg-white/5">
                          <td className="px-4 py-3 text-white font-medium">{stat.brand}</td>
                          <td className="px-4 py-3 text-slate-400">${stat.denomination}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-medium ${stat.available === 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {stat.available}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-yellow-400">{stat.reserved}</td>
                          <td className="px-4 py-3 text-center text-purple-400">{stat.sold}</td>
                          <td className="px-4 py-3 text-center text-red-400">{stat.expired}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="max-w-2xl">
            <div className="bg-[#121212] border border-border-dark rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Import Gift Card Codes</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Select Gift Card</label>
                  <select
                    value={selectedGiftCard}
                    onChange={(e) => setSelectedGiftCard(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-dark border border-border-dark rounded-lg text-white"
                  >
                    <option value="">Select a gift card...</option>
                    {giftCards.map(card => (
                      <option key={card.id} value={card.id}>{card.brand}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Upload CSV File</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 border-2 border-dashed border-border-dark rounded-lg text-slate-400 hover:text-white hover:border-primary transition-colors"
                  >
                    <Icon name="upload" size={24} className="mx-auto mb-2" />
                    Click to upload CSV file
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Or paste data manually (one per line)
                  </label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="denomination,code,pin,costPrice,expiresAt&#10;50,XXXX-XXXX-XXXX,,45.00,2027-12-31&#10;25,YYYY-YYYY-YYYY,1234,22.50,"
                    rows={8}
                    className="w-full px-4 py-3 bg-surface-dark border border-border-dark rounded-lg text-white font-mono text-sm placeholder:text-slate-600"
                  />
                </div>

                <p className="text-xs text-slate-500">
                  Format: denomination,code,pin,costPrice,expiresAt<br />
                  Required: denomination, code. Optional: pin, costPrice, expiresAt
                </p>

                {importError && (
                  <div className="p-3 bg-red-900/30 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {importError}
                  </div>
                )}

                <button
                  onClick={handleImport}
                  disabled={importMutation.isPending || !selectedGiftCard || !importData.trim()}
                  className="w-full px-4 py-3 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all disabled:opacity-50"
                >
                  {importMutation.isPending ? 'Importing...' : 'Import Codes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setEditingCard(null); resetForm() }} />
            <div className="relative bg-[#121212] border border-border-dark rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-border-dark">
                <h2 className="text-xl font-bold text-white">
                  {editingCard ? 'Edit Gift Card' : 'Add Gift Card'}
                </h2>
                <button
                  onClick={() => { setShowAddModal(false); setEditingCard(null); resetForm() }}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Brand *</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-dark border border-border-dark rounded-lg text-white"
                      placeholder="Steam"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Slug *</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-dark border border-border-dark rounded-lg text-white"
                      placeholder="steam"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-dark border border-border-dark rounded-lg text-white"
                  >
                    {GIFT_CARD_CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="capitalize">{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-dark border border-border-dark rounded-lg text-white h-20"
                    placeholder="Gift card description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Image URL</label>
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-dark border border-border-dark rounded-lg text-white"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Denominations (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.denominations}
                    onChange={(e) => setFormData({ ...formData, denominations: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-dark border border-border-dark rounded-lg text-white"
                    placeholder="25, 50, 100"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Discount %</label>
                    <input
                      type="number"
                      value={formData.discountPercent}
                      onChange={(e) => setFormData({ ...formData, discountPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-surface-dark border border-border-dark rounded-lg text-white"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Sort Priority</label>
                    <input
                      type="number"
                      value={formData.sortPriority}
                      onChange={(e) => setFormData({ ...formData, sortPriority: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-dark border border-border-dark rounded-lg text-white"
                      min="1"
                      placeholder="1 = top"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">API Provider</label>
                    <select
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-dark border border-border-dark rounded-lg text-white"
                    >
                      <option value="">None (Bulk only)</option>
                      <option value="reloadly">Reloadly</option>
                      <option value="tango">Tango Card</option>
                      <option value="ezpin">EZ Pin</option>
                    </select>
                  </div>
                </div>

                {formData.provider && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Provider Product ID</label>
                    <input
                      type="text"
                      value={formData.providerProductId}
                      onChange={(e) => setFormData({ ...formData, providerProductId: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-dark border border-border-dark rounded-lg text-white"
                      placeholder="12345"
                    />
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-border-dark bg-surface-dark text-primary"
                    />
                    <span className="text-slate-300">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-4 h-4 rounded border-border-dark bg-surface-dark text-primary"
                    />
                    <span className="text-slate-300">Featured</span>
                  </label>
                </div>

                {formError && (
                  <div className="p-3 bg-red-900/30 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {formError}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-border-dark flex gap-3 justify-end">
                <button
                  onClick={() => { setShowAddModal(false); setEditingCard(null); resetForm() }}
                  className="px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-white hover:bg-[#262626] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
