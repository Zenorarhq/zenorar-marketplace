'use client'

import { useState, useEffect, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { formatNumber, formatCurrency } from '@/lib/formatNumber'
import { useTimezone } from '@/hooks/use-timezone'
import { formatDateShort } from '@/lib/date-utils'

interface CardStats {
  total_cards: number
  active_cards: number
  frozen_cards: number
  expired_cards: number
  used_cards: number
  virtual_cards: number
  instant_cards: number
  total_revenue: number
  total_fees: number
  total_transactions: number
  by_provider: { provider: string; card_count: number; active_count: number }[]
}

interface IssuedCard {
  id: string
  provider: string
  card_type: string
  card_brand: string
  card_last_four: string
  card_expiry: string
  currency: string
  balance: number
  denomination: number
  status: string
  nickname: string
  is_premium: boolean
  created_at: string
  expires_at: string | null
  user_name: string
  user_email: string
}

interface CardTransaction {
  id: string
  card_id: string
  provider: string
  type: string
  amount: number
  fee: number
  merchant_name: string
  merchant_category: string
  status: string
  description: string
  created_at: string
  user_name: string
  user_email: string
  card_last_four: string
  card_type: string
}

interface ProviderConfig {
  id: string
  provider: string
  display_name: string
  creation_fee: number
  top_up_fee_percent: number
  instant_markup_percent: number
  min_top_up: number
  max_top_up: number
  min_denomination: number
  max_denomination: number
  is_enabled: boolean
  is_featured?: boolean
  is_staff_pick?: boolean
  features: Record<string, any>
  status: { enabled: boolean; configured: boolean; mode: string }
}

type TabType = 'overview' | 'providers' | 'issued' | 'transactions'

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <span className="px-2 py-1 text-xs rounded-full bg-green-900/30 text-green-400 border border-green-500/20">Active</span>
    case 'frozen':
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-900/30 text-blue-400 border border-blue-500/20">Frozen</span>
    case 'expired':
      return <span className="px-2 py-1 text-xs rounded-full bg-red-900/30 text-red-400 border border-red-500/20">Expired</span>
    case 'used':
      return <span className="px-2 py-1 text-xs rounded-full bg-slate-900/30 text-slate-400 border border-slate-500/20">Used</span>
    default:
      return <span className="px-2 py-1 text-xs rounded-full bg-slate-900/30 text-slate-400 border border-slate-500/20">{status}</span>
  }
}

function getTxTypeBadge(type: string) {
  switch (type) {
    case 'creation':
      return <span className="px-2 py-1 text-xs rounded-full bg-green-900/30 text-green-400 border border-green-500/20">Creation</span>
    case 'top_up':
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-900/30 text-blue-400 border border-blue-500/20">Top Up</span>
    case 'spend':
      return <span className="px-2 py-1 text-xs rounded-full bg-orange-900/30 text-orange-400 border border-orange-500/20">Spend</span>
    case 'purchase':
      return <span className="px-2 py-1 text-xs rounded-full bg-purple-900/30 text-purple-400 border border-purple-500/20">Purchase</span>
    case 'refund':
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-500/20">Refund</span>
    default:
      return <span className="px-2 py-1 text-xs rounded-full bg-slate-900/30 text-slate-400 border border-slate-500/20">{type}</span>
  }
}

function AdminCardsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tz = useTimezone()
  const queryClient = useQueryClient()

  const tabParam = searchParams.get('tab') as TabType | null
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'overview')
  const [cardsPage, setCardsPage] = useState(1)
  const [txPage, setTxPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [txTypeFilter, setTxTypeFilter] = useState('')
  const [txProviderFilter, setTxProviderFilter] = useState('')

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    if (tab === 'overview') setCardsPage(1)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/admin/cards?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (tabParam && ['overview', 'providers', 'issued', 'transactions'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Fetch cards overview (stats + paginated cards)
  const { data: cardsData, isLoading: loadingCards, isError: cardsError } = useQuery({
    queryKey: ['admin-cards', cardsPage, statusFilter, providerFilter],
    queryFn: async () => {
      const token = localStorage.getItem('admin_auth_token')
      const params = new URLSearchParams({ page: String(cardsPage), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)
      if (providerFilter) params.set('provider', providerFilter)
      const res = await fetch(`/api/admin/cards?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return data.data
    },
  })

  // Fetch providers
  const { data: providers = [], isLoading: loadingProviders, isError: providersError } = useQuery({
    queryKey: ['admin-card-providers'],
    queryFn: async () => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch('/api/admin/cards/providers', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return data.data as ProviderConfig[]
    },
    enabled: activeTab === 'providers' || activeTab === 'overview' || activeTab === 'issued' || activeTab === 'transactions',
  })

  // Toggle curated flags (Recommended / Staff Pick)
  const toggleCuratedMutation = useMutation({
    mutationFn: async ({ provider, field, value }: { provider: string; field: 'is_featured' | 'is_staff_pick'; value: boolean }) => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch('/api/admin/cards/providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ provider, [field]: value }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-card-providers'] }),
  })

  // Fetch transactions
  const { data: txData, isLoading: loadingTx, isError: txError } = useQuery({
    queryKey: ['admin-card-transactions', txPage, txTypeFilter, txProviderFilter],
    queryFn: async () => {
      const token = localStorage.getItem('admin_auth_token')
      const params = new URLSearchParams({ page: String(txPage), limit: '20' })
      if (txTypeFilter) params.set('type', txTypeFilter)
      if (txProviderFilter) params.set('provider', txProviderFilter)
      const res = await fetch(`/api/admin/cards/transactions?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      return { transactions: data.data, pagination: data.pagination }
    },
    enabled: activeTab === 'transactions',
  })


  const stats: CardStats = cardsData?.stats || {
    total_cards: 0, active_cards: 0, frozen_cards: 0, expired_cards: 0, used_cards: 0,
    virtual_cards: 0, instant_cards: 0, total_revenue: 0, total_fees: 0, total_transactions: 0,
    by_provider: [],
  }
  const cards: IssuedCard[] = cardsData?.cards || []
  const pagination = cardsData?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }
  const txPagination = txData?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }

  const renderPagination = (pag: typeof pagination, setPage: (p: number | ((prev: number) => number)) => void, label?: string) => {
    if (pag.totalPages <= 1) return null
    const startItem = ((pag.page - 1) * pag.limit) + 1
    const endItem = Math.min(pag.page * pag.limit, pag.total)
    return (
      <div className="border-t border-[#1f1f1f] px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-sm">
            Showing {startItem}-{endItem} of {formatNumber(pag.total)} {label || ''}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={pag.page === 1}
              className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pag.totalPages) }, (_, i) => {
                let pageNum: number
                if (pag.totalPages <= 5) pageNum = i + 1
                else if (pag.page <= 3) pageNum = i + 1
                else if (pag.page >= pag.totalPages - 2) pageNum = pag.totalPages - 4 + i
                else pageNum = pag.page - 2 + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                      pag.page === pageNum
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
              onClick={() => setPage(p => Math.min(pag.totalPages, p + 1))}
              disabled={pag.page === pag.totalPages}
              className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Cards</h1>
            <p className="text-slate-400">Manage virtual and instant card providers, issued cards, and transactions</p>
          </div>
        </div>

        {/* Provider Status Alerts */}
        {providers.length > 0 && (
          <div className="mb-4 space-y-2">
            {providers.map((p) => (
              <div key={p.provider} className={`p-3 rounded-lg border ${
                p.status.configured && p.status.enabled
                  ? 'bg-green-900/20 border-green-500/20 text-green-400'
                  : p.status.enabled && !p.status.configured
                  ? 'bg-yellow-900/20 border-yellow-500/20 text-yellow-400'
                  : 'bg-slate-900/20 border-slate-500/20 text-slate-400'
              }`}>
                <div className="flex items-center gap-2 text-sm">
                  <Icon name={p.status.configured && p.status.enabled ? 'check-circle' : p.status.enabled ? 'alert' : 'x-circle'} size={16} />
                  {p.status.configured && p.status.enabled
                    ? `${p.display_name} (${p.provider}) connected — ${p.status.mode} mode`
                    : p.status.enabled && !p.status.configured
                    ? `${p.display_name} (${p.provider}): Missing credentials`
                    : `${p.display_name} (${p.provider}): Disabled`
                  }
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'overview' as TabType, label: 'Overview', icon: 'credit-card' },
            { id: 'issued' as TabType, label: 'Cards Issued', icon: 'list' },
            { id: 'transactions' as TabType, label: 'Card Transactions', icon: 'wallet' },
            { id: 'providers' as TabType, label: 'Providers', icon: 'settings' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
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
                  <Icon name="credit-card" size={16} />
                  Total Cards
                </div>
                <p className="text-2xl font-bold text-white">{formatNumber(stats.total_cards)}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="check-circle" size={16} />
                  Active
                </div>
                <p className="text-2xl font-bold text-green-400">{formatNumber(stats.active_cards)}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="lock" size={16} />
                  Frozen
                </div>
                <p className="text-2xl font-bold text-blue-400">{formatNumber(stats.frozen_cards)}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="wallet" size={16} />
                  Revenue
                </div>
                <p className="text-2xl font-bold text-primary">{formatCurrency(stats.total_revenue)}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Icon name="tag" size={16} />
                  Fees Earned
                </div>
                <p className="text-2xl font-bold text-yellow-400">{formatCurrency(stats.total_fees)}</p>
              </div>
            </div>

            {/* Provider Breakdown */}
            {stats.by_provider.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {stats.by_provider.map((bp) => {
                  const providerConfig = providers.find(p => p.provider === bp.provider)
                  return (
                    <div key={bp.provider} className="bg-[#121212] border border-border-dark rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium capitalize">{bp.provider}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleCuratedMutation.mutate({ provider: bp.provider, field: 'is_featured', value: !providerConfig?.is_featured })}
                            className={`p-1.5 rounded-lg transition-colors ${providerConfig?.is_featured ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-600 hover:text-slate-400'}`}
                            title="Toggle Recommended for You"
                          ><Icon name="star" size={14} /></button>
                          <button
                            onClick={() => toggleCuratedMutation.mutate({ provider: bp.provider, field: 'is_staff_pick', value: !providerConfig?.is_staff_pick })}
                            className={`p-1.5 rounded-lg transition-colors ${providerConfig?.is_staff_pick ? 'text-primary bg-primary/10' : 'text-slate-600 hover:text-slate-400'}`}
                            title="Toggle Staff Pick"
                          ><Icon name="crown" size={14} /></button>
                          <span className="text-slate-400 text-sm">{bp.active_count} active</span>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-white">{formatNumber(bp.card_count)} cards</p>
                    </div>
                  )
                })}
              </div>
            )}

          </>
        )}

        {/* Providers Tab */}
        {activeTab === 'providers' && (
          <div className="space-y-4">
            {loadingProviders ? (
              <div className="text-center py-8 text-slate-400">Loading providers...</div>
            ) : providersError ? (
              <div className="text-center py-8 text-red-400">Failed to load providers</div>
            ) : providers.length === 0 ? (
              <div className="bg-[#121212] border border-border-dark rounded-xl p-8 text-center">
                <Icon name="credit-card" size={48} className="text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-2">No card providers configured</p>
                <Link href="/admin/settings" className="text-primary hover:underline text-sm">
                  Configure in Settings
                </Link>
              </div>
            ) : (
              providers.map((p) => (
                <div key={p.provider} className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
                  <div className="p-5 border-b border-border-dark flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold text-lg">{p.display_name}</h3>
                      <p className="text-slate-400 text-sm capitalize">{p.provider} — {p.status.mode} mode</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleCuratedMutation.mutate({ provider: p.provider, field: 'is_featured', value: !p.is_featured })}
                        className={`p-1.5 rounded-lg transition-colors ${p.is_featured ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-600 hover:text-slate-400'}`}
                        title="Toggle Recommended for You"
                      ><Icon name="star" size={14} /></button>
                      <button
                        onClick={() => toggleCuratedMutation.mutate({ provider: p.provider, field: 'is_staff_pick', value: !p.is_staff_pick })}
                        className={`p-1.5 rounded-lg transition-colors ${p.is_staff_pick ? 'text-primary bg-primary/10' : 'text-slate-600 hover:text-slate-400'}`}
                        title="Toggle Staff Pick"
                      ><Icon name="crown" size={14} /></button>
                      {p.status.configured ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-900/30 text-green-400 border border-green-500/20">Configured</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-900/30 text-red-400 border border-red-500/20">Not Configured</span>
                      )}
                      {p.status.enabled ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary border border-primary/30">Enabled</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-slate-900/30 text-slate-400 border border-slate-500/20">Disabled</span>
                      )}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Creation Fee</p>
                        <p className="text-white font-medium">{formatCurrency(Number(p.creation_fee))}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Top-Up Fee</p>
                        <p className="text-white font-medium">{Number(p.top_up_fee_percent)}%</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Instant Markup</p>
                        <p className="text-white font-medium">{Number(p.instant_markup_percent)}%</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Top-Up Range</p>
                        <p className="text-white font-medium">{formatCurrency(Number(p.min_top_up))} — {formatCurrency(Number(p.max_top_up))}</p>
                      </div>
                    </div>
                    {p.features?.description && (
                      <p className="text-slate-400 text-sm mt-3">{p.features.description}</p>
                    )}
                    {p.features?.['3d_secure'] && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs rounded bg-amber-900/30 text-amber-400 border border-amber-500/20">3D Secure Enabled</span>
                    )}
                    {p.features?.instant && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs rounded bg-purple-900/30 text-purple-400 border border-purple-500/20">Instant Cards</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Cards Issued Tab */}
        {activeTab === 'issued' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCardsPage(1) }}
                className="px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-white text-sm"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="frozen">Frozen</option>
                <option value="expired">Expired</option>
                <option value="used">Used</option>
              </select>
              <select
                value={providerFilter}
                onChange={(e) => { setProviderFilter(e.target.value); setCardsPage(1) }}
                className="px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-white text-sm"
              >
                <option value="">All Providers</option>
                {providers.map(p => (
                  <option key={p.provider} value={p.provider}>{p.display_name}</option>
                ))}
              </select>
            </div>

            <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-dark text-left">
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Card</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">User</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Provider</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Type</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Balance</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Status</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Created</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCards ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                    ) : cardsError ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-red-400">Failed to load cards</td></tr>
                    ) : cards.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No cards found</td></tr>
                    ) : (
                      cards.map((card) => (
                        <tr key={card.id} className="border-b border-border-dark hover:bg-white/5">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium capitalize">{card.card_brand}</span>
                              <span className="text-slate-500 font-mono text-sm">****{card.card_last_four}</span>
                              {card.is_premium && <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-900/30 text-amber-400 border border-amber-500/20">3DS</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-white text-sm">{card.user_name || 'Unknown'}</p>
                              <p className="text-slate-500 text-xs">{card.user_email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400 capitalize">{card.provider}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full border ${
                              card.card_type === 'virtual'
                                ? 'bg-blue-900/30 text-blue-400 border-blue-500/20'
                                : 'bg-purple-900/30 text-purple-400 border-purple-500/20'
                            }`}>
                              {card.card_type === 'virtual' ? 'Virtual' : 'Instant'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white font-medium">
                            {card.card_type === 'virtual'
                              ? formatCurrency(card.balance || 0)
                              : formatCurrency(card.denomination || 0)
                            }
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(card.status)}</td>
                          <td className="px-4 py-3 text-slate-400 text-sm">{formatDateShort(card.created_at, tz)}</td>
                          <td className="px-4 py-3 text-slate-400 text-sm">{card.expires_at ? formatDateShort(card.expires_at, tz) : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(pagination, setCardsPage, 'cards')}
            </div>
          </>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={txTypeFilter}
                onChange={(e) => { setTxTypeFilter(e.target.value); setTxPage(1) }}
                className="px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-white text-sm"
              >
                <option value="">All Types</option>
                <option value="creation">Creation</option>
                <option value="top_up">Top Up</option>
                <option value="spend">Spend</option>
                <option value="purchase">Purchase</option>
                <option value="refund">Refund</option>
              </select>
              <select
                value={txProviderFilter}
                onChange={(e) => { setTxProviderFilter(e.target.value); setTxPage(1) }}
                className="px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-white text-sm"
              >
                <option value="">All Providers</option>
                {providers.map(p => (
                  <option key={p.provider} value={p.provider}>{p.display_name}</option>
                ))}
              </select>
            </div>

            <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-dark text-left">
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Type</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">User</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Card</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Provider</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Amount</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Fee</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Merchant</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTx ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                    ) : txError ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-red-400">Failed to load transactions</td></tr>
                    ) : !txData?.transactions?.length ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No transactions found</td></tr>
                    ) : (
                      txData.transactions.map((tx: CardTransaction) => (
                        <tr key={tx.id} className="border-b border-border-dark hover:bg-white/5">
                          <td className="px-4 py-3">{getTxTypeBadge(tx.type)}</td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-white text-sm">{tx.user_name || 'Unknown'}</p>
                              <p className="text-slate-500 text-xs">{tx.user_email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-slate-400 font-mono text-sm">
                              {tx.card_last_four ? `****${tx.card_last_four}` : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 capitalize">{tx.provider}</td>
                          <td className="px-4 py-3 text-white font-medium">{formatCurrency(tx.amount)}</td>
                          <td className="px-4 py-3 text-slate-400">{tx.fee > 0 ? formatCurrency(tx.fee) : '-'}</td>
                          <td className="px-4 py-3 text-slate-400 text-sm">{tx.merchant_name || '-'}</td>
                          <td className="px-4 py-3 text-slate-400 text-sm">{formatDateShort(tx.created_at, tz)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(txPagination, setTxPage, 'transactions')}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

export default function AdminCardsPage() {
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
      <AdminCardsPageContent />
    </Suspense>
  )
}
