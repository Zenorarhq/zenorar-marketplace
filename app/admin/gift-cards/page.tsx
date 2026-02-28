'use client'

import { useState, useRef } from 'react'
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
  minCustomAmount: number | null
  maxCustomAmount: number | null
  provider: string | null
  providerProductId: string | null
  createdAt: string
  updatedAt: string
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
  const [activeTab, setActiveTab] = useState<'products' | 'inventory' | 'import'>('products')
  const [selectedGiftCard, setSelectedGiftCard] = useState<string>('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingCard, setEditingCard] = useState<GiftCard | null>(null)
  const [importData, setImportData] = useState('')
  const [importError, setImportError] = useState('')
  const [formError, setFormError] = useState('')

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
    providerProductId: ''
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
  const { data: inventoryStats } = useQuery<InventoryStats[]>({
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
    enabled: activeTab === 'inventory'
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
      setShowImportModal(false)
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
      alert(`Sync complete: ${data.synced} new, ${data.updated} updated`)
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
      providerProductId: ''
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
      providerProductId: card.providerProductId || ''
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
      providerProductId: formData.providerProductId || undefined
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

    // Parse CSV: denomination,code,pin,cost_price,expires_at
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

  const giftCards: GiftCard[] = giftCardsData?.giftCards || []
  const stats = giftCardsData?.stats

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-white mb-6">Gift Cards Management</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
            <div className="text-gray-400 text-sm">Total Products</div>
            <div className="text-2xl font-bold text-white">{stats.totalProducts}</div>
          </div>
          <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
            <div className="text-gray-400 text-sm">Active</div>
            <div className="text-2xl font-bold text-green-400">{stats.activeProducts}</div>
          </div>
          <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
            <div className="text-gray-400 text-sm">Total Codes</div>
            <div className="text-2xl font-bold text-white">{stats.totalCodes}</div>
          </div>
          <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
            <div className="text-gray-400 text-sm">Available</div>
            <div className="text-2xl font-bold text-blue-400">{stats.availableCodes}</div>
          </div>
          <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
            <div className="text-gray-400 text-sm">Sold</div>
            <div className="text-2xl font-bold text-purple-400">{stats.soldCodes}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6 border-b border-dark-700">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'products'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'inventory'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Inventory
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'import'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Import Codes
        </button>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
          >
            <Icon name="refresh-cw" className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync Reloadly
          </button>
          <button
            onClick={() => { resetForm(); setEditingCard(null); setShowAddModal(true) }}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2"
          >
            <Icon name="plus" className="w-4 h-4" />
            Add Gift Card
          </button>
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="bg-dark-800 rounded-lg border border-dark-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-900">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Brand</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Denominations</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Stock</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Provider</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : giftCards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No gift cards found. Add one or sync from Reloadly.
                  </td>
                </tr>
              ) : (
                giftCards.map((card) => (
                  <tr key={card.id} className="hover:bg-dark-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {card.imageUrl && (
                          <img src={card.imageUrl} alt={card.brand} className="w-10 h-10 rounded object-cover" />
                        )}
                        <div>
                          <div className="font-medium text-white">{card.brand}</div>
                          <div className="text-sm text-gray-400">{card.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 capitalize">{card.category}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {card.denominations.slice(0, 3).map(d => `$${d}`).join(', ')}
                      {card.denominations.length > 3 && ` +${card.denominations.length - 3}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">{card.inventory.available}</span>
                        <span className="text-gray-500">/</span>
                        <span className="text-purple-400">{card.inventory.sold}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {card.provider ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-900/30 text-blue-400 border border-blue-500/20">
                          {card.provider}
                        </span>
                      ) : (
                        <span className="text-gray-500">Bulk only</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActiveMutation.mutate({ id: card.id, isActive: !card.isActive })}
                        className={`px-2 py-1 text-xs rounded-full ${
                          card.isActive
                            ? 'bg-green-900/30 text-green-400 border border-green-500/20'
                            : 'bg-red-900/30 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {card.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleEdit(card)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-dark-600 rounded"
                      >
                        <Icon name="edit" className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <select
              value={selectedGiftCard}
              onChange={(e) => setSelectedGiftCard(e.target.value)}
              className="px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
            >
              <option value="">All Gift Cards</option>
              {giftCards.map(card => (
                <option key={card.id} value={card.id}>{card.brand}</option>
              ))}
            </select>
          </div>

          <div className="bg-dark-800 rounded-lg border border-dark-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-dark-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Brand</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Denomination</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Available</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Reserved</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Sold</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Expired</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {!inventoryStats || inventoryStats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No inventory data. Import codes to see stats.
                    </td>
                  </tr>
                ) : (
                  inventoryStats.map((stat, i) => (
                    <tr key={i} className="hover:bg-dark-700/50">
                      <td className="px-4 py-3 text-white">{stat.brand}</td>
                      <td className="px-4 py-3 text-gray-300">${stat.denomination}</td>
                      <td className="px-4 py-3 text-green-400">{stat.available}</td>
                      <td className="px-4 py-3 text-yellow-400">{stat.reserved}</td>
                      <td className="px-4 py-3 text-purple-400">{stat.sold}</td>
                      <td className="px-4 py-3 text-red-400">{stat.expired}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Import Gift Card Codes</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Select Gift Card
                </label>
                <select
                  value={selectedGiftCard}
                  onChange={(e) => setSelectedGiftCard(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                >
                  <option value="">Select a gift card...</option>
                  {giftCards.map(card => (
                    <option key={card.id} value={card.id}>{card.brand}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Upload CSV or paste data
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-dark-600 hover:bg-dark-500 text-white rounded-lg flex items-center gap-2"
                  >
                    <Icon name="upload" className="w-4 h-4" />
                    Upload CSV
                  </button>
                </div>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="denomination,code,pin,costPrice,expiresAt&#10;50,XXXX-XXXX-XXXX,,45.00,2027-12-31&#10;25,YYYY-YYYY-YYYY,1234,22.50,"
                  className="w-full h-48 px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-500 font-mono text-sm"
                />
              </div>

              {importError && (
                <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {importError}
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={importMutation.isPending || !selectedGiftCard || !importData.trim()}
                className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-medium"
              >
                {importMutation.isPending ? 'Importing...' : 'Import Codes'}
              </button>
            </div>
          </div>

          <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
            <h3 className="text-lg font-medium text-white mb-2">CSV Format</h3>
            <p className="text-gray-400 text-sm mb-4">
              Each line should contain: denomination, code, pin (optional), cost_price (optional), expires_at (optional)
            </p>
            <pre className="bg-dark-900 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto">
{`50,XXXX-XXXX-XXXX-XXXX,,45.00,2027-12-31
25,ABCD-EFGH-IJKL-MNOP,1234,22.50,
100,STEAM-CODE-HERE,,90.00,`}
            </pre>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg border border-dark-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h2 className="text-lg font-medium text-white">
                {editingCard ? 'Edit Gift Card' : 'Add Gift Card'}
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setEditingCard(null); resetForm() }}
                className="p-2 text-gray-400 hover:text-white hover:bg-dark-600 rounded"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Brand *</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                    placeholder="Steam"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Slug *</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                    placeholder="steam"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                >
                  {GIFT_CARD_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="capitalize">{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white h-20"
                  placeholder="Gift card description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Image URL</label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Denominations (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.denominations}
                  onChange={(e) => setFormData({ ...formData, denominations: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                  placeholder="25, 50, 100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Discount %</label>
                  <input
                    type="number"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Provider</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                  >
                    <option value="">None (Bulk only)</option>
                    <option value="reloadly">Reloadly</option>
                  </select>
                </div>
              </div>

              {formData.provider && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Provider Product ID</label>
                  <input
                    type="text"
                    value={formData.providerProductId}
                    onChange={(e) => setFormData({ ...formData, providerProductId: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
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
                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500"
                  />
                  <span className="text-gray-300">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500"
                  />
                  <span className="text-gray-300">Featured</span>
                </label>
              </div>

              {formError && (
                <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowAddModal(false); setEditingCard(null); resetForm() }}
                  className="flex-1 px-4 py-2 bg-dark-600 hover:bg-dark-500 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
