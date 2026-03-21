import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')
  if (!domain) return new NextResponse(null, { status: 400 })

  try {
    const res = await fetch(`https://logos-api.apistemic.com/domain:${domain}`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    })
    if (!res.ok) return new NextResponse(null, { status: 404 })

    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'image/webp',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
