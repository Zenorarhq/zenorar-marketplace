import { NextRequest } from 'next/server'
import { requireAdmin, successResponse, errorResponse, parseRequestBody, validateRequiredFields } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'
import { createId } from '@paralleldrive/cuid2'

const SELECT_COLUMNS = `
  id, code, type, value,
  "minOrderValue",
  "maxDiscountValue",
  "usageLimit",
  "usageCount",
  "isActive",
  "expiresAt",
  "createdAt",
  "updatedAt"
`

// GET /api/discounts — List all discounts (admin only)
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('search')

    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (status === 'active') {
      conditions.push(`"isActive" = true AND ("expiresAt" IS NULL OR "expiresAt" > NOW())`)
    } else if (status === 'expired') {
      conditions.push(`("isActive" = false OR ("expiresAt" IS NOT NULL AND "expiresAt" <= NOW()))`)
    }

    if (type && type !== 'all') {
      conditions.push(`type = $${paramIndex}`)
      params.push(type)
      paramIndex++
    }

    if (search) {
      conditions.push(`code ILIKE $${paramIndex}`)
      params.push(`%${search}%`)
      paramIndex++
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const result = await executeQuery(
      `SELECT ${SELECT_COLUMNS} FROM discounts ${where} ORDER BY "createdAt" DESC`,
      params
    )

    return successResponse(result.rows)
  } catch (error) {
    console.error('Error listing discounts:', error)
    return errorResponse('Failed to list discounts', 500)
  }
})

// POST /api/discounts — Create a new discount (admin only)
export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    const body = await parseRequestBody(request)
    if (!body) return errorResponse('Invalid request body', 400)

    const validation = validateRequiredFields(body, ['code', 'type', 'value'])
    if (!validation.valid) {
      return errorResponse(`Missing required fields: ${validation.missing!.join(', ')}`, 400)
    }

    if (!['PERCENTAGE', 'FIXED'].includes(body.type)) {
      return errorResponse('Type must be PERCENTAGE or FIXED', 400)
    }

    if (body.type === 'PERCENTAGE' && (body.value < 0 || body.value > 100)) {
      return errorResponse('Percentage value must be between 0 and 100', 400)
    }

    // Check for duplicate code
    const existing = await executeQuery('SELECT id FROM discounts WHERE code = $1', [body.code.toUpperCase()])
    if (existing.rows.length > 0) {
      return errorResponse('A discount with this code already exists', 400)
    }

    const id = createId()
    const now = new Date().toISOString()
    const result = await executeQuery(
      `INSERT INTO discounts (id, code, type, value, "minOrderValue", "maxDiscountValue", "usageLimit", "usageCount", "isActive", "expiresAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING ${SELECT_COLUMNS}`,
      [
        id,
        body.code.toUpperCase(),
        body.type,
        body.value,
        body.minOrderValue || null,
        body.maxDiscountValue || null,
        body.usageLimit || null,
        0, // usageCount starts at 0
        body.isActive !== undefined ? body.isActive : true,
        body.expiresAt || null,
        now,
        now,
      ]
    )

    return successResponse(result.rows[0], 201)
  } catch (error) {
    console.error('Error creating discount:', error)
    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Detailed error:', errorMessage)
    return errorResponse(`Failed to create discount: ${errorMessage}`, 500)
  }
})
