import { apiFetch } from './client'
import { ordersApi } from './orders'
import { productsApi } from './products'
import { ticketsApi } from './tickets'
import { financeApi } from './finance'

export interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalProducts: number
  totalTickets: number
  openTickets: number
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
  async getDashboardStats(): Promise<{ success: boolean; data?: DashboardStats; error?: string }> {
    try {
      // Fetch data from multiple sources in parallel
      const [ordersResult, financeResult, productsResult, ticketsResult] = await Promise.all([
        ordersApi.getStats(),
        financeApi.getOverview(),
        productsApi.list({ limit: 1000 }), // Load all products to get accurate count
        ticketsApi.getStats(),
      ])

      if (!ordersResult.success || !financeResult.success || !ticketsResult.success) {
        return {
          success: false,
          error: 'Failed to fetch dashboard stats'
        }
      }

      // Calculate open tickets from byStatus array
      const openTicketsCount = ticketsResult.data?.byStatus?.find((s: any) => s.status === 'OPEN')?.count || 0

      return {
        success: true,
        data: {
          totalRevenue: financeResult.data?.totalRevenue || 0,
          totalOrders: ordersResult.data?.totalOrders || 0,
          totalProducts: productsResult.data?.length || 0,
          totalTickets: ticketsResult.data?.total || 0,
          openTickets: openTicketsCount,
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
   * Get top selling products
   */
  async getTopProducts(limit: number = 5) {
    return productsApi.list({
      sortBy: 'sales',
      sortOrder: 'desc',
      limit
    })
  },

  /**
   * Get monthly revenue trends
   */
  async getMonthlyRevenue(months: number = 12) {
    return financeApi.getMonthlyRevenue(months)
  },
}
