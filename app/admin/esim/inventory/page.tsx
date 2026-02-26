'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { formatNumber } from '@/lib/formatNumber'
import { useTimezone } from '@/hooks/use-timezone'
import { formatDateShort } from '@/lib/date-utils'

interface InventoryItem {
  id: string
  plan_id: string
  iccid: string
  qr_code_data: string
  status: 'available' | 'reserved' | 'sold'
  cost_price: number
  sold_at: string | null
  plan_name: string
  data_amount_display: string
  validity_days: number
  region_name: string
  sold_to_email: string | null
}

interface InventoryStats {
  overall: {
    available: number
    reserved: number
    sold: number
    total: number
  }
  byPlan: {
    planId: string
    planName: string
    dataAmount: string
    validityDays: number
    regionName: string
    retailPrice: number
    stock: {
      available: number
      reserved: number
      sold: number
      total: number
    }
  }[]
  lowStock: {
    planId: string
    planName: string
    regionName: string
    available: number
  }[]
  recentActivity: {
    id: string
    iccid: string
    status: string
    planName: string
    soldTo: string | null
    createdAt: string
    soldAt: string | null
  }[]
}

export default function AdminEsimInventoryPage() {
  const queryClient = useQueryClient()
  const tz = useTimezone()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'import'>('overview')
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importPlanId, setImportPlanId] = useState('')
  const [importData, setImportData] = useState('')
  const [importError, setImportError] = useState('')

  // Fetch stats
  const { data: stats, isLoading: loadingStats } = useQuery<InventoryStats>({
    queryKey: ['esim-inventory-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/esim/inventory/stats', {
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return data.data
    }
  })

  // Fetch inventory items
  const { data: inventoryData, isLoading: loadingInventory } = useQuery({
    queryKey: ['esim-inventory', selectedPlan, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedPlan) params.append('planId', selectedPlan)
      if (statusFilter) params.append('status', statusFilter)
      const res = await fetch(`/api/admin/esim/inventory?${params}`, {
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return data.data
    }
  })

  // Fetch plans for import dropdown
  const { data: plans } = useQuery({
    queryKey: ['esim-plans-list'],
    queryFn: async () => {
      const res = await fetch('/api/esim/plans', {
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return data.data
    }
  })

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (data: { planId: string; items: any[] }) => {
      const res = await fetch('/api/admin/esim/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['esim-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['esim-inventory-stats'] })
      setShowImportModal(false)
      setImportData('')
      setImportPlanId('')
      alert(`Import complete: ${data.imported} imported, ${data.duplicates} duplicates skipped`)
    },
    onError: (error: any) => {
      setImportError(error.message)
    }
  })

  const handleImport = () => {
    setImportError('')

    if (!importPlanId) {
      setImportError('Please select a plan')
      return
    }

    if (!importData.trim()) {
      setImportError('Please enter eSIM data')
      return
    }

    // Parse CSV-like data
    // Expected format: iccid,qrCodeData,smdpAddress,matchingId,costPrice
    const lines = importData.trim().split('\n')
    const items = []

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim())
      if (parts.length >= 2) {
        items.push({
          iccid: parts[0],
          qrCodeData: parts[1],
          smdpAddress: parts[2] || null,
          matchingId: parts[3] || null,
          costPrice: parts[4] ? parseFloat(parts[4]) : null
        })
      }
    }

    if (items.length === 0) {
      setImportError('No valid data found. Format: iccid,qrCodeData[,smdpAddress,matchingId,costPrice]')
      return
    }

    importMutation.mutate({ planId: importPlanId, items })
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-900/30 text-green-400 border border-green-500/20">Available</span>
      case 'reserved':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-500/20">Reserved</span>
      case 'sold':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-900/30 text-blue-400 border border-blue-500/20">Sold</span>
      default:
        return null
    }
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">eSIM Inventory</h1>
            <p className="text-slate-400">Manage bulk eSIM inventory and stock levels</p>
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all"
          >
            <Icon name="upload" size={18} />
            Import eSIMs
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: 'chart' },
            { id: 'inventory', label: 'Inventory', icon: 'list' },
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="check-circle" size={16} />
                  Available
                </div>
                <p className="text-2xl font-bold text-green-400">{formatNumber(stats?.overall.available || 0)}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="clock" size={16} />
                  Reserved
                </div>
                <p className="text-2xl font-bold text-yellow-400">{formatNumber(stats?.overall.reserved || 0)}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="shopping-cart" size={16} />
                  Sold
                </div>
                <p className="text-2xl font-bold text-blue-400">{formatNumber(stats?.overall.sold || 0)}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="package" size={16} />
                  Total
                </div>
                <p className="text-2xl font-bold text-white">{formatNumber(stats?.overall.total || 0)}</p>
              </div>
            </div>

            {/* Low Stock Alerts */}
            {stats?.lowStock && stats.lowStock.length > 0 && (
              <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-4 mb-6">
                <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                  <Icon name="alert" size={18} />
                  Low Stock Alerts
                </h3>
                <div className="space-y-2">
                  {stats.lowStock.map(item => (
                    <div key={item.planId} className="flex items-center justify-between text-sm">
                      <span className="text-white">{item.planName} ({item.regionName})</span>
                      <span className="text-red-400 font-medium">{item.available} remaining</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stock by Plan */}
            <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border-dark">
                <h3 className="text-white font-bold">Stock by Plan</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-dark text-left">
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Plan</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Region</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Data</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Price</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400 text-center">Available</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400 text-center">Reserved</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400 text-center">Sold</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingStats ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                          Loading...
                        </td>
                      </tr>
                    ) : stats?.byPlan.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                          No inventory data
                        </td>
                      </tr>
                    ) : (
                      stats?.byPlan.map(plan => (
                        <tr key={plan.planId} className="border-b border-border-dark hover:bg-white/5">
                          <td className="px-4 py-3 text-white font-medium">{plan.planName}</td>
                          <td className="px-4 py-3 text-slate-400">{plan.regionName}</td>
                          <td className="px-4 py-3 text-slate-400">{plan.dataAmount}</td>
                          <td className="px-4 py-3 text-slate-400">${plan.retailPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-medium ${plan.stock.available < 10 ? 'text-red-400' : 'text-green-400'}`}>
                              {plan.stock.available}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-yellow-400">{plan.stock.reserved}</td>
                          <td className="px-4 py-3 text-center text-blue-400">{plan.stock.sold}</td>
                          <td className="px-4 py-3 text-center text-white">{plan.stock.total}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity */}
            {stats?.recentActivity && stats.recentActivity.length > 0 && (
              <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden mt-6">
                <div className="p-4 border-b border-border-dark">
                  <h3 className="text-white font-bold">Recent Activity</h3>
                </div>
                <div className="divide-y divide-border-dark">
                  {stats.recentActivity.map(item => (
                    <div key={item.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{item.planName}</p>
                        <p className="text-sm text-slate-400">ICCID: {item.iccid}</p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(item.status)}
                        {item.soldTo && (
                          <p className="text-xs text-slate-400 mt-1">{item.soldTo}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-white text-sm"
              >
                <option value="">All Plans</option>
                {plans?.map((plan: any) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-white text-sm"
              >
                <option value="">All Statuses</option>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
              </select>
            </div>

            {/* Inventory Table */}
            <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-dark text-left">
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">ICCID</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Plan</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Region</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Status</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Cost</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Sold To</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Sold At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingInventory ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          Loading...
                        </td>
                      </tr>
                    ) : inventoryData?.items?.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          No inventory items found
                        </td>
                      </tr>
                    ) : (
                      inventoryData?.items?.map((item: InventoryItem) => (
                        <tr key={item.id} className="border-b border-border-dark hover:bg-white/5">
                          <td className="px-4 py-3 font-mono text-sm text-white">{item.iccid}</td>
                          <td className="px-4 py-3 text-slate-300">{item.plan_name}</td>
                          <td className="px-4 py-3 text-slate-400">{item.region_name}</td>
                          <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                          <td className="px-4 py-3 text-slate-400">
                            {item.cost_price ? `$${item.cost_price.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-400">{item.sold_to_email || '-'}</td>
                          <td className="px-4 py-3 text-slate-400">
                            {item.sold_at ? formatDateShort(item.sold_at, tz) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {inventoryData?.pagination && (
                <div className="p-4 border-t border-border-dark flex items-center justify-between">
                  <p className="text-sm text-slate-400">
                    Showing {inventoryData.items?.length || 0} of {inventoryData.pagination.total} items
                  </p>
                  <div className="flex gap-2">
                    {/* Pagination controls can be added here */}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
            <div className="relative bg-[#121212] border border-border-dark rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-border-dark">
                <h2 className="text-xl font-bold text-white">Import Bulk eSIMs</h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Plan Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Select Plan</label>
                  <select
                    value={importPlanId}
                    onChange={(e) => setImportPlanId(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-dark border border-border-dark rounded-lg text-white"
                  >
                    <option value="">Select a plan...</option>
                    {plans?.map((plan: any) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {plan.regionName} ({plan.dataAmountDisplay})
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Upload */}
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

                {/* Manual Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Or paste data manually (one per line)
                  </label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="iccid,qrCodeData,smdpAddress,matchingId,costPrice&#10;89012345678901234567,LPA:1$example.com$abc123,example.com,abc123,5.00"
                    rows={8}
                    className="w-full px-4 py-3 bg-surface-dark border border-border-dark rounded-lg text-white font-mono text-sm placeholder:text-slate-600"
                  />
                </div>

                <p className="text-xs text-slate-500">
                  Format: iccid,qrCodeData[,smdpAddress,matchingId,costPrice]<br />
                  Required fields: iccid, qrCodeData. Optional: smdpAddress, matchingId, costPrice
                </p>

                {importError && (
                  <div className="p-3 bg-red-900/30 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {importError}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-border-dark flex gap-3 justify-end">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-white hover:bg-[#262626] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                  className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all disabled:opacity-50"
                >
                  {importMutation.isPending ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
