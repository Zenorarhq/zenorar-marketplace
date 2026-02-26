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

    // Verify user owns this eSIM product
    const ownershipCheck = await query(
      `
      SELECT o.id as order_id, p.name as product_name
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = $1
        AND oi.product_id = $2
        AND o.payment_status = 'PAID'
      LIMIT 1
      `,
      [userId, productId]
    )

    if (ownershipCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'eSIM product not found in your library' },
        { status: 404 }
      )
    }

    const { order_id, product_name } = ownershipCheck.rows[0]

    // Check if QR code already exists for this user/product
    let accessRecord = await query(
      `
      SELECT access_key, metadata, expires_at
      FROM user_product_access
      WHERE user_id = $1
        AND product_id = $2
        AND access_type = 'esim'
      LIMIT 1
      `,
      [userId, productId]
    )

    let qrData, activationCode, expiresAt

    if (accessRecord.rows.length > 0) {
      // Use existing QR code
      const record = accessRecord.rows[0]
      activationCode = record.access_key
      qrData = record.metadata?.qr_code_data || `LPA:1$${activationCode}`
      expiresAt = record.expires_at
    } else {
      // Generate new QR code data for eSIM
      // Format: LPA:1$activation-code (eSIM QR code format)
      activationCode = `ESIM-${crypto.randomBytes(16).toString('hex').toUpperCase()}`
      qrData = `LPA:1$${activationCode}`

      // Set expiry to 30 days from now (typical eSIM duration)
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 30)
      expiresAt = expiryDate

      // Store in database
      await query(
        `
        INSERT INTO user_product_access (
          user_id, product_id, order_id, access_type, access_key, metadata, expires_at, last_accessed
        ) VALUES ($1, $2, $3, 'esim', $4, $5, $6, CURRENT_TIMESTAMP)
        `,
        [
          userId,
          productId,
          order_id,
          activationCode,
          JSON.stringify({ qr_code_data: qrData, product_name }),
          expiresAt,
        ]
      )
    }

    // Update last accessed
    await query(
      `
      UPDATE user_product_access
      SET last_accessed = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND product_id = $2 AND access_type = 'esim'
      `,
      [userId, productId]
    )

    return NextResponse.json({
      success: true,
      data: {
        qrCodeData: qrData,
        activationCode: activationCode,
        expiresAt: expiresAt,
        productName: product_name,
        instructions: 'Scan this QR code with your device to activate the eSIM',
      },
    })
  } catch (error: any) {
    console.error('QR code generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate QR code',
      },
      { status: 500 }
    )
  }
}
