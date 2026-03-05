import { NextRequest, NextResponse } from 'next/server'
import { inventoryService } from '@/lib/virtual-numbers/inventory'
import { query } from '@/lib/db'

/**
 * GET /api/cron/virtual-numbers
 * Cron job to process virtual number lifecycle events
 * - Process expired rentals (move to grace period or hold)
 * - Release unused numbers before Twilio billing
 * - Send expiry reminders
 *
 * Should be called hourly via Vercel/Railway cron or external service
 */
export async function GET(req: NextRequest) {
  // Verify cron secret for security
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const results = {
    expiredRentals: { processed: 0, errors: [] as string[] },
    releasedNumbers: { released: 0, errors: [] as string[] },
    remindersSent: { sent: 0, errors: [] as string[] },
    timestamp: new Date().toISOString()
  }

  try {
    // 1. Process expired rentals (grace periods and holds)
    console.log('[Cron] Processing expired rentals...')
    const expiryResult = await inventoryService.processExpiredRentals()
    results.expiredRentals = expiryResult

    // 2. Release unused numbers before Twilio billing
    console.log('[Cron] Checking for numbers to release...')
    const releaseResult = await inventoryService.releaseUnusedNumbers()
    results.releasedNumbers = releaseResult

    // 3. Send expiry reminders
    console.log('[Cron] Sending expiry reminders...')
    const reminderResult = await sendExpiryReminders()
    results.remindersSent = reminderResult

    console.log('[Cron] Virtual numbers cron completed:', results)

    return NextResponse.json({
      success: true,
      data: results
    })
  } catch (error: any) {
    console.error('[Cron] Virtual numbers cron error:', error)
    return NextResponse.json(
      { success: false, error: error.message, partialResults: results },
      { status: 500 }
    )
  }
}

/**
 * Send expiry reminder notifications
 * - 48hr reminder for 7-day and 30-day plans
 * - 24hr reminder for all plans
 * - 2hr reminder for 24hr plans
 */
async function sendExpiryReminders(): Promise<{ sent: number; errors: string[] }> {
  const errors: string[] = []
  let sent = 0

  try {
    // 48hr reminders (for plans > 1 day)
    const reminder48hr = await query(
      `SELECT
         uvn.id, uvn.user_id, uvn.phone_number, uvn.phone_number_display, uvn.expires_at,
         vnp.duration_days, vnp.name as plan_name,
         u.email, u.name as user_name
       FROM user_virtual_numbers uvn
       JOIN virtual_number_plans vnp ON uvn.plan_id = vnp.id
       JOIN users u ON uvn.user_id = u.id
       WHERE uvn.status = 'active'
         AND vnp.duration_days > 1
         AND uvn.expires_at BETWEEN NOW() + INTERVAL '47 hours' AND NOW() + INTERVAL '49 hours'
         AND NOT EXISTS (
           SELECT 1 FROM virtual_number_reminders
           WHERE virtual_number_id = uvn.id AND reminder_type = '48hr'
         )`
    )

    for (const row of reminder48hr.rows) {
      try {
        await sendReminderNotification(row, '48hr')
        await recordReminder(row.id, '48hr')
        sent++
      } catch (err: any) {
        errors.push(`48hr reminder for ${row.phone_number}: ${err.message}`)
      }
    }

    // 24hr reminders (for all plans)
    const reminder24hr = await query(
      `SELECT
         uvn.id, uvn.user_id, uvn.phone_number, uvn.phone_number_display, uvn.expires_at,
         vnp.duration_days, vnp.name as plan_name,
         u.email, u.name as user_name
       FROM user_virtual_numbers uvn
       JOIN virtual_number_plans vnp ON uvn.plan_id = vnp.id
       JOIN users u ON uvn.user_id = u.id
       WHERE uvn.status = 'active'
         AND uvn.expires_at BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'
         AND NOT EXISTS (
           SELECT 1 FROM virtual_number_reminders
           WHERE virtual_number_id = uvn.id AND reminder_type = '24hr'
         )`
    )

    for (const row of reminder24hr.rows) {
      try {
        await sendReminderNotification(row, '24hr')
        await recordReminder(row.id, '24hr')
        sent++
      } catch (err: any) {
        errors.push(`24hr reminder for ${row.phone_number}: ${err.message}`)
      }
    }

    // 2hr reminders (for 24hr plans only)
    const reminder2hr = await query(
      `SELECT
         uvn.id, uvn.user_id, uvn.phone_number, uvn.phone_number_display, uvn.expires_at,
         vnp.duration_days, vnp.name as plan_name,
         u.email, u.name as user_name
       FROM user_virtual_numbers uvn
       JOIN virtual_number_plans vnp ON uvn.plan_id = vnp.id
       JOIN users u ON uvn.user_id = u.id
       WHERE uvn.status = 'active'
         AND vnp.duration_days = 1
         AND uvn.expires_at BETWEEN NOW() + INTERVAL '1 hour 50 minutes' AND NOW() + INTERVAL '2 hours 10 minutes'
         AND NOT EXISTS (
           SELECT 1 FROM virtual_number_reminders
           WHERE virtual_number_id = uvn.id AND reminder_type = '2hr'
         )`
    )

    for (const row of reminder2hr.rows) {
      try {
        await sendReminderNotification(row, '2hr')
        await recordReminder(row.id, '2hr')
        sent++
      } catch (err: any) {
        errors.push(`2hr reminder for ${row.phone_number}: ${err.message}`)
      }
    }

  } catch (error: any) {
    errors.push(`General error: ${error.message}`)
  }

  return { sent, errors }
}

async function sendReminderNotification(
  row: {
    id: string
    user_id: string
    phone_number: string
    phone_number_display: string
    expires_at: Date
    plan_name: string
    email: string
    user_name: string
  },
  reminderType: '48hr' | '24hr' | '2hr'
): Promise<void> {
  const timeLabel = reminderType === '48hr' ? '48 hours' :
                    reminderType === '24hr' ? '24 hours' : '2 hours'

  // Send in-app notification
  await query(
    `INSERT INTO notifications (id, "userId", type, title, message, metadata)
     VALUES (gen_random_uuid()::text, $1, 'VIRTUAL_NUMBER_EXPIRY'::"NotificationType",
             'Virtual Number Expiring Soon',
             'Your virtual number ' || $2 || ' will expire in ' || $3 || '. Renew now to keep your number.',
             $4::jsonb)`,
    [
      row.user_id,
      row.phone_number_display || row.phone_number,
      timeLabel,
      JSON.stringify({
        virtualNumberId: row.id,
        phoneNumber: row.phone_number,
        expiresAt: row.expires_at,
        reminderType
      })
    ]
  )

  // TODO: Send email notification using sendExpiryReminderEmail
}

async function recordReminder(virtualNumberId: string, reminderType: string): Promise<void> {
  await query(
    `INSERT INTO virtual_number_reminders (virtual_number_id, reminder_type, sent_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT DO NOTHING`,
    [virtualNumberId, reminderType]
  )
}
