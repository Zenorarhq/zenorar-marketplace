import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params

    const result = await executeQuery(
      `SELECT r.id, r.rating, r.title, r.content, r."isVerified", r."isApproved",
              r."createdAt", r.guest_name, r.admin_reply, r.admin_reply_at,
              u.name as author_name
       FROM reviews r
       LEFT JOIN users u ON r."userId" = u.id
       WHERE r."productId" = $1
       ORDER BY r."createdAt" DESC
       LIMIT 50`,
      [productId]
    )

    const reviews = result.rows.map((r: any) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      content: r.content,
      author: r.author_name || r.guest_name || 'Anonymous',
      isVerified: r.isVerified,
      isApproved: r.isApproved,
      adminReply: r.admin_reply || null,
      adminReplyAt: r.admin_reply_at || null,
      createdAt: r.createdAt,
    }))

    return NextResponse.json({ success: true, data: reviews })
  } catch (error) {
    console.error('Failed to fetch reviews:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}
