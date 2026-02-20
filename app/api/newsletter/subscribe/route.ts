import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Valid email is required' }, { status: 400 })
    }

    await executeQuery(
      `INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
      [email.toLowerCase().trim()]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Newsletter subscribe error:', error)
    return NextResponse.json({ success: false, error: 'Failed to subscribe' }, { status: 500 })
  }
}
