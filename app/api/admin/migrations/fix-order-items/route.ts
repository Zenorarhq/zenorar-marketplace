import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth-utils'

/**
 * POST /api/admin/migrations/fix-order-items
 * One-time migration to make productId nullable for dynamic products
 * Run this once on production to fix the foreign key constraint
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is admin
    const userResult = await query(`SELECT role FROM users WHERE id = $1`, [payload.userId])
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    // Run migration steps
    const steps = []

    // Step 1: Drop the foreign key constraint
    try {
      await query(`ALTER TABLE order_items DROP CONSTRAINT IF EXISTS "order_items_productId_fkey"`)
      steps.push('Dropped foreign key constraint')
    } catch (e: any) {
      steps.push(`Drop constraint: ${e.message}`)
    }

    // Step 2: Make productId nullable
    try {
      await query(`ALTER TABLE order_items ALTER COLUMN "productId" DROP NOT NULL`)
      steps.push('Made productId nullable')
    } catch (e: any) {
      steps.push(`Make nullable: ${e.message}`)
    }

    // Step 3: Re-add the foreign key with ON DELETE SET NULL
    try {
      await query(`
        ALTER TABLE order_items
        ADD CONSTRAINT "order_items_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE SET NULL
      `)
      steps.push('Re-added foreign key with ON DELETE SET NULL')
    } catch (e: any) {
      steps.push(`Re-add constraint: ${e.message}`)
    }

    // Step 4: Ensure metadata column exists
    try {
      await query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`)
      steps.push('Ensured metadata column exists')
    } catch (e: any) {
      steps.push(`Metadata column: ${e.message}`)
    }

    // Step 5: Ensure product_type column exists
    try {
      await query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_type VARCHAR(50)`)
      steps.push('Ensured product_type column exists')
    } catch (e: any) {
      steps.push(`Product_type column: ${e.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed',
      steps
    })

  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Migration failed' },
      { status: 500 }
    )
  }
}
