import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'
import crypto from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const body = await request.json()
    const { url, alt, isPrimary } = body

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      )
    }

    // Get current image count to determine order
    const countResult = await executeQuery(
      'SELECT COUNT(*) as count FROM product_images WHERE "productId" = $1',
      [productId]
    )
    const currentCount = parseInt(countResult.rows[0].count, 10)

    const imageId = crypto.randomUUID()
    const order = currentCount
    const primary = isPrimary ?? currentCount === 0 // First image is primary by default

    await executeQuery(
      `INSERT INTO product_images (id, "productId", url, alt, "order", "isPrimary", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [imageId, productId, url, alt || null, order, primary]
    )

    return NextResponse.json({
      success: true,
      data: {
        id: imageId,
        url,
        alt: alt || null,
        order,
        isPrimary: primary,
      },
    })
  } catch (error) {
    console.error('Add product image error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add image' },
      { status: 500 }
    )
  }
}
