// Gift Card Alert Service
// Low stock notifications and inventory alerts

import { query } from '@/lib/db'
import { getLowStockAlerts } from './inventory'
import { sendLowStockAlertEmail } from '@/lib/email-service'
import { getSiteSettingsByGroup } from '@/lib/db-helpers'

export interface AlertConfig {
  lowStockThreshold: number
  alertEmail: string
  enabled: boolean
}

/**
 * Get alert configuration from settings
 */
export async function getAlertConfig(): Promise<AlertConfig> {
  try {
    // Settings are saved under 'api' group by admin settings page
    const settings = await getSiteSettingsByGroup('api')

    return {
      lowStockThreshold: parseInt(settings.giftCardLowStockThreshold) || 5,
      alertEmail: settings.giftCardAlertEmail || settings.adminEmail || '',
      enabled: settings.giftCardAlertsEnabled !== false
    }
  } catch (error) {
    console.error('Error getting alert config:', error)
    return {
      lowStockThreshold: 5,
      alertEmail: '',
      enabled: false
    }
  }
}

/**
 * Check for low stock and send alerts if needed
 */
export async function checkAndSendLowStockAlerts(): Promise<{
  sent: boolean
  itemCount: number
  error?: string
}> {
  try {
    const config = await getAlertConfig()

    if (!config.enabled || !config.alertEmail) {
      return { sent: false, itemCount: 0, error: 'Alerts disabled or no email configured' }
    }

    // Get low stock items
    const lowStockItems = await getLowStockAlerts(config.lowStockThreshold)

    if (lowStockItems.length === 0) {
      return { sent: false, itemCount: 0 }
    }

    // Check if we already sent an alert recently (within 24 hours)
    const recentAlertResult = await query(
      `SELECT * FROM gift_card_alerts
       WHERE alert_type = 'low_stock'
         AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC
       LIMIT 1`
    )

    // If we sent an alert recently and the items are the same, skip
    if (recentAlertResult.rows.length > 0) {
      const lastAlert = recentAlertResult.rows[0]
      const lastItems = lastAlert.metadata?.items || []

      // Check if the low stock situation has changed
      const hasChanged = lowStockItems.some(item =>
        !lastItems.find((lastItem: any) =>
          lastItem.brand === item.brand &&
          lastItem.denomination === item.denomination &&
          lastItem.available === item.available
        )
      )

      if (!hasChanged) {
        return { sent: false, itemCount: lowStockItems.length, error: 'Alert already sent recently' }
      }
    }

    // Send the alert
    const sent = await sendLowStockAlertEmail({
      adminEmail: config.alertEmail,
      items: lowStockItems.map(item => ({
        brand: item.brand,
        denomination: item.denomination,
        available: item.available,
        threshold: config.lowStockThreshold
      }))
    })

    if (sent) {
      // Record the alert
      await query(
        `INSERT INTO gift_card_alerts (alert_type, metadata)
         VALUES ('low_stock', $1)`,
        [JSON.stringify({
          items: lowStockItems,
          sentTo: config.alertEmail,
          threshold: config.lowStockThreshold
        })]
      )
    }

    return { sent, itemCount: lowStockItems.length }
  } catch (error: any) {
    console.error('Error checking low stock alerts:', error)
    return { sent: false, itemCount: 0, error: error.message }
  }
}

/**
 * Get recent alerts
 */
export async function getRecentAlerts(limit: number = 10): Promise<Array<{
  id: string
  alertType: string
  metadata: any
  createdAt: Date
}>> {
  try {
    const result = await query(
      `SELECT * FROM gift_card_alerts
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    )

    return result.rows.map(row => ({
      id: row.id,
      alertType: row.alert_type,
      metadata: row.metadata,
      createdAt: row.created_at
    }))
  } catch (error) {
    console.error('Error getting recent alerts:', error)
    return []
  }
}
