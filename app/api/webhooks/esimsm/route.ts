import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db-helpers'

/**
 * eSIM.sm Webhooks
 *
 * Two event types:
 * 1. status_change — eSIM status updated (not_installed → installed → in_use)
 * 2. data_usage — Usage threshold reached (e.g., 80% data used)
 *
 * Configure webhook URLs in your eSIM.sm reseller dashboard:
 *   Status: https://yourdomain.com/api/webhooks/esimsm
 *   Usage:  https://yourdomain.com/api/webhooks/esimsm
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const eventType = body.event_type

    if (!eventType || !body.esim) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    const { iccid, status, mb_total, mb_used, mb_remaining, expiration_timestamp } = body.esim

    if (!iccid) {
      return NextResponse.json({ error: 'Missing ICCID' }, { status: 400 })
    }

    if (eventType === 'status_change') {
      // Map eSIM.sm status to our status
      let mappedStatus = 'pending'
      switch (status) {
        case 'installed':
        case 'in_use':
          mappedStatus = 'active'
          break
        case 'not_installed':
          mappedStatus = 'pending'
          break
        case 'expired':
          mappedStatus = 'expired'
          break
      }

      await executeQuery(
        `UPDATE user_esims
         SET status = $1,
             installed_at = CASE WHEN $2 IN ('installed', 'in_use') AND installed_at IS NULL THEN NOW() ELSE installed_at END,
             data_used_mb = COALESCE($3, data_used_mb),
             data_remaining_mb = COALESCE($4, data_remaining_mb),
             expires_at = COALESCE($5, expires_at),
             last_usage_sync = NOW(),
             updated_at = NOW()
         WHERE iccid = $6`,
        [
          mappedStatus,
          status,
          mb_used ?? null,
          mb_remaining ?? (mb_total != null && mb_used != null ? mb_total - mb_used : null),
          expiration_timestamp ? new Date(expiration_timestamp * 1000) : null,
          iccid,
        ]
      )

      console.log(`[eSIM.sm webhook] Status change: ${iccid} → ${status}`)

    } else if (eventType === 'data_usage') {
      const usagePercent = body.current_usage_percentage

      await executeQuery(
        `UPDATE user_esims
         SET data_used_mb = COALESCE($1, data_used_mb),
             data_remaining_mb = COALESCE($2, data_remaining_mb),
             last_usage_sync = NOW(),
             updated_at = NOW()
         WHERE iccid = $3`,
        [
          mb_used ?? null,
          mb_remaining ?? (mb_total != null && mb_used != null ? mb_total - mb_used : null),
          iccid,
        ]
      )

      console.log(`[eSIM.sm webhook] Data usage: ${iccid} at ${usagePercent}%`)

    } else {
      console.warn(`[eSIM.sm webhook] Unknown event type: ${eventType}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[eSIM.sm webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}