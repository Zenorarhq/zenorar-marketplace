'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { analyticsApi, DashboardStats } from '@/lib/api/analytics'
import { Product } from '@/lib/api/products'
import { ordersApi, Order } from '@/lib/api/orders'
import { formatCurrency, formatNumber } from '@/lib/formatNumber'

type Period = 'today' | 'yesterday' | '7days' | '30days' | 'all'

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7days': 'Last 7 Days',
  '30days': 'Last 30 Days',
  all: 'All Time',
}

function getPeriodDates(period: Period): { startDate?: string; endDate?: string } {
  const now = new Date()
  const end = now.toISOString()
  switch (period) {
    case 'today': {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      return { startDate: start.toISOString(), endDate: end }
    }
    case 'yesterday': {
      const start = new Date(now)
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      const end2 = new Date(start)
      end2.setHours(23, 59, 59, 999)
      return { startDate: start.toISOString(), endDate: end2.toISOString() }
    }
    case '7days': {
      const start = new Date(now)
      start.setDate(start.getDate() - 7)
      return { startDate: start.toISOString(), endDate: end }
    }
    case '30days': {
      const start = new Date(now)
      start.setDate(start.getDate() - 30)
      return { startDate: start.toISOString(), endDate: end }
    }
    case 'all':
    default:
      return {}
  }
}

function groupByWeek(dailyData: any[]): { date: string; revenue: number; orders: number }[] {
  const weeks: { date: string; revenue: number; orders: number }[] = []
  for (let i = 0; i < dailyData.length; i += 7) {
    const chunk = dailyData.slice(i, i + 7)
    const total = chunk.reduce((sum: number, d: any) => sum + (d.amount || d.revenue || 0), 0)
    const label = chunk[0]?.date || ''
    weeks.push({ date: label, revenue: total, orders: chunk.reduce((s: number, d: any) => s + (d.orders || 0), 0) })
  }
  return weeks
}

function getChartLabel(dateStr: string, period: Period): string {
  if (!dateStr) return ''
  // Monthly data comes as "YYYY-MM"
  if (period === 'all') {
    const [year, month] = dateStr.split('-')
    const d = new Date(Number(year), Number(month) - 1)
    return d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  }
  // Weekly: show "Feb 3" style
  if (period === '30days') {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  // Daily: show weekday
  const d = new Date(dateStr)
  if (period === 'today' || period === 'yesterday') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
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

export default function AdminDashboard() {
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState<Period>('7days')
  const [showPeriodMenu, setShowPeriodMenu] = useState(false)
  const periodRef = useRef<HTMLDivElement>(null)
  const { startDate, endDate } = getPeriodDates(period)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) {
        setShowPeriodMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Fetch dashboard stats
  const { data: stats = null, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats', period],
    queryFn: async () => {
      const result = await analyticsApi.getDashboardStats(startDate, endDate)
      if (result.success && result.data) {
        return result.data
      }
      throw new Error(result.error || 'Failed to load dashboard stats')
    },
    refetchInterval: 30000,
  })

  // Fetch top products (not filtered by period)
  const { data: topProducts = [] } = useQuery({
    queryKey: ['dashboard-top-products'],
    queryFn: async () => {
      const result = await analyticsApi.getTopProducts(4)
      if (result.success && result.data) {
        return result.data
      }
      return []
    },
    refetchInterval: 30000,
  })

  // Fetch chart data — granularity depends on period
  const { data: chartData = [] } = useQuery({
    queryKey: ['dashboard-chart', period],
    refetchInterval: 30000,
    queryFn: async () => {
      if (period === 'all') {
        // Monthly bars for All Time
        const result = await analyticsApi.getMonthlyRevenue(12)

        if (result.success && result.data) return result.data
        return []
      }
      // Daily data for other periods
      const days = period === 'today' ? 1 : period === 'yesterday' ? 1 : period === '30days' ? 30 : 7
      const result = await analyticsApi.getSalesChart(days)

      if (result.success && result.data) {
        let data = result.data
        // For 30 days, group into weekly buckets
        if (period === '30days') {
          data = groupByWeek(data)
        }
        return data
      }
      return []
    },
  })

  // Fetch recent orders
  const { data: recentOrders = [] } = useQuery({
    queryKey: ['dashboard-recent-orders'],
    queryFn: async () => {
      const result = await ordersApi.list({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' })
      if (result.success && result.data) {
        return result.data
      }
      return []
    },
    refetchInterval: 30000,
  })

  const loading = statsLoading
  const error = statsError ? String(statsError) : ''

  function loadDashboardData() {
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-top-products'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-chart'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-recent-orders'] })
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-400">Loading dashboard...</p>
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
          <p className="text-red-400 text-lg font-semibold mb-2">Error Loading Dashboard</p>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="bg-primary hover:bg-primary/90 text-black font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </AdminLayout>
    )
  }

  const changeLabel = period === 'today' ? 'vs yesterday'
    : period === 'yesterday' ? 'vs day before'
    : period === '7days' ? 'vs prev 7 days'
    : period === '30days' ? 'vs prev 30 days'
    : 'all time'

  const statCards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue || 0),
      change: stats?.revenueChange != null ? `${stats.revenueChange > 0 ? '+' : ''}${stats.revenueChange}%` : '',
      changeLabel,
      positive: !stats?.revenueChange || stats.revenueChange >= 0,
      icon: 'wallet'
    },
    {
      label: 'Total Products',
      value: formatNumber(stats?.totalProducts || 0),
      change: '-',
      changeLabel: 'active items',
      positive: true,
      icon: 'box'
    },
    {
      label: 'Total Orders',
      value: formatNumber(stats?.totalOrders || 0),
      change: stats?.ordersChange != null ? `${stats.ordersChange > 0 ? '+' : ''}${stats.ordersChange}%` : '',
      changeLabel,
      positive: !stats?.ordersChange || stats.ordersChange >= 0,
      icon: 'shopping-cart'
    },
    {
      label: 'Total Customers',
      value: formatNumber(stats?.totalCustomers || 0),
      change: '-',
      changeLabel: 'registered users',
      positive: true,
      icon: 'users'
    },
    {
      label: 'Open Tickets',
      value: formatNumber(stats?.openTickets || 0),
      change: formatNumber(stats?.totalTickets || 0),
      changeLabel: 'total tickets',
      positive: false,
      icon: 'ticket'
    },
  ]

  return (
    <AdminLayout>
      {/* Page Header with Period Selector */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-slate-500 text-xs sm:text-sm">Welcome back! Here&apos;s your marketplace overview</p>
        </div>
        <div className="relative" ref={periodRef}>
          <button
            onClick={() => setShowPeriodMenu(!showPeriodMenu)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 hover:border-primary/50 transition-colors"
          >
            {PERIOD_LABELS[period]}
            <Icon name="chevron-down" size={14} className="text-slate-400" />
          </button>
          {showPeriodMenu && (
            <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-50 overflow-hidden min-w-[140px]">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((key) => (
                <button
                  key={key}
                  onClick={() => { setPeriod(key); setShowPeriodMenu(false) }}
                  className={`block w-full text-left px-4 py-2 text-xs transition-colors ${
                    period === key ? 'bg-primary/10 text-primary' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {PERIOD_LABELS[key]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid - 2x2 on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 mb-6">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-slate-400 text-xs lg:text-sm">{stat.label}</p>
              <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center ${
                stat.positive ? 'bg-primary/10 text-primary' : 'bg-orange-500/10 text-orange-400'
              }`}>
                <Icon name={stat.icon} size={16} />
              </div>
            </div>
            <p className="text-white text-lg lg:text-2xl font-bold mb-1">{stat.value}</p>
            <p className="text-xs">
              <span className={stat.positive ? 'text-primary' : 'text-orange-400'}>
                {stat.change}
              </span>
              <span className="text-slate-500 ml-1">{stat.changeLabel}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Sales Overview Chart */}
        <div className="lg:col-span-2 bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold">Sales Overview</h3>
              <p className="text-slate-500 text-sm">Revenue performance — {PERIOD_LABELS[period]}</p>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="h-48 flex items-end gap-[2px]">
            {chartData.length > 0 ? (
              chartData.map((day: any, i: number) => {
                const maxRevenue = Math.max(...chartData.map((d: any) => d.amount || d.revenue || 0), 1)
                const dayAmount = day.amount || day.revenue || 0
                const height = maxRevenue > 0 ? (dayAmount / maxRevenue) * 100 : 0
                const barLabel = getChartLabel(day.date || day.month || '', period)
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end h-full"
                    title={`${barLabel}: ${formatCurrency(dayAmount)}`}
                  >
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
                No revenue data available
              </div>
            )}
          </div>
          {chartData.length > 0 && (
            <div className="flex justify-between mt-2">
              <span className="text-slate-500 text-xs">{getChartLabel(chartData[0]?.date || '', period)}</span>
              <span className="text-slate-500 text-xs">{getChartLabel(chartData[chartData.length - 1]?.date || '', period)}</span>
            </div>
          )}
        </div>

        {/* Product Distribution */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-white font-semibold">Quick Actions</h3>
            <p className="text-slate-500 text-sm">Manage your marketplace</p>
          </div>

          <div className="space-y-3">
            <Link
              href="/admin/products/new"
              className="flex items-center gap-3 p-3 bg-[#1a1a1a] hover:bg-white/5 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Icon name="add" size={20} />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Add Product</p>
                <p className="text-slate-500 text-xs">Create new listing</p>
              </div>
            </Link>

            <Link
              href="/admin/purchases"
              className="flex items-center gap-3 p-3 bg-[#1a1a1a] hover:bg-white/5 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Icon name="shopping-cart" size={20} />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">View Orders</p>
                <p className="text-slate-500 text-xs">{stats?.totalOrders || 0} total</p>
              </div>
            </Link>

            <Link
              href="/admin/tickets"
              className="flex items-center gap-3 p-3 bg-[#1a1a1a] hover:bg-white/5 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <Icon name="ticket" size={20} />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Support Tickets</p>
                <p className="text-slate-500 text-xs">{stats?.openTickets || 0} open</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#1f1f1f]">
            <h3 className="text-white font-semibold">Recent Activity</h3>
            <Link href="/admin/analytics" className="text-primary text-sm hover:underline">
              View All
            </Link>
          </div>

          <div className="divide-y divide-[#1f1f1f]">
            {recentOrders.length > 0 ? (
              recentOrders.map((order: any) => {
                const timeAgo = getTimeAgo(order.createdAt)
                const statusColor = order.status === 'CONFIRMED' || order.status === 'DELIVERED' ? 'text-green-400' :
                  order.status === 'CANCELLED' ? 'text-red-400' : 'text-yellow-400'
                return (
                  <div key={order.id} className="flex items-center gap-3 p-4 hover:bg-white/5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0">
                      <Icon name="shopping-cart" size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">
                        Order <span className="text-primary">#{order.orderNumber}</span> — {formatCurrency(order.total)}
                      </p>
                    </div>
                    <p className="text-slate-500 text-xs flex-shrink-0 text-right">
                      <span className={statusColor}>{order.status}</span> · {timeAgo}
                    </p>
                  </div>
                )
              })
            ) : (
              <div className="p-8 text-center">
                <p className="text-slate-400 text-sm">No recent orders</p>
              </div>
            )}
          </div>
        </div>

        {/* Best Sellers */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#1f1f1f]">
            <h3 className="text-white font-semibold">Top Products</h3>
            <Link href="/admin/products" className="text-primary text-sm hover:underline">
              View All
            </Link>
          </div>

          <div className="divide-y divide-[#1f1f1f]">
            {topProducts.length > 0 ? (
              topProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-4 p-4 hover:bg-white/5">
                  {product.images[0]?.url ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-primary">
                      <Icon name="image" size={20} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{product.name}</p>
                    <p className="text-slate-500 text-xs">
                      {product.isDigital ? 'Digital' : 'Physical'} Product
                    </p>
                  </div>
                  <p className="text-primary font-semibold">${Number(product.price).toFixed(2)}</p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <Icon name="shopping-cart" size={48} className="text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-sm">No products yet</p>
              </div>
            )}
          </div>

          {/* View Marketplace Stats Button */}
          <div className="p-4 border-t border-[#1f1f1f]">
            <Link
              href="/admin/analytics"
              className="block w-full bg-primary hover:bg-primary/90 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm text-center"
            >
              View Marketplace Stats
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
