import { apiFetch } from './client'
import { ordersApi } from './orders'
import { ticketsApi } from './tickets'
import { financeApi } from './finance'
import { usersApi } from './users'

export interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalProducts: number
  totalCustomers: number
  totalTickets: number
  openTickets: number
  completedOrders: number
  pendingOrders: number
  revenueChange?: number
  ordersChange?: number
}

export interface TopProduct {
  id: string
  name: string
  sales: number
  revenue: number
}

export interface SalesChartData {
  date: string
  revenue: number
  orders: number
}

export const analyticsApi = {
  /**
   * Get dashboard overview stats
   * Aggregates data from multiple endpoints
   */
  async getDashboardStats(startDate?: string, endDate?: string): Promise<{ success: boolean; data?: DashboardStats; error?: string }> {
    try {
      // Fetch data from multiple sources in parallel
      const [ordersResult, financeResult, totalProductsResult, ticketsResult, usersResult] = await Promise.all([
        ordersApi.getStats(),
        financeApi.getOverview(startDate, endDate),
        apiFetch<{ total: number }>('/analytics/total-products'),
        ticketsApi.getStats(),
        usersApi.getStats(),
      ])

      // Calculate % changes by comparing current vs previous period
      let revenueChange: number | undefined
      let ordersChange: number | undefined

      if (startDate && endDate) {
        const duration = new Date(endDate).getTime() - new Date(startDate).getTime()
        const prevEnd = new Date(new Date(startDate).getTime())
        const prevStart = new Date(prevEnd.getTime() - duration)

        const prevResult = await financeApi.getOverview(prevStart.toISOString(), prevEnd.toISOString())
        if (prevResult.success && prevResult.data) {
          const prevRevenue = prevResult.data.totalRevenue || 0
          const prevOrders = prevResult.data.totalSales || 0
          const curRevenue = financeResult.data?.totalRevenue || 0
          const curOrders = financeResult.data?.totalSales || 0

          if (prevRevenue > 0) revenueChange = Math.round(((curRevenue - prevRevenue) / prevRevenue) * 100)
          if (prevOrders > 0) ordersChange = Math.round(((curOrders - prevOrders) / prevOrders) * 100)
        }
      }

      // Calculate open tickets from byStatus array
      const openTicketsCount = ticketsResult.data?.byStatus?.find((s: any) => s.status === 'OPEN')?.count || 0

      return {
        success: true,
        data: {
          totalRevenue: financeResult.data?.totalRevenue || 0,
          totalOrders: ordersResult.data?.totalOrders || 0,
          totalProducts: totalProductsResult.data?.total || 0,
          totalCustomers: usersResult.data?.totalCustomers || 0,
          totalTickets: ticketsResult.data?.total || 0,
          openTickets: openTicketsCount,
          completedOrders: ordersResult.data?.completedOrders || 0,
          pendingOrders: ordersResult.data?.pendingOrders || 0,
          revenueChange,
          ordersChange,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats'
      }
    }
  },

  /**
   * Get sales chart data for dashboard
   */
  async getSalesChart(days: number = 30) {
    return financeApi.getDailyRevenue(days)
  },

  /**
   * Get top selling items across all product types
   */
  async getTopProducts(limit: number = 5) {
    return apiFetch<{ name: string; product_type: string; sales: number; revenue: number; product_id: string | null }[]>(`/analytics/top-selling?limit=${limit}`)
  },

  /**
   * Get monthly revenue trends
   */
  async getMonthlyRevenue(months: number = 12) {
    return financeApi.getMonthlyRevenue(months)
  },

  /**
   * Get daily customer signups
   */
  async getCustomerGrowth(days: number = 30) {
    return apiFetch<{ date: string; signups: number }[]>(`/analytics/customer-growth?days=${days}`)
  },

  /**
   * Get revenue breakdown by category
   */
  async getRevenueByCategory() {
    return apiFetch<{ category: string; revenue: number; orders: number }[]>('/analytics/revenue-by-category')
  },

  /**
   * Get recent activity feed (orders, signups, tickets)
   */
  async getActivityFeed(limit: number = 10) {
    return apiFetch<{ type: string; id: string; label: string; value: any; detail: string | null; timestamp: string }[]>(`/analytics/activity-feed?limit=${limit}`)
  },
}
