'use client'

import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { financeApi } from '@/lib/api/finance'
import { ordersApi } from '@/lib/api/orders'
import { productsApi } from '@/lib/api/products'
import { formatCurrency } from '@/lib/formatNumber'

type ReportPeriod = '7d' | '30d' | '90d' | '12m' | 'custom'
type ReportType = 'overview' | 'sales' | 'products' | 'customers'

const periodOptions = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '12m', label: 'Last 12 Months' },
  { value: 'custom', label: 'Custom Range' },
]

const reportTabs = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'sales', label: 'Sales', icon: 'cart' },
  { id: 'products', label: 'Products', icon: 'code' },
  { id: 'customers', label: 'Customers', icon: 'user-group' },
]

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('30d')
  const [reportType, setReportType] = useState<ReportType>('overview')
  const tabsRef = useRef<HTMLDivElement>(null)

  // Fetch finance overview
  const { data: financeOverview } = useQuery({
    queryKey: ['finance-overview'],
    queryFn: async () => {
      const result = await financeApi.getOverview()
      return result.success && result.data ? result.data : null
    },
  })

  // Fetch daily revenue for chart
  const { data: dailyRevenue = [] } = useQuery({
    queryKey: ['daily-revenue', period],
    queryFn: async () => {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30
      const result = await financeApi.getDailyRevenue(days)
      return result.success && result.data ? result.data : []
    },
  })

  // Fetch orders stats
  const { data: ordersStats } = useQuery({
    queryKey: ['orders-stats'],
    queryFn: async () => {
      const result = await ordersApi.getStats()
      return result.success && result.data ? result.data : null
    },
  })

  // Fetch top products
  const { data: topProducts = [] } = useQuery({
    queryKey: ['top-products'],
    queryFn: async () => {
      const result = await productsApi.list({ sortBy: 'sales', limit: 5 })
      return result.success && result.data ? result.data : []
    },
  })

  // Fetch recent orders for transactions table
  const { data: recentOrders = [] } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: async () => {
      const result = await ordersApi.list({ limit: 10, sortBy: 'createdAt', sortOrder: 'desc' })
      return result.success && result.data ? result.data : []
    },
  })

  const handleTabClick = (tabId: ReportType, index: number) => {
    setReportType(tabId)
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

  function handleExport() {
    alert('Export functionality would generate CSV/PDF reports based on the current view and filters. This integrates with your reporting service.')
  }

  // Calculate stats from real data
  const totalRevenue = financeOverview?.totalRevenue || 0
  const totalOrders = ordersStats?.totalOrders || 0
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const refundRate = financeOverview?.totalRefunds && totalRevenue > 0
    ? (financeOverview.totalRefunds / totalRevenue) * 100
    : 0

  // Chart data from daily revenue
  const maxRevenue = dailyRevenue.length > 0 ? Math.max(...dailyRevenue.map(d => d.revenue)) : 0

  return (
    <AdminLayout>
      <div className="max-w-full overflow-hidden">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Reports & Analytics</h1>
            <p className="text-slate-500 text-xs sm:text-sm">Track your marketplace performance and insights</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Period Selector */}
            <div className="relative">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
                className="appearance-none bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-2 sm:pl-3 pr-7 sm:pr-9 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                {periodOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <Icon name="chevron-down" size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="bg-primary hover:bg-primary/90 text-black text-xs sm:text-sm font-semibold px-2 sm:px-3 py-2 rounded-lg transition-colors flex items-center gap-1 sm:gap-2"
            >
              <Icon name="download" size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div
          ref={tabsRef}
          className="flex gap-2 mb-6 overflow-x-auto max-w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {reportTabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id as ReportType, index)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                reportType === tab.id
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
        {reportType === 'overview' && (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Total Revenue</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon name="wallet" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs">
                  <span className="text-slate-500">gross revenue</span>
                </p>
              </div>

              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Total Orders</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon name="cart" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">{totalOrders.toLocaleString()}</p>
                <p className="text-xs">
                  <span className="text-slate-500">all time</span>
                </p>
              </div>

              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Average Order Value</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon name="stats" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatCurrency(avgOrderValue)}</p>
                <p className="text-xs">
                  <span className="text-slate-500">per order</span>
                </p>
              </div>

              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Refund Rate</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon name="refresh" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">{refundRate.toFixed(1)}%</p>
                <p className="text-xs">
                  <span className="text-slate-500">of revenue</span>
                </p>
              </div>
            </div>

            {/* Sales Chart */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 lg:p-5 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <h3 className="text-white font-semibold">Revenue Trend</h3>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-slate-400">Revenue</span>
                  </div>
                </div>
              </div>

              {dailyRevenue.length > 0 ? (
                <div className="flex gap-2">
                  {/* Y-axis labels */}
                  <div className="flex flex-col justify-between text-slate-500 text-xs py-2 pr-2">
                    <span>${(maxRevenue).toLocaleString()}</span>
                    <span>${(maxRevenue * 0.75).toLocaleString()}</span>
                    <span>${(maxRevenue * 0.5).toLocaleString()}</span>
                    <span>${(maxRevenue * 0.25).toLocaleString()}</span>
                    <span>$0</span>
                  </div>

                  {/* Chart area */}
                  <div className="flex-1 min-w-0">
                    <div className="h-48 lg:h-56 relative">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex flex-col justify-between">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div key={i} className="border-t border-[#1f1f1f]" />
                        ))}
                      </div>

                      {/* Line chart */}
                      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                        <polyline
                          fill="none"
                          stroke="#43D678"
                          strokeWidth="2"
                          points={dailyRevenue.map((d, i) => {
                            const x = (i / (dailyRevenue.length - 1)) * 100
                            const y = 100 - (d.revenue / maxRevenue) * 80
                            return `${x}%,${y}%`
                          }).join(' ')}
                        />
                        {dailyRevenue.map((d, i) => {
                          const x = (i / (dailyRevenue.length - 1)) * 100
                          const y = 100 - (d.revenue / maxRevenue) * 80
                          return (
                            <circle
                              key={i}
                              cx={`${x}%`}
                              cy={`${y}%`}
                              r="4"
                              fill="#43D678"
                            />
                          )
                        })}
                      </svg>
                    </div>

                    {/* X-axis labels */}
                    <div className="flex justify-between mt-2 text-slate-500 text-xs overflow-hidden">
                      {dailyRevenue.map((d, i) => (
                        <span key={i} className="truncate">{new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <p className="text-slate-400">No revenue data available</p>
                </div>
              )}
            </div>

            {/* Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Top Products */}
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
                  <h3 className="text-white font-semibold">Top Products</h3>
                </div>

                {topProducts.length > 0 ? (
                  <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1f1f1f]">
                          <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Product</th>
                          <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Stock</th>
                          <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.slice(0, 5).map((product) => (
                          <tr key={product.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-white/5">
                            <td className="px-4 py-3">
                              <p className="text-white text-sm font-medium truncate max-w-[180px]">{product.name}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-300 text-sm">{product.stock}</td>
                            <td className="px-4 py-3 text-white text-sm">{formatCurrency(product.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm">No products found</p>
                  </div>
                )}
              </div>

              {/* Recent Orders */}
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
                  <h3 className="text-white font-semibold">Recent Orders</h3>
                </div>

                {recentOrders.length > 0 ? (
                  <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1f1f1f]">
                          <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Order</th>
                          <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Amount</th>
                          <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.slice(0, 5).map((order) => (
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm">No orders found</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ==================== SALES TAB ==================== */}
        {reportType === 'sales' && (
          <>
            {/* Sales Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Total Revenue</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon name="wallet" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs">
                  <span className="text-slate-500">gross revenue</span>
                </p>
              </div>

              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Net Revenue</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
                    <Icon name="check" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatCurrency(totalRevenue - (financeOverview?.totalFees || 0))}</p>
                <p className="text-xs">
                  <span className="text-slate-500">after fees</span>
                </p>
              </div>

              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Avg Order Value</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Icon name="stats" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatCurrency(avgOrderValue)}</p>
                <p className="text-xs">
                  <span className="text-slate-500">per order</span>
                </p>
              </div>

              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Total Refunds</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                    <Icon name="refresh" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatCurrency(financeOverview?.totalRefunds || 0)}</p>
                <p className="text-xs">
                  <span className="text-slate-500">refunded amount</span>
                </p>
              </div>
            </div>

            {/* Revenue Chart (reuse from Overview) */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 lg:p-5 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <h3 className="text-white font-semibold">Revenue Trend</h3>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-slate-400">Revenue</span>
                  </div>
                </div>
              </div>

              {dailyRevenue.length > 0 ? (
                <div className="flex gap-2">
                  <div className="flex flex-col justify-between text-slate-500 text-xs py-2 pr-2">
                    <span>${(maxRevenue).toLocaleString()}</span>
                    <span>${(maxRevenue * 0.75).toLocaleString()}</span>
                    <span>${(maxRevenue * 0.5).toLocaleString()}</span>
                    <span>${(maxRevenue * 0.25).toLocaleString()}</span>
                    <span>$0</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="h-48 lg:h-56 relative">
                      <div className="absolute inset-0 flex flex-col justify-between">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div key={i} className="border-t border-[#1f1f1f]" />
                        ))}
                      </div>
                      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                        <polyline
                          fill="none"
                          stroke="#43D678"
                          strokeWidth="2"
                          points={dailyRevenue.map((d, i) => {
                            const x = (i / (dailyRevenue.length - 1)) * 100
                            const y = 100 - (d.revenue / maxRevenue) * 80
                            return `${x}%,${y}%`
                          }).join(' ')}
                        />
                        {dailyRevenue.map((d, i) => {
                          const x = (i / (dailyRevenue.length - 1)) * 100
                          const y = 100 - (d.revenue / maxRevenue) * 80
                          return (
                            <circle
                              key={i}
                              cx={`${x}%`}
                              cy={`${y}%`}
                              r="4"
                              fill="#43D678"
                            />
                          )
                        })}
                      </svg>
                    </div>
                    <div className="flex justify-between mt-2 text-slate-500 text-xs overflow-hidden">
                      {dailyRevenue.map((d, i) => (
                        <span key={i} className="truncate">{new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <p className="text-slate-400">No revenue data available</p>
                </div>
              )}
            </div>

            {/* Recent Orders Table */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
                <h3 className="text-white font-semibold">Recent Transactions</h3>
              </div>

              {recentOrders.length > 0 ? (
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
                      {recentOrders.slice(0, 10).map((order) => (
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
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm">No transactions found</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================== PRODUCTS TAB ==================== */}
        {reportType === 'products' && (
          <>
            {/* Product Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Total Products</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon name="package" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">{topProducts.length}</p>
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
                <p className="text-white text-sm lg:text-base font-bold mb-1 truncate">{topProducts[0]?.name || 'N/A'}</p>
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
                  {topProducts.length > 0 ? formatCurrency(topProducts.reduce((sum, p) => sum + p.price, 0) / topProducts.length) : '$0.00'}
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
                  {topProducts.filter(p => p.stock > 0).length}
                </p>
                <p className="text-xs">
                  <span className="text-slate-500">available products</span>
                </p>
              </div>
            </div>

            {/* Top Products Table */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden mb-6">
              <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
                <h3 className="text-white font-semibold">Top Selling Products</h3>
              </div>

              {topProducts.length > 0 ? (
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
                      {topProducts.map((product) => (
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
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm">No products found</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================== CUSTOMERS TAB ==================== */}
        {reportType === 'customers' && (
          <>
            {/* Customer Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Total Customers</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon name="user-group" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">{totalOrders}</p>
                <p className="text-xs">
                  <span className="text-slate-500">total orders placed</span>
                </p>
              </div>

              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-slate-400 text-xs lg:text-sm">Avg Lifetime Value</p>
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
                    <Icon name="wallet" size={16} />
                  </div>
                </div>
                <p className="text-white text-lg lg:text-2xl font-bold mb-1">{formatCurrency(avgOrderValue)}</p>
                <p className="text-xs">
                  <span className="text-slate-500">per customer</span>
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
                  <span className="text-slate-500">last 10 orders</span>
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
                  {recentOrders.filter(o => o.status === 'DELIVERED').length}
                </p>
                <p className="text-xs">
                  <span className="text-slate-500">successful deliveries</span>
                </p>
              </div>
            </div>

            {/* Recent Customers Table */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
                <h3 className="text-white font-semibold">Recent Customer Orders</h3>
              </div>

              {recentOrders.length > 0 ? (
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
                      {recentOrders.slice(0, 10).map((order) => (
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
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm">No customer data found</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
