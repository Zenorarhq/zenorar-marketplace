'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'
import { libraryApi, LibraryItem } from '@/lib/api/library'

type LibraryFilter = 'all' | 'scripts' | 'esims' | 'tools' | 'api'

export default function LibraryPage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Handler for View QR button (eSIMs)
  const handleViewQR = async (productId: string, productName: string) => {
    try {
      setLoadingAction(`qr-${productId}`)
      const result = await libraryApi.getQRCode(productId)

      if (result.success && result.data) {
        // Show QR code in modal or alert (can be enhanced with a modal component)
        const qrData = result.data.qrCodeData
        const activationCode = result.data.activationCode
        alert(`eSIM Activation\n\nScan this QR code:\n${qrData}\n\nActivation Code:\n${activationCode}\n\nExpires: ${result.data.expiresAt}`)
        // TODO: Show in a proper modal with actual QR code image
      } else {
        alert(result.error || 'Failed to generate QR code')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to view QR code')
    } finally {
      setLoadingAction(null)
    }
  }

  // Handler for API Key button
  const handleApiKey = async (productId: string, productName: string) => {
    try {
      setLoadingAction(`api-${productId}`)
      const result = await libraryApi.getApiKey(productId)

      if (result.success && result.data) {
        // Copy to clipboard and show
        await navigator.clipboard.writeText(result.data.key)
        alert(`API Key copied to clipboard!\n\nKey: ${result.data.key}\n\nProduct: ${productName}`)
        // TODO: Show in a proper modal with copy button
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
      default:
        return null
    }
  }

  const filterButtons: { key: LibraryFilter; label: string; icon: string }[] = [
    { key: 'all', label: 'All Items', icon: 'grid-view' },
    { key: 'scripts', label: 'Scripts', icon: 'code' },
    { key: 'esims', label: 'eSIMs', icon: 'sim-card' },
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
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-sm text-slate-300 hover:bg-[#262626] transition-colors">
              <Icon name="download" size={18} />
              Download All
            </button>
          </div>
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
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-[#121212] border border-border-dark rounded-xl overflow-hidden shadow-lg ${
                item.status === 'expired' ? 'opacity-60' : ''
              }`}
            >
              <div className="p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-6">
                {/* Icon */}
                <div className="h-16 w-16 rounded-xl bg-surface-dark border border-border-dark flex items-center justify-center flex-shrink-0 text-primary">
                  <Icon name={item.icon} size={32} />
                </div>

                {/* Info */}
                <div className="flex-grow">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-white font-bold text-base sm:text-lg">{item.name}</h3>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-slate-400 text-sm mb-3">{item.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Icon name="calendar" size={14} />
                      Purchased: {item.purchaseDate}
                    </span>
                    {item.version && (
                      <span className="flex items-center gap-1">
                        <Icon name="code" size={14} />
                        {item.version}
                      </span>
                    )}
                    {item.expiresAt && (
                      <span className={`flex items-center gap-1 ${item.status === 'expired' ? 'text-red-500' : ''}`}>
                        <Icon name="clock" size={14} />
                        {item.status === 'expired' ? 'Expired:' : 'Expires:'} {item.expiresAt}
                      </span>
                    )}
                    {item.downloadCount !== undefined && (
                      <span className="flex items-center gap-1">
                        <Icon name="download" size={14} />
                        {item.downloadCount} downloads
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 sm:gap-3 flex-shrink-0">
                  {item.status === 'expired' ? (
                    <button
                      onClick={() => handleRenew(item.id, item.name)}
                      disabled={loadingAction === `renew-${item.id}`}
                      className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingAction === `renew-${item.id}` ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <Icon name="refresh" size={18} />
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
                          className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingAction === `download-${item.id}` ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                              Loading...
                            </>
                          ) : (
                            <>
                              <Icon name="download" size={18} />
                              {item.status === 'update-available' ? 'Update' : 'Download'}
                            </>
                          )}
                        </button>
                      )}
                      {item.category === 'esims' && (
                        <button
                          onClick={() => handleViewQR(item.id, item.name)}
                          disabled={loadingAction === `qr-${item.id}`}
                          className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingAction === `qr-${item.id}` ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                              Loading...
                            </>
                          ) : (
                            <>
                              <Icon name="qr" size={18} />
                              View QR
                            </>
                          )}
                        </button>
                      )}
                      {item.category === 'api' && (
                        <button
                          onClick={() => handleApiKey(item.id, item.name)}
                          disabled={loadingAction === `api-${item.id}`}
                          className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingAction === `api-${item.id}` ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                              Loading...
                            </>
                          ) : (
                            <>
                              <Icon name="key" size={18} />
                              API Key
                            </>
                          )}
                        </button>
                      )}
                      <div className="relative" ref={openMenuId === item.id ? menuRef : undefined}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                          className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-surface-dark border border-border-dark rounded-lg text-slate-300 hover:text-white hover:bg-[#262626] transition-colors"
                        >
                          <Icon name="more-horizontal" size={18} />
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
          ))
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
    </ProfileLayout>
  )
}
