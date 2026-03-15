'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { formatNumber } from '@/lib/formatNumber'
import { useTimezone } from '@/hooks/use-timezone'
import { formatDateShort } from '@/lib/date-utils'

interface EsimPlan {
  id: string
  name: string
  slug: string
  dataAmountDisplay: string
  validityDays: number
  retailPrice: number
  isActive: boolean
  provider: {
    name: string
    slug: string
  } | null
  region: {
    name: string
  } | null
  countries: string[]
}

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
}

interface SyncResult {
  provider: string
  success: boolean
  synced: number
  updated: number
  errors: string[]
}

interface ProviderConnection {
  enabled: boolean
  mode: string
  hasCredentials: boolean
}

type TabType = 'overview' | 'providers' | 'inventory'

function AdminEsimPageContent() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tz = useTimezone()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get tab from URL or default to overview
  const tabParam = searchParams.get('tab') as TabType | null
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'overview')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 50

  // Filters
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false)
  const [importPlanId, setImportPlanId] = useState('')
  const [importData, setImportData] = useState('')
  const [importError, setImportError] = useState('')

  // Sync results modal
  const [lastSyncResults, setLastSyncResults] = useState<SyncResult[] | null>(null)
  const [showSyncDetails, setShowSyncDetails] = useState(false)

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setCurrentPage(1)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/admin/esim?${params.toString()}`, { scroll: false })
  }

  // Sync tab from URL on mount
  useEffect(() => {
    if (tabParam && ['overview', 'providers', 'inventory'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Refresh provider status when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      queryClient.invalidateQueries({ queryKey: ['esim-provider-status'] })
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [queryClient])

  // Fetch provider status
  const { data: providerStatus } = useQuery({
    queryKey: ['esim-provider-status'],
    queryFn: async () => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch('/api/admin/sync/esim', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      return data
    }
  })

  // Fetch plans
  const { data: plansData, isLoading: loadingPlans } = useQuery({
    queryKey: ['admin-esim-plans'],
    queryFn: async () => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch('/api/esim/plans?includeInactive=true', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return data.data as EsimPlan[]
    }
  })

  // Fetch inventory stats
  const { data: inventoryStats, isLoading: loadingStats } = useQuery<InventoryStats>({
    queryKey: ['esim-inventory-stats'],
    queryFn: async () => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch('/api/admin/esim/inventory/stats', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (!data.success) return { overall: { available: 0, reserved: 0, sold: 0, total: 0 }, byPlan: [], lowStock: [] }
      return data.data
    },
    enabled: activeTab === 'overview' || activeTab === 'providers' || activeTab === 'inventory'
  })

  // Fetch inventory items
  const { data: inventoryData, isLoading: loadingInventory } = useQuery({
    queryKey: ['esim-inventory', selectedPlan, statusFilter],
    queryFn: async () => {
      const token = localStorage.getItem('admin_auth_token')
      const params = new URLSearchParams()
      if (selectedPlan) params.append('planId', selectedPlan)
      if (statusFilter) params.append('status', statusFilter)
      const res = await fetch(`/api/admin/esim/inventory?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (!data.success) return { items: [], pagination: { total: 0 } }
      return data.data
    },
    enabled: activeTab === 'inventory'
  })

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch('/api/admin/sync/esim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      })
      const result = await res.json()
      if (!result.success && !result.results) throw new Error(result.error || 'Sync failed')
      return result
    },
    onSuccess: (data) => {
      setLastSyncResults(data.results || [])
      setShowSyncDetails(true)
      queryClient.invalidateQueries({ queryKey: ['admin-esim-plans'] })
      queryClient.invalidateQueries({ queryKey: ['esim-provider-status'] })
    },
    onError: (error: any) => {
      setLastSyncResults([{
        provider: 'all',
        success: false,
        synced: 0,
        updated: 0,
        errors: [error.message]
      }])
      setShowSyncDetails(true)
    }
  })

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (data: { planId: string; items: any[] }) => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch('/api/admin/esim/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

  // Data
  const plans = plansData || []
  const connections = providerStatus?.connections as Record<string, ProviderConnection> || {}
  const enabledProviders = Object.entries(connections).filter(([_, c]) => c.enabled)

  // Pagination
  const totalPlans = plans.length
  const totalPages = Math.ceil(totalPlans / pageSize)
  const paginatedPlans = plans.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Stats
  const activePlans = plans.filter(p => p.isActive).length
  const totalAvailable = inventoryStats?.overall?.available || 0
  const totalSold = inventoryStats?.overall?.sold || 0
  const totalReserved = inventoryStats?.overall?.reserved || 0

  // Plans by provider
  const byProvider: Record<string, number> = {}
  plans.forEach(p => {
    const slug = p.provider?.slug || 'unknown'
    byProvider[slug] = (byProvider[slug] || 0) + 1
  })

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">eSIMs</h1>
            <p className="text-slate-400">Manage eSIM providers, plans, and inventory</p>
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
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all"
            >
              <Icon name="upload" size={18} />
              Import eSIMs
            </button>
          </div>
        </div>

        {/* Provider Status - Only show enabled providers */}
        {enabledProviders.length > 0 ? (
          <div className="mb-4 space-y-2">
            {enabledProviders.map(([provider, status]) => (
              <div key={provider} className={`p-3 rounded-lg border ${
                status.hasCredentials
                  ? 'bg-green-900/20 border-green-500/20 text-green-400'
                  : 'bg-yellow-900/20 border-yellow-500/20 text-yellow-400'
              }`}>
                <div className="flex items-center gap-2 text-sm">
                  <Icon name={status.hasCredentials ? 'check-circle' : 'alert'} size={16} />
                  {status.hasCredentials
                    ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} connected (${status.mode} mode)`
                    : `${provider.charAt(0).toUpperCase() + provider.slice(1)}: Missing credentials`
                  }
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mb-4 p-3 rounded-lg border bg-yellow-900/20 border-yellow-500/20 text-yellow-400">
            <div className="flex items-center gap-2 text-sm">
              <Icon name="alert" size={16} />
              No eSIM providers enabled. <Link href="/admin/settings" className="underline hover:text-yellow-300">Configure in Settings</Link>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'overview' as TabType, label: 'Overview', icon: 'sim-card' },
            { id: 'providers' as TabType, label: 'Plans by Providers', icon: 'chart' },
            { id: 'inventory' as TabType, label: 'Inventory', icon: 'list' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
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

        {/* Overview Tab - Plans Table */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="sim-card" size={16} />
                  Total Plans
                </div>
                <p className="text-2xl font-bold text-white">{formatNumber(totalPlans)}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="check-circle" size={16} />
                  Active Plans
                </div>
                <p className="text-2xl font-bold text-green-400">{formatNumber(activePlans)}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="package" size={16} />
                  Available Inventory
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

          <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-dark text-left">
                    <th className="px-4 py-3 text-sm font-medium text-slate-400">Plan</th>
                    <th className="px-4 py-3 text-sm font-medium text-slate-400">Region</th>
                    <th className="px-4 py-3 text-sm font-medium text-slate-400">Data</th>
                    <th className="px-4 py-3 text-sm font-medium text-slate-400">Validity</th>
                    <th className="px-4 py-3 text-sm font-medium text-slate-400">Price</th>
                    <th className="px-4 py-3 text-sm font-medium text-slate-400">Provider</th>
                    <th className="px-4 py-3 text-sm font-medium text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPlans ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td>
                    </tr>
                  ) : plans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No eSIM plans found. Click "Sync Providers" to fetch plans.
                      </td>
                    </tr>
                  ) : (
                    paginatedPlans.map(plan => (
                      <tr key={plan.id} className="border-b border-border-dark hover:bg-white/5">
                        <td className="px-4 py-3 text-white font-medium">{plan.name}</td>
                        <td className="px-4 py-3 text-slate-400">{plan.region?.name || '-'}</td>
                        <td className="px-4 py-3 text-slate-400">{plan.dataAmountDisplay}</td>
                        <td className="px-4 py-3 text-slate-400">{plan.validityDays} days</td>
                        <td className="px-4 py-3 text-slate-400">${plan.retailPrice?.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {plan.provider ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-900/30 text-blue-400 border border-blue-500/20">
                              {plan.provider.name}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {plan.isActive ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-900/30 text-green-400 border border-green-500/20">Active</span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-900/30 text-red-400 border border-red-500/20">Inactive</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPlans > pageSize && (
              <div className="border-t border-[#1f1f1f] px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-slate-400 text-sm">
                    Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalPlans)} of {formatNumber(totalPlans)}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) pageNum = i + 1
                        else if (currentPage <= 3) pageNum = i + 1
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                        else pageNum = currentPage - 2 + i
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
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
          </>
        )}

        {/* Plans by Providers Tab */}
        {activeTab === 'providers' && (
          <>
            {/* Low Stock Alert */}
            {inventoryStats?.lowStock && inventoryStats.lowStock.length > 0 && (
              <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-4 mb-6">
                <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                  <Icon name="alert" size={18} />
                  Low Stock Alerts
                </h3>
                <div className="space-y-2">
                  {inventoryStats.lowStock.slice(0, 10).map(item => (
                    <div key={item.planId} className="flex items-center justify-between text-sm">
                      <span className="text-white">{item.planName} ({item.regionName})</span>
                      <span className="text-red-400 font-medium">{item.available} remaining</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plans by Provider Table */}
            <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border-dark">
                <h3 className="text-white font-bold">Plans by Provider</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-dark text-left">
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Provider</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Mode</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400 text-center">Plans</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enabledProviders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                          No providers enabled
                        </td>
                      </tr>
                    ) : (
                      enabledProviders.map(([provider, status]) => (
                        <tr key={provider} className="border-b border-border-dark hover:bg-white/5">
                          <td className="px-4 py-3 text-white font-medium capitalize">{provider}</td>
                          <td className="px-4 py-3 text-slate-400 capitalize">{status.mode}</td>
                          <td className="px-4 py-3 text-center text-slate-400">{byProvider[provider] || 0}</td>
                          <td className="px-4 py-3">
                            {status.hasCredentials ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-green-900/30 text-green-400 border border-green-500/20">Connected</span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-red-900/30 text-red-400 border border-red-500/20">Missing Credentials</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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
                {plans.map(plan => (
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
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td>
                      </tr>
                    ) : !inventoryData?.items?.length ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          No inventory items found. Click "Import eSIMs" to add bulk eSIMs.
                        </td>
                      </tr>
                    ) : (
                      inventoryData.items.map((item: InventoryItem) => (
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
                <div className="p-4 border-t border-border-dark">
                  <p className="text-sm text-slate-400">
                    Showing {inventoryData.items?.length || 0} of {inventoryData.pagination.total} items
                  </p>
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
              <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Select Plan</label>
                  <select
                    value={importPlanId}
                    onChange={(e) => setImportPlanId(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-dark border border-border-dark rounded-lg text-white"
                  >
                    <option value="">Select a plan...</option>
                    {plans.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {plan.region?.name || 'Global'} ({plan.dataAmountDisplay})
                      </option>
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
                  disabled={importMutation.isPending || !importPlanId || !importData.trim()}
                  className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all disabled:opacity-50"
                >
                  {importMutation.isPending ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sync Results Modal */}
        {showSyncDetails && lastSyncResults && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowSyncDetails(false)} />
            <div className="relative bg-[#121212] border border-border-dark rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-border-dark">
                <h2 className="text-xl font-bold text-white">Sync Results</h2>
                <button
                  onClick={() => setShowSyncDetails(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                {lastSyncResults.length === 0 ? (
                  <div className="text-center text-slate-400 py-4">
                    No providers synced
                  </div>
                ) : (
                  lastSyncResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border ${
                        result.success
                          ? 'bg-green-900/20 border-green-500/20'
                          : 'bg-red-900/20 border-red-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-bold capitalize">{result.provider}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          result.success
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}>
                          {result.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      {result.success ? (
                        <div className="flex gap-4 text-sm">
                          <span className="text-slate-400">
                            <span className="text-green-400 font-medium">{result.synced}</span> new plans
                          </span>
                          <span className="text-slate-400">
                            <span className="text-blue-400 font-medium">{result.updated}</span> updated
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-red-400">
                          {result.errors?.length > 0 ? result.errors[0] : 'Unknown error'}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="p-6 border-t border-border-dark">
                <button
                  onClick={() => setShowSyncDetails(false)}
                  className="w-full px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default function AdminEsimPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-slate-800 rounded mb-4" />
            <div className="h-4 w-96 bg-slate-800 rounded mb-8" />
            <div className="h-64 bg-slate-800 rounded-xl" />
          </div>
        </div>
      </AdminLayout>
    }>
      <AdminEsimPageContent />
    </Suspense>
  )
}
