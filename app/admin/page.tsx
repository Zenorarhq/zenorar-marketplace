'use client'

import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'

const stats = [
  { label: 'Total Revenue', value: '$128,430', change: '+12.8%', changeLabel: 'vs last month', positive: true, icon: 'wallet' },
  { label: 'Active Scripts', value: '1,240', change: '+8.2%', changeLabel: 'growth rate', positive: true, icon: 'code' },
  { label: 'New Customers', value: '450', change: '+18%', changeLabel: 'this week', positive: true, icon: 'user-group' },
  { label: 'Open Tickets', value: '12', change: '5', changeLabel: 'unresolved', positive: false, icon: 'ticket' },
]

const recentQueries = [
  { term: 'E-commerce React Template', user: 'mark_dev02', timestamp: '2 mins ago', results: 12 },
  { term: 'Global eSIM App', user: 'kane_thomas', timestamp: '14 mins ago', results: 8 },
  { term: 'Dark Mode Admin Dashboard', user: 'Speed_dev', timestamp: '1 hour ago', results: 24 },
  { term: 'Python automation script', user: 'coding_pro', timestamp: '5 hours ago', results: 2 },
]

const bestSellers = [
  { name: 'Ultimate CRM Scri...', price: '$129', icon: 'code', color: 'text-blue-400' },
  { name: 'EU Global Roam...', price: '$49', icon: 'globe', color: 'text-green-400' },
  { name: 'Modern SaaS Theme', price: '$89', icon: 'sparkles', color: 'text-purple-400' },
  { name: 'Payment Gateway Pro', price: '$199', icon: 'credit-card', color: 'text-orange-400' },
]

const productDistribution = [
  { label: 'Scripts & Plugins', percentage: 73, color: 'bg-primary' },
  { label: 'eSIM Packages', percentage: 20, color: 'bg-blue-500' },
  { label: 'Themes', percentage: 7, color: 'bg-purple-500' },
]

export default function AdminDashboard() {
  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-slate-500 text-xs sm:text-sm">Welcome back! Here's your marketplace overview</p>
      </div>

      {/* Stats Grid - 2x2 on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        {stats.map((stat) => (
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
              <p className="text-slate-500 text-sm">Revenue performance over the last 7 days</p>
            </div>
            <button className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs px-3 py-1.5 rounded-lg">
              Last 7 Days
            </button>
          </div>

          {/* Chart Placeholder */}
          <div className="h-48 flex items-end justify-between gap-2 px-4">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => {
              const heights = [40, 60, 45, 80, 65, 55, 70]
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-primary/20 to-primary/5 rounded-t-lg relative"
                    style={{ height: `${heights[i]}%` }}
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-primary rounded-t-lg" />
                  </div>
                  <span className="text-slate-500 text-xs">{day}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Product Distribution */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-white font-semibold">Product Distribution</h3>
            <p className="text-slate-500 text-sm">Sales by category</p>
          </div>

          {/* Donut Chart Placeholder */}
          <div className="flex items-center justify-center py-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1f1f1f" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#43D678" strokeWidth="3" strokeDasharray="73 27" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="20 80" strokeDashoffset="-73" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#a855f7" strokeWidth="3" strokeDasharray="7 93" strokeDashoffset="-93" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white text-xl font-bold">5.2k</p>
                  <p className="text-slate-500 text-xs">Total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2 mt-2">
            {productDistribution.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-slate-400">{item.label}</span>
                </div>
                <span className="text-white font-medium">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Customer Queries */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#1f1f1f]">
            <h3 className="text-white font-semibold">Recent Customer Queries</h3>
            <Link href="/admin/analytics" className="text-primary text-sm hover:underline">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Search Term</th>
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">User</th>
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Timestamp</th>
                  <th className="text-left text-slate-500 text-xs font-medium px-5 py-3">Results</th>
                </tr>
              </thead>
              <tbody>
                {recentQueries.map((query, i) => (
                  <tr key={i} className="border-b border-[#1f1f1f] last:border-0 hover:bg-white/5">
                    <td className="px-5 py-3 text-white text-sm">{query.term}</td>
                    <td className="px-5 py-3 text-slate-400 text-sm">{query.user}</td>
                    <td className="px-5 py-3 text-slate-500 text-sm">{query.timestamp}</td>
                    <td className="px-5 py-3 text-primary text-sm font-medium">{query.results}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Best Sellers */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#1f1f1f]">
            <h3 className="text-white font-semibold">Best Sellers</h3>
            <Link href="/admin/library" className="text-primary text-sm hover:underline">
              View All
            </Link>
          </div>

          <div className="divide-y divide-[#1f1f1f]">
            {bestSellers.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 hover:bg-white/5">
                <div className={`w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center ${item.color}`}>
                  <Icon name={item.icon} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.name}</p>
                  <p className="text-slate-500 text-xs">Digital Product</p>
                </div>
                <p className="text-primary font-semibold">{item.price}</p>
              </div>
            ))}
          </div>

          {/* View Marketplace Stats Button */}
          <div className="p-4 border-t border-[#1f1f1f]">
            <button className="w-full bg-primary hover:bg-primary/90 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm">
              View Marketplace Stats
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
