import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { esimInventoryService } from '@/lib/esim'

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    // Get plan ID from slug
    const planResult = await query(
      `SELECT id FROM esim_plans WHERE slug = $1 AND is_active = true`,
      [slug]
    )

    if (planResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, available: false, error: 'Plan not found' },
        { status: 404 }
      )
    }

    const planId = planResult.rows[0].id

    // Check bulk inventory first
    const hasBulk = await esimInventoryService.checkBulkAvailability(planId)

    if (hasBulk) {
      return NextResponse.json({
        success: true,
        available: true,
        source: 'bulk',
      })
    }

    // If no bulk, check if plan has API provider mapping
    const providerResult = await query(
      `SELECT provider_plan_id FROM esim_plans WHERE id = $1`,
      [planId]
    )

    const hasApiProvider = !!providerResult.rows[0]?.provider_plan_id

    return NextResponse.json({
      success: true,
      available: hasApiProvider,
      source: hasApiProvider ? 'api' : undefined,
    })
  } catch (error: any) {
    console.error('Error checking eSIM availability:', error)
    return NextResponse.json(
      { success: false, available: false, error: error.message },
      { status: 500 }
    )
  }
}
