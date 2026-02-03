'use client'

import { useState, useRef } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'

type ReportPeriod = '7d' | '30d' | '90d' | '12m' | 'custom'
type ReportType = 'overview' | 'sales' | 'products' | 'customers'

const periodOptions = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '12m', label: 'Last 12 Months' },
  { value: 'custom', label: 'Custom Range' },
]

// Overview Tab Data
const overviewStats = [
  { label: 'Total Revenue', value: '$284,520', change: '+18.2%', positive: true, icon: 'wallet' },
  { label: 'Total Orders', value: '3,847', change: '+12.5%', positive: true, icon: 'cart' },
  { label: 'Average Order Value', value: '$73.95', change: '+5.3%', positive: true, icon: 'stats' },
  { label: 'Refund Rate', value: '2.1%', change: '-0.4%', positive: true, icon: 'refresh' },
]

const revenueData = [
  { date: '1/21', revenue: 18500, orders: 245 },
  { date: '1/23', revenue: 28300, orders: 298 },
  { date: '1/24', revenue: 12800, orders: 167 },
  { date: '1/25', revenue: 28400, orders: 356 },
  { date: '1/26', revenue: 8100, orders: 112 },
  { date: '1/27', revenue: 5700, orders: 78 },
  { date: '1/28', revenue: 25200, orders: 345 },
  { date: '1/29', revenue: 21800, orders: 298 },
  { date: '1/30', revenue: 28500, orders: 387 },
  { date: '2/1', revenue: 26300, orders: 334 },
]

const topProducts = [
  { id: 1, name: 'Ultimate CRM Script', category: 'Scripts', sales: 847, revenue: '$109,263', trend: '+24%' },
  { id: 2, name: 'EU Global Roaming eSIM', category: 'eSIM', sales: 1243, revenue: '$62,150', trend: '+18%' },
  { id: 3, name: 'Modern SaaS Dashboard', category: 'Themes', sales: 562, revenue: '$50,018', trend: '+12%' },
  { id: 4, name: 'Payment Gateway Pro', category: 'Scripts', sales: 234, revenue: '$46,566', trend: '+31%' },
  { id: 5, name: 'USA Unlimited Data eSIM', category: 'eSIM', sales: 892, revenue: '$35,680', trend: '+9%' },
]

const recentTransactions = [
  { id: 'TXN-001', customer: 'John Smith', email: 'john@example.com', product: 'Ultimate CRM Script', amount: '$129.00', status: 'completed', date: '2024-01-15' },
  { id: 'TXN-002', customer: 'Sarah Wilson', email: 'sarah@example.com', product: 'EU Global Roaming eSIM', amount: '$49.00', status: 'completed', date: '2024-01-15' },
  { id: 'TXN-003', customer: 'Mike Johnson', email: 'mike@example.com', product: 'Modern SaaS Dashboard', amount: '$89.00', status: 'pending', date: '2024-01-15' },
  { id: 'TXN-004', customer: 'Emily Davis', email: 'emily@example.com', product: 'Payment Gateway Pro', amount: '$199.00', status: 'completed', date: '2024-01-15' },
]

// Sales Tab Data
const salesStats = [
  { label: 'Gross Sales', value: '$312,450', change: '+22.4%', positive: true, icon: 'wallet' },
  { label: 'Net Revenue', value: '$284,520', change: '+18.2%', positive: true, icon: 'stats' },
  { label: 'Transactions', value: '4,128', change: '+15.7%', positive: true, icon: 'credit-card' },
  { label: 'Refunds', value: '$8,240', change: '-12.3%', positive: true, icon: 'refresh' },
]

const salesByMethod = [
  { method: 'Credit Card', amount: '$156,280', percentage: 55, icon: 'credit-card' },
  { method: 'PayPal', amount: '$71,130', percentage: 25, icon: 'wallet' },
  { method: 'Crypto', amount: '$42,678', percentage: 15, icon: 'globe' },
  { method: 'Bank Transfer', amount: '$14,232', percentage: 5, icon: 'code' },
]

const salesByRegion = [
  { region: 'North America', amount: '$128,034', orders: 1845, percentage: 45 },
  { region: 'Europe', amount: '$85,356', orders: 1156, percentage: 30 },
  { region: 'Asia Pacific', amount: '$42,678', orders: 612, percentage: 15 },
  { region: 'Others', amount: '$28,452', orders: 234, percentage: 10 },
]

// Products Tab Data
const productStats = [
  { label: 'Total Products', value: '1,247', change: '+48', positive: true, icon: 'code' },
  { label: 'Active Listings', value: '1,189', change: '+32', positive: true, icon: 'check' },
  { label: 'Out of Stock', value: '58', change: '-12', positive: true, icon: 'x-circle' },
  { label: 'Categories', value: '24', change: '+3', positive: true, icon: 'grid-view' },
]

const categoryPerformance = [
  { category: 'Scripts & Plugins', products: 524, sales: 2847, revenue: '$186,420', trend: '+28%' },
  { category: 'eSIM Packages', products: 186, sales: 3156, revenue: '$94,680', trend: '+42%' },
  { category: 'Themes & Templates', products: 312, sales: 1245, revenue: '$62,250', trend: '+15%' },
  { category: 'Digital Assets', products: 225, sales: 892, revenue: '$26,760', trend: '+8%' },
]

const lowStockProducts = [
  { id: 1, name: 'Premium API Bundle', stock: 5, threshold: 10, status: 'critical' },
  { id: 2, name: 'Enterprise License', stock: 8, threshold: 15, status: 'warning' },
  { id: 3, name: 'Starter Pack eSIM', stock: 12, threshold: 20, status: 'warning' },
  { id: 4, name: 'Pro Dashboard Theme', stock: 3, threshold: 10, status: 'critical' },
]

// Customers Tab Data
const customerStats = [
  { label: 'Total Customers', value: '12,847', change: '+842', positive: true, icon: 'user-group' },
  { label: 'New This Month', value: '1,256', change: '+18.4%', positive: true, icon: 'user' },
  { label: 'Active Users', value: '8,934', change: '+12.1%', positive: true, icon: 'check' },
  { label: 'Churn Rate', value: '2.4%', change: '-0.6%', positive: true, icon: 'stats' },
]

const topCustomers = [
  { id: 1, name: 'TechCorp Inc.', email: 'billing@techcorp.com', orders: 156, spent: '$24,560', lastOrder: '2024-01-15' },
  { id: 2, name: 'StartupHub', email: 'finance@startuphub.io', orders: 98, spent: '$18,420', lastOrder: '2024-01-14' },
  { id: 3, name: 'DevAgency Pro', email: 'admin@devagency.com', orders: 87, spent: '$15,890', lastOrder: '2024-01-15' },
  { id: 4, name: 'CloudSoft Ltd', email: 'orders@cloudsoft.uk', orders: 72, spent: '$12,340', lastOrder: '2024-01-13' },
  { id: 5, name: 'Digital Nomads', email: 'team@digitalnomads.co', orders: 65, spent: '$9,870', lastOrder: '2024-01-12' },
]

const acquisitionSources = [
  { source: 'Organic Search', customers: 4562, percentage: 35, color: 'bg-primary' },
  { source: 'Direct Traffic', customers: 3214, percentage: 25, color: 'bg-blue-500' },
  { source: 'Social Media', customers: 2571, percentage: 20, color: 'bg-purple-500' },
  { source: 'Referrals', customers: 1542, percentage: 12, color: 'bg-orange-500' },
  { source: 'Paid Ads', customers: 958, percentage: 8, color: 'bg-pink-500' },
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

  const maxRevenue = Math.max(...revenueData.map(d => d.revenue))

  const handleTabClick = (tabId: ReportType, index: number) => {
    setReportType(tabId)
    // Scroll the clicked tab into view within the container
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
        {/* Page Header - Always horizontal with buttons on right */}
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
            <button className="bg-primary hover:bg-primary/90 text-black text-xs sm:text-sm font-semibold px-2 sm:px-3 py-2 rounded-lg transition-colors flex items-center gap-1 sm:gap-2">
              <Icon name="download" size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Report Type Tabs - Horizontal scroll with labels */}
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
              {overviewStats.map((stat) => (
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
                    <span className="text-slate-500 ml-1">vs last period</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Sales Chart */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 lg:p-5 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <h3 className="text-white font-semibold">Sales & Orders Trend</h3>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-slate-400">Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-pink-500" />
                    <span className="text-slate-400">Orders</span>
                  </div>
                </div>
              </div>

              {/* Y-axis labels and Chart */}
              <div className="flex gap-2">
                {/* Y-axis labels */}
                <div className="flex flex-col justify-between text-slate-500 text-xs py-2 pr-2">
                  <span>$31k</span>
                  <span>$25k</span>
                  <span>$19k</span>
                  <span>$12k</span>
                  <span>$6k</span>
                  <span>$0</span>
                </div>

                {/* Chart area */}
                <div className="flex-1 min-w-0">
                  <div className="h-48 lg:h-56 relative">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="border-t border-[#1f1f1f]" />
                      ))}
                    </div>

                    {/* Line chart simulation */}
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                      {/* Revenue line */}
                      <polyline
                        fill="none"
                        stroke="#43D678"
                        strokeWidth="2"
                        points={revenueData.map((d, i) => {
                          const x = (i / (revenueData.length - 1)) * 100
                          const y = 100 - (d.revenue / maxRevenue) * 80
                          return `${x}%,${y}%`
                        }).join(' ')}
                      />
                      {/* Data points */}
                      {revenueData.map((d, i) => {
                        const x = (i / (revenueData.length - 1)) * 100
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
                    {revenueData.map((d) => (
                      <span key={d.date} className="truncate">{d.date}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Top Products */}
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
                  <h3 className="text-white font-semibold">Top Products</h3>
                  <button className="text-primary text-sm hover:underline">View All</button>
                </div>

                <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1f1f1f]">
                        <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Product</th>
                        <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Sales</th>
                        <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Revenue</th>
                        <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.slice(0, 4).map((product) => (
                        <tr key={product.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-white/5">
                          <td className="px-4 py-3">
                            <p className="text-white text-sm font-medium truncate max-w-[120px]">{product.name}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-sm">{product.sales}</td>
                          <td className="px-4 py-3 text-white text-sm">{product.revenue}</td>
                          <td className="px-4 py-3">
                            <span className="text-primary text-sm">{product.trend}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
                  <h3 className="text-white font-semibold">Recent Transactions</h3>
                  <button className="text-primary text-sm hover:underline">View All</button>
                </div>

                <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1f1f1f]">
                        <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Customer</th>
                        <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Amount</th>
                        <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Status</th>
                        <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map((txn) => (
                        <tr key={txn.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-white/5">
                          <td className="px-4 py-3">
                            <p className="text-white text-sm truncate max-w-[100px]">{txn.customer}</p>
                          </td>
                          <td className="px-4 py-3 text-white text-sm">{txn.amount}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              txn.status === 'completed' ? 'bg-primary/10 text-primary' :
                              txn.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                              'bg-red-500/10 text-red-400'
                            }`}>
                              {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-sm">{txn.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== SALES TAB ==================== */}
        {reportType === 'sales' && (
          <>
            {/* Sales Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
              {salesStats.map((stat) => (
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
                    <span className="text-slate-500 ml-1">vs last period</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Sales by Payment Method & Region */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Payment Methods */}
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 lg:p-5">
                <h3 className="text-white font-semibold mb-4">Sales by Payment Method</h3>
                <div className="space-y-4">
                  {salesByMethod.map((item) => (
                    <div key={item.method}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-slate-400">
                            <Icon name={item.icon} size={16} />
                          </div>
                          <span className="text-white text-sm">{item.method}</span>
                        </div>
                        <span className="text-slate-400 text-sm">{item.amount}</span>
                      </div>
                      <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sales by Region */}
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 lg:p-5">
                <h3 className="text-white font-semibold mb-4">Sales by Region</h3>
                <div className="space-y-3">
                  {salesByRegion.map((item) => (
                    <div key={item.region} className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg">
                      <div>
                        <p className="text-white text-sm font-medium">{item.region}</p>
                        <p className="text-slate-500 text-xs">{item.orders} orders</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm font-semibold">{item.amount}</p>
                        <p className="text-primary text-xs">{item.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* All Transactions Table */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
                <h3 className="text-white font-semibold">All Transactions</h3>
                <button className="text-primary text-sm hover:underline">Export CSV</button>
              </div>

              <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1f1f1f]">
                      <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Transaction ID</th>
                      <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Customer</th>
                      <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Product</th>
                      <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Amount</th>
                      <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Status</th>
                      <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((txn) => (
                      <tr key={txn.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-white/5">
                        <td className="px-4 py-3 text-slate-400 text-sm font-mono">{txn.id}</td>
                        <td className="px-4 py-3">
                          <p className="text-white text-sm">{txn.customer}</p>
                          <p className="text-slate-500 text-xs">{txn.email}</p>
                        </td>
                        <td className="px-4 py-3 text-white text-sm truncate max-w-[150px]">{txn.product}</td>
                        <td className="px-4 py-3 text-white text-sm font-semibold">{txn.amount}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            txn.status === 'completed' ? 'bg-primary/10 text-primary' :
                            txn.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-sm">{txn.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ==================== PRODUCTS TAB ==================== */}
        {reportType === 'products' && (
          <>
            {/* Product Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
              {productStats.map((stat) => (
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
                    <span className="text-slate-500 ml-1">this period</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Category Performance */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden mb-6">
              <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
                <h3 className="text-white font-semibold">Category Performance</h3>
                <button className="text-primary text-sm hover:underline">Manage Categories</button>
              </div>

              <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1f1f1f]">
                      <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Category</th>
                      <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Products</th>
                      <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Sales</th>
                      <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Revenue</th>
                      <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryPerformance.map((cat, i) => (
                      <tr key={i} className="border-b border-[#1f1f1f] last:border-0 hover:bg-white/5">
                        <td className="px-4 py-3">
                          <p className="text-white text-sm font-medium">{cat.category}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">{cat.products}</td>
                        <td className="px-4 py-3 text-slate-300 text-sm">{cat.sales}</td>
                        <td className="px-4 py-3 text-white text-sm font-semibold">{cat.revenue}</td>
                        <td className="px-4 py-3">
                          <span className="text-primary text-sm">{cat.trend}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Products & Low Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Performing Products */}
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
                  <h3 className="text-white font-semibold">Top Performing</h3>
                  <button className="text-primary text-sm hover:underline">View All</button>
                </div>

                <div className="divide-y divide-[#1f1f1f]">
                  {topProducts.slice(0, 4).map((product, i) => (
                    <div key={product.id} className="flex items-center gap-4 p-4 hover:bg-white/5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        #{i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{product.name}</p>
                        <p className="text-slate-500 text-xs">{product.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm font-semibold">{product.revenue}</p>
                        <p className="text-primary text-xs">{product.trend}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Low Stock Alerts */}
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
                  <h3 className="text-white font-semibold">Low Stock Alerts</h3>
                  <span className="bg-orange-500/10 text-orange-400 text-xs px-2 py-1 rounded-full">
                    {lowStockProducts.length} items
                  </span>
                </div>

                <div className="divide-y divide-[#1f1f1f]">
                  {lowStockProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-4 p-4 hover:bg-white/5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        product.status === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        <Icon name="alert" size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{product.name}</p>
                        <p className="text-slate-500 text-xs">Threshold: {product.threshold}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${
                          product.status === 'critical' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {product.stock} left
                        </p>
                        <p className="text-slate-500 text-xs capitalize">{product.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== CUSTOMERS TAB ==================== */}
        {reportType === 'customers' && (
          <>
            {/* Customer Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
              {customerStats.map((stat) => (
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
                    <span className="text-slate-500 ml-1">vs last period</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Acquisition Sources & Top Customers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Acquisition Sources */}
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 lg:p-5">
                <h3 className="text-white font-semibold mb-4">Customer Acquisition</h3>

                {/* Donut Chart */}
                <div className="flex items-center justify-center py-4 mb-4">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1f1f1f" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#43D678" strokeWidth="3" strokeDasharray="35 65" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="25 75" strokeDashoffset="-35" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#a855f7" strokeWidth="3" strokeDasharray="20 80" strokeDashoffset="-60" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f97316" strokeWidth="3" strokeDasharray="12 88" strokeDashoffset="-80" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#ec4899" strokeWidth="3" strokeDasharray="8 92" strokeDashoffset="-92" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-white text-xl font-bold">12.8k</p>
                        <p className="text-slate-500 text-xs">Total</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-2">
                  {acquisitionSources.map((source) => (
                    <div key={source.source} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${source.color}`} />
                        <span className="text-slate-400">{source.source}</span>
                      </div>
                      <span className="text-white font-medium">{source.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Activity */}
              <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 lg:p-5">
                <h3 className="text-white font-semibold mb-4">Customer Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon name="user" size={20} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">New Signups</p>
                        <p className="text-slate-500 text-xs">Last 7 days</p>
                      </div>
                    </div>
                    <p className="text-white text-lg font-bold">+328</p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Icon name="cart" size={20} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">First Purchase</p>
                        <p className="text-slate-500 text-xs">Conversion rate</p>
                      </div>
                    </div>
                    <p className="text-white text-lg font-bold">24.8%</p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Icon name="refresh" size={20} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">Repeat Buyers</p>
                        <p className="text-slate-500 text-xs">Retention rate</p>
                      </div>
                    </div>
                    <p className="text-white text-lg font-bold">68.2%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Customers Table */}
            <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
                <h3 className="text-white font-semibold">Top Customers</h3>
                <button className="text-primary text-sm hover:underline">View All</button>
              </div>

              <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1f1f1f]">
                      <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Customer</th>
                      <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Orders</th>
                      <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Total Spent</th>
                      <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Last Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((customer) => (
                      <tr key={customer.id} className="border-b border-[#1f1f1f] last:border-0 hover:bg-white/5">
                        <td className="px-4 py-3">
                          <p className="text-white text-sm font-medium">{customer.name}</p>
                          <p className="text-slate-500 text-xs">{customer.email}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">{customer.orders}</td>
                        <td className="px-4 py-3 text-white text-sm font-semibold">{customer.spent}</td>
                        <td className="px-4 py-3 text-slate-400 text-sm">{customer.lastOrder}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
