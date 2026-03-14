'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { formatNumber } from '@/lib/formatNumber'

interface SyncResult {
  provider: string
  success: boolean
  synced: number
  updated: number
  errors: string[]
}

interface ProviderStatus {
  enabledProviders: string[]
  availableProviders: string[]
}

export default function AdminEsimPage() {
  const queryClient = useQueryClient()
  const [lastSyncResults, setLastSyncResults] = useState<SyncResult[] | null>(null)
  const [showSyncDetails, setShowSyncDetails] = useState(false)

  // Refresh provider status when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      queryClient.invalidateQueries({ queryKey: ['esim-provider-status'] })
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [queryClient])

  // Fetch provider status
  const { data: providerStatus, isLoading: loadingStatus } = useQuery<ProviderStatus>({
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

  // Fetch plan stats
  const { data: planStats, isLoading: loadingStats } = useQuery({
    queryKey: ['esim-plan-stats'],
    queryFn: async () => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch('/api/esim/plans?stats=true', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (!data.success) return { total: 0, active: 0, byProvider: {} }

      const plans = data.data || []
      const byProvider: Record<string, number> = {}
      let active = 0

      for (const plan of plans) {
        const providerSlug = plan.provider?.slug || 'unknown'
        byProvider[providerSlug] = (byProvider[providerSlug] || 0) + 1
        if (plan.isActive) active++
      }

      return { total: plans.length, active, byProvider }
    }
  })

  // Sync all providers mutation
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch('/api/admin/sync/esim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({}) // Empty body = sync all
      })
      const result = await res.json()
      if (!result.success && !result.results) throw new Error(result.error || 'Sync failed')
      return result
    },
    onSuccess: (data) => {
      setLastSyncResults(data.results || [])
      setShowSyncDetails(true)
      queryClient.invalidateQueries({ queryKey: ['esim-plan-stats'] })
      queryClient.invalidateQueries({ queryKey: ['esim-provider-status'] })
    },
    onError: (error: any) => {
      alert(`Sync failed: ${error.message}`)
    }
  })

  // Sync single provider mutation
  const syncProviderMutation = useMutation({
    mutationFn: async (provider: string) => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch('/api/admin/sync/esim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ provider })
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error || 'Sync failed')
      return result
    },
    onSuccess: (data) => {
      setLastSyncResults([data])
      setShowSyncDetails(true)
      queryClient.invalidateQueries({ queryKey: ['esim-plan-stats'] })
    },
    onError: (error: any) => {
      alert(`Sync failed: ${error.message}`)
    }
  })

  const enabledProviders = providerStatus?.enabledProviders || []
  const availableProviders = providerStatus?.availableProviders || ['zendit', 'airalo', 'esimgo']

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'zendit': return 'zap'
      case 'airalo': return 'globe'
      case 'esimgo': return 'sim-card'
      default: return 'box'
    }
  }

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'zendit': return 'text-purple-400 bg-purple-500/20'
      case 'airalo': return 'text-blue-400 bg-blue-500/20'
      case 'esimgo': return 'text-green-400 bg-green-500/20'
      default: return 'text-slate-400 bg-slate-500/20'
    }
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">eSIM Management</h1>
            <p className="text-slate-400">Manage eSIM providers, plans, and inventory</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => syncAllMutation.mutate()}
              disabled={syncAllMutation.isPending || enabledProviders.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Icon name="refresh-cw" size={18} className={syncAllMutation.isPending ? 'animate-spin' : ''} />
              Sync All Providers
            </button>
            <Link
              href="/admin/esim/inventory"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all"
            >
              <Icon name="package" size={18} />
              Bulk Inventory
            </Link>
          </div>
        </div>

        {/* Provider Status */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white mb-3">Provider Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableProviders.map(provider => {
              const isEnabled = enabledProviders.includes(provider)
              const planCount = planStats?.byProvider?.[provider] || 0

              return (
                <div
                  key={provider}
                  className={`p-4 rounded-xl border ${
                    isEnabled
                      ? 'bg-[#121212] border-border-dark'
                      : 'bg-[#0a0a0a] border-border-dark/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getProviderColor(provider)}`}>
                        <Icon name={getProviderIcon(provider)} size={20} />
                      </div>
                      <div>
                        <h3 className="text-white font-bold capitalize">{provider}</h3>
                        <p className="text-sm text-slate-400">
                          {isEnabled ? 'Connected' : 'Not configured'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      isEnabled
                        ? 'bg-green-900/30 text-green-400 border border-green-500/20'
                        : 'bg-slate-900/30 text-slate-400 border border-slate-500/20'
                    }`}>
                      {isEnabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">
                      {planCount} plans synced
                    </span>
                    {isEnabled && (
                      <button
                        onClick={() => syncProviderMutation.mutate(provider)}
                        disabled={syncProviderMutation.isPending}
                        className="text-sm text-primary hover:text-green-400 font-medium flex items-center gap-1"
                      >
                        <Icon name="refresh-cw" size={14} className={syncProviderMutation.isPending ? 'animate-spin' : ''} />
                        Sync
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {enabledProviders.length === 0 && (
            <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/20 rounded-xl text-yellow-400">
              <div className="flex items-center gap-2">
                <Icon name="alert" size={18} />
                <span>No eSIM providers configured. Go to <Link href="/admin/settings" className="underline hover:text-yellow-300">Settings</Link> to enable providers.</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Icon name="sim-card" size={16} />
              Total Plans
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(planStats?.total || 0)}</p>
          </div>
          <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Icon name="check-circle" size={16} />
              Active Plans
            </div>
            <p className="text-2xl font-bold text-green-400">{formatNumber(planStats?.active || 0)}</p>
          </div>
          <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Icon name="link" size={16} />
              Providers Enabled
            </div>
            <p className="text-2xl font-bold text-blue-400">{enabledProviders.length}</p>
          </div>
          <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Icon name="globe" size={16} />
              Available Providers
            </div>
            <p className="text-2xl font-bold text-purple-400">{availableProviders.length}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link
            href="/admin/esim/inventory"
            className="p-4 bg-[#121212] border border-border-dark rounded-xl hover:bg-[#1a1a1a] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Icon name="package" size={20} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-bold group-hover:text-primary transition-colors">Bulk Inventory</h3>
                <p className="text-sm text-slate-400">Manage pre-purchased eSIMs</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/settings"
            className="p-4 bg-[#121212] border border-border-dark rounded-xl hover:bg-[#1a1a1a] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Icon name="settings" size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-bold group-hover:text-primary transition-colors">Provider Settings</h3>
                <p className="text-sm text-slate-400">Configure API credentials</p>
              </div>
            </div>
          </Link>

          <Link
            href="/esim"
            target="_blank"
            className="p-4 bg-[#121212] border border-border-dark rounded-xl hover:bg-[#1a1a1a] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Icon name="external-link" size={20} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-bold group-hover:text-primary transition-colors">View Store</h3>
                <p className="text-sm text-slate-400">See eSIM store page</p>
              </div>
            </div>
          </Link>
        </div>

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
                {lastSyncResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border ${
                      result.success
                        ? 'bg-green-900/20 border-green-500/20'
                        : 'bg-red-900/20 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getProviderColor(result.provider)}`}>
                          <Icon name={getProviderIcon(result.provider)} size={16} />
                        </div>
                        <span className="text-white font-bold capitalize">{result.provider}</span>
                      </div>
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
                ))}

                {lastSyncResults.length === 0 && (
                  <div className="text-center text-slate-400 py-8">
                    No sync results to display
                  </div>
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
