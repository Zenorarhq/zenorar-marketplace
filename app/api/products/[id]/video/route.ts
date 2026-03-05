import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { executeQuery } from '@/lib/db-helpers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: productId } = await params
    const body = await request.json()
    const { videoUrl } = body

    await executeQuery(
      'UPDATE products SET video_url = $1 WHERE id = $2',
      [videoUrl || null, productId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update product video URL:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update video URL' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params

    const result = await executeQuery(
      'SELECT video_url FROM products WHERE id = $1',
      [productId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { videoUrl: result.rows[0].video_url || null }
    })
  } catch (error) {
    console.error('Failed to get product video URL:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get video URL' },
      { status: 500 }
    )
  }
}
