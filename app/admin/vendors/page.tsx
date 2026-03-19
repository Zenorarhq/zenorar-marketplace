'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { apiFetch } from '@/lib/api/client'

type Tab = 'overview' | 'applications' | 'vendors' | 'payouts'

// ─── API helpers ──────────────────────────────────────────────────────────────

async function vendorFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await apiFetch<T>(`/vendor${path}`, opts)
  if (!res.success) throw new Error((res as any).error || 'Request failed')
  return (res as any).data ?? (res as any)
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, color = 'primary' }: {
  label: string; value: string | number; sub?: string; icon: string; color?: string
}) {
  const colorMap: Record<string, string> = {
    primary: 'text-primary bg-primary/10',
    green: 'text-green-400 bg-green-400/10',
    yellow: 'text-yellow-400 bg-yellow-400/10',
    red: 'text-red-400 bg-red-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
  }
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.primary}`}>
          <Icon name={icon} size={16} />
        </span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING:   'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    APPROVED:  'bg-green-500/20 text-green-400 border border-green-500/30',
    REJECTED:  'bg-red-500/20 text-red-400 border border-red-500/30',
    PAID:      'bg-green-500/20 text-green-400 border border-green-500/30',
    CANCELLED: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
    AVAILABLE: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    LOCKED:    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
      {status}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminVendorsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('overview')

  // Application tab state
  const [appStatusFilter, setAppStatusFilter] = useState('PENDING')
  const [appPage, setAppPage] = useState(1)
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null)

  // Vendors tab state
  const [vendorSearch, setVendorSearch] = useState('')
  const [vendorPage, setVendorPage] = useState(1)
  const [selectedVendor, setSelectedVendor] = useState<any>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  // Payouts tab state
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('PENDING')
  const [payoutPage, setPayoutPage] = useState(1)
  const [expandedPayoutId, setExpandedPayoutId] = useState<string | null>(null)
  const [txHashInput, setTxHashInput] = useState<Record<string, string>>({})
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({})

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: stats } = useQuery({
    queryKey: ['vendor-admin-stats'],
    queryFn: () => vendorFetch<any>('/admin/stats'),
    refetchInterval: 30000,
  })

  const { data: applicationsData, isLoading: appsLoading } = useQuery({
    queryKey: ['vendor-applications', appStatusFilter, appPage],
    queryFn: () => vendorFetch<any>(`/admin/applications?status=${appStatusFilter}&page=${appPage}&limit=20`),
    enabled: tab === 'applications',
  })

  const { data: vendorsData, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendor-list', vendorSearch, vendorPage],
    queryFn: () => vendorFetch<any>(`/admin/vendors?search=${encodeURIComponent(vendorSearch)}&page=${vendorPage}&limit=20`),
    enabled: tab === 'vendors',
  })

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery({
    queryKey: ['vendor-payouts-admin', payoutStatusFilter, payoutPage],
    queryFn: () => vendorFetch<any>(`/admin/payouts?status=${payoutStatusFilter}&page=${payoutPage}&limit=20`),
    enabled: tab === 'payouts',
  })

  const { data: vendorDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['vendor-detail', selectedVendor?.id],
    queryFn: () => vendorFetch<any>(`/admin/vendors/${selectedVendor.id}`),
    enabled: !!selectedVendor?.id,
  })

  // ── Mutations ────────────────────────────────────────────────────────────

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/vendor/admin/applications/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-applications'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-admin-stats'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/vendor/admin/applications/${id}/reject`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-applications'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-admin-stats'] })
    },
  })

  const suspendMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/vendor/admin/vendors/${id}/suspend`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendor-list'] }),
  })

  const reinstateMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/vendor/admin/vendors/${id}/reinstate`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendor-list'] }),
  })

  const markPaidMutation = useMutation({
    mutationFn: ({ id, txHash }: { id: string; txHash: string }) =>
      apiFetch(`/vendor/admin/payouts/${id}/mark-paid`, { method: 'POST', body: JSON.stringify({ txHash }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payouts-admin'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-admin-stats'] })
    },
  })

  const rejectPayoutMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      apiFetch(`/vendor/admin/payouts/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendor-payouts-admin'] }),
  })

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleAdjustBalance() {
    if (!selectedVendor || !adjustAmount) return
    setAdjusting(true)
    await apiFetch(`/vendor/admin/vendors/${selectedVendor.id}/adjust-balance`, {
      method: 'POST',
      body: JSON.stringify({ amount: Number(adjustAmount), note: adjustNote }),
    })
    setAdjusting(false)
    setAdjustAmount('')
    setAdjustNote('')
    queryClient.invalidateQueries({ queryKey: ['vendor-detail', selectedVendor.id] })
    queryClient.invalidateQueries({ queryKey: ['vendor-list'] })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'chart' },
    { id: 'applications', label: 'Applications', icon: 'document' },
    { id: 'vendors', label: 'Active Vendors', icon: 'users' },
    { id: 'payouts', label: 'Payouts', icon: 'wallet' },
  ]

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Vendor Management</h1>
          <p className="text-slate-400 text-sm">Manage vendor applications, commissions, and payouts.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto max-w-full">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                tab === t.id ? 'bg-primary text-black' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-slate-400 hover:text-white'
              }`}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
              {t.id === 'applications' && (stats?.pendingApplications > 0) && (
                <span className="bg-yellow-500 text-black text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {stats.pendingApplications}
                </span>
              )}
              {t.id === 'payouts' && (stats?.pendingPayouts > 0) && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {stats.pendingPayouts}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard label="Total Vendors" value={stats?.totalVendors ?? '—'} icon="users" color="primary" />
              <StatCard label="Pending Applications" value={stats?.pendingApplications ?? '—'} icon="document" color="yellow" />
              <StatCard label="Commission Paid" value={stats ? `$${Number(stats.totalCommissionPaid).toFixed(2)}` : '—'} icon="check" color="green" />
              <StatCard label="Pending Payouts" value={stats?.pendingPayouts ?? '—'} icon="wallet" color="red" />
              <StatCard label="Pending Amount" value={stats ? `$${Number(stats.pendingPayoutAmount).toFixed(2)}` : '—'} icon="dollar" color="blue" />
            </div>
            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setTab('applications')} className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/20 transition-colors">
                  <Icon name="document" size={14} />
                  Review Applications ({stats?.pendingApplications ?? 0})
                </button>
                <button onClick={() => setTab('payouts')} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors">
                  <Icon name="wallet" size={14} />
                  Process Payouts ({stats?.pendingPayouts ?? 0})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── APPLICATIONS ─────────────────────────────────────────────── */}
        {tab === 'applications' && (
          <div className="space-y-4">
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 flex items-center gap-3">
              {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
                <button
                  key={s}
                  onClick={() => { setAppStatusFilter(s); setAppPage(1) }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${appStatusFilter === s ? 'bg-primary text-black' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-slate-400 hover:text-white'}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
              {appsLoading ? (
                <div className="text-center py-12 text-slate-400">Loading...</div>
              ) : !applicationsData?.length ? (
                <div className="text-center py-12 text-slate-500">No {appStatusFilter.toLowerCase()} applications</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1f1f1f] text-left">
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Applicant</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Business</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Country</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Avg Volume</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Applied</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]">
                    {applicationsData.map((app: any) => (
                      <>
                        <tr key={app.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-white font-medium">{app.full_name}</div>
                              <div className="text-slate-500 text-xs">{app.email}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{app.business_name}</td>
                          <td className="px-4 py-3 text-slate-400">{app.country}</td>
                          <td className="px-4 py-3 text-slate-400">{app.avg_order_volume}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{new Date(app.applied_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setExpandedAppId(expandedAppId === app.id ? null : app.id)}
                                className="text-xs text-slate-400 hover:text-white transition-colors"
                              >
                                {expandedAppId === app.id ? 'Hide' : 'View ID'}
                              </button>
                              {app.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => approveMutation.mutate(app.id)}
                                    disabled={approveMutation.isPending}
                                    className="text-xs text-green-400 hover:text-green-300 disabled:opacity-40"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => rejectMutation.mutate(app.id)}
                                    disabled={rejectMutation.isPending}
                                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedAppId === app.id && (
                          <tr key={`${app.id}-expanded`}>
                            <td colSpan={7} className="px-4 py-4 bg-[#0a0a0a]">
                              <div className="flex gap-6 items-start">
                                <div>
                                  <p className="text-xs text-slate-500 mb-2">ID Document</p>
                                  <a href={app.id_document_url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-primary text-sm hover:underline">
                                    <Icon name="document" size={14} />
                                    View Document
                                  </a>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">User ID</p>
                                  <p className="text-xs text-slate-400 font-mono">{app.user_id}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {applicationsData?.pagination && applicationsData.pagination.total > 20 && (
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Page {appPage} of {Math.ceil(applicationsData.pagination.total / 20)}</span>
                <div className="flex gap-2">
                  <button onClick={() => setAppPage(p => Math.max(1, p - 1))} disabled={appPage === 1} className="px-3 py-1 bg-[#111] border border-[#1f1f1f] rounded-lg disabled:opacity-40 hover:text-white">Previous</button>
                  <button onClick={() => setAppPage(p => p + 1)} disabled={appPage >= Math.ceil(applicationsData.pagination.total / 20)} className="px-3 py-1 bg-[#111] border border-[#1f1f1f] rounded-lg disabled:opacity-40 hover:text-white">Next</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVE VENDORS ────────────────────────────────────────────── */}
        {tab === 'vendors' && (
          <div className="space-y-4">
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
              <div className="relative w-full md:w-80">
                <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search vendors by name or email..."
                  value={vendorSearch}
                  onChange={e => { setVendorSearch(e.target.value); setVendorPage(1) }}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-4 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Vendors table */}
              <div className="lg:col-span-2 bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
                {vendorsLoading ? (
                  <div className="text-center py-12 text-slate-400">Loading...</div>
                ) : !vendorsData?.length ? (
                  <div className="text-center py-12 text-slate-500">No active vendors</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1f1f1f] text-left">
                        <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Vendor</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Total Earned</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Available</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a1a1a]">
                      {vendorsData.map((v: any) => (
                        <tr
                          key={v.id}
                          onClick={() => setSelectedVendor(v)}
                          className={`cursor-pointer hover:bg-white/[0.03] transition-colors ${selectedVendor?.id === v.id ? 'bg-primary/5' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300 shrink-0">
                                {v.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <div className="text-white text-sm">{v.name}</div>
                                <div className="text-slate-500 text-xs">{v.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">${Number(v.total_earned).toFixed(2)}</td>
                          <td className="px-4 py-3 text-green-400">${Number(v.available_balance).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            {v.vendor_suspended_at
                              ? <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/15 text-red-400">Suspended</span>
                              : <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/15 text-green-400">Active</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Vendor detail panel */}
              <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
                {!selectedVendor ? (
                  <div className="text-center py-12 text-slate-500 text-sm">Select a vendor to view details</div>
                ) : detailLoading ? (
                  <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
                ) : vendorDetail ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-white font-semibold">{vendorDetail.user?.name}</h3>
                      <p className="text-slate-500 text-xs">{vendorDetail.user?.email}</p>
                      {vendorDetail.application && (
                        <p className="text-slate-400 text-xs mt-1">{vendorDetail.application.business_name} · {vendorDetail.application.country}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Available', value: `$${vendorDetail.balance?.available?.toFixed(2) ?? '0.00'}`, color: 'text-green-400' },
                        { label: 'Locked', value: `$${vendorDetail.balance?.locked?.toFixed(2) ?? '0.00'}`, color: 'text-yellow-400' },
                        { label: 'Total Earned', value: `$${vendorDetail.balance?.lifetimeEarned?.toFixed(2) ?? '0.00'}`, color: 'text-white' },
                        { label: 'Total Paid', value: `$${vendorDetail.balance?.totalPaid?.toFixed(2) ?? '0.00'}`, color: 'text-slate-300' },
                      ].map(item => (
                        <div key={item.label} className="bg-[#0a0a0a] rounded-lg p-3">
                          <p className="text-xs text-slate-500">{item.label}</p>
                          <p className={`font-semibold text-sm ${item.color}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Manual adjust */}
                    <div className="border-t border-[#1f1f1f] pt-4">
                      <p className="text-xs text-slate-400 mb-2 font-medium">Manual Balance Adjustment</p>
                      <input
                        type="number"
                        value={adjustAmount}
                        onChange={e => setAdjustAmount(e.target.value)}
                        placeholder="Amount (use - to deduct)"
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs mb-2 focus:outline-none focus:border-primary/50"
                      />
                      <input
                        type="text"
                        value={adjustNote}
                        onChange={e => setAdjustNote(e.target.value)}
                        placeholder="Note (reason)"
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs mb-2 focus:outline-none focus:border-primary/50"
                      />
                      <button
                        onClick={handleAdjustBalance}
                        disabled={!adjustAmount || adjusting}
                        className="w-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-40"
                      >
                        {adjusting ? 'Adjusting...' : 'Apply Adjustment'}
                      </button>
                    </div>

                    {/* Suspend / Reinstate */}
                    <div className="border-t border-[#1f1f1f] pt-4 flex gap-2">
                      {selectedVendor.vendor_suspended_at ? (
                        <button
                          onClick={() => reinstateMutation.mutate(selectedVendor.id)}
                          disabled={reinstateMutation.isPending}
                          className="flex-1 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                        >
                          Reinstate Vendor
                        </button>
                      ) : (
                        <button
                          onClick={() => suspendMutation.mutate(selectedVendor.id)}
                          disabled={suspendMutation.isPending}
                          className="flex-1 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                        >
                          Suspend Vendor
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* ── PAYOUTS ───────────────────────────────────────────────────── */}
        {tab === 'payouts' && (
          <div className="space-y-4">
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 flex items-center gap-3">
              {['PENDING', 'PAID', 'REJECTED'].map(s => (
                <button
                  key={s}
                  onClick={() => { setPayoutStatusFilter(s); setPayoutPage(1) }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${payoutStatusFilter === s ? 'bg-primary text-black' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-slate-400 hover:text-white'}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
              {payoutsLoading ? (
                <div className="text-center py-12 text-slate-400">Loading...</div>
              ) : !payoutsData?.length ? (
                <div className="text-center py-12 text-slate-500">No {payoutStatusFilter.toLowerCase()} payouts</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1f1f1f] text-left">
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Vendor</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Amount</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Method</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Requested</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]">
                    {payoutsData.map((p: any) => (
                      <>
                        <tr key={p.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <div className="text-white">{p.vendor_name}</div>
                            <div className="text-slate-500 text-xs">{p.vendor_email}</div>
                          </td>
                          <td className="px-4 py-3 text-white font-medium">${Number(p.amount).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <div className="text-slate-300 text-xs">{p.method_type?.replace(/_/g, ' ')}</div>
                            <div className="text-slate-500 text-xs font-mono truncate max-w-[120px]" title={p.wallet_address}>{p.wallet_address}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{new Date(p.requested_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                          <td className="px-4 py-3">
                            {p.status === 'PAID' && p.tx_hash && (
                              <span className="text-xs text-slate-500 font-mono truncate block max-w-[100px]" title={p.tx_hash}>{p.tx_hash.slice(0, 12)}…</span>
                            )}
                            {p.status === 'PENDING' && (
                              <button
                                onClick={() => setExpandedPayoutId(expandedPayoutId === p.id ? null : p.id)}
                                className="text-xs text-primary hover:underline"
                              >
                                {expandedPayoutId === p.id ? 'Close' : 'Process'}
                              </button>
                            )}
                          </td>
                        </tr>
                        {expandedPayoutId === p.id && p.status === 'PENDING' && (
                          <tr key={`${p.id}-process`}>
                            <td colSpan={6} className="px-4 py-4 bg-[#0a0a0a]">
                              <div className="flex flex-col sm:flex-row gap-3 items-start">
                                <div className="flex-1">
                                  <label className="text-xs text-slate-400 mb-1 block">Transaction Hash</label>
                                  <input
                                    type="text"
                                    value={txHashInput[p.id] || ''}
                                    onChange={e => setTxHashInput(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    placeholder="Enter tx hash after sending..."
                                    className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-primary/50"
                                  />
                                </div>
                                <div className="flex gap-2 pt-5">
                                  <button
                                    onClick={() => markPaidMutation.mutate({ id: p.id, txHash: txHashInput[p.id] || '' })}
                                    disabled={!txHashInput[p.id] || markPaidMutation.isPending}
                                    className="px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                                  >
                                    Mark Paid
                                  </button>
                                  <button
                                    onClick={() => rejectPayoutMutation.mutate({ id: p.id, note: rejectNote[p.id] })}
                                    disabled={rejectPayoutMutation.isPending}
                                    className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                              <input
                                type="text"
                                value={rejectNote[p.id] || ''}
                                onChange={e => setRejectNote(prev => ({ ...prev, [p.id]: e.target.value }))}
                                placeholder="Rejection note (optional)"
                                className="w-full mt-2 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-primary/50"
                              />
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {payoutsData?.pagination && payoutsData.pagination.total > 20 && (
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Page {payoutPage} of {Math.ceil(payoutsData.pagination.total / 20)}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPayoutPage(p => Math.max(1, p - 1))} disabled={payoutPage === 1} className="px-3 py-1 bg-[#111] border border-[#1f1f1f] rounded-lg disabled:opacity-40 hover:text-white">Previous</button>
                  <button onClick={() => setPayoutPage(p => p + 1)} disabled={payoutPage >= Math.ceil(payoutsData.pagination.total / 20)} className="px-3 py-1 bg-[#111] border border-[#1f1f1f] rounded-lg disabled:opacity-40 hover:text-white">Next</button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </AdminLayout>
  )
}