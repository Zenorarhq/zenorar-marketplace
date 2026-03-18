import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'EDITOR'
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const { id: productId, imageId } = await params

    // Fetch the image to check ownership and isPrimary
    const imageResult = await executeQuery(
      'SELECT id, "isPrimary" FROM product_images WHERE id = $1 AND "productId" = $2',
      [imageId, productId]
    )

    if (imageResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 })
    }

    const wasPrimary = imageResult.rows[0].isPrimary

    // Delete the image
    await executeQuery('DELETE FROM product_images WHERE id = $1', [imageId])

    // If it was the primary image, promote the next remaining image
    if (wasPrimary) {
      await executeQuery(
        `UPDATE product_images SET "isPrimary" = true
         WHERE id = (
           SELECT id FROM product_images WHERE "productId" = $1
           ORDER BY "order" ASC LIMIT 1
         )`,
        [productId]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete product image error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}
