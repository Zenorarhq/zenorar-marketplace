'use client'

import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import MaskedField from '@/components/admin/MaskedField'
import PinConfirmationModal from '@/components/admin/PinConfirmationModal'
import {
  getLicenseStats,
  getDownloadStats,
  getAllLicenses,
  searchLicenses,
  suspendLicense,
  revokeLicense,
  reactivateLicense,
  getLicenseDetails,
  getVerificationLogs,
  type License,
  type LicenseFilters,
} from '@/lib/api/licenses'
type Tab = 'overview' | 'licenses' | 'trace' | 'downloads'

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'licenses', label: 'All Licenses', icon: 'key' },
  { id: 'trace', label: 'Trace Lookup', icon: 'search' },
  { id: 'downloads', label: 'Downloads', icon: 'download' },
]

export default function LicensesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const queryClient = useQueryClient()
  const tabsRef = useRef<HTMLDivElement>(null)

  const handleTabClick = (tabId: Tab, index: number) => {
    setActiveTab(tabId)
    if (tabsRef.current) {
      const container = tabsRef.current
      const tabElements = container.children
      if (tabElements[index]) {
        const tab = tabElements[index] as HTMLElement
        const scrollLeft = tab.offsetLeft - container.offsetWidth / 2 + tab.offsetWidth / 2
        container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' })
      }
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">License Management</h1>
          <p className="text-slate-400 text-xs sm:text-sm">Manage licenses, trace lookups, and downloads</p>
        </div>

        {/* Tabs */}
        <div
          ref={tabsRef}
          className="flex gap-2 overflow-x-auto max-w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' as const }}
        >
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, index)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-primary text-black'
                  : 'bg-[#1a1a1a] text-slate-400 hover:text-white border border-[#2a2a2a]'
              }`}
            >
              <Icon name={tab.icon} size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'licenses' && <AllLicensesTab queryClient={queryClient} />}
        {activeTab === 'trace' && <TraceLookupTab />}
        {activeTab === 'downloads' && <DownloadsTab />}
      </div>
    </AdminLayout>
  )
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['license-stats'],
    queryFn: async () => {
      const res = await getLicenseStats()
      return res.success ? res.data : null
    },
  })

  const { data: dlStats, isLoading: dlLoading } = useQuery({
    queryKey: ['download-stats'],
    queryFn: async () => {
      const res = await getDownloadStats()
      return res.success ? res.data : null
    },
  })

  if (statsLoading || dlLoading) {
    return <div className="text-gray-400 py-8 text-center">Loading stats...</div>
  }

  const statusCount = (status: string) =>
    stats?.byStatus.find((s) => s.status === status)?.count || 0

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Licenses" value={stats?.totalLicenses || 0} />
        <StatCard label="Active" value={statusCount('ACTIVE')} color="text-green-400" />
        <StatCard label="Suspended" value={statusCount('SUSPENDED')} color="text-yellow-400" />
        <StatCard label="Revoked" value={statusCount('REVOKED')} color="text-red-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Expiring (30d)" value={stats?.expiringSoon || 0} color="text-orange-400" />
        <StatCard label="Total Verifications" value={stats?.totalVerifications || 0} />
        <StatCard label="Downloads Today" value={dlStats?.today || 0} />
        <StatCard label="Downloads (30d)" value={dlStats?.month || 0} />
      </div>

      {/* License Types */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
          <h3 className="text-white font-semibold mb-4">By License Type</h3>
          <div className="space-y-3">
            {stats?.byType.map((t) => (
              <div key={t.type} className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">{t.type}</span>
                <span className="text-white font-mono text-sm">{t.count}</span>
              </div>
            )) || <p className="text-gray-500 text-sm">No data</p>}
          </div>
        </div>

        {/* Top Downloaded Products */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
          <h3 className="text-white font-semibold mb-4">Top Downloads (30d)</h3>
          <div className="space-y-3">
            {dlStats?.topProducts.map((p, i) => (
              <div key={p.productId} className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">
                  <span className="text-gray-500 mr-2">#{i + 1}</span>
                  {p.productName}
                </span>
                <span className="text-white font-mono text-sm">{p.downloads}</span>
              </div>
            )) || <p className="text-gray-500 text-sm">No data</p>}
          </div>
        </div>
      </div>

      {/* Flagged Users */}
      {dlStats?.flaggedUsers && dlStats.flaggedUsers.length > 0 && (
        <div className="bg-[#1a1a1a] border border-red-900/30 rounded-lg p-5">
          <h3 className="text-red-400 font-semibold mb-4">Flagged Users (20+ downloads today)</h3>
          <div className="space-y-2">
            {dlStats.flaggedUsers.map((u) => (
              <div key={u.userId} className="flex justify-between items-center">
                <div>
                  <span className="text-white text-sm">{u.userName}</span>
                  <span className="text-gray-500 text-sm ml-2">{u.userEmail}</span>
                </div>
                <span className="text-red-400 font-mono text-sm">{u.downloads} downloads</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color = 'text-white' }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
    </div>
  )
}

// ─── All Licenses Tab ──────────────────────────────────────────────────────────

function AllLicensesTab({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const [filters, setFilters] = useState<LicenseFilters>({ page: 1, limit: 20 })
  const [search, setSearch] = useState('')
  const [pinAction, setPinAction] = useState<{ type: 'suspend' | 'revoke' | 'reactivate'; licenseId: string } | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [revealedRowId, setRevealedRowId] = useState<string | null>(null)
  const [revealedLicense, setRevealedLicense] = useState<License | null>(null)
  const [revealingId, setRevealingId] = useState<string | null>(null)

  const handleReveal = async (licenseId: string) => {
    // Same row clicked again → toggle off
    if (revealedRowId === licenseId) {
      setRevealedRowId(null)
      setRevealedLicense(null)
      return
    }
    setRevealingId(licenseId)
    const res = await getLicenseDetails(licenseId)
    setRevealingId(null)
    if (res.success && res.data) {
      setRevealedRowId(licenseId)
      setRevealedLicense(res.data)
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-licenses', filters],
    queryFn: async () => {
      const res = await getAllLicenses(filters)
      if (res.success) return { licenses: res.data || [], pagination: res.pagination }
      return { licenses: [], pagination: undefined }
    },
  })

  const handleSearch = () => {
    setFilters((f) => ({ ...f, search: search || undefined, page: 1 }))
  }

  const handlePinConfirm = async (pin: string) => {
    if (!pinAction) return
    const fn = pinAction.type === 'suspend' ? suspendLicense
      : pinAction.type === 'revoke' ? revokeLicense
      : reactivateLicense
    const res = await fn(pinAction.licenseId, pin)
    if (!res.success) throw new Error(res.error || 'Action failed')
    queryClient.invalidateQueries({ queryKey: ['admin-licenses'] })
    queryClient.invalidateQueries({ queryKey: ['license-stats'] })
    setPinAction(null)
  }

  const statusColor: Record<string, string> = {
    ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
    SUSPENDED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    REVOKED: 'bg-red-500/10 text-red-400 border-red-500/20',
    EXPIRED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by license key..."
            className="flex-1 px-3 py-2 bg-[#111] border border-[#333] rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-white text-sm hover:bg-[#222] transition-colors"
          >
            Search
          </button>
        </div>
        <select
          value={filters.status || ''}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))}
          className="px-3 py-2 bg-[#111] border border-[#333] rounded-lg text-white text-sm focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="REVOKED">Revoked</option>
        </select>
        <select
          value={filters.licenseType || ''}
          onChange={(e) => setFilters((f) => ({ ...f, licenseType: e.target.value || undefined, page: 1 }))}
          className="px-3 py-2 bg-[#111] border border-[#333] rounded-lg text-white text-sm focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="NORMAL">Normal</option>
          <option value="EXTENDED">Extended</option>
          <option value="PRO">Pro</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-gray-400 py-8 text-center">Loading licenses...</div>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left text-gray-400 font-medium px-4 py-3">License Key</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Product</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Buyer</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Type</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Status</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Created</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.licenses.map((l: License) => {
                  const isRevealed = revealedRowId === l.id
                  const raw = isRevealed ? revealedLicense : null
                  const isLoading = revealingId === l.id
                  return (
                  <tr key={l.id} className="border-b border-[#222] hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-gray-300">
                        {raw ? raw.licenseKey : l.licenseKey}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{l.product?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-gray-300">{l.user?.name || '—'}</span>
                        {l.user?.email && (
                          <span className="text-gray-500 text-xs block">
                            {raw ? raw.user?.email : l.user.email}
                          </span>
                        )}
                        {raw?.lastVerifiedIp && (
                          <span className="text-gray-600 text-xs block font-mono">
                            IP: {raw.lastVerifiedIp}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-300">{l.licenseType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor[l.status] || ''}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end items-center">
                        <button
                          onClick={() => handleReveal(l.id)}
                          disabled={isLoading}
                          title={isRevealed ? 'Hide data' : 'Reveal data'}
                          className="px-2 py-1 text-xs text-gray-400 hover:text-white bg-[#222] rounded transition-colors disabled:opacity-50"
                        >
                          {isLoading ? (
                            <svg className="w-3.5 h-3.5 animate-spin inline" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          ) : isRevealed ? (
                            <svg className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => setDetailId(l.id)}
                          className="px-2 py-1 text-xs text-gray-400 hover:text-white bg-[#222] rounded transition-colors"
                        >
                          View
                        </button>
                        {l.status === 'ACTIVE' && (
                          <button
                            onClick={() => setPinAction({ type: 'suspend', licenseId: l.id })}
                            className="px-2 py-1 text-xs text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 rounded transition-colors"
                          >
                            Suspend
                          </button>
                        )}
                        {l.status !== 'REVOKED' && (
                          <button
                            onClick={() => setPinAction({ type: 'revoke', licenseId: l.id })}
                            className="px-2 py-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 rounded transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                        {(l.status === 'SUSPENDED' || l.status === 'REVOKED') && (
                          <button
                            onClick={() => setPinAction({ type: 'reactivate', licenseId: l.id })}
                            className="px-2 py-1 text-xs text-green-400 hover:text-green-300 bg-green-500/10 rounded transition-colors"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  )
                })}
                {(!data?.licenses || data.licenses.length === 0) && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No licenses found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2a2a]">
              <p className="text-gray-400 text-xs">
                Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
              </p>
              <div className="flex gap-1">
                <button
                  disabled={data.pagination.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
                  className="px-3 py-1 text-xs bg-[#222] text-gray-300 rounded disabled:opacity-30 hover:bg-[#333] transition-colors"
                >
                  Prev
                </button>
                <button
                  disabled={data.pagination.page >= data.pagination.totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
                  className="px-3 py-1 text-xs bg-[#222] text-gray-300 rounded disabled:opacity-30 hover:bg-[#333] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PIN Confirmation Modal */}
      <PinConfirmationModal
        isOpen={!!pinAction}
        onClose={() => setPinAction(null)}
        onConfirm={handlePinConfirm}
        title={
          pinAction?.type === 'suspend' ? 'Suspend License'
          : pinAction?.type === 'revoke' ? 'Revoke License'
          : 'Reactivate License'
        }
        description={
          pinAction?.type === 'suspend'
            ? 'This will temporarily suspend the license. Enter your PIN to confirm.'
            : pinAction?.type === 'revoke'
            ? 'This will permanently revoke the license. This cannot be undone.'
            : 'This will restore the license to active status. Enter your PIN to confirm.'
        }
        confirmLabel={
          pinAction?.type === 'suspend' ? 'Suspend'
          : pinAction?.type === 'revoke' ? 'Revoke'
          : 'Reactivate'
        }
        destructive={pinAction?.type === 'revoke'}
      />

      {/* License Detail Modal */}
      {detailId && (
        <LicenseDetailModal licenseId={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  )
}

// ─── License Detail Modal ──────────────────────────────────────────────────────

function LicenseDetailModal({ licenseId, onClose }: { licenseId: string; onClose: () => void }) {
  const { data: license, isLoading } = useQuery({
    queryKey: ['license-detail', licenseId],
    queryFn: async () => {
      const res = await getLicenseDetails(licenseId)
      return res.success ? res.data : null
    },
  })

  const { data: logs } = useQuery({
    queryKey: ['license-logs', licenseId],
    queryFn: async () => {
      const res = await getVerificationLogs(licenseId, 1, 20)
      return res.success ? res.data : []
    },
  })

  const supportActive = license?.supportExpiresAt
    ? new Date(license.supportExpiresAt) > new Date()
    : false

  const daysRemaining = license?.supportExpiresAt
    ? Math.max(0, Math.ceil((new Date(license.supportExpiresAt).getTime() - Date.now()) / 86400000))
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
          <h2 className="text-lg font-bold text-white">License Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <Icon name="close" size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : !license ? (
          <div className="p-8 text-center text-gray-400">License not found</div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Key Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-xs mb-1">License Key</p>
                <MaskedField maskedValue={license.licenseKey} />
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Status</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                  license.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  license.status === 'SUSPENDED' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                  'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {license.status}
                </span>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Type</p>
                <p className="text-white text-sm">{license.licenseType}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Product</p>
                <p className="text-white text-sm">{license.product?.name || '—'}</p>
              </div>
            </div>

            {/* Buyer */}
            <div className="bg-[#111] rounded-lg p-4">
              <h4 className="text-white text-sm font-medium mb-3">Buyer</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Name</p>
                  <p className="text-white text-sm">{license.user?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Email</p>
                  {license.user?.email ? (
                    <MaskedField maskedValue={license.user.email} />
                  ) : (
                    <p className="text-gray-400 text-sm">—</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Order ID</p>
                  <p className="text-white text-sm font-mono text-xs">{license.orderId || '—'}</p>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="bg-[#111] rounded-lg p-4">
              <h4 className="text-white text-sm font-medium mb-2">Support Status</h4>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${supportActive ? 'text-green-400' : 'text-red-400'}`}>
                  {supportActive ? 'Active' : 'Expired'}
                </span>
                {supportActive && (
                  <span className="text-gray-400 text-xs">{daysRemaining} days remaining</span>
                )}
                {license.supportExpiresAt && (
                  <span className="text-gray-500 text-xs">
                    Expires {new Date(license.supportExpiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Activations */}
            <div>
              <h4 className="text-white text-sm font-medium mb-2">
                Activations ({license.activations?.filter(a => a.isActive).length || 0}/{license.domainsAllowed})
              </h4>
              {license.activations && license.activations.length > 0 ? (
                <div className="space-y-2">
                  {license.activations.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-[#111] rounded p-3">
                      <div>
                        <MaskedField maskedValue={a.identifier} />
                        <span className="text-gray-500 text-xs ml-2">{a.identifierType}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs ${a.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                          {a.isActive ? 'Active' : 'Deactivated'}
                        </span>
                        <p className="text-gray-500 text-[10px]">
                          {new Date(a.activatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No activations</p>
              )}
            </div>

            {/* Verification Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#111] rounded p-3">
                <p className="text-gray-500 text-xs">Total Verifications</p>
                <p className="text-white font-mono text-lg">{license.verificationCount}</p>
              </div>
              <div className="bg-[#111] rounded p-3">
                <p className="text-gray-500 text-xs">Last Verified</p>
                <p className="text-white text-sm">
                  {license.lastVerifiedAt ? new Date(license.lastVerifiedAt).toLocaleDateString() : 'Never'}
                </p>
              </div>
              <div className="bg-[#111] rounded p-3">
                <p className="text-gray-500 text-xs">Created</p>
                <p className="text-white text-sm">{new Date(license.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Recent Verification Logs */}
            {logs && logs.length > 0 && (
              <div>
                <h4 className="text-white text-sm font-medium mb-2">Recent Verifications</h4>
                <div className="bg-[#111] rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#222]">
                        <th className="text-left text-gray-500 px-3 py-2">Date</th>
                        <th className="text-left text-gray-500 px-3 py-2">Domain</th>
                        <th className="text-left text-gray-500 px-3 py-2">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.slice(0, 10).map((log: any) => (
                        <tr key={log.id} className="border-b border-[#1a1a1a]">
                          <td className="px-3 py-2 text-gray-400">
                            {new Date(log.verifiedAt).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-gray-300">{log.domain || '—'}</td>
                          <td className="px-3 py-2">
                            <span className={log.isValid ? 'text-green-400' : 'text-red-400'}>
                              {log.isValid ? 'Valid' : log.failureReason || 'Failed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Trace Lookup Tab ──────────────────────────────────────────────────────────

function TraceLookupTab() {
  const [query, setQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['license-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return null
      const res = await searchLicenses(searchQuery)
      if (res.success) return { licenses: res.data || [], pagination: res.pagination }
      return { licenses: [], pagination: undefined }
    },
    enabled: !!searchQuery,
  })

  const handleSearch = () => {
    if (query.trim()) setSearchQuery(query.trim())
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
        <h3 className="text-white font-semibold mb-2">Trace Lookup</h3>
        <p className="text-gray-400 text-sm mb-4">
          Search by license key, buyer email, buyer name, or order ID to trace a license.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter license key, email, name, or order ID..."
            className="flex-1 px-3 py-2 bg-[#111] border border-[#333] rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={!query.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Search
          </button>
        </div>
      </div>

      {isLoading && <div className="text-gray-400 py-8 text-center">Searching...</div>}

      {data && (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm">
            Found {data.pagination?.total || data.licenses.length} result(s) for &quot;{searchQuery}&quot;
          </p>
          {data.licenses.map((l: License) => (
            <div key={l.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div>
                  <p className="text-gray-500 text-xs">License Key</p>
                  <MaskedField maskedValue={l.licenseKey} />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Product</p>
                  <p className="text-white text-sm">{l.product?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Buyer</p>
                  <p className="text-white text-sm">{l.user?.name || '—'}</p>
                  {l.user?.email && (
                    <p className="text-gray-500 text-xs">{l.user.email}</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Status</p>
                  <span className={`text-sm ${
                    l.status === 'ACTIVE' ? 'text-green-400' :
                    l.status === 'SUSPENDED' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {l.status}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Type</p>
                  <p className="text-white text-sm">{l.licenseType}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Created</p>
                  <p className="text-gray-300 text-sm">{new Date(l.createdAt).toLocaleDateString()}</p>
                </div>
                {l.activations && l.activations.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs">Active Domains</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {l.activations.map((a, i) => (
                        <span key={i} className="text-xs bg-[#222] text-gray-300 px-2 py-0.5 rounded">
                          {a.identifier}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {data.licenses.length === 0 && (
            <div className="text-gray-500 text-sm text-center py-8">No results found</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Downloads Tab ─────────────────────────────────────────────────────────────

function DownloadsTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['download-stats-tab'],
    queryFn: async () => {
      const res = await getDownloadStats()
      return res.success ? res.data : null
    },
  })

  if (isLoading) {
    return <div className="text-gray-400 py-8 text-center">Loading download stats...</div>
  }

  return (
    <div className="space-y-6">
      {/* Download Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Today" value={stats?.today || 0} />
        <StatCard label="This Week" value={stats?.week || 0} />
        <StatCard label="This Month" value={stats?.month || 0} />
        <StatCard label="All Time" value={stats?.total || 0} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
          <h3 className="text-white font-semibold mb-4">Top Products (30 days)</h3>
          <div className="space-y-3">
            {stats?.topProducts.map((p, i) => (
              <div key={p.productId} className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">
                  <span className="text-gray-500 mr-2">#{i + 1}</span>
                  {p.productName}
                </span>
                <span className="text-white font-mono text-sm">{p.downloads}</span>
              </div>
            ))}
            {(!stats?.topProducts || stats.topProducts.length === 0) && (
              <p className="text-gray-500 text-sm">No download data</p>
            )}
          </div>
        </div>

        {/* Flagged Users */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
          <h3 className="text-white font-semibold mb-1">Flagged Users</h3>
          <p className="text-gray-500 text-xs mb-4">Users with 20+ downloads today</p>
          <div className="space-y-3">
            {stats?.flaggedUsers.map((u) => (
              <div key={u.userId} className="flex justify-between items-center">
                <div>
                  <span className="text-white text-sm">{u.userName}</span>
                  <span className="text-gray-500 text-xs block">{u.userEmail}</span>
                </div>
                <span className="text-red-400 font-mono text-sm">{u.downloads}</span>
              </div>
            ))}
            {(!stats?.flaggedUsers || stats.flaggedUsers.length === 0) && (
              <p className="text-green-400 text-sm">No flagged users</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Downloads */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-5">
        <h3 className="text-white font-semibold mb-4">Recent Downloads</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left text-gray-400 font-medium px-3 py-2">User</th>
                <th className="text-left text-gray-400 font-medium px-3 py-2">Product</th>
                <th className="text-left text-gray-400 font-medium px-3 py-2">IP</th>
                <th className="text-left text-gray-400 font-medium px-3 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentDownloads.map((d) => (
                <tr key={d.id} className="border-b border-[#222]">
                  <td className="px-3 py-2">
                    <span className="text-gray-300">{d.userName}</span>
                    <span className="text-gray-500 text-xs block">{d.userEmail}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-300">{d.productName}</td>
                  <td className="px-3 py-2 text-gray-400 font-mono text-xs">{d.ipAddress || '—'}</td>
                  <td className="px-3 py-2 text-gray-400 text-xs">
                    {d.downloadedAt ? new Date(d.downloadedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
              {(!stats?.recentDownloads || stats.recentDownloads.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500">No recent downloads</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}