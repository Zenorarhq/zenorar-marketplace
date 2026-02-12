'use client'

import { useQuery } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { analyticsApi } from '@/lib/api/analytics'
import { ordersApi } from '@/lib/api/orders'
import { formatCurrency, formatNumber } from '@/lib/formatNumber'

export default function AnalyticsPage() {
  // Fetch dashboard stats
  const { data: stats = null } = useQuery({
    queryKey: ['analytics-stats'],
    queryFn: async () => {
      const result = await analyticsApi.getDashboardStats()
      if (result.success && result.data) {
        return result.data
      }
      return null
    },
  })

  // Fetch orders stats for additional metrics
  const { data: orderStats = null } = useQuery({
    queryKey: ['analytics-order-stats'],
    queryFn: async () => {
      const result = await ordersApi.getStats()
      if (result.success && result.data) {
        return result.data
      }
      return null
    },
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
  })

  const avgOrderValue = orderStats?.totalOrders
    ? (stats?.totalRevenue || 0) / orderStats.totalOrders
    : 0

  // Get max revenue for scaling chart
  const maxRevenue = Math.max(...monthlyRevenue.map((d: any) => d.revenue || 0), 1)

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Analytics</h1>
        <p className="text-slate-500 text-xs sm:text-sm">Detailed marketplace performance metrics</p>
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
                <span className="text-slate-500">completed orders</span>
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
                    const maxPrice = Math.max(...topProducts.map((p: any) => Number(p.price)))
                    const percentage = maxPrice > 0 ? (Number(product.price) / maxPrice) * 100 : 0
                    return (
                      <div key={product.id}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-slate-300 truncate flex-1">{product.name}</span>
                          <span className="text-white font-medium ml-2">
                            {formatCurrency(Number(product.price))}
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

          {/* Order Statistics */}
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Order Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1a1a1a] rounded-lg p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Icon name="check" size={20} className="text-primary" />
                </div>
                <p className="text-white font-semibold mb-1">
                  {formatNumber(orderStats?.completedOrders || 0)}
                </p>
                <p className="text-slate-400 text-sm mb-2">Completed Orders</p>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full bg-primary"
                    style={{
                      width: `${
                        orderStats?.totalOrders
                          ? (orderStats.completedOrders / orderStats.totalOrders) * 100
                          : 0
                      }%`,
                    }}
                  />
                  <span className="text-xs text-slate-500">
                    {orderStats?.totalOrders
                      ? Math.round((orderStats.completedOrders / orderStats.totalOrders) * 100)
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
                  {formatNumber(orderStats?.pendingOrders || 0)}
                </p>
                <p className="text-slate-400 text-sm mb-2">Pending Orders</p>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full bg-orange-500"
                    style={{
                      width: `${
                        orderStats?.totalOrders
                          ? (orderStats.pendingOrders / orderStats.totalOrders) * 100
                          : 0
                      }%`,
                    }}
                  />
                  <span className="text-xs text-slate-500">
                    {orderStats?.totalOrders
                      ? Math.round((orderStats.pendingOrders / orderStats.totalOrders) * 100)
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
        </>
      )}
    </AdminLayout>
  )
}
