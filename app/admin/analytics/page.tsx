'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { analyticsApi } from '@/lib/api/analytics'
import { formatCurrency, formatNumber } from '@/lib/formatNumber'

type Period = '7days' | '30days' | '90days' | 'all'

const PERIOD_LABELS: Record<Period, string> = {
  '7days': 'Last 7 Days',
  '30days': 'Last 30 Days',
  '90days': 'Last 90 Days',
  all: 'All Time',
}

function getPeriodDates(period: Period): { startDate?: string; endDate?: string } {
  if (period === 'all') return {}
  const now = new Date()
  const end = now.toISOString()
  const start = new Date(now)
  if (period === '7days') start.setDate(start.getDate() - 7)
  else if (period === '30days') start.setDate(start.getDate() - 30)
  else if (period === '90days') start.setDate(start.getDate() - 90)
  return { startDate: start.toISOString(), endDate: end }
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30days')
  const [showPeriodMenu, setShowPeriodMenu] = useState(false)
  const periodRef = useRef<HTMLDivElement>(null)
  const { startDate, endDate } = getPeriodDates(period)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) {
        setShowPeriodMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Fetch dashboard stats (includes completedOrders, pendingOrders)
  const { data: stats = null } = useQuery({
    queryKey: ['analytics-stats', period],
    queryFn: async () => {
      const result = await analyticsApi.getDashboardStats(startDate, endDate)
      if (result.success && result.data) {
        return result.data
      }
      return null
    },
    refetchInterval: 30000,
  })

  // Fetch top products
  const { data: topProducts = [] } = useQuery({
    queryKey: ['analytics-top-products'],
    queryFn: async () => {
      const result = await analyticsApi.getTopProducts(4)
      if (result.success && result.data) {
        return result.data
      }
      return []
    },
    refetchInterval: 30000,
  })

  // Fetch monthly revenue data
  const { data: monthlyRevenue = [], isLoading } = useQuery({
    queryKey: ['analytics-monthly-revenue'],
    queryFn: async () => {
      const result = await analyticsApi.getMonthlyRevenue(6)
      if (result.success && result.data) {
        return result.data
      }
      return []
    },
    refetchInterval: 30000,
  })

  // Fetch customer growth data
  const { data: customerGrowth = [] } = useQuery({
    queryKey: ['analytics-customer-growth'],
    queryFn: async () => {
      const result = await analyticsApi.getCustomerGrowth(30)
      return result.success && result.data ? result.data : []
    },
    refetchInterval: 30000,
  })

  // Fetch revenue by category
  const { data: revenueByCategory = [] } = useQuery({
    queryKey: ['analytics-revenue-by-category'],
    queryFn: async () => {
      const result = await analyticsApi.getRevenueByCategory()
      return result.success && result.data ? result.data : []
    },
    refetchInterval: 30000,
  })

  // Fetch activity feed
  const { data: activityFeed = [] } = useQuery({
    queryKey: ['analytics-activity-feed'],
    queryFn: async () => {
      const result = await analyticsApi.getActivityFeed(10)
      return result.success && result.data ? result.data : []
    },
    refetchInterval: 30000,
  })

  const avgOrderValue = stats?.totalOrders
    ? (stats?.totalRevenue || 0) / stats.totalOrders
    : 0

  // Get max revenue for scaling chart
  const maxRevenue = Math.max(...monthlyRevenue.map((d: any) => d.revenue || 0), 1)
  const maxSignups = Math.max(...customerGrowth.map((d: any) => d.signups || 0), 1)
  const maxCategoryRevenue = Math.max(...revenueByCategory.map((d: any) => d.revenue || 0), 1)

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Analytics</h1>
          <p className="text-slate-500 text-xs sm:text-sm">Detailed marketplace performance metrics</p>
        </div>
        <div className="relative" ref={periodRef}>
          <button
            onClick={() => setShowPeriodMenu(!showPeriodMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-[#141414] border border-[#1f1f1f] rounded-lg text-sm text-slate-300 hover:border-[#2a2a2a] transition-colors"
          >
            {PERIOD_LABELS[period]}
            <Icon name="chevron-down" size={14} />
          </button>
          {showPeriodMenu && (
            <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-50 overflow-hidden min-w-[150px]">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setShowPeriodMenu(false) }}
                  className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                    period === p ? 'bg-primary/10 text-primary' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-400">Loading analytics...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-slate-400 text-xs lg:text-sm">Total Revenue</p>
                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon name="wallet" size={16} />
                </div>
              </div>
              <p className="text-white text-lg lg:text-2xl font-bold mb-1">
                {formatCurrency(stats?.totalRevenue || 0)}
              </p>
              <p className="text-xs">
                <span className="text-slate-500">total earnings</span>
              </p>
            </div>

            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-slate-400 text-xs lg:text-sm">Total Orders</p>
                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Icon name="shopping-cart" size={16} />
                </div>
              </div>
              <p className="text-white text-lg lg:text-2xl font-bold mb-1">
                {formatNumber(stats?.totalOrders || 0)}
              </p>
              <p className="text-xs">
                <span className="text-slate-500">all orders</span>
              </p>
            </div>

            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-slate-400 text-xs lg:text-sm">Products</p>
                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Icon name="code" size={16} />
                </div>
              </div>
              <p className="text-white text-lg lg:text-2xl font-bold mb-1">
                {formatNumber(stats?.totalProducts || 0)}
              </p>
              <p className="text-xs">
                <span className="text-slate-500">in catalog</span>
              </p>
            </div>

            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-slate-400 text-xs lg:text-sm">Avg. Order Value</p>
                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                  <Icon name="chart" size={16} />
                </div>
              </div>
              <p className="text-white text-lg lg:text-2xl font-bold mb-1">
                {formatCurrency(avgOrderValue)}
              </p>
              <p className="text-xs">
                <span className="text-slate-500">per order</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Revenue Trends */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Revenue Trends</h3>
              <div className="h-64 flex items-end justify-between gap-2">
                {monthlyRevenue.length > 0 ? (
                  monthlyRevenue.map((data: any, i: number) => {
                    const height = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0
                    const monthLabel = new Date(data.date).toLocaleDateString('en-US', { month: 'short' })
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div
                          className="w-full bg-gradient-to-t from-primary/20 to-primary/5 rounded-t-lg relative"
                          style={{ height: `${Math.max(height, 5)}%` }}
                        >
                          <div className="absolute inset-x-0 top-0 h-1 bg-primary rounded-t-lg" />
                        </div>
                        <span className="text-slate-500 text-xs">{monthLabel}</span>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                    No revenue data available
                  </div>
                )}
              </div>
            </div>

            {/* Top Products by Sales */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Top Products by Sales</h3>
              <div className="space-y-3">
                {topProducts.length > 0 ? (
                  topProducts.map((product: any) => {
                    const salesCount = product._count?.orderItems || 0
                    const maxSales = Math.max(...topProducts.map((p: any) => p._count?.orderItems || 0))
                    const percentage = maxSales > 0 ? (salesCount / maxSales) * 100 : 0
                    return (
                      <div key={product.id}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-slate-300 truncate flex-1">{product.name}</span>
                          <span className="text-white font-medium ml-2">
                            {salesCount} {salesCount === 1 ? 'sale' : 'sales'}
                          </span>
                        </div>
                        <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No products available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer Growth + Revenue by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Customer Growth */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Customer Growth</h3>
              <div className="h-48 flex items-end gap-[2px]">
                {customerGrowth.length > 0 ? (
                  customerGrowth.map((data: any, i: number) => {
                    const height = maxSignups > 0 ? (data.signups / maxSignups) * 100 : 0
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${data.date}: ${data.signups} signup${data.signups !== 1 ? 's' : ''}`}>
                        <div
                          className="w-full bg-gradient-to-t from-green-500/30 to-green-500/10 rounded-t relative min-h-[2px]"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        >
                          <div className="absolute inset-x-0 top-0 h-[2px] bg-green-400 rounded-t" />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                    No signup data available
                  </div>
                )}
              </div>
              {customerGrowth.length > 0 && (
                <div className="flex justify-between mt-2">
                  <span className="text-slate-500 text-xs">{customerGrowth[0]?.date ? new Date(customerGrowth[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
                  <span className="text-slate-500 text-xs">{customerGrowth[customerGrowth.length - 1]?.date ? new Date(customerGrowth[customerGrowth.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
                </div>
              )}
            </div>

            {/* Revenue by Category */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Revenue by Category</h3>
              <div className="space-y-3">
                {revenueByCategory.length > 0 ? (
                  revenueByCategory.map((item: any, i: number) => {
                    const percentage = maxCategoryRevenue > 0 ? (item.revenue / maxCategoryRevenue) * 100 : 0
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-slate-300 truncate flex-1">{item.category}</span>
                          <span className="text-white font-medium ml-2">{formatCurrency(item.revenue)}</span>
                        </div>
                        <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No category data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Statistics */}
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5 mb-6">
            <h3 className="text-white font-semibold mb-4">Order Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1a1a1a] rounded-lg p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Icon name="check" size={20} className="text-primary" />
                </div>
                <p className="text-white font-semibold mb-1">
                  {formatNumber(stats?.completedOrders || 0)}
                </p>
                <p className="text-slate-400 text-sm mb-2">Completed Orders</p>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full bg-primary"
                    style={{
                      width: `${
                        stats?.totalOrders
                          ? (stats.completedOrders / stats.totalOrders) * 100
                          : 0
                      }%`,
                    }}
                  />
                  <span className="text-xs text-slate-500">
                    {stats?.totalOrders
                      ? Math.round((stats.completedOrders / stats.totalOrders) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>

              <div className="bg-[#1a1a1a] rounded-lg p-4">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3">
                  <Icon name="clock" size={20} className="text-orange-400" />
                </div>
                <p className="text-white font-semibold mb-1">
                  {formatNumber(stats?.pendingOrders || 0)}
                </p>
                <p className="text-slate-400 text-sm mb-2">Pending Orders</p>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full bg-orange-500"
                    style={{
                      width: `${
                        stats?.totalOrders
                          ? (stats.pendingOrders / stats.totalOrders) * 100
                          : 0
                      }%`,
                    }}
                  />
                  <span className="text-xs text-slate-500">
                    {stats?.totalOrders
                      ? Math.round((stats.pendingOrders / stats.totalOrders) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>

              <div className="bg-[#1a1a1a] rounded-lg p-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                  <Icon name="ticket" size={20} className="text-blue-400" />
                </div>
                <p className="text-white font-semibold mb-1">
                  {formatNumber(stats?.openTickets || 0)}
                </p>
                <p className="text-slate-400 text-sm mb-2">Open Tickets</p>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full bg-blue-500"
                    style={{
                      width: `${
                        stats?.totalTickets ? (stats.openTickets / stats.totalTickets) * 100 : 0
                      }%`,
                    }}
                  />
                  <span className="text-xs text-slate-500">
                    {stats?.totalTickets ? Math.round((stats.openTickets / stats.totalTickets) * 100) : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-1">
              {activityFeed.length > 0 ? (
                activityFeed.map((item: any, i: number) => {
                  const iconName = item.type === 'order' ? 'shopping-cart' : item.type === 'signup' ? 'users' : 'ticket'
                  const iconColor = item.type === 'order' ? 'text-primary bg-primary/10' : item.type === 'signup' ? 'text-blue-400 bg-blue-500/10' : 'text-orange-400 bg-orange-500/10'
                  const timeAgo = getTimeAgo(item.timestamp)
                  return (
                    <div key={`${item.type}-${item.id}-${i}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                        <Icon name={iconName} size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 truncate">
                          {item.type === 'order' && <>Order <span className="text-white font-medium">#{item.label}</span> — {formatCurrency(Number(item.value) || 0)}</>}
                          {item.type === 'signup' && <>New customer <span className="text-white font-medium">{item.label || item.value}</span></>}
                          {item.type === 'ticket' && <>Ticket: <span className="text-white font-medium">{item.label}</span></>}
                        </p>
                      </div>
                      {item.detail && (
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                          item.detail === 'PAID' || item.detail === 'DELIVERED' ? 'bg-primary/10 text-primary'
                          : item.detail === 'PENDING' ? 'bg-orange-500/10 text-orange-400'
                          : item.detail === 'URGENT' || item.detail === 'HIGH' ? 'bg-red-500/10 text-red-400'
                          : 'bg-slate-500/10 text-slate-400'
                        }`}>
                          {item.detail}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 flex-shrink-0">{timeAgo}</span>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
