export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'

/**
 * GET /api/admin/cards/test-lithic
 * Diagnose Lithic credentials and test connection
 */
export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user || user.role?.toUpperCase() !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const settings = await getSiteSettingsByGroup('api')

  const enabled = settings.lithicCardsEnabled === true || settings.lithicCardsEnabled === 'true'
  const isSandbox = settings.lithicMode === 'sandbox' || settings.lithicSandbox === true

  const sandboxKey = settings.lithicSandboxApiKey || ''
  const productionKey = settings.lithicProductionApiKey || ''
  const envKey = process.env.LITHIC_API_KEY || ''

  let resolvedKey = ''
  let resolvedKeySource = ''
  if (isSandbox) {
    if (sandboxKey) { resolvedKey = sandboxKey; resolvedKeySource = 'lithicSandboxApiKey (DB)' }
    else if (settings.lithicApiKey) { resolvedKey = settings.lithicApiKey; resolvedKeySource = 'lithicApiKey (DB)' }
    else if (envKey) { resolvedKey = envKey; resolvedKeySource = 'LITHIC_API_KEY (env var)' }
  } else {
    if (productionKey) { resolvedKey = productionKey; resolvedKeySource = 'lithicProductionApiKey (DB)' }
    else if (settings.lithicApiKey) { resolvedKey = settings.lithicApiKey; resolvedKeySource = 'lithicApiKey (DB)' }
    else if (envKey) { resolvedKey = envKey; resolvedKeySource = 'LITHIC_API_KEY (env var)' }
  }

  const baseUrl = isSandbox ? 'https://sandbox.lithic.com' : 'https://api.lithic.com'

  const diagnosis = {
    enabled,
    mode: isSandbox ? 'sandbox' : 'production',
    baseUrl,
    hasSandboxKey: !!sandboxKey,
    hasProductionKey: !!productionKey,
    hasEnvKey: !!envKey,
    resolvedKeySource,
    resolvedKeyPrefix: resolvedKey ? resolvedKey.slice(0, 12) + '...' : '(none)',
    keyLooksValid: resolvedKey.startsWith('sandbox_') ? 'YES - starts with sandbox_' :
                   resolvedKey.length > 20 ? 'MAYBE - does not start with sandbox_ (expected for sandbox keys)' :
                   'NO - key too short or empty',
  }

  if (!resolvedKey) {
    return NextResponse.json({ diagnosis, lithicTest: null, error: 'No API key resolved' })
  }

  // Actually test the Lithic connection
  try {
    const response = await fetch(`${baseUrl}/v1/cards?page_size=1`, {
      headers: { 'Authorization': `Bearer ${resolvedKey}` }
    })
    const data = await response.json()

    return NextResponse.json({
      diagnosis,
      lithicTest: {
        status: response.status,
        ok: response.ok,
        response: data
      }
    })
  } catch (err: any) {
    return NextResponse.json({ diagnosis, lithicTest: null, error: err.message })
  }
}
