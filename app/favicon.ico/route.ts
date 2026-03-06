import { NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/settings/public`, {
      next: { revalidate: 300 },
    })
    if (res.ok) {
      const data = await res.json()
      const settings = data.data || data
      const val = settings.faviconUrl
      const faviconUrl = typeof val === 'object' && val !== null ? val.value : val

      if (faviconUrl) {
        return NextResponse.redirect(faviconUrl, { status: 302 })
      }
    }
  } catch {
    // fall through to 204
  }

  return new NextResponse(null, { status: 204 })
}
