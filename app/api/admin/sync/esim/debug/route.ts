// Temporary debug endpoint to inspect raw Zendit API response
// DELETE this file after fixing the sync

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user || (user.role?.toUpperCase() !== 'ADMIN' && user.role?.toUpperCase() !== 'EDITOR')) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const settings = await getSiteSettingsByGroup('api')
    const isSandbox = settings.zenditMode === 'sandbox'
    const apiKey = isSandbox
      ? (settings.zenditSandboxApiKey || process.env.ZENDIT_SANDBOX_API_KEY || '')
      : (settings.zenditProductionApiKey || process.env.ZENDIT_API_KEY || '')
    const baseUrl = isSandbox ? 'https://test-api.zendit.io/v1' : 'https://api.zendit.io/v1'

    if (!apiKey) {
      return NextResponse.json({ error: 'No Zendit API key configured' }, { status: 400 })
    }

    // Fetch just 5 offers to inspect the raw response
    const response = await fetch(`${baseUrl}/esim/offers?_limit=5&_offset=0`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Zendit API error: ${response.status}`, body: await response.text() }, { status: 500 })
    }

    const rawResponse = await response.json()

    return NextResponse.json({
      rawResponseKeys: Object.keys(rawResponse),
      firstOffers: (rawResponse.list || rawResponse.data || rawResponse).slice(0, 5),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
