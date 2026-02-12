'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { analyticsApi, DashboardStats } from '@/lib/api/analytics'
import { Product } from '@/lib/api/products'
import { formatCurrency, formatNumber } from '@/lib/formatNumber'

export default function AdminDashboard() {
  const queryClient = useQueryClient()

  // Fetch dashboard stats with React Query (cached for 5 minutes)
  const { data: stats = null, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const result = await analyticsApi.getDashboardStats()
      if (result.success && result.data) {
        return result.data
      }
      throw new Error(result.error || 'Failed to load dashboard stats')
    },
  })

  // Fetch top products with React Query (cached)
  const { data: topProducts = [] } = useQuery({
    queryKey: ['dashboard-top-products'],
    queryFn: async () => {
      const result = await analyticsApi.getTopProducts(4)
      if (result.success && result.data) {
        return result.data
      }
      return []
    },
  })

  const loading = statsLoading
  const error = statsError ? String(statsError) : ''

  function loadDashboardData() {
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-top-products'] })
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

  const statCards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue || 0),
      change: stats?.revenueChange ? `${stats.revenueChange > 0 ? '+' : ''}${stats.revenueChange}%` : '-',
      changeLabel: 'vs last month',
      positive: true,
      icon: 'wallet'
    },
    {
      label: 'Total Products',
      value: formatNumber(stats?.totalProducts || 0),
      change: '-',
      changeLabel: 'active items',
      positive: true,
      icon: 'code'
    },
    {
      label: 'Total Orders',
      value: formatNumber(stats?.totalOrders || 0),
      change: stats?.ordersChange ? `${stats.ordersChange > 0 ? '+' : ''}${stats.ordersChange}%` : '-',
      changeLabel: 'this week',
      positive: true,
      icon: 'shopping-cart'
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
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-slate-500 text-xs sm:text-sm">Welcome back! Here&apos;s your marketplace overview</p>
      </div>

      {/* Stats Grid - 2x2 on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
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

          <div className="p-5">
            <p className="text-slate-400 text-sm text-center py-8">
              Activity tracking coming soon
            </p>
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
