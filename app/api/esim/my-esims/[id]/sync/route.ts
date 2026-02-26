import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { query } from '@/lib/db'
import { EsimProviderFactory } from '@/lib/esim'

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

    const userId = authResult.payload.userId
    const esimId = params.id

    // Get user's eSIM with provider info
    const result = await query(
      `
      SELECT
        ue.*,
        ep.slug as provider_slug
      FROM user_esims ue
      LEFT JOIN esim_providers ep ON ue.provider_id = ep.id
      WHERE ue.id = $1 AND ue.user_id = $2
      `,
      [esimId, userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'eSIM not found' },
        { status: 404 }
      )
    }

    const esim = result.rows[0]

    // Only API-provisioned eSIMs can sync usage
    if (esim.source_type !== 'api' || !esim.provider_esim_id) {
      return NextResponse.json({
        success: true,
        data: {
          dataUsedMb: parseFloat(esim.data_used_mb) || 0,
          dataRemainingMb: parseFloat(esim.data_remaining_mb) || 0,
          status: esim.status,
          expiresAt: esim.expires_at,
        },
        message: 'Usage sync not available for this eSIM',
      })
    }

    // Get provider and fetch usage
    const provider = EsimProviderFactory.getProvider(esim.provider_slug)

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider not available' },
        { status: 500 }
      )
    }

    const usage = await provider.getEsimStatus(esim.provider_esim_id)

    // Update database with new usage data
    await query(
      `
      UPDATE user_esims
      SET data_used_mb = $2,
          data_remaining_mb = $3,
          status = $4,
          expires_at = COALESCE($5, expires_at),
          last_usage_sync = NOW(),
          updated_at = NOW()
      WHERE id = $1
      `,
      [
        esimId,
        usage.dataUsedMb,
        usage.dataRemainingMb,
        usage.status === 'unknown' ? esim.status : usage.status,
        usage.expiresAt,
      ]
    )

    return NextResponse.json({
      success: true,
      data: {
        dataUsedMb: usage.dataUsedMb,
        dataRemainingMb: usage.dataRemainingMb,
        status: usage.status === 'unknown' ? esim.status : usage.status,
        expiresAt: usage.expiresAt || esim.expires_at,
      },
    })
  } catch (error: any) {
    console.error('Error syncing eSIM usage:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync usage' },
      { status: 500 }
    )
  }
}
