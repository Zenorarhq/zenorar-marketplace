// Gift Card Analytics
// Sales trends, profit margins, and performance metrics

import { query } from '@/lib/db'

export interface SalesTrend {
  date: string
  sales: number
  revenue: number
  profit: number
}

export interface BrandPerformance {
  brand: string
  giftCardId: string
  totalSales: number
  totalRevenue: number
  totalCost: number
  profit: number
  margin: number
  topDenomination: number
}

export interface DenominationPerformance {
  denomination: number
  sales: number
  revenue: number
  averageOrderValue: number
}

export interface GiftCardAnalytics {
  overview: {
    totalSales: number
    totalRevenue: number
    totalCost: number
    totalProfit: number
    averageMargin: number
    averageOrderValue: number
  }
  salesTrends: SalesTrend[]
  topBrands: BrandPerformance[]
  denominationDistribution: DenominationPerformance[]
  categoryBreakdown: Array<{
    category: string
    sales: number
    revenue: number
    percentage: number
  }>
  inventoryHealth: {
    totalAvailable: number
    totalReserved: number
    expiringIn7Days: number
    expiringIn30Days: number
    lowStockBrands: number
  }
}

/**
 * Get comprehensive gift card analytics
 */
export async function getGiftCardAnalytics(
  fromDate?: Date,
  toDate?: Date
): Promise<GiftCardAnalytics> {
  const dateFilter = fromDate && toDate
    ? `AND ugc.created_at BETWEEN $1 AND $2`
    : fromDate
    ? `AND ugc.created_at >= $1`
    : ''

  const params: any[] = []
  if (fromDate) params.push(fromDate)
  if (toDate) params.push(toDate)

  // Get overview metrics
  const overviewResult = await query(
    `SELECT
       COUNT(*) as total_sales,
       COALESCE(SUM(ugc.denomination), 0) as total_revenue,
       COALESCE(SUM(gcc.cost_price), 0) as total_cost
     FROM user_gift_cards ugc
     LEFT JOIN gift_card_codes gcc ON ugc.gift_card_code_id = gcc.id
     WHERE ugc.status != 'refunded'
     ${dateFilter}`,
    params
  )

  const overview = overviewResult.rows[0]
  const totalRevenue = parseFloat(overview.total_revenue || '0')
  const totalCost = parseFloat(overview.total_cost || '0')
  const totalProfit = totalRevenue - totalCost
  const totalSales = parseInt(overview.total_sales || '0')

  // Get sales trends (daily for last 30 days)
  const trendsResult = await query(
    `SELECT
       DATE(ugc.created_at) as date,
       COUNT(*) as sales,
       COALESCE(SUM(ugc.denomination), 0) as revenue,
       COALESCE(SUM(ugc.denomination) - SUM(COALESCE(gcc.cost_price, 0)), 0) as profit
     FROM user_gift_cards ugc
     LEFT JOIN gift_card_codes gcc ON ugc.gift_card_code_id = gcc.id
     WHERE ugc.status != 'refunded'
       AND ugc.created_at > NOW() - INTERVAL '30 days'
     GROUP BY DATE(ugc.created_at)
     ORDER BY date DESC`
  )

  // Get top brands
  const brandsResult = await query(
    `SELECT
       ugc.brand,
       ugc.gift_card_id,
       COUNT(*) as total_sales,
       SUM(ugc.denomination) as total_revenue,
       COALESCE(SUM(gcc.cost_price), 0) as total_cost,
       MODE() WITHIN GROUP (ORDER BY ugc.denomination) as top_denomination
     FROM user_gift_cards ugc
     LEFT JOIN gift_card_codes gcc ON ugc.gift_card_code_id = gcc.id
     WHERE ugc.status != 'refunded'
     GROUP BY ugc.brand, ugc.gift_card_id
     ORDER BY total_sales DESC
     LIMIT 10`
  )

  // Get denomination distribution
  const denomResult = await query(
    `SELECT
       denomination,
       COUNT(*) as sales,
       SUM(denomination) as revenue
     FROM user_gift_cards
     WHERE status != 'refunded'
     GROUP BY denomination
     ORDER BY sales DESC`
  )

  // Get category breakdown
  const categoryResult = await query(
    `SELECT
       COALESCE(ugc.category, 'other') as category,
       COUNT(*) as sales,
       SUM(ugc.denomination) as revenue
     FROM user_gift_cards ugc
     WHERE ugc.status != 'refunded'
     GROUP BY ugc.category
     ORDER BY sales DESC`
  )

  // Get inventory health
  const inventoryResult = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'available') as total_available,
       COUNT(*) FILTER (WHERE status = 'reserved') as total_reserved,
       COUNT(*) FILTER (WHERE status = 'available' AND expires_at IS NOT NULL AND expires_at <= NOW() + INTERVAL '7 days') as expiring_7_days,
       COUNT(*) FILTER (WHERE status = 'available' AND expires_at IS NOT NULL AND expires_at <= NOW() + INTERVAL '30 days') as expiring_30_days
     FROM gift_card_codes`
  )

  // Get low stock count
  const lowStockResult = await query(
    `SELECT COUNT(DISTINCT gc.id) as count
     FROM gift_cards gc
     WHERE gc.is_active = true
       AND (
         SELECT COUNT(*)
         FROM gift_card_codes gcc
         WHERE gcc.gift_card_id = gc.id
           AND gcc.status = 'available'
           AND (gcc.expires_at IS NULL OR gcc.expires_at > NOW())
       ) < 5`
  )

  const invHealth = inventoryResult.rows[0]
  const totalCategoryRevenue = categoryResult.rows.reduce((sum: number, r: any) =>
    sum + parseFloat(r.revenue || '0'), 0)

  return {
    overview: {
      totalSales,
      totalRevenue,
      totalCost,
      totalProfit,
      averageMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      averageOrderValue: totalSales > 0 ? totalRevenue / totalSales : 0
    },
    salesTrends: trendsResult.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      sales: parseInt(row.sales),
      revenue: parseFloat(row.revenue),
      profit: parseFloat(row.profit)
    })),
    topBrands: brandsResult.rows.map(row => {
      const revenue = parseFloat(row.total_revenue || '0')
      const cost = parseFloat(row.total_cost || '0')
      const profit = revenue - cost
      return {
        brand: row.brand,
        giftCardId: row.gift_card_id,
        totalSales: parseInt(row.total_sales),
        totalRevenue: revenue,
        totalCost: cost,
        profit,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        topDenomination: parseFloat(row.top_denomination || '0')
      }
    }),
    denominationDistribution: denomResult.rows.map(row => ({
      denomination: parseFloat(row.denomination),
      sales: parseInt(row.sales),
      revenue: parseFloat(row.revenue),
      averageOrderValue: parseInt(row.sales) > 0
        ? parseFloat(row.revenue) / parseInt(row.sales)
        : 0
    })),
    categoryBreakdown: categoryResult.rows.map(row => ({
      category: row.category,
      sales: parseInt(row.sales),
      revenue: parseFloat(row.revenue),
      percentage: totalCategoryRevenue > 0
        ? (parseFloat(row.revenue) / totalCategoryRevenue) * 100
        : 0
    })),
    inventoryHealth: {
      totalAvailable: parseInt(invHealth.total_available || '0'),
      totalReserved: parseInt(invHealth.total_reserved || '0'),
      expiringIn7Days: parseInt(invHealth.expiring_7_days || '0'),
      expiringIn30Days: parseInt(invHealth.expiring_30_days || '0'),
      lowStockBrands: parseInt(lowStockResult.rows[0]?.count || '0')
    }
  }
}

/**
 * Get revenue report for a specific period
 */
export async function getRevenueReport(
  startDate: Date,
  endDate: Date
): Promise<{
  totalRevenue: number
  totalCost: number
  grossProfit: number
  margin: number
  salesCount: number
  dailyBreakdown: Array<{
    date: string
    revenue: number
    cost: number
    profit: number
    sales: number
  }>
}> {
  const result = await query(
    `SELECT
       DATE(ugc.created_at) as date,
       COUNT(*) as sales,
       SUM(ugc.denomination) as revenue,
       COALESCE(SUM(gcc.cost_price), 0) as cost
     FROM user_gift_cards ugc
     LEFT JOIN gift_card_codes gcc ON ugc.gift_card_code_id = gcc.id
     WHERE ugc.status != 'refunded'
       AND ugc.created_at BETWEEN $1 AND $2
     GROUP BY DATE(ugc.created_at)
     ORDER BY date ASC`,
    [startDate, endDate]
  )

  let totalRevenue = 0
  let totalCost = 0
  let salesCount = 0

  const dailyBreakdown = result.rows.map(row => {
    const revenue = parseFloat(row.revenue || '0')
    const cost = parseFloat(row.cost || '0')
    const sales = parseInt(row.sales || '0')

    totalRevenue += revenue
    totalCost += cost
    salesCount += sales

    return {
      date: row.date.toISOString().split('T')[0],
      revenue,
      cost,
      profit: revenue - cost,
      sales
    }
  })

  const grossProfit = totalRevenue - totalCost

  return {
    totalRevenue,
    totalCost,
    grossProfit,
    margin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
    salesCount,
    dailyBreakdown
  }
}

/**
 * Get customer purchase history summary
 */
export async function getCustomerPurchaseHistory(
  userId: string
): Promise<{
  totalPurchases: number
  totalSpent: number
  favoriteCategory: string | null
  favoriteBrand: string | null
  lastPurchaseDate: Date | null
}> {
  const result = await query(
    `SELECT
       COUNT(*) as total_purchases,
       COALESCE(SUM(denomination), 0) as total_spent,
       MODE() WITHIN GROUP (ORDER BY category) as favorite_category,
       MODE() WITHIN GROUP (ORDER BY brand) as favorite_brand,
       MAX(created_at) as last_purchase_date
     FROM user_gift_cards
     WHERE user_id = $1
       AND status != 'refunded'`,
    [userId]
  )

  const row = result.rows[0]

  return {
    totalPurchases: parseInt(row?.total_purchases || '0'),
    totalSpent: parseFloat(row?.total_spent || '0'),
    favoriteCategory: row?.favorite_category || null,
    favoriteBrand: row?.favorite_brand || null,
    lastPurchaseDate: row?.last_purchase_date || null
  }
}
