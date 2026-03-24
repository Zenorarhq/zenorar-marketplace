export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'

/**
 * GET /api/utilities/debug
 * Search ALL topup offers for utility/electricity subTypes
 */
export async function GET() {
  try {
    const settings = await getSiteSettingsByGroup('api')
    const isSandbox = settings.zenditMode === 'sandbox'
    const apiKey = isSandbox
      ? (settings.zenditSandboxApiKey || process.env.ZENDIT_SANDBOX_API_KEY || '')
      : (settings.zenditProductionApiKey || process.env.ZENDIT_API_KEY || '')

    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured' }, { status: 500 })
    }

    const baseUrl = isSandbox
      ? 'https://test-api.zendit.io/v1'
      : 'https://api.zendit.io/v1'

    // Try multiple Zendit API endpoints to find prepaid utilities
    const endpoints = [
      '/utilities/offers?_limit=3&_offset=0',
      '/billpay/offers?_limit=3&_offset=0',
      '/topups/offers?_limit=3&_offset=0&subType=Prepaid+Utilities',
      '/topups/offers?_limit=3&_offset=0&subTypes=Prepaid+Utilities',
      '/topups/offers?_limit=3&_offset=0&brand=SONABEL',
    ]

    const results: Record<string, any> = {}

    for (const ep of endpoints) {
      try {
        const res = await fetch(`${baseUrl}${ep}`, {
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        })
        const body = await res.text()
        let parsed: any
        try { parsed = JSON.parse(body) } catch { parsed = body.substring(0, 200) }
        results[ep] = { status: res.status, data: typeof parsed === 'object' ? parsed : { raw: parsed } }
      } catch (e: any) {
        results[ep] = { error: e.message }
      }
    }

    return NextResponse.json({ mode: isSandbox ? 'sandbox' : 'production', results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
