'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { ordersApi, Order } from '@/lib/api/orders'
import { formatCurrency, formatNumber } from '@/lib/formatNumber'

export default function PurchasesPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Fetch orders with React Query (cached for 5 minutes)
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const result = await ordersApi.list()
      if (result.success && result.data) {
        return result.data
      }
      throw new Error(result.error || 'Failed to load orders')
    },
  })

  // Fetch stats with React Query (cached)
  const { data: stats = { totalOrders: 0, totalRevenue: 0, pendingOrders: 0, completedOrders: 0 } } = useQuery({
    queryKey: ['admin-orders-stats'],
    queryFn: async () => {
      const result = await ordersApi.getStats()
      if (result.success && result.data) {
        return result.data
      }
      return { totalOrders: 0, totalRevenue: 0, pendingOrders: 0, completedOrders: 0 }
    },
  })

  const loading = ordersLoading
  const error = ordersError ? String(ordersError) : ''

  function loadData() {
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    queryClient.invalidateQueries({ queryKey: ['admin-orders-stats'] })
  }

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status.toLowerCase() === statusFilter)

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  const getStatusColor = (status: string) => {
    switch(status) {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

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
          <button
            onClick={loadData}
            className="bg-primary hover:bg-primary/90 text-black font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Purchases</h1>
        <p className="text-slate-500 text-xs sm:text-sm">View and manage customer orders</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Total Orders</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="shopping-cart" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatNumber(stats.totalOrders)}</p>
          <p className="text-xs">
            <span className="text-slate-500">all time</span>
          </p>
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
            <span className="text-primary">{stats.completedOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%</span>
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
          <p className="text-xs">
            <span className="text-orange-400">needs attention</span>
          </p>
        </div>

        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-slate-400 text-xs lg:text-sm">Total Revenue</p>
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="wallet" size={16} />
            </div>
          </div>
          <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs">
            <span className="text-slate-500">gross revenue</span>
          </p>
        </div>
      </div>

      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 mb-4">
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
      </div>

      <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1f1f1f]">
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Order Number</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Customer</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Items</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Total</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Payment</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Status</th>
                <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Date</th>
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
                        {order.phone && (
                          <p className="text-slate-500 text-xs">{order.phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-sm">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-5 py-3 text-white font-medium">${Number(order.total).toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        order.paymentStatus === 'PAID'
                          ? 'bg-green-500/10 text-green-400'
                          : order.paymentStatus === 'FAILED'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-orange-500/10 text-orange-400'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-sm">{formatDate(order.createdAt)}</td>
                    <td className="px-5 py-3">
                      <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="View Details">
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
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

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
    </AdminLayout>
  )
}
