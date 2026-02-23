import { NextRequest } from 'next/server'
import { requireAdmin, successResponse, errorResponse, parseRequestBody } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

const SELECT_COLUMNS = `
  id, code, type, value,
  "minOrderValue",
  "maxDiscountValue",
  "usageLimit",
  "usageCount",
  "isActive",
  "startsAt",
  "expiresAt",
  "createdAt",
  "updatedAt"
`

// Field mapping: frontend key → actual DB column name (camelCase, quoted)
const FIELD_MAP: Record<string, string> = {
  code: 'code',
  type: 'type',
  value: 'value',
  minOrderValue: '"minOrderValue"',
  maxDiscountValue: '"maxDiscountValue"',
  usageLimit: '"usageLimit"',
  isActive: '"isActive"',
  startsAt: '"startsAt"',
  expiresAt: '"expiresAt"',
}

// PATCH /api/discounts/[id] — Update a discount (admin only)
export const PATCH = requireAdmin(async (request: NextRequest, user, params?: Record<string, string>) => {
  try {
    const url = new URL(request.url)
    const id = url.pathname.split('/').pop()
    if (!id) return errorResponse('Discount ID is required', 400)

    const body = await parseRequestBody(request)
    if (!body) return errorResponse('Invalid request body', 400)

    // Build dynamic SET clause
    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1

    for (const [frontendKey, dbColumn] of Object.entries(FIELD_MAP)) {
      if (frontendKey in body) {
        let val = body[frontendKey]
        if (frontendKey === 'code' && val) val = val.toUpperCase()
        setClauses.push(`${dbColumn} = $${paramIndex}`)
        values.push(val === undefined ? null : val)
        paramIndex++
      }
    }

    if (setClauses.length === 0) {
      return errorResponse('No fields to update', 400)
    }

    values.push(id)
    const result = await executeQuery(
      `UPDATE discounts SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING ${SELECT_COLUMNS}`,
      values
    )

    if (result.rows.length === 0) {
      return errorResponse('Discount not found', 404)
    }

    return successResponse(result.rows[0])
  } catch (error) {
    console.error('Error updating discount:', error)
    return errorResponse('Failed to update discount', 500)
  }
})

// DELETE /api/discounts/[id] — Delete a discount (admin only)
export const DELETE = requireAdmin(async (request: NextRequest) => {
  try {
    const url = new URL(request.url)
    const id = url.pathname.split('/').pop()
    if (!id) return errorResponse('Discount ID is required', 400)

    const result = await executeQuery('DELETE FROM discounts WHERE id = $1 RETURNING id', [id])

    if (result.rows.length === 0) {
      return errorResponse('Discount not found', 404)
    }

    return successResponse({ message: 'Discount deleted successfully' })
  } catch (error) {
    console.error('Error deleting discount:', error)
    return errorResponse('Failed to delete discount', 500)
  }
})
