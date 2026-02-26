import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

/**
 * GET /api/admin/esim/inventory/stats
 * Get eSIM inventory statistics and stock levels by plan
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get overall stats
    const overallResult = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'available') as available,
        COUNT(*) FILTER (WHERE status = 'reserved') as reserved,
        COUNT(*) FILTER (WHERE status = 'sold') as sold,
        COUNT(*) as total
      FROM esim_inventory
    `)

    // Get stock levels by plan
    const byPlanResult = await query(`
      SELECT
        ep.id as plan_id,
        ep.name as plan_name,
        ep.data_amount_display,
        ep.validity_days,
        er.name as region_name,
        ep.retail_price,
        COUNT(*) FILTER (WHERE ei.status = 'available') as available,
        COUNT(*) FILTER (WHERE ei.status = 'reserved') as reserved,
        COUNT(*) FILTER (WHERE ei.status = 'sold') as sold,
        COUNT(ei.id) as total
      FROM esim_plans ep
      LEFT JOIN esim_regions er ON ep.region_id = er.id
      LEFT JOIN esim_inventory ei ON ep.id = ei.plan_id
      WHERE ep.is_active = true
      GROUP BY ep.id, ep.name, ep.data_amount_display, ep.validity_days, er.name, ep.retail_price
      ORDER BY er.name, ep.name
    `)

    // Get recent activity
    const recentActivityResult = await query(`
      SELECT
        ei.id,
        ei.iccid,
        ei.status,
        ei.created_at,
        ei.sold_at,
        ep.name as plan_name,
        u.email as sold_to
      FROM esim_inventory ei
      LEFT JOIN esim_plans ep ON ei.plan_id = ep.id
      LEFT JOIN users u ON ei.sold_to_user_id = u.id
      ORDER BY COALESCE(ei.sold_at, ei.created_at) DESC
      LIMIT 10
    `)

    // Get low stock alerts (plans with < 10 available)
    const lowStockResult = await query(`
      SELECT
        ep.id as plan_id,
        ep.name as plan_name,
        er.name as region_name,
        COUNT(*) FILTER (WHERE ei.status = 'available') as available
      FROM esim_plans ep
      LEFT JOIN esim_regions er ON ep.region_id = er.id
      LEFT JOIN esim_inventory ei ON ep.id = ei.plan_id
      WHERE ep.is_active = true
      GROUP BY ep.id, ep.name, er.name
      HAVING COUNT(*) FILTER (WHERE ei.status = 'available') < 10
      ORDER BY COUNT(*) FILTER (WHERE ei.status = 'available') ASC
    `)

    return NextResponse.json({
      success: true,
      data: {
        overall: {
          available: parseInt(overallResult.rows[0]?.available || '0'),
          reserved: parseInt(overallResult.rows[0]?.reserved || '0'),
          sold: parseInt(overallResult.rows[0]?.sold || '0'),
          total: parseInt(overallResult.rows[0]?.total || '0')
        },
        byPlan: byPlanResult.rows.map(row => ({
          planId: row.plan_id,
          planName: row.plan_name,
          dataAmount: row.data_amount_display,
          validityDays: row.validity_days,
          regionName: row.region_name,
          retailPrice: parseFloat(row.retail_price || '0'),
          stock: {
            available: parseInt(row.available || '0'),
            reserved: parseInt(row.reserved || '0'),
            sold: parseInt(row.sold || '0'),
            total: parseInt(row.total || '0')
          }
        })),
        recentActivity: recentActivityResult.rows.map(row => ({
          id: row.id,
          iccid: row.iccid,
          status: row.status,
          planName: row.plan_name,
          soldTo: row.sold_to,
          createdAt: row.created_at,
          soldAt: row.sold_at
        })),
        lowStock: lowStockResult.rows.map(row => ({
          planId: row.plan_id,
          planName: row.plan_name,
          regionName: row.region_name,
          available: parseInt(row.available || '0')
        }))
      }
    })
  } catch (error: any) {
    console.error('Error fetching inventory stats:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
