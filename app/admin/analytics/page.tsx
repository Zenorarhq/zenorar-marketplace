'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { analyticsApi } from '@/lib/api/analytics'
import { ordersApi } from '@/lib/api/orders'
import { productsApi } from '@/lib/api/products'
import { formatCurrency, formatNumber } from '@/lib/formatNumber'

type Period = '7days' | '30days' | '90days' | 'all' | 'custom'
type TabType = 'overview' | 'products' | 'customers' | 'transactions'

const PERIOD_LABELS: Record<Period, string> = {
  '7days': 'Last 7 Days',
  '30days': 'Last 30 Days',
  '90days': 'Last 90 Days',
  all: 'All Time',
  custom: 'Custom Range',
}

const TABS = [
  { id: 'overview' as TabType, label: 'Overview', icon: 'dashboard' },
  { id: 'products' as TabType, label: 'Products', icon: 'code' },
  { id: 'customers' as TabType, label: 'Customers', icon: 'user-group' },
  { id: 'transactions' as TabType, label: 'Transactions', icon: 'cart' },
]

function getPeriodDates(period: Period, customStart?: string, customEnd?: string): { startDate?: string; endDate?: string } {
  if (period === 'all') return {}
  if (period === 'custom') {
    return {
      startDate: customStart ? new Date(customStart).toISOString() : undefined,
      endDate: customEnd ? new Date(customEnd + 'T23:59:59').toISOString() : undefined,
    }
  }
  const now = new Date()
  const end = now.toISOString()
  const start = new Date(now)
  if (period === '7days') start.setDate(start.getDate() - 7)
  else if (period === '30days') start.setDate(start.getDate() - 30)
  else if (period === '90days') start.setDate(start.getDate() - 90)
  return { startDate: start.toISOString(), endDate: end }
}

function getPeriodMonths(period: Period): number {
  if (period === '7days') return 1
  if (period === '30days') return 3
  if (period === '90days') return 6
  return 12 // 'all' or 'custom'
}

function getPeriodDays(period: Period): number {
  if (period === '7days') return 7
  if (period === '30days') return 30
  if (period === '90days') return 90
  return 90 // 'all' → backend caps at 90 anyway
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
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [productsPage, setProductsPage] = useState(1)
  const [customersPage, setCustomersPage] = useState(1)
  const [transactionsPage, setTransactionsPage] = useState(1)
  const PAGE_SIZE = 10
  const periodRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const { startDate, endDate } = getPeriodDates(period, customStartDate, customEndDate)

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
  const { data: stats = null } = useQuery({
    queryKey: ['analytics-stats', period, customStartDate, customEndDate],
    queryFn: async () => {
      const result = await analyticsApi.getDashboardStats(startDate, endDate)
      if (result.success && result.data) {
        return result.data
      }
      return null
    },
    refetchInterval: 30000,
  })

  // Fetch top products (analytics)
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
    queryKey: ['analytics-monthly-revenue', period],
    queryFn: async () => {
      const result = await analyticsApi.getMonthlyRevenue(getPeriodMonths(period))
      if (result.success && result.data) {
        return result.data
      }
      return []
    },
    refetchInterval: 30000,
  })

  // Fetch customer growth data
  const { data: customerGrowth = [] } = useQuery({
    queryKey: ['analytics-customer-growth', period],
    queryFn: async () => {
      const result = await analyticsApi.getCustomerGrowth(getPeriodDays(period))
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

  // Fetch products list (for Products tab)
  const { data: productsList = [] } = useQuery({
    queryKey: ['analytics-products-list'],
    queryFn: async () => {
      const result = await productsApi.list({ sortBy: 'sales', limit: 100 })
      return result.success && result.data ? result.data : []
    },
    enabled: activeTab === 'products',
    refetchInterval: 30000,
  })

  // Fetch recent orders (for Customers + Transactions tabs)
  const { data: recentOrders = [] } = useQuery({
    queryKey: ['analytics-recent-orders'],
    queryFn: async () => {
      const result = await ordersApi.list({ limit: 100, sortBy: 'createdAt', sortOrder: 'desc' })
      return result.success && result.data ? result.data : []
    },
    enabled: activeTab === 'customers' || activeTab === 'transactions',
    refetchInterval: 30000,
  })

  const avgOrderValue = stats?.totalOrders
    ? (stats?.totalRevenue || 0) / stats.totalOrders
    : 0

  // Get max values for scaling charts
  const maxRevenue = Math.max(...monthlyRevenue.map((d: any) => d.revenue || 0), 1)
  const maxSignups = Math.max(...customerGrowth.map((d: any) => d.signups || 0), 1)
  const maxCategoryRevenue = Math.max(...revenueByCategory.map((d: any) => d.revenue || 0), 1)

  // CSV Export
  function csvEscape(val: string) {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  function handleExport() {
    let csv = ''
    let filename = 'analytics'

    if (activeTab === 'overview') {
      csv = 'Metric,Value\n'
      csv += `Total Revenue,${stats?.totalRevenue || 0}\n`
      csv += `Total Orders,${stats?.totalOrders || 0}\n`
      csv += `Total Products,${stats?.totalProducts || 0}\n`
      csv += `Avg Order Value,${avgOrderValue.toFixed(2)}\n`
      csv += `Completed Orders,${stats?.completedOrders || 0}\n`
      csv += `Pending Orders,${stats?.pendingOrders || 0}\n`
      filename = 'analytics-overview'
    } else if (activeTab === 'products') {
      csv = 'Product,Price,Stock,Status\n'
      productsList.forEach((p: any) => {
        csv += `${csvEscape(p.name)},${p.price},${p.stock},${p.stock > 0 ? 'In Stock' : 'Out of Stock'}\n`
      })
      filename = 'analytics-products'
    } else if (activeTab === 'customers') {
      csv = 'Customer,Order,Amount,Date\n'
      recentOrders.forEach((o: any) => {
        csv += `${csvEscape(o.email || 'Guest')},${o.orderNumber},${o.total},${new Date(o.createdAt).toLocaleDateString()}\n`
      })
      filename = 'analytics-customers'
    } else if (activeTab === 'transactions') {
      csv = 'Order,Amount,Status,Date\n'
      recentOrders.forEach((o: any) => {
        csv += `${o.orderNumber},${o.total},${o.status},${new Date(o.createdAt).toLocaleDateString()}\n`
      })
      filename = 'analytics-transactions'
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleTabClick = (tabId: TabType, index: number) => {
    setActiveTab(tabId)
    setProductsPage(1)
    setCustomersPage(1)
    setTransactionsPage(1)
    if (tabsRef.current) {
      const container = tabsRef.current
      const tabs = container.children
      if (tabs[index]) {
        const tab = tabs[index] as HTMLElement
        const scrollLeft = tab.offsetLeft - container.offsetWidth / 2 + tab.offsetWidth / 2
        container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' })
      }
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-full overflow-hidden">
        {/* Header with Period Selector + Export */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Analytics</h1>
            <p className="text-slate-500 text-xs sm:text-sm">Detailed marketplace performance metrics</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
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
                      onClick={() => { setPeriod(p); setShowPeriodMenu(false); setProductsPage(1); setCustomersPage(1); setTransactionsPage(1) }}
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
            <button
              onClick={handleExport}
              className="bg-primary hover:bg-primary/90 text-black text-xs sm:text-sm font-semibold px-2 sm:px-3 py-2 rounded-lg transition-colors flex items-center gap-1 sm:gap-2"
            >
              <Icon name="download" size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {period === 'custom' && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-slate-400 text-xs">From</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-[#141414] border border-[#1f1f1f] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50 [color-scheme:dark]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-400 text-xs">To</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-[#141414] border border-[#1f1f1f] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50 [color-scheme:dark]"
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div
          ref={tabsRef}
          className="flex gap-2 mb-6 overflow-x-auto max-w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {TABS.map((tab, index) => (
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

        {/* ==================== OVERVIEW TAB ==================== */}
        {activeTab === 'overview' && (
          <>
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
                      {stats?.revenueChange !== undefined && stats.revenueChange !== 0 ? (
                        <span className={stats.revenueChange > 0 ? 'text-green-400' : 'text-red-400'}>
                          {stats.revenueChange > 0 ? '+' : ''}{stats.revenueChange}%
                        </span>
                      ) : null}
                      <span className="text-slate-500">{stats?.revenueChange !== undefined && stats.revenueChange !== 0 ? ' vs prev period' : 'total earnings'}</span>
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
                      {stats?.ordersChange !== undefined && stats.ordersChange !== 0 ? (
                        <span className={stats.ordersChange > 0 ? 'text-green-400' : 'text-red-400'}>
                          {stats.ordersChange > 0 ? '+' : ''}{stats.ordersChange}%
                        </span>
                      ) : null}
                      <span className="text-slate-500">{stats?.ordersChange !== undefined && stats.ordersChange !== 0 ? ' vs prev period' : 'all orders'}</span>
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
                    <div className="h-48 flex items-end gap-[2px]">
                      {monthlyRevenue.length > 0 ? (
                        monthlyRevenue.map((data: any, i: number) => {
                          const height = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0
                          const monthLabel = new Date(data.date).toLocaleDateString('en-US', { month: 'short' })
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${monthLabel}: ${formatCurrency(data.revenue)}`}>
                              <div
                                className="w-full bg-gradient-to-t from-primary/30 to-primary/10 rounded-t relative min-h-[2px]"
                                style={{ height: `${Math.max(height, 2)}%` }}
                              >
                                <div className="absolute inset-x-0 top-0 h-[2px] bg-primary rounded-t" />
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
                    {monthlyRevenue.length > 0 && (
                      <div className="flex justify-between mt-2">
                        <span className="text-slate-500 text-xs">{new Date(monthlyRevenue[0]?.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                        <span className="text-slate-500 text-xs">{new Date(monthlyRevenue[monthlyRevenue.length - 1]?.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                      </div>
                    )}
                  </div>

                  {/* Top Products by Sales */}
                  <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4">Top Products by Sales</h3>
                    <div className="space-y-3">
                      {topProducts.length > 0 ? (
                        topProducts.map((product: any) => {
                          const salesCount = product.sales || 0
                          const maxSales = Math.max(...topProducts.map((p: any) => p.sales || 0))
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
                        const iconName = item.type === 'order' ? 'shopping-cart' : item.type === 'signup' ? 'user-add' : 'ticket'
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
                                item.detail === 'PAID' || item.detail === 'DELIVERED' || item.detail === 'CONFIRMED' ? 'bg-primary/10 text-primary'
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
          </>
        )}

        {/* ==================== PRODUCTS TAB ==================== */}
        {activeTab === 'products' && (
          <>
            {/* Product Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Total Products</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon name="code" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatNumber(stats?.totalProducts || productsList.length)}</p>
                <p className="text-xs">
                  <span className="text-slate-500">active listings</span>
                </p>
              </div>

              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Top Seller</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
                    <Icon name="star" size={16} />
                  </div>
                </div>
                <p className="text-white text-sm lg:text-base font-bold mb-1 truncate">{productsList[0]?.name || 'N/A'}</p>
                <p className="text-xs">
                  <span className="text-slate-500">best performing</span>
                </p>
              </div>

              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Avg Price</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Icon name="wallet" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">
                  {productsList.length > 0 ? formatCurrency(productsList.reduce((sum: number, p: any) => sum + p.price, 0) / productsList.length) : '$0.00'}
                </p>
                <p className="text-xs">
                  <span className="text-slate-500">across catalog</span>
                </p>
              </div>

              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">In Stock</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
                    <Icon name="check" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">
                  {productsList.filter((p: any) => p.stock > 0).length}
                </p>
                <p className="text-xs">
                  <span className="text-slate-500">available products</span>
                </p>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
                <h3 className="text-white font-semibold">Top Selling Products</h3>
              </div>

              {productsList.length > 0 ? (
                <>
                  <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1f1f1f]">
                          <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Product</th>
                          <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Price</th>
                          <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Stock</th>
                          <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productsList.slice((productsPage - 1) * PAGE_SIZE, productsPage * PAGE_SIZE).map((product: any) => (
                          <tr key={product.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-white/5">
                            <td className="px-4 py-3">
                              <p className="text-white text-sm font-medium truncate max-w-[200px]">{product.name}</p>
                            </td>
                            <td className="px-4 py-3 text-white text-sm">{formatCurrency(product.price)}</td>
                            <td className="px-4 py-3 text-slate-300 text-sm">{product.stock}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                product.stock > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                              }`}>
                                {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(() => {
                    const totalPages = Math.ceil(productsList.length / PAGE_SIZE)
                    return totalPages > 1 ? (
                      <div className="border-t border-[#1f1f1f] px-5 py-4">
                        <div className="flex items-center justify-between">
                          <p className="text-slate-400 text-sm">
                            Showing {(productsPage - 1) * PAGE_SIZE + 1}-{Math.min(productsPage * PAGE_SIZE, productsList.length)} of {productsList.length}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setProductsPage(p => Math.max(1, p - 1))}
                              disabled={productsPage === 1}
                              className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number
                                if (totalPages <= 5) pageNum = i + 1
                                else if (productsPage <= 3) pageNum = i + 1
                                else if (productsPage >= totalPages - 2) pageNum = totalPages - 4 + i
                                else pageNum = productsPage - 2 + i
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setProductsPage(pageNum)}
                                    className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                                      productsPage === pageNum
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
                              onClick={() => setProductsPage(p => Math.min(totalPages, p + 1))}
                              disabled={productsPage === totalPages}
                              className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null
                  })()}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm">No products found</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================== CUSTOMERS TAB ==================== */}
        {activeTab === 'customers' && (
          <>
            {/* Customer Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Total Orders</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon name="user-group" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatNumber(stats?.totalOrders || 0)}</p>
                <p className="text-xs">
                  <span className="text-slate-500">total orders placed</span>
                </p>
              </div>

              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Avg Order Value</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
                    <Icon name="wallet" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatCurrency(avgOrderValue)}</p>
                <p className="text-xs">
                  <span className="text-slate-500">per order</span>
                </p>
              </div>

              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Recent Orders</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Icon name="cart" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">{recentOrders.length}</p>
                <p className="text-xs">
                  <span className="text-slate-500">recent orders</span>
                </p>
              </div>

              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Completed</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
                    <Icon name="check" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">
                  {recentOrders.filter((o: any) => o.status === 'CONFIRMED').length}
                </p>
                <p className="text-xs">
                  <span className="text-slate-500">orders completed</span>
                </p>
              </div>
            </div>

            {/* Customer Orders Table */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
                <h3 className="text-white font-semibold">Recent Customer Orders</h3>
              </div>

              {recentOrders.length > 0 ? (
                <>
                  <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1f1f1f]">
                          <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Customer</th>
                          <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Order</th>
                          <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Amount</th>
                          <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.slice((customersPage - 1) * PAGE_SIZE, customersPage * PAGE_SIZE).map((order: any) => (
                          <tr key={order.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-white/5">
                            <td className="px-4 py-3">
                              <p className="text-white text-sm truncate max-w-[150px]">{order.email || 'Guest'}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-slate-300 text-sm font-mono truncate max-w-[100px]">{order.orderNumber}</p>
                            </td>
                            <td className="px-4 py-3 text-white text-sm">{formatCurrency(order.total)}</td>
                            <td className="px-4 py-3 text-slate-400 text-sm">
                              {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(() => {
                    const totalPages = Math.ceil(recentOrders.length / PAGE_SIZE)
                    return totalPages > 1 ? (
                      <div className="border-t border-[#1f1f1f] px-5 py-4">
                        <div className="flex items-center justify-between">
                          <p className="text-slate-400 text-sm">
                            Showing {(customersPage - 1) * PAGE_SIZE + 1}-{Math.min(customersPage * PAGE_SIZE, recentOrders.length)} of {recentOrders.length}
                          </p>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setCustomersPage(p => Math.max(1, p - 1))} disabled={customersPage === 1} className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number
                                if (totalPages <= 5) pageNum = i + 1
                                else if (customersPage <= 3) pageNum = i + 1
                                else if (customersPage >= totalPages - 2) pageNum = totalPages - 4 + i
                                else pageNum = customersPage - 2 + i
                                return (
                                  <button key={pageNum} onClick={() => setCustomersPage(pageNum)}
                                    className={`w-8 h-8 rounded-lg text-sm transition-colors ${customersPage === pageNum ? 'bg-primary text-black font-semibold' : 'bg-[#1a1a1a] hover:bg-white/10 text-slate-400'}`}>
                                    {pageNum}
                                  </button>
                                )
                              })}
                            </div>
                            <button onClick={() => setCustomersPage(p => Math.min(totalPages, p + 1))} disabled={customersPage === totalPages} className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                          </div>
                        </div>
                      </div>
                    ) : null
                  })()}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm">No customer data found</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================== TRANSACTIONS TAB ==================== */}
        {activeTab === 'transactions' && (
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
              <h3 className="text-white font-semibold">Recent Transactions</h3>
            </div>

            {recentOrders.length > 0 ? (
              <>
                <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1f1f1f]">
                        <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Order</th>
                        <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Amount</th>
                        <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Status</th>
                        <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.slice((transactionsPage - 1) * PAGE_SIZE, transactionsPage * PAGE_SIZE).map((order: any) => (
                        <tr key={order.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-white/5">
                          <td className="px-4 py-3">
                            <p className="text-white text-sm font-mono truncate max-w-[120px]">{order.orderNumber}</p>
                          </td>
                          <td className="px-4 py-3 text-white text-sm">{formatCurrency(order.total)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              order.status === 'DELIVERED' ? 'bg-primary/10 text-primary' :
                              order.status === 'SHIPPED' ? 'bg-blue-500/10 text-blue-400' :
                              order.status === 'PROCESSING' ? 'bg-yellow-500/10 text-yellow-400' :
                              'bg-slate-500/10 text-slate-400'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-sm">
                            {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(() => {
                  const totalPages = Math.ceil(recentOrders.length / PAGE_SIZE)
                  return totalPages > 1 ? (
                    <div className="border-t border-[#1f1f1f] px-5 py-4">
                      <div className="flex items-center justify-between">
                        <p className="text-slate-400 text-sm">
                          Showing {(transactionsPage - 1) * PAGE_SIZE + 1}-{Math.min(transactionsPage * PAGE_SIZE, recentOrders.length)} of {recentOrders.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setTransactionsPage(p => Math.max(1, p - 1))} disabled={transactionsPage === 1} className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum: number
                              if (totalPages <= 5) pageNum = i + 1
                              else if (transactionsPage <= 3) pageNum = i + 1
                              else if (transactionsPage >= totalPages - 2) pageNum = totalPages - 4 + i
                              else pageNum = transactionsPage - 2 + i
                              return (
                                <button key={pageNum} onClick={() => setTransactionsPage(pageNum)}
                                  className={`w-8 h-8 rounded-lg text-sm transition-colors ${transactionsPage === pageNum ? 'bg-primary text-black font-semibold' : 'bg-[#1a1a1a] hover:bg-white/10 text-slate-400'}`}>
                                  {pageNum}
                                </button>
                              )
                            })}
                          </div>
                          <button onClick={() => setTransactionsPage(p => Math.min(totalPages, p + 1))} disabled={transactionsPage === totalPages} className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-white/10 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                        </div>
                      </div>
                    </div>
                  ) : null
                })()}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">No transactions found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
