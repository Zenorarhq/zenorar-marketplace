import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

export async function POST(
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

    // Verify user owns this product (has completed order for it)
    const ownershipCheck = await query(
      `
      SELECT COUNT(*) as count
      FROM orders o
      JOIN order_items oi ON o.id = oi."orderId"
      WHERE o."userId" = $1
        AND oi."productId" = $2
        AND o."paymentStatus" = 'PAID'
      `,
      [userId, productId]
    )

    if (parseInt(ownershipCheck.rows[0].count) === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found in your library' },
        { status: 404 }
      )
    }

    // Get product file (latest version)
    const fileResult = await query(
      `
      SELECT id, file_name, file_url, version
      FROM product_files
      WHERE product_id = $1
        AND is_latest = true
      LIMIT 1
      `,
      [productId]
    )

    if (fileResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No download file available for this product',
        },
        { status: 404 }
      )
    }

    const file = fileResult.rows[0]

    // Update user_product_access table (track download)
    await query(
      `
      INSERT INTO user_product_access (user_id, product_id, order_id, access_type, downloads_count, last_accessed)
      SELECT $1, $2, o.id, 'download', 1, CURRENT_TIMESTAMP
      FROM orders o
      JOIN order_items oi ON o.id = oi."orderId"
      WHERE o."userId" = $1
        AND oi."productId" = $2
        AND o."paymentStatus" = 'PAID'
      LIMIT 1
      ON CONFLICT (user_id, product_id, access_type)
      DO UPDATE SET
        downloads_count = user_product_access.downloads_count + 1,
        last_accessed = CURRENT_TIMESTAMP
      `,
      [userId, productId]
    )

    // Log download in history
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await query(
      `
      INSERT INTO download_history (user_id, product_id, file_id, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [userId, productId, file.id, ipAddress, userAgent]
    )

    // Return download link
    return NextResponse.json({
      success: true,
      data: {
        url: file.file_url,
        filename: file.file_name,
        version: file.version,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour expiry
      },
    })
  } catch (error: any) {
    console.error('Download error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process download',
      },
      { status: 500 }
    )
  }
}
