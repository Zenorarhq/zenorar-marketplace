'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'
import { libraryApi } from '@/lib/api/library'
import EsimDetailModal from '@/components/library/EsimDetailModal'
import IntegrationCodeModal from '@/components/library/IntegrationCodeModal'
import { apiFetch } from '@/lib/api/client'

interface License {
  id: string
  productId: string
  licenseKey: string
  registeredDomains: string[]
  domainsAllowed: number
  isActive: boolean
}

function maskLicenseKey(key: string): string {
  const parts = key.split('-')
  if (parts.length < 2) return key
  const first = parts[0]
  const last = parts[parts.length - 1]
  const middle = parts.slice(1, -1).map(() => '••••')
  return [first, ...middle, last].join('-')
}

type LibraryFilter = 'all' | 'scripts' | 'esims' | 'tools' | 'api' | 'virtual-numbers'

export default function LibraryPage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all')

  // Read ?tab= from URL on mount (client-only, avoids useSearchParams Suspense requirement)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab') as LibraryFilter
    if (tab) setActiveFilter(tab)
  }, [])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [selectedEsimId, setSelectedEsimId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [apiKeyModal, setApiKeyModal] = useState<{ key: string; productName: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [snippetModal, setSnippetModal] = useState<{ productId: string; productName: string } | null>(null)

  // Domain activation state
  const [domainModal, setDomainModal] = useState<{ licenseId: string; licenseKey: string; productName: string; registeredDomains: string[] } | null>(null)
  const [domainInput, setDomainInput] = useState('')
  const [domainLoading, setDomainLoading] = useState(false)
  const [domainError, setDomainError] = useState<string | null>(null)

  // License key reveal/copy state
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenuId])

  // Fetch library data from API
  const {
    data: libraryItems = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user-library'],
    queryFn: async () => {
      const result = await libraryApi.getLibrary()
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch library')
      }
      return result.data
    },
  })

  // Fetch user's licenses (for license key + domain activation)
  const { data: licenses = [] } = useQuery({
    queryKey: ['user-licenses'],
    queryFn: async () => {
      const res = await apiFetch<License[]>('/licenses/my')
      return res.success ? res.data || [] : []
    },
  })

  // Handler for Download/Update button
  const handleDownload = async (productId: string, productName: string) => {
    try {
      setLoadingAction(`download-${productId}`)
      const result = await libraryApi.downloadProduct(productId)

      if (result.success && result.data) {
        // Open download URL in new tab
        window.open(result.data.url, '_blank')
        alert(`${productName} download started!`)
      } else {
        alert(result.error || 'Download failed')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to download product')
    } finally {
      setLoadingAction(null)
    }
  }

  // Handler for View QR button (eSIMs) - opens the detail modal
  const handleViewQR = (esimId: string) => {
    setSelectedEsimId(esimId)
  }

  // Handler for API Key button
  const handleApiKey = async (productId: string, productName: string) => {
    try {
      setLoadingAction(`api-${productId}`)
      const result = await libraryApi.getApiKey(productId)

      if (result.success && result.data) {
        setApiKeyModal({ key: result.data.key, productName })
      } else {
        alert(result.error || 'Failed to get API key')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to retrieve API key')
    } finally {
      setLoadingAction(null)
    }
  }

  // Handler for Renew button
  const handleRenew = async (productId: string, productName: string) => {
    try {
      setLoadingAction(`renew-${productId}`)
      const result = await libraryApi.renewSubscription(productId)

      if (result.success && result.data) {
        alert(`${productName} added to cart for renewal!`)
        router.push('/cart')
      } else {
        alert(result.error || 'Failed to renew product')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to renew subscription')
    } finally {
      setLoadingAction(null)
    }
  }

  // Toggle license key visibility
  const toggleRevealKey = (productId: string) => {
    setRevealedKeys(prev => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  // Copy license key to clipboard
  const copyLicenseKey = (key: string, productId: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(productId)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Activate a domain against the license
  const handleActivateDomain = async () => {
    if (!domainModal || !domainInput.trim()) return
    setDomainLoading(true)
    setDomainError(null)
    const res = await apiFetch('/licenses/activate', {
      method: 'POST',
      body: JSON.stringify({ licenseKey: domainModal.licenseKey, identifier: domainInput.trim(), identifierType: 'DOMAIN' }),
    })
    setDomainLoading(false)
    if (res.success) {
      setDomainModal(prev => prev ? { ...prev, registeredDomains: [...prev.registeredDomains, domainInput.trim()] } : prev)
      setDomainInput('')
    } else {
      setDomainError((res as any).message || res.error || 'Failed to activate domain')
    }
  }

  // Deactivate a domain from the license
  const handleDeactivateDomain = async (domain: string) => {
    if (!domainModal) return
    setDomainLoading(true)
    setDomainError(null)
    const res = await apiFetch(`/licenses/${domainModal.licenseId}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ identifier: domain }),
    })
    setDomainLoading(false)
    if (res.success) {
      setDomainModal(prev => prev ? { ...prev, registeredDomains: prev.registeredDomains.filter(d => d !== domain) } : prev)
    } else {
      setDomainError((res as any).message || res.error || 'Failed to deactivate domain')
    }
  }

  const filteredItems = libraryItems.filter((item) => {
    const matchesFilter = activeFilter === 'all' || item.category === activeFilter
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-900/30 text-green-500 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
          </div>
        )
      case 'update-available':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-900/30 text-blue-400 border border-blue-500/20">
            <Icon name="download" size={12} /> Update Available
          </div>
        )
      case 'expired':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-900/30 text-red-500 border border-red-500/20">
            <Icon name="alert" size={12} /> Expired
          </div>
        )
      case 'suspended':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-900/30 text-yellow-500 border border-yellow-500/20">
            <Icon name="alert" size={12} /> Suspended
          </div>
        )
      default:
        return null
    }
  }

  const filterButtons: { key: LibraryFilter; label: string; icon: string }[] = [
    { key: 'all', label: 'All Items', icon: 'grid-view' },
    { key: 'scripts', label: 'Scripts', icon: 'code' },
    { key: 'esims', label: 'eSIMs', icon: 'sim-card' },
    { key: 'virtual-numbers', label: 'Numbers', icon: 'phone' },
    { key: 'tools', label: 'Tools', icon: 'terminal' },
    { key: 'api', label: 'API', icon: 'api' },
  ]

  return (
    <ProfileLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">My Library</h1>
            <p className="text-slate-400">Access and manage all your purchased digital products.</p>
          </div>
          {/* Download All — commented out until bulk download is implemented */}
          {/* <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-sm text-slate-300 hover:bg-[#262626] transition-colors">
              <Icon name="download" size={18} />
              Download All
            </button>
          </div> */}
        </div>

        {/* Search and Filter Tabs */}
        <div className="bg-[#1a1a1a] rounded-xl p-2 flex flex-col md:flex-row items-center gap-2">
          <div className="relative flex-grow w-full md:w-auto pl-2">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-slate-300 text-sm py-2 pl-9 pr-4 placeholder:text-slate-600 focus:ring-0"
              placeholder="Search your library..."
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full md:w-auto p-1">
            {filterButtons.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === filter.key
                    ? 'bg-primary text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon name={filter.icon} size={16} />
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Library Items */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-400">Loading your library...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <Icon name="alert-circle" size={64} className="text-red-500 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">Failed to load library</p>
            <p className="text-slate-500 text-sm">{(error as Error).message}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="library" size={64} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">
              {libraryItems.length === 0
                ? 'No purchased products yet. Visit the marketplace to get started!'
                : 'No items found in your library.'}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const license = licenses.find(l => l.productId === item.id)
            const isScriptOrTool = item.category === 'scripts' || item.category === 'tools'
            const isRevealed = revealedKeys.has(item.id)
            return (
              <div
                key={item.id}
                className={`bg-[#121212] border border-border-dark rounded-xl overflow-hidden shadow-lg ${
                  item.status === 'expired' ? 'opacity-60' : ''
                }`}
              >
                <div className="p-4 sm:p-6">
                  {/* Top: icon + info */}
                  <div className="flex gap-4 mb-4">
                    <div className="h-14 w-14 rounded-xl bg-surface-dark border border-border-dark flex items-center justify-center flex-shrink-0 text-primary">
                      <Icon name={item.icon} size={28} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-white font-bold text-base sm:text-lg truncate">{item.name}</h3>
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-slate-400 text-sm mb-2">{item.description}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        {item.category === 'virtual-numbers' && item.phoneNumberDisplay && (
                          <span className="flex items-center gap-1 text-primary font-mono">
                            <Icon name="phone" size={13} />
                            {item.phoneNumberDisplay}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Icon name="calendar" size={13} />
                          Purchased: {item.purchaseDate}
                        </span>
                        {item.version && (
                          <span className="flex items-center gap-1">
                            <Icon name="code" size={13} />
                            {item.version}
                          </span>
                        )}
                        {item.expiresAt && (
                          <span className={`flex items-center gap-1 ${item.status === 'expired' ? 'text-red-500' : ''}`}>
                            <Icon name="clock" size={13} />
                            {item.status === 'expired' ? 'Expired:' : 'Expires:'} {item.expiresAt}
                          </span>
                        )}
                        {item.downloadCount !== undefined && (
                          <span className="flex items-center gap-1">
                            <Icon name="download" size={13} />
                            {item.downloadCount} downloads
                          </span>
                        )}
                        {item.category === 'virtual-numbers' && item.smsUsed !== undefined && (
                          <span className="flex items-center gap-1">
                            <Icon name="message" size={13} />
                            SMS: {item.smsUsed} / {item.smsIncluded === 0 ? '∞' : item.smsIncluded}
                          </span>
                        )}
                      </div>
                      {/* License Key — inline with eye + copy, same size as meta */}
                      {isScriptOrTool && license && (
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                          <Icon name="key" size={13} />
                          <span className="font-mono text-slate-300 whitespace-nowrap">
                            {isRevealed ? license.licenseKey : maskLicenseKey(license.licenseKey)}
                          </span>
                          <button
                            onClick={() => toggleRevealKey(item.id)}
                            className="text-slate-500 hover:text-white transition-colors"
                            title={isRevealed ? 'Hide key' : 'Reveal key'}
                          >
                            <Icon name={isRevealed ? 'visibility-off' : 'eye'} size={13} />
                          </button>
                          <button
                            onClick={() => copyLicenseKey(license.licenseKey, item.id)}
                            className="text-slate-500 hover:text-white transition-colors"
                            title="Copy key"
                          >
                            <Icon name={copiedKey === item.id ? 'check' : 'copy'} size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom: action buttons */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-border-dark">
                    {item.status === 'expired' ? (
                      <button
                        onClick={() => handleRenew(item.id, item.name)}
                        disabled={loadingAction === `renew-${item.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingAction === `renew-${item.id}` ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Icon name="refresh" size={16} />
                            Renew
                          </>
                        )}
                      </button>
                    ) : (
                      <>
                        {(item.category === 'scripts' || item.category === 'tools') && (
                          <button
                            onClick={() => handleDownload(item.id, item.name)}
                            disabled={loadingAction === `download-${item.id}`}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingAction === `download-${item.id}` ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                                Loading...
                              </>
                            ) : (
                              <>
                                <Icon name="download" size={16} />
                                {item.status === 'update-available' ? 'Update' : 'Download'}
                              </>
                            )}
                          </button>
                        )}
                        {(item.category === 'scripts' || item.category === 'tools') && (
                          <button
                            onClick={() => setSnippetModal({ productId: item.id, productName: item.name })}
                            className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-slate-300 hover:text-white hover:bg-[#262626] transition-colors"
                          >
                            <Icon name="code" size={16} />
                            Integration Code
                          </button>
                        )}
                        {isScriptOrTool && license && (
                          <button
                            onClick={() => setDomainModal({ licenseId: license.id, licenseKey: license.licenseKey, productName: item.name, registeredDomains: [...license.registeredDomains] })}
                            className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-slate-300 hover:text-white hover:bg-[#262626] transition-colors"
                          >
                            <Icon name="globe" size={16} />
                            Activate Domain
                          </button>
                        )}
                        {item.category === 'esims' && (
                          <button
                            onClick={() => handleViewQR(item.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all"
                          >
                            <Icon name="qr" size={16} />
                            View Details
                          </button>
                        )}
                        {item.category === 'virtual-numbers' && (
                          <button
                            onClick={() => router.push(`/profile/numbers/${item.id}`)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all"
                          >
                            <Icon name="inbox" size={16} />
                            {item.unreadCount && item.unreadCount > 0 ? (
                              <span className="flex items-center gap-1">
                                Inbox
                                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                  {item.unreadCount}
                                </span>
                              </span>
                            ) : (
                              'Manage'
                            )}
                          </button>
                        )}
                        {item.category === 'api' && (
                          <button
                            onClick={() => handleApiKey(item.id, item.name)}
                            disabled={loadingAction === `api-${item.id}`}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingAction === `api-${item.id}` ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                                Loading...
                              </>
                            ) : (
                              <>
                                <Icon name="key" size={16} />
                                API Key
                              </>
                            )}
                          </button>
                        )}
                        <div className="relative ml-auto" ref={openMenuId === item.id ? menuRef : undefined}>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                            className="flex items-center gap-2 px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-slate-300 hover:text-white hover:bg-[#262626] transition-colors"
                          >
                            <Icon name="more-horizontal" size={16} />
                          </button>
                          {openMenuId === item.id && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-border-dark rounded-xl shadow-xl z-50 overflow-hidden">
                              <button
                                onClick={() => { setOpenMenuId(null); router.push(`/products/${item.slug}`) }}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <Icon name="eye" size={16} />
                                View Product Page
                              </button>
                              <button
                                onClick={() => { setOpenMenuId(null); router.push(`/profile/orders/${item.orderId}`) }}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <Icon name="receipt" size={16} />
                                View Order
                              </button>
                              <button
                                onClick={() => { setOpenMenuId(null); router.push('/profile/tickets') }}
                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <Icon name="alert" size={16} />
                                Report Issue
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Stats Summary */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#121212] border border-border-dark rounded-xl p-3 sm:p-5">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Icon name="package" size={16} />
            Total Items
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">{libraryItems.length}</p>
        </div>
        <div className="bg-[#121212] border border-border-dark rounded-xl p-3 sm:p-5">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Icon name="check-circle" size={16} />
            Active
          </div>
          <p className="text-xl sm:text-2xl font-bold text-green-500">
            {libraryItems.filter((i) => i.status === 'active' || i.status === 'update-available').length}
          </p>
        </div>
        <div className="bg-[#121212] border border-border-dark rounded-xl p-3 sm:p-5">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Icon name="download" size={16} />
            Updates
          </div>
          <p className="text-xl sm:text-2xl font-bold text-blue-400">
            {libraryItems.filter((i) => i.status === 'update-available').length}
          </p>
        </div>
        <div className="bg-[#121212] border border-border-dark rounded-xl p-3 sm:p-5">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Icon name="alert" size={16} />
            Expired
          </div>
          <p className="text-xl sm:text-2xl font-bold text-red-500">
            {libraryItems.filter((i) => i.status === 'expired').length}
          </p>
        </div>
      </div>

      {/* eSIM Detail Modal */}
      <EsimDetailModal
        esimId={selectedEsimId || ''}
        isOpen={!!selectedEsimId}
        onClose={() => setSelectedEsimId(null)}
      />

      {/* API Key Modal */}
      {apiKeyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark rounded-2xl p-5 sm:p-8 max-w-md w-full border border-border-dark">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">API Key</h3>
              <button onClick={() => { setApiKeyModal(null); setCopied(false) }} className="text-slate-400 hover:text-white">
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Product</label>
                <div className="mt-1 text-white font-medium">{apiKeyModal.productName}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">API Key</label>
                <div className="mt-1 bg-black border border-border-dark rounded-xl px-4 py-3 text-white font-mono text-sm break-all">
                  {apiKeyModal.key}
                </div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(apiKeyModal.key)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="w-full py-3 rounded-xl bg-primary text-black font-bold hover:bg-green-400 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy API Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Integration Code Modal */}
      <IntegrationCodeModal
        isOpen={!!snippetModal}
        onClose={() => setSnippetModal(null)}
        productId={snippetModal?.productId || ''}
        productName={snippetModal?.productName || ''}
      />

      {/* Domain Activation Modal */}
      {domainModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark rounded-2xl p-5 sm:p-8 max-w-md w-full border border-border-dark">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Activate Domain</h3>
                <p className="text-sm text-slate-400 mt-1">{domainModal.productName}</p>
              </div>
              <button
                onClick={() => { setDomainModal(null); setDomainInput(''); setDomainError(null) }}
                className="text-slate-400 hover:text-white"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Active domains list */}
            {domainModal.registeredDomains.length > 0 && (
              <div className="mb-5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                  Active Domains ({domainModal.registeredDomains.length})
                </label>
                <div className="space-y-2">
                  {domainModal.registeredDomains.map(domain => (
                    <div key={domain} className="flex items-center justify-between bg-black border border-border-dark rounded-xl px-4 py-2.5">
                      <span className="text-white font-mono text-sm">{domain}</span>
                      <button
                        onClick={() => handleDeactivateDomain(domain)}
                        disabled={domainLoading}
                        className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add domain form */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Add Domain</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={domainInput}
                  onChange={e => setDomainInput(e.target.value)}
                  placeholder="example.com"
                  className="flex-1 bg-black border border-border-dark rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-primary"
                  onKeyDown={e => e.key === 'Enter' && handleActivateDomain()}
                />
                <button
                  onClick={handleActivateDomain}
                  disabled={domainLoading || !domainInput.trim()}
                  className="px-4 py-2.5 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {domainLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                  ) : 'Add'}
                </button>
              </div>
              {domainError && (
                <p className="text-red-400 text-sm mt-2">{domainError}</p>
              )}
            </div>
          </div>
        </div>
      )}

    </ProfileLayout>
  )
}
