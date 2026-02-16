'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { ordersApi, Order } from '@/lib/api/orders'
import { formatCurrency, formatNumber } from '@/lib/formatNumber'
import { useTimezone } from '@/hooks/use-timezone'
import { formatDate } from '@/lib/date-utils'

type SortField = 'date' | 'total' | 'status' | null
type SortDir = 'asc' | 'desc'

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED']

function getStatusColor(status: string) {
  switch (status) {
    case 'DELIVERED':
    case 'CONFIRMED': return 'bg-primary/10 text-primary'
    case 'PENDING': return 'bg-orange-500/10 text-orange-400'
    case 'PROCESSING': return 'bg-blue-500/10 text-blue-400'
    case 'SHIPPED': return 'bg-purple-500/10 text-purple-400'
    case 'CANCELLED':
    case 'REFUNDED': return 'bg-red-500/10 text-red-400'
    default: return 'bg-slate-500/10 text-slate-400'
  }
}

function getPaymentColor(status: string) {
  switch (status) {
    case 'PAID': return 'bg-green-500/10 text-green-400'
    case 'FAILED': return 'bg-red-500/10 text-red-400'
    case 'REFUNDED': return 'bg-red-500/10 text-red-400'
    default: return 'bg-orange-500/10 text-orange-400'
  }
}

function exportToCsv(orders: Order[], tz?: string) {
  const headers = ['Order Number', 'Customer Email', 'Phone', 'Items', 'Total', 'Payment Status', 'Order Status', 'Date']
  const rows = orders.map(o => [
    o.orderNumber,
    o.email,
    o.phone || '',
    o.items.length.toString(),
    Number(o.total).toFixed(2),
    o.paymentStatus,
    o.status,
    formatDate(o.createdAt, tz),
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function PurchasesPage() {
  const queryClient = useQueryClient()
  const tz = useTimezone()
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [updatingPayment, setUpdatingPayment] = useState(false)
  const [updatingTracking, setUpdatingTracking] = useState(false)
  const [trackingInput, setTrackingInput] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const itemsPerPage = 10

  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const result = await ordersApi.list({ limit: 100 })
      if (result.success && result.data) return result.data
      throw new Error(result.error || 'Failed to load orders')
    },
  })

  // Fetch accurate stats from backend (counts ALL orders, not just loaded 100)
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-orders-stats'],
    queryFn: async () => {
      const result = await ordersApi.getStats()
      if (result.success && result.data) return result.data
      throw new Error(result.error || 'Failed to load stats')
    },
  })

  // Map backend stats to UI format
  const stats = statsData ? {
    totalOrders: statsData.totalOrders,
    completedOrders: statsData.completedOrders,
    pendingOrders: statsData.pendingOrders,
    totalRevenue: statsData.totalRevenue,
  } : {
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  }

  function refreshData() {
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    queryClient.invalidateQueries({ queryKey: ['admin-orders-stats'] })
  }

  // Load detail order
  useEffect(() => {
    if (!selectedOrderId) {
      setDetailOrder(null)
      return
    }
    setDetailLoading(true)
    ordersApi.getById(selectedOrderId).then((result) => {
      if (result.success && result.data) {
        setDetailOrder(result.data)
        setTrackingInput(result.data.trackingNumber || '')
      }
    }).finally(() => setDetailLoading(false))
  }, [selectedOrderId])

  // Filtering
  const filteredOrders = useMemo(() => {
    let result = orders.filter((o) => {
      const matchesStatus = statusFilter === 'all' || o.status.toLowerCase() === statusFilter
      const matchesSearch = searchQuery === '' ||
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesDate =
        (!startDate || new Date(o.createdAt) >= new Date(startDate)) &&
        (!endDate || new Date(o.createdAt) <= new Date(endDate + 'T23:59:59'))
      return matchesStatus && matchesSearch && matchesDate
    })

    // Sorting
    if (sortField) {
      result = [...result].sort((a, b) => {
        let cmp = 0
        if (sortField === 'date') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        else if (sortField === 'total') cmp = Number(a.total) - Number(b.total)
        else if (sortField === 'status') cmp = a.status.localeCompare(b.status)
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return result
  }, [orders, statusFilter, searchQuery, startDate, endDate, sortField, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  useEffect(() => { setCurrentPage(1) }, [statusFilter, searchQuery, startDate, endDate])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <Icon name="chevron-down" size={14} className="text-slate-600 ml-1" />
    return <Icon name={sortDir === 'asc' ? 'chevron-up' : 'chevron-down'} size={14} className="text-primary ml-1" />
  }

  async function handleStatusUpdate(newStatus: string) {
    if (!detailOrder) return
    setUpdatingStatus(true)
    try {
      const result = await ordersApi.updateStatus(detailOrder.id, newStatus, statusNote || undefined)
      if (result.success && result.data) {
        setDetailOrder(result.data)
        setStatusNote('')
        refreshData()
      } else {
        alert(result.error || 'Failed to update status')
      }
    } catch { alert('Network error') }
    finally { setUpdatingStatus(false) }
  }

  async function handlePaymentUpdate(newStatus: string) {
    if (!detailOrder) return
    setUpdatingPayment(true)
    try {
      const result = await ordersApi.updatePaymentStatus(detailOrder.id, newStatus)
      if (result.success && result.data) {
        setDetailOrder(result.data)
        refreshData()
      } else {
        alert(result.error || 'Failed to update payment')
      }
    } catch { alert('Network error') }
    finally { setUpdatingPayment(false) }
  }

  async function handleTrackingUpdate() {
    if (!detailOrder) return
    setUpdatingTracking(true)
    try {
      const result = await ordersApi.updateTracking(detailOrder.id, trackingInput)
      if (result.success && result.data) {
        setDetailOrder(result.data)
        refreshData()
      } else {
        alert(result.error || 'Failed to update tracking')
      }
    } catch { alert('Network error') }
    finally { setUpdatingTracking(false) }
  }

  const loading = ordersLoading || statsLoading
  const error = ordersError ? String(ordersError) : ''

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-400">Loading orders...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <Icon name="alert" size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-lg font-semibold mb-2">Error Loading Orders</p>
          <p className="text-slate-400 mb-4">{error}</p>
          <button onClick={refreshData} className="bg-primary hover:bg-primary/90 text-black font-semibold px-4 py-2 rounded-lg transition-colors">
            Try Again
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Purchases</h1>
          <p className="text-slate-500 text-xs sm:text-sm">View and manage customer orders</p>
        </div>
        <button
          onClick={() => exportToCsv(filteredOrders, tz)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-white/10 text-white rounded-lg text-sm transition-colors"
        >
          <Icon name="download" size={16} />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Total Orders</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="shopping-cart" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatNumber(stats.totalOrders)}</p>
          <p className="text-xs"><span className="text-slate-500">all time</span></p>
        </div>
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Completed</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="check" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatNumber(stats.completedOrders)}</p>
          <p className="text-xs">
            <span className="text-primary">{stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%</span>
            <span className="text-slate-500 ml-1">completed</span>
          </p>
        </div>
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Pending</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Icon name="clock" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatNumber(stats.pendingOrders)}</p>
          <p className="text-xs"><span className="text-orange-400">needs attention</span></p>
        </div>
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Total Revenue</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="wallet" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs"><span className="text-slate-500">gross revenue</span></p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
          <div className="relative flex-grow max-w-xs">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order # or email..."
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 pl-9 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-600"
            />
          </div>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              showDatePicker || startDate || endDate
                ? 'bg-primary/10 border border-primary/30 text-primary'
                : 'bg-[#1a1a1a] border border-[#2a2a2a] text-white hover:bg-white/10'
            }`}
          >
            <Icon name="calendar" size={16} />
            Dates
          </button>
        </div>

        {/* Date Range */}
        {showDatePicker && (
          <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-[#1f1f1f]">
            <div className="flex items-center gap-2">
              <label className="text-slate-400 text-sm">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:dark]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-400 text-sm">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:dark]"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate('') }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                <Icon name="close" size={14} /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1f1f1f]">
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Order Number</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Customer</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Items</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 cursor-pointer select-none" onClick={() => toggleSort('total')}>
                  <span className="inline-flex items-center">Total <SortIcon field="total" /></span>
                </th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Payment</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  <span className="inline-flex items-center">Status <SortIcon field="status" /></span>
                </th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  <span className="inline-flex items-center">Date <SortIcon field="date" /></span>
                </th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map((order) => (
                  <tr key={order.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-white/5">
                    <td className="px-5 py-3 text-white font-medium">#{order.orderNumber}</td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-white text-sm">{order.email}</p>
                        {order.phone && <p className="text-slate-500 text-xs">{order.phone}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-sm">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-5 py-3 text-white font-medium">${Number(order.total).toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getPaymentColor(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-sm">{formatDate(order.createdAt, tz)}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Icon name="eye" size={16} className="text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <Icon name="shopping-cart" size={48} className="text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No orders found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredOrders.length > 0 && totalPages > 1 && (
          <div className="border-t border-[#1f1f1f] px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
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
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

      {/* Order Detail Slide-out Panel */}
      {selectedOrderId && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedOrderId(null)}
          />
          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-[#0e0e0e] border-l border-[#1f1f1f] z-50 overflow-y-auto shadow-2xl">
            {/* Panel Header */}
            <div className="sticky top-0 bg-[#0e0e0e] border-b border-[#1f1f1f] px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-white font-bold text-lg">Order Details</h2>
              <button
                onClick={() => setSelectedOrderId(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Icon name="close" size={20} className="text-slate-400" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : detailOrder ? (
              <div className="p-6 space-y-6">
                {/* Order Info */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-bold text-xl">#{detailOrder.orderNumber}</h3>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(detailOrder.status)}`}>
                      {detailOrder.status.charAt(0) + detailOrder.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">{formatDate(detailOrder.createdAt, tz)}</p>
                  <p className="text-slate-400 text-sm mt-1">{detailOrder.email} {detailOrder.phone ? `| ${detailOrder.phone}` : ''}</p>
                </div>

                {/* Update Order Status */}
                <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                  <h4 className="text-white font-semibold text-sm mb-3">Order Status</h4>
                  <select
                    value={detailOrder.status}
                    onChange={(e) => handleStatusUpdate(e.target.value)}
                    disabled={updatingStatus}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    {ORDER_STATUSES.map(s => (
                      <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Add a note (optional)..."
                    className="w-full mt-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-600"
                  />
                </div>

                {/* Update Payment Status */}
                <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                  <h4 className="text-white font-semibold text-sm mb-3">Payment Status</h4>
                  <select
                    value={detailOrder.paymentStatus}
                    onChange={(e) => handlePaymentUpdate(e.target.value)}
                    disabled={updatingPayment}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    {PAYMENT_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Tracking Number */}
                <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                  <h4 className="text-white font-semibold text-sm mb-3">Tracking Number</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={trackingInput}
                      onChange={(e) => setTrackingInput(e.target.value)}
                      placeholder="Enter tracking number..."
                      className="flex-grow bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-600"
                    />
                    <button
                      onClick={handleTrackingUpdate}
                      disabled={updatingTracking || trackingInput === (detailOrder.trackingNumber || '')}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingTracking ? '...' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                  <h4 className="text-white font-semibold text-sm mb-3">Items ({detailOrder.items.length})</h4>
                  <div className="space-y-3">
                    {detailOrder.items.map((item, i) => (
                      <div key={item.id || i} className={`flex items-center justify-between ${i > 0 ? 'pt-3 border-t border-[#1f1f1f]' : ''}`}>
                        <div>
                          <p className="text-white text-sm font-medium">{item.name}</p>
                          {item.sku && <p className="text-slate-500 text-xs">SKU: {item.sku}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-white text-sm">${Number(item.price).toFixed(2)}</p>
                          {item.quantity > 1 && <p className="text-slate-500 text-xs">x{item.quantity}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                  <h4 className="text-white font-semibold text-sm mb-3">Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Subtotal</span>
                      <span className="text-white">${Number(detailOrder.subtotal).toFixed(2)}</span>
                    </div>
                    {Number(detailOrder.shippingCost) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Shipping</span>
                        <span className="text-white">${Number(detailOrder.shippingCost).toFixed(2)}</span>
                      </div>
                    )}
                    {Number(detailOrder.taxAmount) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tax</span>
                        <span className="text-white">${Number(detailOrder.taxAmount).toFixed(2)}</span>
                      </div>
                    )}
                    {Number(detailOrder.discountAmount) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Discount</span>
                        <span className="text-green-400">-${Number(detailOrder.discountAmount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-[#1f1f1f]">
                      <span className="text-white font-bold">Total</span>
                      <span className="text-white font-bold">${Number(detailOrder.total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                {detailOrder.shippingAddress && (
                  <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                    <h4 className="text-white font-semibold text-sm mb-3">Shipping Address</h4>
                    <div className="text-slate-400 text-sm space-y-1">
                      <p className="text-white">{detailOrder.shippingAddress.firstName} {detailOrder.shippingAddress.lastName}</p>
                      {detailOrder.shippingAddress.company && <p>{detailOrder.shippingAddress.company}</p>}
                      <p>{detailOrder.shippingAddress.address1}</p>
                      {detailOrder.shippingAddress.address2 && <p>{detailOrder.shippingAddress.address2}</p>}
                      <p>{detailOrder.shippingAddress.city}{detailOrder.shippingAddress.state ? `, ${detailOrder.shippingAddress.state}` : ''} {detailOrder.shippingAddress.postalCode}</p>
                      <p>{detailOrder.shippingAddress.country}</p>
                      {detailOrder.shippingAddress.phone && <p>Phone: {detailOrder.shippingAddress.phone}</p>}
                    </div>
                  </div>
                )}

                {/* Admin Note */}
                {detailOrder.adminNote && (
                  <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                    <h4 className="text-white font-semibold text-sm mb-3">Admin Notes</h4>
                    <pre className="text-slate-400 text-sm whitespace-pre-wrap font-sans">{detailOrder.adminNote}</pre>
                  </div>
                )}

                {/* Customer Note */}
                {detailOrder.customerNote && (
                  <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                    <h4 className="text-white font-semibold text-sm mb-3">Customer Note</h4>
                    <p className="text-slate-400 text-sm">{detailOrder.customerNote}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-slate-400">Order not found</p>
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  )
}
