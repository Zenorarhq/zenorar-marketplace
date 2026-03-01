import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { query } from '@/lib/db'
import crypto from 'crypto'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = authResult.payload.userId
    const productId = params.id

    // Verify user owns this API product
    const ownershipCheck = await query(
      `
      SELECT o.id as order_id, p.name as product_name
      FROM orders o
      JOIN order_items oi ON o.id = oi."orderId"
      JOIN products p ON oi."productId" = p.id
      WHERE o."userId" = $1
        AND oi."productId" = $2
        AND o."paymentStatus" = 'PAID'
      LIMIT 1
      `,
      [userId, productId]
    )

    if (ownershipCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'API product not found in your library' },
        { status: 404 }
      )
    }

    const { order_id, product_name } = ownershipCheck.rows[0]

    // Check if API key already exists for this user/product
    let accessRecord = await query(
      `
      SELECT access_key, expires_at, is_active, created_at
      FROM user_product_access
      WHERE user_id = $1
        AND product_id = $2
        AND access_type = 'api_key'
      LIMIT 1
      `,
      [userId, productId]
    )

    let apiKey, createdAt, expiresAt, isActive

    if (accessRecord.rows.length > 0) {
      // Use existing API key
      const record = accessRecord.rows[0]
      apiKey = record.access_key
      createdAt = record.created_at
      expiresAt = record.expires_at
      isActive = record.is_active
    } else {
      // Generate new API key
      // Format: znr_live_[32 random hex chars]
      const randomPart = crypto.randomBytes(32).toString('hex')
      apiKey = `znr_live_${randomPart}`

      // API keys don't expire by default (null), but can be set per product
      expiresAt = null
      isActive = true
      createdAt = new Date()

      // Store in database
      await query(
        `
        INSERT INTO user_product_access (
          user_id, product_id, order_id, access_type, access_key, is_active, last_accessed
        ) VALUES ($1, $2, $3, 'api_key', $4, true, CURRENT_TIMESTAMP)
        `,
        [userId, productId, order_id, apiKey]
      )
    }

    // Update last accessed
    await query(
      `
      UPDATE user_product_access
      SET last_accessed = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND product_id = $2 AND access_type = 'api_key'
      `,
      [userId, productId]
    )

    return NextResponse.json({
      success: true,
      data: {
        key: apiKey,
        productId: productId,
        productName: product_name,
        createdAt: createdAt,
        expiresAt: expiresAt,
        isActive: isActive,
        usage: {
          // Placeholder for usage tracking - can be implemented later
          requests: 0,
          limit: 'unlimited',
        },
      },
    })
  } catch (error: any) {
    console.error('API key generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate API key',
      },
      { status: 500 }
    )
  }
}

// Optional: POST endpoint to regenerate API key
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = authResult.payload.userId
    const productId = params.id

    // Verify ownership
    const ownershipCheck = await query(
      `
      SELECT o.id as order_id
      FROM orders o
      JOIN order_items oi ON o.id = oi."orderId"
      WHERE o."userId" = $1
        AND oi."productId" = $2
        AND o."paymentStatus" = 'PAID'
      LIMIT 1
      `,
      [userId, productId]
    )

    if (ownershipCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'API product not found in your library' },
        { status: 404 }
      )
    }

    // Generate new API key
    const randomPart = crypto.randomBytes(32).toString('hex')
    const newApiKey = `znr_live_${randomPart}`

    // Update existing key or create new one
    await query(
      `
      INSERT INTO user_product_access (
        user_id, product_id, order_id, access_type, access_key, is_active, last_accessed
      ) VALUES ($1, $2, $3, 'api_key', $4, true, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, product_id)
      WHERE access_type = 'api_key'
      DO UPDATE SET
        access_key = $4,
        updated_at = CURRENT_TIMESTAMP,
        last_accessed = CURRENT_TIMESTAMP
      `,
      [userId, productId, ownershipCheck.rows[0].order_id, newApiKey]
    )

    return NextResponse.json({
      success: true,
      data: {
        key: newApiKey,
        productId: productId,
        createdAt: new Date(),
        message: 'API key regenerated successfully',
      },
    })
  } catch (error: any) {
    console.error('API key regeneration error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to regenerate API key',
      },
      { status: 500 }
    )
  }
}
