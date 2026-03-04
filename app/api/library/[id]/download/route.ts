import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'

const RAILWAY_API = process.env.RAILWAY_API_URL || 'https://api-production-8db8.up.railway.app/api'

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

    const productId = params.id
    const token = request.headers.get('Authorization') || ''

    // Delegate to Railway API — it handles access check, R2 signed URL, watermarking, and logging
    // 90s timeout: first-time watermarking can take 20-60s on cold starts
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90000)

    const railwayRes = await fetch(`${RAILWAY_API}/downloads/${productId}`, {
      headers: { Authorization: token },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const data = await railwayRes.json()

    if (!railwayRes.ok || !data.success) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Download failed' },
        { status: railwayRes.status }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        url: data.data.downloadUrl,
        filename: data.data.fileName,
        version: data.data.version,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Download error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process download' },
      { status: 500 }
    )
  }
}
