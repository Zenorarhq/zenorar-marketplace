'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'
import { ordersApi, Order } from '@/lib/api/orders'
import { usePreferences } from '@/contexts/PreferencesContext'

type FilterStatus = 'all' | 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

const ITEMS_PER_PAGE = 10

const filterButtons: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'All Orders' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
]

function getStatusBadge(status: string) {
  switch (status) {
    case 'DELIVERED':
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-900/30 text-green-500 border border-green-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Completed
        </div>
      )
    case 'CONFIRMED':
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-900/30 text-blue-400 border border-blue-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Confirmed
        </div>
      )
    case 'PROCESSING':
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-900/30 text-yellow-500 border border-yellow-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span> Processing
        </div>
      )
    case 'PENDING':
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-900/30 text-yellow-500 border border-yellow-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Pending
        </div>
      )
    case 'SHIPPED':
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-900/30 text-blue-400 border border-blue-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span> Shipped
        </div>
      )
    case 'CANCELLED':
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-900/30 text-red-500 border border-red-500/20">
          <Icon name="close" size={14} /> Cancelled
        </div>
      )
    case 'REFUNDED':
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-900/30 text-red-500 border border-red-500/20">
          <Icon name="refresh" size={14} /> Refunded
        </div>
      )
    default:
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/30 text-slate-400 border border-slate-500/20">
          {status}
        </div>
      )
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function OrdersPage() {
  const router = useRouter()
  const { formatPrice } = usePreferences()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)

  const hasActiveFilters = activeFilter !== 'all' || searchQuery !== '' || startDate !== '' || endDate !== ''

  const fetchOrders = () => {
    setIsLoading(true)
    setError(null)
    ordersApi
      .getMyOrders({ limit: 100 })
      .then((result) => {
        if (result.success && Array.isArray(result.data)) {
          setOrders(result.data)
        } else {
          setError(result.error || 'Failed to load orders')
        }
      })
      .catch(() => {
        setError('Network error. Please try again.')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // Client-side filtering
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesFilter = activeFilter === 'all' || order.status === activeFilter
      const matchesSearch =
        searchQuery === '' ||
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items.some((item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      const matchesDate =
        (!startDate || new Date(order.createdAt) >= new Date(startDate)) &&
        (!endDate || new Date(order.createdAt) <= new Date(endDate + 'T23:59:59'))
      return matchesFilter && matchesSearch && matchesDate
    })
  }, [orders, activeFilter, searchQuery, startDate, endDate])

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE))
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset to page 1 when filter/search/date changes
  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter, searchQuery, startDate, endDate])

  const handleCancel = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    setCancellingId(orderId)
    try {
      const result = await ordersApi.cancel(orderId)
      if (result.success) {
        fetchOrders()
      } else {
        alert(result.error || 'Failed to cancel order')
      }
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <ProfileLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Order History</h1>
            <p className="text-slate-400">View and manage your recent transactions and returns.</p>
          </div>
          <div className="flex gap-3">
            <button
              className="relative flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-sm text-slate-300 hover:bg-[#262626] transition-colors"
              onClick={() => {
                if (hasActiveFilters) {
                  setActiveFilter('all')
                  setSearchQuery('')
                  setStartDate('')
                  setEndDate('')
                }
              }}
            >
              <Icon name="filter" size={18} />
              Filter
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full" />
              )}
            </button>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`flex items-center gap-2 px-4 py-2 bg-surface-dark border rounded-lg text-sm transition-colors ${
                showDatePicker || startDate || endDate
                  ? 'border-primary text-primary'
                  : 'border-border-dark text-slate-300 hover:bg-[#262626]'
              }`}
            >
              <Icon name="calendar" size={18} />
              Select Dates
            </button>
          </div>
        </div>

        {/* Date Range Picker */}
        {showDatePicker && (
          <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-[#1a1a1a] border border-border-dark rounded-xl">
            <div className="flex items-center gap-2">
              <label className="text-slate-400 text-sm">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#121212] border border-border-dark rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:border-primary focus:ring-0 [color-scheme:dark]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-400 text-sm">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#121212] border border-border-dark rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:border-primary focus:ring-0 [color-scheme:dark]"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate('') }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                <Icon name="close" size={16} />
                Clear Dates
              </button>
            )}
          </div>
        )}

        {/* Search and Filter Tabs */}
        <div className="bg-[#1a1a1a] rounded-xl p-2 flex flex-col md:flex-row items-center gap-2">
          <div className="relative flex-grow w-full md:w-auto pl-2">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-slate-300 text-sm py-2 pl-9 pr-4 placeholder:text-slate-600 focus:ring-0"
              placeholder="Search orders by ID, product name..."
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full md:w-auto p-1">
            {filterButtons.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`px-3 py-1.5 sm:px-4 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === filter.key
                    ? 'bg-primary text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your orders...</p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="text-center py-16">
          <Icon name="alert-circle" size={60} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={fetchOrders}
            className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && orders.length === 0 && (
        <div className="text-center py-16">
          <Icon name="shopping-bag" size={64} className="text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No orders yet</h2>
          <p className="text-slate-400 mb-6">When you make a purchase, your orders will appear here.</p>
          <Link
            href="/scripts"
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      )}

      {/* No Results for Filter */}
      {!isLoading && !error && orders.length > 0 && filteredOrders.length === 0 && (
        <div className="text-center py-16">
          <Icon name="search" size={60} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No orders found matching your criteria.</p>
        </div>
      )}

      {/* Orders List */}
      {!isLoading && !error && paginatedOrders.length > 0 && (
        <div className="space-y-6">
          {paginatedOrders.map((order) => (
            <div
              key={order.id}
              className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden shadow-lg"
            >
              {/* Order Header */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border-dark flex flex-wrap justify-between items-center gap-3 sm:gap-4 bg-[#161616]">
                <div className="flex gap-4 sm:gap-8">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                      Order ID
                    </div>
                    <div className="text-white font-mono font-bold">#{order.orderNumber}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                      Date Placed
                    </div>
                    <div className="text-slate-300 text-sm">{formatDate(order.createdAt)}</div>
                  </div>
                </div>
                {getStatusBadge(order.status)}
              </div>

              {/* Order Items */}
              <div
                className={`p-4 sm:p-6 border-b border-border-dark ${
                  order.status === 'CANCELLED' || order.status === 'REFUNDED' ? 'opacity-60' : ''
                }`}
              >
                <div className="space-y-6">
                  {order.items.map((item, index) => (
                    <div
                      key={item.id || index}
                      className={`flex items-start gap-3 sm:gap-5 ${
                        index > 0 ? 'border-t border-dashed border-border-dark pt-4 sm:pt-6' : ''
                      }`}
                    >
                      <div className="h-16 w-16 rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.product?.images?.[0]?.url ? (
                          <img
                            src={item.product.images[0].url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Icon name="box" size={36} className="text-slate-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-base sm:text-lg leading-tight mb-1">
                          {item.name}
                        </h3>
                        {item.variant && (
                          <p className="text-slate-400 text-sm mb-2">{item.variant.name}</p>
                        )}
                        {item.sku && (
                          <p className="text-slate-500 text-xs mb-2">SKU: {item.sku}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-white font-bold">{formatPrice(Number(item.price))}</span>
                          {item.quantity > 1 && (
                            <span className="text-slate-500 text-xs">x{item.quantity}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Footer */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 bg-[#161616] flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                {order.status === 'REFUNDED' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm">Refund Status:</span>
                    <span className="text-primary font-medium text-sm">Refunded to Original Payment Method</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">Total Amount:</span>
                    <span className="text-white font-bold text-lg">{formatPrice(Number(order.total))}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {order.status === 'CANCELLED' || order.status === 'REFUNDED' ? (
                    order.items[0]?.product?.slug && (
                      <Link
                        href={`/products/${order.items[0].product.slug}`}
                        className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white text-sm font-medium transition-colors"
                      >
                        <Icon name="refresh" size={18} /> Buy Again
                      </Link>
                    )
                  ) : (
                    <>
                      {order.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          disabled={cancellingId === order.id}
                          className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <Icon name="close" size={18} />
                          {cancellingId === order.id ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          try {
                            // Get token from localStorage
                            const token = localStorage.getItem('accessToken') || localStorage.getItem('auth_token')

                            if (!token) {
                              alert('Please login to download invoice')
                              return
                            }

                            // Fetch PDF from Railway backend (via /backend rewrite)
                            const response = await fetch(`/backend/orders/${order.id}/invoice`, {
                              headers: {
                                'Authorization': `Bearer ${token}`
                              }
                            })

                            if (!response.ok) {
                              throw new Error('Failed to download invoice')
                            }

                            // Get PDF blob
                            const blob = await response.blob()

                            // Create download link and trigger download
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `invoice-${order.orderNumber}.pdf`
                            document.body.appendChild(a)
                            a.click()
                            window.URL.revokeObjectURL(url)
                            document.body.removeChild(a)
                          } catch (error) {
                            console.error('Download failed:', error)
                            alert('Failed to download invoice. Please try again.')
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white text-sm font-medium transition-colors"
                      >
                        <Icon name="download" size={18} /> Download Invoice
                      </button>
                      <button
                        onClick={() => router.push(`/profile/orders/${order.id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark hover:bg-border-dark/50 rounded-lg text-white text-sm font-medium transition-colors"
                      >
                        <Icon name="eye" size={18} /> View Details
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="mt-10 flex justify-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-border-dark text-slate-500 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Icon name="chevron-left" size={18} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                  currentPage === page
                    ? 'bg-primary text-black font-bold'
                    : 'border border-border-dark text-slate-500 hover:text-white hover:border-slate-500'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-border-dark text-slate-500 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Icon name="chevron-right" size={18} />
            </button>
          </div>
        </div>
      )}
    </ProfileLayout>
  )
}
