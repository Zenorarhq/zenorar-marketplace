import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'
import { esimInventoryService } from '@/lib/esim'

/**
 * GET /api/admin/esim/inventory
 * Get all bulk eSIM inventory with filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user || !['ADMIN', 'SUPER_ADMIN', 'EDITOR'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('planId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build query with filters
    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (planId) {
      whereClause += ` AND ei.plan_id = $${paramIndex++}`
      params.push(planId)
    }

    if (status) {
      whereClause += ` AND ei.status = $${paramIndex++}`
      params.push(status)
    }

    // Get inventory items
    const result = await query(
      `SELECT
         ei.*,
         ep.name as plan_name,
         ep.data_amount_display,
         ep.validity_days,
         er.name as region_name,
         u.email as sold_to_email
       FROM esim_inventory ei
       LEFT JOIN esim_plans ep ON ei.plan_id = ep.id
       LEFT JOIN esim_regions er ON ep.region_id = er.id
       LEFT JOIN users u ON ei.sold_to_user_id = u.id
       ${whereClause}
       ORDER BY ei.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    )

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM esim_inventory ei ${whereClause}`,
      params
    )

    // Get stock summary by status
    const summaryResult = await query(
      `SELECT
         status,
         COUNT(*) as count
       FROM esim_inventory
       GROUP BY status`
    )

    const summary = summaryResult.rows.reduce((acc: any, row: any) => {
      acc[row.status] = parseInt(row.count)
      return acc
    }, { available: 0, reserved: 0, sold: 0 })

    return NextResponse.json({
      success: true,
      data: {
        items: result.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0]?.count || '0'),
          totalPages: Math.ceil(parseInt(countResult.rows[0]?.count || '0') / limit)
        },
        summary
      }
    })
  } catch (error: any) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/esim/inventory
 * Add new bulk eSIM codes (single or bulk import)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { planId, items } = body

    if (!planId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'planId and items array are required' },
        { status: 400 }
      )
    }

    // Validate plan exists
    const planResult = await query(
      `SELECT id, name FROM esim_plans WHERE id = $1`,
      [planId]
    )

    if (planResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'eSIM plan not found' },
        { status: 404 }
      )
    }

    // Generate batch ID for tracking
    const batchId = `batch_${Date.now()}_${user.id.slice(0, 8)}`

    // Import the items
    const importResult = await esimInventoryService.bulkImport(planId, items, batchId)

    return NextResponse.json({
      success: true,
      data: {
        imported: importResult.success,
        duplicates: importResult.duplicates,
        errors: importResult.errors,
        message: `Successfully imported ${importResult.success} eSIMs. ${importResult.duplicates} duplicates skipped.`
      }
    })
  } catch (error: any) {
    console.error('Error importing inventory:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to import inventory' },
      { status: 500 }
    )
  }
}
