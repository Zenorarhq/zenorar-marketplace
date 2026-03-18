'use client'

import { useState, useEffect, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { formatNumber } from '@/lib/formatNumber'
import { localApiFetch } from '@/lib/api/client'

interface VirtualNumber {
  id: string
  phone_number: string
  phone_number_display: string
  status: string
  nickname: string | null
  user_email: string
  user_name: string
  country_name: string
  country_code: string
  flag_emoji: string
  plan_name: string
  plan_price: number
  sms_sent_count: number
  sms_received_count: number
  created_at: string
  expires_at: string | null
}

interface Plan {
  id: string
  name: string
  slug: string
  duration_type: string
  duration_days: number
  sms_included: number
  voice_minutes_included: number
  unlimited_sms: boolean
  unlimited_voice: boolean
  base_price: number
  is_active: boolean
  is_featured: boolean
  total_subscriptions: string
  active_subscriptions: string
}

interface Country {
  id: string
  name: string
  iso_code: string
  dial_code: string
  flag_emoji: string
  sms_enabled: boolean
  voice_enabled: boolean
  mms_enabled: boolean
  provider: string
  cost_monthly: number
  retail_monthly: number
  is_active: boolean
  total_numbers: string
  active_numbers: string
}

interface Stats {
  total: string
  active: string
  expired: string
  cancelled: string
  total_sms_sent: string
  total_sms_received: string
}

interface DetailedStats {
  overview: {
    total_numbers: string
    active_numbers: string
    expired_numbers: string
    cancelled_numbers: string
    unique_users: string
    total_sms_sent: string
    total_sms_received: string
    total_voice_minutes: string
  }
  expiringSoon: { id: string; phone_number: string; phone_number_display: string; expires_at: string; user_email: string; flag_emoji: string }[]
  byCountry: { country: string; iso_code: string; flag_emoji: string; count: string; active: string }[]
}

type TabType = 'overview' | 'plans' | 'countries' | 'providers'

function AdminVirtualNumbersContent() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const tabParam = searchParams.get('tab') as TabType | null
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'overview')

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setCurrentPage(1)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/admin/virtual-numbers?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (tabParam && ['overview', 'plans', 'countries', 'providers'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Filters & pagination
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // Plan/Country modals
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [editingCountry, setEditingCountry] = useState<Country | null>(null)
  const [formError, setFormError] = useState('')

  // Sync
  const [showSyncDetails, setShowSyncDetails] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<any>(null)

  // Plan form state
  const [planForm, setPlanForm] = useState({
    name: '', slug: '', duration_type: 'monthly', duration_days: '30',
    sms_included: '100', voice_minutes_included: '0', unlimited_sms: false,
    unlimited_voice: false, base_price: '', is_active: true, is_featured: false,
  })

  // Country form state
  const [countryForm, setCountryForm] = useState({
    name: '', iso_code: '', dial_code: '', flag_emoji: '',
    sms_enabled: true, voice_enabled: true, mms_enabled: false,
    provider: 'twilio', cost_monthly: '', retail_monthly: '', is_active: true,
  })

  // Fetch numbers (paginated)
  const { data: numbersData, isLoading: loadingNumbers } = useQuery({
    queryKey: ['admin-virtual-numbers', currentPage, statusFilter, searchQuery, countryFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', currentPage.toString())
      params.set('limit', pageSize.toString())
      if (statusFilter) params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (countryFilter) params.set('country', countryFilter)
      const result = await localApiFetch(`/admin/virtual-numbers?${params}`)
      if (!result.success) throw new Error(result.error)
      return result.data as any
    },
    enabled: activeTab === 'overview',
  })

  // Fetch detailed stats
  const { data: detailedStats } = useQuery<DetailedStats>({
    queryKey: ['admin-virtual-numbers-stats'],
    queryFn: async () => {
      const result = await localApiFetch<DetailedStats>('/admin/virtual-numbers/stats')
      if (!result.success) throw new Error(result.error)
      return result.data as DetailedStats
    },
    enabled: activeTab === 'overview',
  })

  // Fetch plans
  const { data: plans = [], isLoading: loadingPlans } = useQuery<Plan[]>({
    queryKey: ['admin-virtual-number-plans'],
    queryFn: async () => {
      const result = await localApiFetch('/admin/virtual-numbers/plans')
      if (!result.success) throw new Error(result.error)
      return result.data as Plan[]
    },
    enabled: activeTab === 'plans' || activeTab === 'overview',
  })

  // Fetch countries
  const { data: countries = [], isLoading: loadingCountries } = useQuery<Country[]>({
    queryKey: ['admin-virtual-number-countries'],
    queryFn: async () => {
      const result = await localApiFetch('/admin/virtual-numbers/countries')
      if (!result.success) throw new Error(result.error)
      return result.data as Country[]
    },
    enabled: activeTab === 'countries' || activeTab === 'overview',
  })

  // Fetch provider status
  const { data: providerStatus } = useQuery({
    queryKey: ['virtual-number-provider-status'],
    queryFn: async () => {
      const result = await localApiFetch('/admin/sync/virtual-numbers')
      return result as any
    },
    enabled: activeTab === 'providers',
  })

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const result = await localApiFetch('/admin/sync/virtual-numbers', { method: 'POST' })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-virtual-numbers'] })
      queryClient.invalidateQueries({ queryKey: ['admin-virtual-number-countries'] })
      queryClient.invalidateQueries({ queryKey: ['admin-virtual-number-plans'] })
      queryClient.invalidateQueries({ queryKey: ['virtual-number-provider-status'] })
      setLastSyncResult(data)
      setShowSyncDetails(true)
    },
    onError: (error: any) => {
      setLastSyncResult({ success: false, error: error.message })
      setShowSyncDetails(true)
    },
  })

  // Save plan mutation
  const savePlanMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('admin_auth_token')
      const method = editingPlan ? 'PATCH' : 'POST'
      const body = editingPlan ? { id: editingPlan.id, ...data } : data
      const res = await fetch('/api/admin/virtual-numbers/plans', {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-virtual-number-plans'] })
      setShowPlanModal(false)
      setEditingPlan(null)
    },
    onError: (error: any) => setFormError(error.message),
  })

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('admin_auth_token')
      const res = await fetch(`/api/admin/virtual-numbers/plans?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-virtual-number-plans'] })
    },
    onError: (error: any) => alert(error.message),
  })

  // Save country mutation
  const saveCountryMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('admin_auth_token')
      const method = editingCountry ? 'PATCH' : 'POST'
      const body = editingCountry ? { id: editingCountry.id, ...data } : data
      const res = await fetch('/api/admin/virtual-numbers/countries', {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-virtual-number-countries'] })
      setShowCountryModal(false)
      setEditingCountry(null)
    },
    onError: (error: any) => setFormError(error.message),
  })

  // Helpers
  const resetPlanForm = () => {
    setPlanForm({ name: '', slug: '', duration_type: 'monthly', duration_days: '30', sms_included: '100', voice_minutes_included: '0', unlimited_sms: false, unlimited_voice: false, base_price: '', is_active: true, is_featured: false })
    setFormError('')
  }

  const resetCountryForm = () => {
    setCountryForm({ name: '', iso_code: '', dial_code: '', flag_emoji: '', sms_enabled: true, voice_enabled: true, mms_enabled: false, provider: 'twilio', cost_monthly: '', retail_monthly: '', is_active: true })
    setFormError('')
  }

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan)
    setPlanForm({
      name: plan.name, slug: plan.slug, duration_type: plan.duration_type, duration_days: plan.duration_days.toString(),
      sms_included: plan.sms_included.toString(), voice_minutes_included: plan.voice_minutes_included.toString(),
      unlimited_sms: plan.unlimited_sms, unlimited_voice: plan.unlimited_voice,
      base_price: plan.base_price.toString(), is_active: plan.is_active, is_featured: plan.is_featured,
    })
    setShowPlanModal(true)
  }

  const handleEditCountry = (country: Country) => {
    setEditingCountry(country)
    setCountryForm({
      name: country.name, iso_code: country.iso_code, dial_code: country.dial_code, flag_emoji: country.flag_emoji || '',
      sms_enabled: country.sms_enabled, voice_enabled: country.voice_enabled, mms_enabled: country.mms_enabled,
      provider: country.provider || 'twilio', cost_monthly: country.cost_monthly?.toString() || '',
      retail_monthly: country.retail_monthly?.toString() || '', is_active: country.is_active,
    })
    setShowCountryModal(true)
  }

  const handleSavePlan = () => {
    setFormError('')
    if (!planForm.name || !planForm.slug || !planForm.base_price) {
      setFormError('Name, slug, and base price are required')
      return
    }
    savePlanMutation.mutate({
      name: planForm.name, slug: planForm.slug, duration_type: planForm.duration_type,
      duration_days: parseInt(planForm.duration_days), sms_included: parseInt(planForm.sms_included),
      voice_minutes_included: parseInt(planForm.voice_minutes_included), unlimited_sms: planForm.unlimited_sms,
      unlimited_voice: planForm.unlimited_voice, base_price: parseFloat(planForm.base_price),
      is_active: planForm.is_active, is_featured: planForm.is_featured,
    })
  }

  const handleSaveCountry = () => {
    setFormError('')
    if (!countryForm.name || !countryForm.iso_code || !countryForm.dial_code) {
      setFormError('Name, ISO code, and dial code are required')
      return
    }
    saveCountryMutation.mutate({
      name: countryForm.name, iso_code: countryForm.iso_code, dial_code: countryForm.dial_code,
      flag_emoji: countryForm.flag_emoji, sms_enabled: countryForm.sms_enabled, voice_enabled: countryForm.voice_enabled,
      mms_enabled: countryForm.mms_enabled, provider: countryForm.provider,
      cost_monthly: countryForm.cost_monthly ? parseFloat(countryForm.cost_monthly) : null,
      retail_monthly: countryForm.retail_monthly ? parseFloat(countryForm.retail_monthly) : null,
      is_active: countryForm.is_active,
    })
  }

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-900/30 text-green-400 border-green-500/20',
      expired: 'bg-red-900/30 text-red-400 border-red-500/20',
      cancelled: 'bg-slate-500/30 text-slate-400 border-slate-500/20',
      suspended: 'bg-yellow-900/30 text-yellow-400 border-yellow-500/20',
    }
    return <span className={`px-2 py-1 text-xs rounded-full border ${styles[status] || styles.cancelled}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
  }

  const numbers: VirtualNumber[] = numbersData?.numbers || []
  const stats: Stats | null = numbersData?.stats || null
  const pagination = numbersData?.pagination || { page: 1, total: 0, totalPages: 1 }

  const renderPagination = (total: number, totalPages: number) => {
    if (totalPages <= 1) return null
    return (
      <div className="border-t border-[#1f1f1f] px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-sm">
            Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, total)} of {formatNumber(total)}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) pageNum = i + 1
                else if (currentPage <= 3) pageNum = i + 1
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                else pageNum = currentPage - 2 + i
                return (
                  <button key={pageNum} onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm transition-colors ${currentPage === pageNum ? 'bg-primary text-black font-semibold' : 'bg-[#1a1a1a] hover:bg-white/10 text-slate-400'}`}>
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
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
            <h1 className="text-2xl font-bold text-white mb-1">Virtual Numbers</h1>
            <p className="text-slate-400">Manage virtual numbers, plans, and countries</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              <Icon name="refresh-cw" size={18} className={syncMutation.isPending ? 'animate-spin' : ''} />
              Sync Providers
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'overview' as TabType, label: 'Overview', icon: 'phone' },
            { id: 'plans' as TabType, label: 'Plans', icon: 'box' },
            { id: 'countries' as TabType, label: 'Countries', icon: 'globe' },
            { id: 'providers' as TabType, label: 'Providers', icon: 'settings' },
          ].map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-primary text-black' : 'bg-surface-dark text-slate-400 hover:text-white'}`}>
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
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2"><Icon name="phone" size={16} />Total Numbers</div>
                <p className="text-2xl font-bold text-white">{formatNumber(parseInt(detailedStats?.overview?.total_numbers || stats?.total || '0'))}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2"><Icon name="check-circle" size={16} />Active</div>
                <p className="text-2xl font-bold text-green-400">{formatNumber(parseInt(detailedStats?.overview?.active_numbers || stats?.active || '0'))}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2"><Icon name="clock" size={16} />Expired</div>
                <p className="text-2xl font-bold text-red-400">{formatNumber(parseInt(detailedStats?.overview?.expired_numbers || stats?.expired || '0'))}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2"><Icon name="chat" size={16} />SMS Sent</div>
                <p className="text-2xl font-bold text-blue-400">{formatNumber(parseInt(detailedStats?.overview?.total_sms_sent || stats?.total_sms_sent || '0'))}</p>
              </div>
              <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2"><Icon name="chat" size={16} />SMS Received</div>
                <p className="text-2xl font-bold text-purple-400">{formatNumber(parseInt(detailedStats?.overview?.total_sms_received || stats?.total_sms_received || '0'))}</p>
              </div>
            </div>

            {/* Expiring Soon Alert */}
            {detailedStats?.expiringSoon && detailedStats.expiringSoon.length > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-4 mb-6">
                <h3 className="text-yellow-400 font-bold mb-3 flex items-center gap-2">
                  <Icon name="alert" size={18} />
                  Expiring Soon (next 7 days)
                </h3>
                <div className="space-y-2">
                  {detailedStats.expiringSoon.map(n => (
                    <div key={n.id} className="flex items-center justify-between text-sm">
                      <span className="text-white">{n.flag_emoji} {n.phone_number_display || n.phone_number} — {n.user_email}</span>
                      <span className="text-yellow-400 font-medium">{new Date(n.expires_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Numbers by Country */}
            {detailedStats?.byCountry && detailedStats.byCountry.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {detailedStats.byCountry.map(c => (
                  <div key={c.iso_code} className="bg-[#121212] border border-border-dark rounded-xl p-4">
                    <p className="text-slate-400 text-sm mb-1">{c.flag_emoji} {c.country}</p>
                    <p className="text-white text-xl font-bold">{c.count}</p>
                    <p className="text-green-400 text-xs">{c.active} active</p>
                  </div>
                ))}
              </div>
            )}

            {/* Filters */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search by phone or email..." value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="suspended">Suspended</option>
                </select>
                <select value={countryFilter} onChange={(e) => { setCountryFilter(e.target.value); setCurrentPage(1) }}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">All Countries</option>
                  {countries.map(c => (
                    <option key={c.iso_code} value={c.iso_code}>{c.flag_emoji} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Numbers Table */}
            <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-dark text-left">
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Number</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">User</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Country</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Plan</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">SMS</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Status</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingNumbers ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                    ) : numbers.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No virtual numbers found.</td></tr>
                    ) : (
                      numbers.map(n => (
                        <tr key={n.id} className="border-b border-border-dark hover:bg-white/5">
                          <td className="px-4 py-3">
                            <p className="text-white font-medium font-mono text-sm">{n.phone_number_display || n.phone_number}</p>
                            {n.nickname && <p className="text-slate-500 text-xs">{n.nickname}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-white text-sm">{n.user_name}</p>
                            <p className="text-slate-500 text-xs">{n.user_email}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-sm">{n.flag_emoji} {n.country_name}</td>
                          <td className="px-4 py-3 text-slate-400 text-sm">{n.plan_name || '-'}</td>
                          <td className="px-4 py-3 text-slate-400 text-sm">{n.sms_sent_count}↑ {n.sms_received_count}↓</td>
                          <td className="px-4 py-3">{getStatusBadge(n.status)}</td>
                          <td className="px-4 py-3 text-slate-400 text-sm">{n.expires_at ? new Date(n.expires_at).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(pagination.total, pagination.totalPages)}
            </div>
          </>
        )}

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => { resetPlanForm(); setEditingPlan(null); setShowPlanModal(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all">
                <Icon name="plus" size={18} />Add Plan
              </button>
            </div>
            <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-dark text-left">
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Plan</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Duration</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">SMS Included</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Price</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Subscriptions</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Status</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingPlans ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                    ) : plans.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No plans found.</td></tr>
                    ) : (
                      plans.map(plan => (
                        <tr key={plan.id} className="border-b border-border-dark hover:bg-white/5">
                          <td className="px-4 py-3">
                            <p className="text-white font-medium">{plan.name}</p>
                            <p className="text-slate-500 text-xs">{plan.slug}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-sm">{plan.duration_days} days</td>
                          <td className="px-4 py-3 text-slate-400 text-sm">{plan.unlimited_sms ? 'Unlimited' : plan.sms_included}</td>
                          <td className="px-4 py-3 text-white text-sm font-medium">${Number(plan.base_price).toFixed(2)}</td>
                          <td className="px-4 py-3 text-slate-400 text-sm">
                            <span className="text-green-400">{plan.active_subscriptions}</span> / {plan.total_subscriptions}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full border ${plan.is_active ? 'bg-green-900/30 text-green-400 border-green-500/20' : 'bg-red-900/30 text-red-400 border-red-500/20'}`}>
                              {plan.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleEditPlan(plan)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                <Icon name="edit" size={16} />
                              </button>
                              <button onClick={() => { if (confirm('Delete this plan?')) deletePlanMutation.mutate(plan.id) }}
                                disabled={parseInt(plan.total_subscriptions) > 0}
                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                <Icon name="delete" size={16} />
                              </button>
                            </div>
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

        {/* Countries Tab */}
        {activeTab === 'countries' && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => { resetCountryForm(); setEditingCountry(null); setShowCountryModal(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all">
                <Icon name="plus" size={18} />Add Country
              </button>
            </div>
            <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-dark text-left">
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Country</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Code</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Capabilities</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Cost/mo</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Retail/mo</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Numbers</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Status</th>
                      <th className="px-4 py-3 text-sm font-medium text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCountries ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                    ) : countries.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No countries found.</td></tr>
                    ) : (
                      countries.map(country => (
                        <tr key={country.id} className="border-b border-border-dark hover:bg-white/5">
                          <td className="px-4 py-3">
                            <span className="text-white font-medium">{country.flag_emoji} {country.name}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-sm">{country.iso_code} ({country.dial_code})</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {country.sms_enabled && <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-900/30 text-blue-400 border border-blue-500/20">SMS</span>}
                              {country.voice_enabled && <span className="px-1.5 py-0.5 text-[10px] rounded bg-green-900/30 text-green-400 border border-green-500/20">Voice</span>}
                              {country.mms_enabled && <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-900/30 text-purple-400 border border-purple-500/20">MMS</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-sm">{country.cost_monthly ? `$${Number(country.cost_monthly).toFixed(2)}` : '-'}</td>
                          <td className="px-4 py-3 text-white text-sm font-medium">{country.retail_monthly ? `$${Number(country.retail_monthly).toFixed(2)}` : '-'}</td>
                          <td className="px-4 py-3 text-slate-400 text-sm">
                            <span className="text-green-400">{country.active_numbers}</span> / {country.total_numbers}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full border ${country.is_active ? 'bg-green-900/30 text-green-400 border-green-500/20' : 'bg-red-900/30 text-red-400 border-red-500/20'}`}>
                              {country.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleEditCountry(country)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
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
          </>
        )}

        {/* Providers Tab */}
        {activeTab === 'providers' && (
          <>
            {providerStatus?.enabledProviders?.length > 0 ? (
              <div className="space-y-3 mb-6">
                {providerStatus.enabledProviders.map((p: string) => (
                  <div key={p} className="bg-green-900/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                    <Icon name="check-circle" size={18} className="text-green-400" />
                    <span className="text-green-400 text-sm font-medium capitalize">{p} — Connected</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-4 mb-6">
                <p className="text-yellow-400 text-sm">No providers enabled. Go to <a href="/admin/settings" className="underline">Settings</a> to configure providers.</p>
              </div>
            )}

            <div className="bg-[#121212] border border-border-dark rounded-xl p-6">
              <h3 className="text-white font-bold mb-4">Available Providers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(providerStatus?.availableProviders || ['twilio', 'plivo', 'vonage']).map((p: string) => {
                  const isEnabled = providerStatus?.enabledProviders?.includes(p)
                  return (
                    <div key={p} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-white font-semibold capitalize">{p}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full border ${isEnabled ? 'bg-green-900/30 text-green-400 border-green-500/20' : 'bg-slate-500/30 text-slate-400 border-slate-500/20'}`}>
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-sm">Configure in Settings → Virtual Numbers</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-border-dark rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">{editingPlan ? 'Edit Plan' : 'Add Plan'}</h2>
                <button onClick={() => { setShowPlanModal(false); setEditingPlan(null) }} className="text-slate-400 hover:text-white"><Icon name="close" size={20} /></button>
              </div>

              {formError && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4"><p className="text-red-400 text-sm">{formError}</p></div>}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
                  <input type="text" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value, slug: editingPlan ? planForm.slug : generateSlug(e.target.value) })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Slug *</label>
                  <input type="text" value={planForm.slug} onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })} disabled={!!editingPlan}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Duration Type</label>
                    <select value={planForm.duration_type} onChange={(e) => setPlanForm({ ...planForm, duration_type: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Duration (days)</label>
                    <input type="number" value={planForm.duration_days} onChange={(e) => setPlanForm({ ...planForm, duration_days: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">SMS Included</label>
                    <input type="number" value={planForm.sms_included} onChange={(e) => setPlanForm({ ...planForm, sms_included: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Base Price ($) *</label>
                    <input type="number" step="0.01" value={planForm.base_price} onChange={(e) => setPlanForm({ ...planForm, base_price: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={planForm.unlimited_sms} onChange={(e) => setPlanForm({ ...planForm, unlimited_sms: e.target.checked })} className="rounded border-[#2a2a2a] bg-[#1a1a1a]" />
                    Unlimited SMS
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={planForm.is_active} onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })} className="rounded border-[#2a2a2a] bg-[#1a1a1a]" />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={planForm.is_featured} onChange={(e) => setPlanForm({ ...planForm, is_featured: e.target.checked })} className="rounded border-[#2a2a2a] bg-[#1a1a1a]" />
                    Featured
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowPlanModal(false); setEditingPlan(null) }} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={handleSavePlan} disabled={savePlanMutation.isPending}
                  className="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 disabled:opacity-50">
                  {savePlanMutation.isPending ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Country Modal */}
      {showCountryModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-border-dark rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">{editingCountry ? 'Edit Country' : 'Add Country'}</h2>
                <button onClick={() => { setShowCountryModal(false); setEditingCountry(null) }} className="text-slate-400 hover:text-white"><Icon name="close" size={20} /></button>
              </div>

              {formError && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4"><p className="text-red-400 text-sm">{formError}</p></div>}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Country Name *</label>
                    <input type="text" value={countryForm.name} onChange={(e) => setCountryForm({ ...countryForm, name: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Flag Emoji</label>
                    <input type="text" value={countryForm.flag_emoji} onChange={(e) => setCountryForm({ ...countryForm, flag_emoji: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="🇺🇸" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">ISO Code *</label>
                    <input type="text" value={countryForm.iso_code} onChange={(e) => setCountryForm({ ...countryForm, iso_code: e.target.value.toUpperCase() })} maxLength={2} disabled={!!editingCountry}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" placeholder="US" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Dial Code *</label>
                    <input type="text" value={countryForm.dial_code} onChange={(e) => setCountryForm({ ...countryForm, dial_code: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="+1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Cost/month ($)</label>
                    <input type="number" step="0.01" value={countryForm.cost_monthly} onChange={(e) => setCountryForm({ ...countryForm, cost_monthly: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Retail/month ($)</label>
                    <input type="number" step="0.01" value={countryForm.retail_monthly} onChange={(e) => setCountryForm({ ...countryForm, retail_monthly: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Provider</label>
                  <select value={countryForm.provider} onChange={(e) => setCountryForm({ ...countryForm, provider: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="twilio">Twilio</option><option value="plivo">Plivo</option><option value="vonage">Vonage</option>
                    <option value="bandwidth">Bandwidth</option><option value="telnyx">Telnyx</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={countryForm.sms_enabled} onChange={(e) => setCountryForm({ ...countryForm, sms_enabled: e.target.checked })} className="rounded border-[#2a2a2a] bg-[#1a1a1a]" />SMS
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={countryForm.voice_enabled} onChange={(e) => setCountryForm({ ...countryForm, voice_enabled: e.target.checked })} className="rounded border-[#2a2a2a] bg-[#1a1a1a]" />Voice
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={countryForm.mms_enabled} onChange={(e) => setCountryForm({ ...countryForm, mms_enabled: e.target.checked })} className="rounded border-[#2a2a2a] bg-[#1a1a1a]" />MMS
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={countryForm.is_active} onChange={(e) => setCountryForm({ ...countryForm, is_active: e.target.checked })} className="rounded border-[#2a2a2a] bg-[#1a1a1a]" />Active
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowCountryModal(false); setEditingCountry(null) }} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={handleSaveCountry} disabled={saveCountryMutation.isPending}
                  className="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 disabled:opacity-50">
                  {saveCountryMutation.isPending ? 'Saving...' : editingCountry ? 'Update Country' : 'Add Country'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Results Modal */}
      {showSyncDetails && lastSyncResult && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-border-dark rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Sync Results</h2>
                <button onClick={() => setShowSyncDetails(false)} className="text-slate-400 hover:text-white"><Icon name="close" size={20} /></button>
              </div>
              {lastSyncResult.success ? (
                <div className="space-y-2">
                  <p className="text-green-400 font-medium">Sync completed successfully</p>
                  <p className="text-slate-400 text-sm">Synced: {lastSyncResult.totalSynced || 0} | Updated: {lastSyncResult.totalUpdated || 0}</p>
                </div>
              ) : (
                <p className="text-red-400">{lastSyncResult.error || 'Sync failed'}</p>
              )}
              <div className="flex justify-end mt-4">
                <button onClick={() => setShowSyncDetails(false)} className="px-4 py-2 bg-primary text-black font-bold rounded-lg">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default function AdminVirtualNumbersPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-400">Loading virtual numbers...</p>
          </div>
        </div>
      </AdminLayout>
    }>
      <AdminVirtualNumbersContent />
    </Suspense>
  )
}
