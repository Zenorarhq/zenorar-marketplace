'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { formatNumber } from '@/lib/formatNumber'

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

interface SyncResult {
  provider: string
  success: boolean
  synced: number
  updated: number
  errors: string[]
}

export default function AdminEsimPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'plans'>('overview')
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
  const { data: plansData, isLoading } = useQuery({
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

  // Sync all providers mutation
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
      alert(`Sync failed: ${error.message}`)
    }
  })

  const enabledProviders = providerStatus?.enabledProviders || []
  const availableProviders = providerStatus?.availableProviders || ['zendit', 'airalo', 'esimgo']
  const plans = plansData || []

  // Calculate stats
  const totalPlans = plans.length
  const activePlans = plans.filter(p => p.isActive).length
  const byProvider: Record<string, number> = {}
  plans.forEach(p => {
    const slug = p.provider?.slug || 'unknown'
    byProvider[slug] = (byProvider[slug] || 0) + 1
  })

  // Build provider connections object similar to gift cards
  const connections: Record<string, { success: boolean; mode?: string; error?: string }> = {}
  availableProviders.forEach((provider: string) => {
    connections[provider] = {
      success: enabledProviders.includes(provider),
      mode: enabledProviders.includes(provider) ? 'connected' : undefined,
      error: enabledProviders.includes(provider) ? undefined : 'Not configured'
    }
  })

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">eSIMs</h1>
            <p className="text-slate-400">Manage eSIM providers and plans</p>
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
            <Link
              href="/admin/esim/inventory"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all"
            >
              <Icon name="upload" size={18} />
              Import Bulk
            </Link>
          </div>
        </div>

        {/* Provider Status */}
        <div className="mb-4 space-y-2">
          {Object.entries(connections).map(([provider, status]) => (
            <div key={provider} className={`p-3 rounded-lg border ${
              status.success
                ? 'bg-green-900/20 border-green-500/20 text-green-400'
                : 'bg-yellow-900/20 border-yellow-500/20 text-yellow-400'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Icon name={status.success ? 'check-circle' : 'alert'} size={16} />
                  {status.success
                    ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} connected`
                    : `${provider.charAt(0).toUpperCase() + provider.slice(1)}: ${status.error || 'Not configured'}`
                  }
                </div>
                {status.success && (
                  <span className="text-xs text-slate-400">{byProvider[provider] || 0} plans</span>
                )}
              </div>
            </div>
          ))}
          {Object.keys(connections).length === 0 && (
            <div className="p-3 rounded-lg border bg-yellow-900/20 border-yellow-500/20 text-yellow-400">
              <div className="flex items-center gap-2 text-sm">
                <Icon name="alert" size={16} />
                No eSIM providers configured. <Link href="/admin/settings" className="underline hover:text-yellow-300">Configure in Settings</Link>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: 'chart' },
            { id: 'plans', label: 'Plans', icon: 'list' },
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
                  <Icon name="sim-card" size={16} />
                  Total Plans
                </div>
                <p className="text-2xl font-bold text-white">{formatNumber(totalPlans)}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="check-circle" size={16} />
                  Active
                </div>
                <p className="text-2xl font-bold text-green-400">{formatNumber(activePlans)}</p>
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

            {/* Plans by Provider */}
            <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border-dark">
                <h3 className="text-white font-bold">Plans by Provider</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-dark text-left">
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Provider</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400 text-center">Total Plans</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableProviders.map((provider: string) => (
                      <tr key={provider} className="border-b border-border-dark hover:bg-white/5">
                        <td className="px-4 py-3 text-white font-medium capitalize">{provider}</td>
                        <td className="px-4 py-3 text-center text-slate-400">{byProvider[provider] || 0}</td>
                        <td className="px-4 py-3">
                          {enabledProviders.includes(provider) ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-900/30 text-green-400 border border-green-500/20">Active</span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-900/30 text-red-400 border border-red-500/20">Inactive</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Plans Tab */}
        {activeTab === 'plans' && (
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
                  {isLoading ? (
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
                    plans.slice(0, 50).map(plan => (
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
            {plans.length > 50 && (
              <div className="p-4 border-t border-border-dark">
                <p className="text-sm text-slate-400">Showing 50 of {plans.length} plans</p>
              </div>
            )}
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
                          <span className="text-green-400 font-medium">{result.synced}</span> new
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
