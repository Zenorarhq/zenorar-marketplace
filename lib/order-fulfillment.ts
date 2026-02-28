/**
 * Order Fulfillment Service
 *
 * Handles provisioning of digital products after payment is confirmed.
 * Supports multiple product types: eSIMs, gift cards, scripts, etc.
 */

import { query } from './db'
import { esimProvisioningService } from './esim'
import { provisionGiftCard } from './gift-cards/provisioning'

export interface FulfillmentResult {
  orderId: string
  success: boolean
  itemsProcessed: number
  itemsFailed: number
  details: {
    itemId: string
    productType: string
    status: 'success' | 'failed' | 'skipped'
    error?: string
    provisionedId?: string
  }[]
}

/**
 * Fulfill all items in an order after payment confirmation
 */
export async function fulfillOrder(orderId: string): Promise<FulfillmentResult> {
  const result: FulfillmentResult = {
    orderId,
    success: true,
    itemsProcessed: 0,
    itemsFailed: 0,
    details: []
  }

  try {
    // Get order details
    const orderResult = await query(
      `SELECT o.*, o.user_id
       FROM orders o
       WHERE o.id = $1`,
      [orderId]
    )

    if (orderResult.rows.length === 0) {
      throw new Error('Order not found')
    }

    const order = orderResult.rows[0]
    const userId = order.user_id

    if (!userId) {
      throw new Error('Order has no associated user')
    }

    // Get order items with product type information
    const itemsResult = await query(
      `SELECT
         oi.id as item_id,
         oi.product_id,
         oi.name,
         oi.quantity,
         p.product_type,
         p.slug as product_slug
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [orderId]
    )

    // Process each item based on its type
    for (const item of itemsResult.rows) {
      const itemResult = await processOrderItem(orderId, userId, item)
      result.details.push(itemResult)

      if (itemResult.status === 'success') {
        result.itemsProcessed++
      } else if (itemResult.status === 'failed') {
        result.itemsFailed++
        result.success = false
      }
    }

    // Update order fulfillment status
    if (result.itemsFailed === 0 && result.itemsProcessed > 0) {
      await query(
        `UPDATE orders
         SET status = 'DELIVERED',
             delivered_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [orderId]
      )
    } else if (result.itemsFailed > 0) {
      // Partial fulfillment - mark as processing with note
      await query(
        `UPDATE orders
         SET status = 'PROCESSING',
             admin_note = COALESCE(admin_note, '') || E'\n[Auto] Partial fulfillment: ' || $2 || ' items failed',
             updated_at = NOW()
         WHERE id = $1`,
        [orderId, result.itemsFailed.toString()]
      )
    }

    return result
  } catch (error: any) {
    console.error('Order fulfillment error:', error)
    result.success = false
    result.details.push({
      itemId: 'order',
      productType: 'system',
      status: 'failed',
      error: error.message
    })
    return result
  }
}

/**
 * Process a single order item based on its product type
 */
async function processOrderItem(
  orderId: string,
  userId: string,
  item: {
    item_id: string
    product_id: string
    name: string
    quantity: number
    product_type: string | null
    product_slug: string | null
  }
): Promise<FulfillmentResult['details'][0]> {
  try {
    const productType = item.product_type || 'digital'

    switch (productType) {
      case 'esim':
        return await processEsimItem(orderId, userId, item)

      case 'script':
      case 'tool':
        return await processDigitalDownload(orderId, userId, item)

      case 'api':
        return await processApiProduct(orderId, userId, item)

      case 'gift_card':
        return await processGiftCardItem(orderId, userId, item)

      default:
        // Generic digital product - just grant access
        return await processDigitalDownload(orderId, userId, item)
    }
  } catch (error: any) {
    console.error(`Failed to process item ${item.item_id}:`, error)
    return {
      itemId: item.item_id,
      productType: item.product_type || 'unknown',
      status: 'failed',
      error: error.message
    }
  }
}

/**
 * Process eSIM order item - provision eSIM using hybrid service
 */
async function processEsimItem(
  orderId: string,
  userId: string,
  item: {
    item_id: string
    product_id: string
    name: string
    quantity: number
  }
): Promise<FulfillmentResult['details'][0]> {
  try {
    // For eSIMs, the product_id should reference an esim_plan
    // We need to look up the plan from the product or order metadata

    // First, check if there's already a user_esim for this order item (idempotency)
    const existingResult = await query(
      `SELECT id FROM user_esims WHERE order_id = $1 AND order_item_id = $2`,
      [orderId, item.item_id]
    )

    if (existingResult.rows.length > 0) {
      // Already provisioned
      return {
        itemId: item.item_id,
        productType: 'esim',
        status: 'success',
        provisionedId: existingResult.rows[0].id
      }
    }

    // Look up the eSIM plan from the product
    const planResult = await query(
      `SELECT ep.id as plan_id, ep.name as plan_name
       FROM products p
       LEFT JOIN esim_plans ep ON ep.id = (p.metadata->>'esim_plan_id')::uuid
       WHERE p.id = $1`,
      [item.product_id]
    )

    let planId: string

    if (planResult.rows.length > 0 && planResult.rows[0].plan_id) {
      planId = planResult.rows[0].plan_id
    } else {
      // Try to find plan by matching product name/slug
      const planByNameResult = await query(
        `SELECT id FROM esim_plans WHERE name ILIKE $1 OR slug ILIKE $2 LIMIT 1`,
        [item.name, item.name.toLowerCase().replace(/\s+/g, '-')]
      )

      if (planByNameResult.rows.length === 0) {
        throw new Error(`No eSIM plan found for product: ${item.name}`)
      }

      planId = planByNameResult.rows[0].id
    }

    // Provision the eSIM using the hybrid service
    const provisionResult = await esimProvisioningService.provisionEsim(
      userId,
      planId,
      orderId,
      item.item_id
    )

    if (!provisionResult.success) {
      throw new Error(provisionResult.error || 'eSIM provisioning failed')
    }

    return {
      itemId: item.item_id,
      productType: 'esim',
      status: 'success',
      provisionedId: provisionResult.userEsimId
    }
  } catch (error: any) {
    console.error(`eSIM provisioning failed for item ${item.item_id}:`, error)

    // Log failed provision for retry
    await query(
      `INSERT INTO esim_provision_log (order_id, order_item_id, user_id, plan_id, status, error_message)
       VALUES ($1, $2, $3, $4, 'failed', $5)
       ON CONFLICT DO NOTHING`,
      [orderId, item.item_id, '', item.product_id, error.message]
    ).catch(() => {}) // Don't fail if logging fails

    return {
      itemId: item.item_id,
      productType: 'esim',
      status: 'failed',
      error: error.message
    }
  }
}

/**
 * Process digital download (script/tool) - grant access in user_product_access
 */
async function processDigitalDownload(
  orderId: string,
  userId: string,
  item: {
    item_id: string
    product_id: string
    name: string
  }
): Promise<FulfillmentResult['details'][0]> {
  try {
    // Check if access already granted (idempotency)
    const existingResult = await query(
      `SELECT id FROM user_product_access WHERE user_id = $1 AND product_id = $2`,
      [userId, item.product_id]
    )

    if (existingResult.rows.length > 0) {
      return {
        itemId: item.item_id,
        productType: 'digital',
        status: 'success',
        provisionedId: existingResult.rows[0].id
      }
    }

    // Grant access
    const accessResult = await query(
      `INSERT INTO user_product_access (user_id, product_id, order_id, order_item_id, access_type, granted_at)
       VALUES ($1, $2, $3, $4, 'download', NOW())
       RETURNING id`,
      [userId, item.product_id, orderId, item.item_id]
    )

    return {
      itemId: item.item_id,
      productType: 'digital',
      status: 'success',
      provisionedId: accessResult.rows[0]?.id
    }
  } catch (error: any) {
    return {
      itemId: item.item_id,
      productType: 'digital',
      status: 'failed',
      error: error.message
    }
  }
}

/**
 * Process API product - generate API key and grant access
 */
async function processApiProduct(
  orderId: string,
  userId: string,
  item: {
    item_id: string
    product_id: string
    name: string
  }
): Promise<FulfillmentResult['details'][0]> {
  try {
    // Check if access already granted
    const existingResult = await query(
      `SELECT id FROM user_product_access WHERE user_id = $1 AND product_id = $2`,
      [userId, item.product_id]
    )

    if (existingResult.rows.length > 0) {
      return {
        itemId: item.item_id,
        productType: 'api',
        status: 'success',
        provisionedId: existingResult.rows[0].id
      }
    }

    // Generate API key
    const crypto = await import('crypto')
    const apiKey = `zn_${crypto.randomBytes(24).toString('hex')}`

    // Grant access with API key
    const accessResult = await query(
      `INSERT INTO user_product_access (user_id, product_id, order_id, order_item_id, access_type, api_key, granted_at)
       VALUES ($1, $2, $3, $4, 'api', $5, NOW())
       RETURNING id`,
      [userId, item.product_id, orderId, item.item_id, apiKey]
    )

    return {
      itemId: item.item_id,
      productType: 'api',
      status: 'success',
      provisionedId: accessResult.rows[0]?.id
    }
  } catch (error: any) {
    return {
      itemId: item.item_id,
      productType: 'api',
      status: 'failed',
      error: error.message
    }
  }
}

/**
 * Process gift card order item - provision from bulk inventory or API
 */
async function processGiftCardItem(
  orderId: string,
  userId: string,
  item: {
    item_id: string
    product_id: string
    name: string
    quantity: number
  }
): Promise<FulfillmentResult['details'][0]> {
  try {
    // Check if already provisioned (idempotency)
    const existingResult = await query(
      `SELECT id FROM user_gift_cards WHERE order_id = $1 AND user_id = $2`,
      [orderId, userId]
    )

    if (existingResult.rows.length > 0) {
      return {
        itemId: item.item_id,
        productType: 'gift_card',
        status: 'success',
        provisionedId: existingResult.rows[0].id
      }
    }

    // Get gift card details from product metadata or order item metadata
    const productResult = await query(
      `SELECT
         p.metadata,
         oi.metadata as item_metadata
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id = p.id AND oi.order_id = $2
       WHERE p.id = $1`,
      [item.product_id, orderId]
    )

    let giftCardId: string | null = null
    let denomination: number | null = null

    if (productResult.rows.length > 0) {
      const productMeta = productResult.rows[0].metadata || {}
      const itemMeta = productResult.rows[0].item_metadata || {}

      // Check item metadata first (for cart selections), then product metadata
      giftCardId = itemMeta.gift_card_id || productMeta.gift_card_id
      denomination = itemMeta.denomination || productMeta.denomination
    }

    // Try to find gift card by product name/slug if not in metadata
    if (!giftCardId) {
      const giftCardResult = await query(
        `SELECT id FROM gift_cards
         WHERE brand ILIKE $1 OR slug ILIKE $2
         LIMIT 1`,
        [item.name, item.name.toLowerCase().replace(/\s+/g, '-')]
      )

      if (giftCardResult.rows.length > 0) {
        giftCardId = giftCardResult.rows[0].id
      }
    }

    if (!giftCardId) {
      throw new Error(`No gift card found for product: ${item.name}`)
    }

    // Get denomination from order item price if not in metadata
    if (!denomination) {
      const priceResult = await query(
        `SELECT price FROM order_items WHERE id = $1`,
        [item.item_id]
      )

      if (priceResult.rows.length > 0) {
        denomination = parseFloat(priceResult.rows[0].price)
      }
    }

    if (!denomination || denomination <= 0) {
      throw new Error('Invalid denomination for gift card')
    }

    // Provision the gift card
    const provisionResult = await provisionGiftCard(
      giftCardId,
      denomination,
      userId,
      orderId
    )

    if (!provisionResult.success) {
      throw new Error(provisionResult.error || 'Gift card provisioning failed')
    }

    return {
      itemId: item.item_id,
      productType: 'gift_card',
      status: 'success',
      provisionedId: provisionResult.userGiftCardId
    }
  } catch (error: any) {
    console.error(`Gift card provisioning failed for item ${item.item_id}:`, error)

    return {
      itemId: item.item_id,
      productType: 'gift_card',
      status: 'failed',
      error: error.message
    }
  }
}

/**
 * Retry failed eSIM provisions
 * Should be run periodically via cron job
 */
export async function retryFailedProvisions(): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const result = { processed: 0, succeeded: 0, failed: 0 }

  try {
    // Get failed provisions that haven't exceeded retry limit
    const failedResult = await query(
      `SELECT * FROM esim_provision_log
       WHERE status = 'failed'
         AND retry_count < 3
         AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at ASC
       LIMIT 10`
    )

    for (const provision of failedResult.rows) {
      result.processed++

      try {
        const provisionResult = await esimProvisioningService.provisionEsim(
          provision.user_id,
          provision.plan_id,
          provision.order_id,
          provision.order_item_id
        )

        if (provisionResult.success) {
          result.succeeded++
          await query(
            `UPDATE esim_provision_log SET status = 'success' WHERE id = $1`,
            [provision.id]
          )
        } else {
          result.failed++
          await query(
            `UPDATE esim_provision_log
             SET retry_count = retry_count + 1,
                 error_message = $2,
                 updated_at = NOW()
             WHERE id = $1`,
            [provision.id, provisionResult.error]
          )
        }
      } catch (error: any) {
        result.failed++
        await query(
          `UPDATE esim_provision_log
           SET retry_count = retry_count + 1,
               error_message = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [provision.id, error.message]
        )
      }
    }
  } catch (error) {
    console.error('Error retrying failed provisions:', error)
  }

  return result
}

export const orderFulfillmentService = {
  fulfillOrder,
  retryFailedProvisions
}
