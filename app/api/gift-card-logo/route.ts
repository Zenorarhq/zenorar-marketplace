import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const CACHE = 'public, max-age=86400, stale-while-revalidate=604800'

async function fetchImage(url: string): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) return null
    const buffer = await res.arrayBuffer()
    return { buffer, contentType }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain')
  const brand = request.nextUrl.searchParams.get('brand') || ''

  if (!domain || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
    return new NextResponse(null, { status: 400 })
  }

  // Derive Simple Icons slug from brand name: lowercase, alphanumeric only
  const simpleSlug = brand.toLowerCase().replace(/[^a-z0-9]/g, '')

  // 1. Try Simple Icons (SVG — best quality for tech/streaming/gaming brands)
  if (simpleSlug) {
    const img = await fetchImage(`https://cdn.simpleicons.org/${simpleSlug}`)
    if (img) {
      return new NextResponse(img.buffer, {
        headers: { 'Content-Type': img.contentType, 'Cache-Control': CACHE },
      })
    }
  }

  // 2. Try Wikipedia thumbnail (covers retail, entertainment brands)
  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(brand)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) }
    )
    if (wikiRes.ok) {
      const data = await wikiRes.json()
      const thumbUrl = data?.thumbnail?.source
      if (thumbUrl) {
        const img = await fetchImage(thumbUrl)
        if (img) {
          return new NextResponse(img.buffer, {
            headers: { 'Content-Type': img.contentType, 'Cache-Control': CACHE },
          })
        }
      }
    }
  } catch { /* fall through */ }

  return new NextResponse(null, { status: 404 })
}
