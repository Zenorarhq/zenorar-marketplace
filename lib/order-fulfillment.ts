/**
 * Order Fulfillment Service
 *
 * Handles provisioning of digital products after payment is confirmed.
 * Supports multiple product types: eSIMs, gift cards, scripts, etc.
 */

import crypto from 'crypto'
import { query } from './db'
import { esimProvisioningService } from './esim'
import { provisionGiftCard } from './gift-cards/provisioning'
import { virtualNumberService } from './virtual-numbers/service'
import {
  sendEsimDeliveryEmail,
  sendVirtualNumberDeliveryEmail,
  sendGiftCardDeliveryEmail
} from './email-service'

const LICENSE_KEY_PREFIX = 'ZNRSCR'

const LICENSE_TYPE_CONFIG: Record<string, { type: string; domains: number; months: number }> = {
  extended: { type: 'EXTENDED', domains: 1, months: 12 },
  pro:      { type: 'PRO',      domains: 3, months: 36 },
}

/**
 * Generate a license record in the licenses table for a purchased digital product.
 * Returns the new license id.
 */
async function generateLicenseRecord(
  userId: string,
  productId: string,
  orderId: string,
  orderItemId: string,
  cartLicense?: string | null
): Promise<string> {
  // Map cart license string → license type config
  const cfg = LICENSE_TYPE_CONFIG[cartLicense || ''] || { type: 'NORMAL', domains: 1, months: 6 }

  // Calculate support expiry
  const supportExpiry = new Date()
  supportExpiry.setMonth(supportExpiry.getMonth() + cfg.months)

  // Generate unique license key (ZNRSCR-XXXX-XXXX-XXXX-XXXX)
  let licenseKey = ''
  for (let attempts = 0; attempts < 5; attempts++) {
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.createHash('sha256')
      .update(`${orderId}:${productId}:${Date.now()}:${salt}`)
      .digest('hex')
      .toUpperCase()
    licenseKey = `${LICENSE_KEY_PREFIX}-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}`
    const existing = await query('SELECT id FROM licenses WHERE license_key = $1', [licenseKey])
    if (existing.rows.length === 0) break
  }

  // Insert license record (id has no DB default — must be provided)
  const result = await query(
    `INSERT INTO licenses
       (id, user_id, product_id, order_id, order_item_id, license_key, license_type,
        domains_allowed, registered_domains, support_expires_at, is_active, status, verification_count)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, true, 'ACTIVE', 0)
     RETURNING id`,
    [userId, productId, orderId, orderItemId, licenseKey, cfg.type, cfg.domains, JSON.stringify([]), supportExpiry]
  )

  // Update user_product_access with license key and type
  await query(
    `UPDATE user_product_access
     SET access_key = $1, access_type = $2
     WHERE user_id = $3 AND product_id = $4`,
    [licenseKey, `license_${cfg.type.toLowerCase()}`, userId, productId]
  )

  // Send in-app notification (non-blocking — same as wallet path)
  // notifications table uses Prisma camelCase columns: "userId", "isRead", "createdAt", metadata
  query(
    `INSERT INTO notifications (id, "userId", type, title, message, metadata)
     VALUES (gen_random_uuid()::text, $1, 'LICENSE_GENERATED'::"NotificationType",
             'License Key Generated',
             'Your license key for order #' || $2 || ' is ready: ' || $3,
             $4::jsonb)`,
    [userId, orderId, licenseKey, JSON.stringify({ licenseKey, productId, orderId })]
  ).catch((err) => console.error('Failed to send license notification:', err))

  return result.rows[0].id
}

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
    // Get order details — orders table uses Prisma camelCase columns
    const orderResult = await query(
      `SELECT o.*, o."userId" as user_id
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

    // Get order items — order_items table uses Prisma camelCase columns
    const itemsResult = await query(
      `SELECT
         oi.id as item_id,
         oi."productId" as product_id,
         oi.name,
         oi.quantity,
         oi.license,
         p.product_type,
         p.slug as product_slug
       FROM order_items oi
       LEFT JOIN products p ON oi."productId" = p.id
       WHERE oi."orderId" = $1`,
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

    // Update order fulfillment status — orders table uses camelCase
    // Digital products use CONFIRMED as final status (same as wallet path — no shipping needed)
    if (result.itemsFailed === 0 && result.itemsProcessed > 0) {
      await query(
        `UPDATE orders
         SET status = 'CONFIRMED',
             "updatedAt" = NOW()
         WHERE id = $1`,
        [orderId]
      )
    } else if (result.itemsFailed > 0) {
      await query(
        `UPDATE orders
         SET status = 'PROCESSING',
             "adminNote" = COALESCE("adminNote", '') || E'\n[Auto] Partial fulfillment: ' || $2 || ' items failed',
             "updatedAt" = NOW()
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
    license?: string | null
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

      case 'virtual_number':
        return await processVirtualNumberItem(orderId, userId, item)

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
    // First, check if there's already a user_esim for this order item (idempotency)
    const existingResult = await query(
      `SELECT id FROM user_esims WHERE order_id = $1 AND order_item_id = $2`,
      [orderId, item.item_id]
    )

    if (existingResult.rows.length > 0) {
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
      const planByNameResult = await query(
        `SELECT id FROM esim_plans WHERE name ILIKE $1 OR slug ILIKE $2 LIMIT 1`,
        [item.name, item.name.toLowerCase().replace(/\s+/g, '-')]
      )

      if (planByNameResult.rows.length === 0) {
        throw new Error(`No eSIM plan found for product: ${item.name}`)
      }

      planId = planByNameResult.rows[0].id
    }

    const provisionResult = await esimProvisioningService.provisionEsim(
      userId,
      planId,
      orderId,
      item.item_id
    )

    if (!provisionResult.success) {
      throw new Error(provisionResult.error || 'eSIM provisioning failed')
    }

    // Send delivery email
    try {
      const esimDetails = await query(
        `SELECT
           ue.*,
           u.email as user_email,
           u.name as user_name,
           ep.name as plan_name,
           ep.data_amount_mb,
           ep.validity_days,
           er.name as region_name,
           o."orderNumber" as order_number
         FROM user_esims ue
         JOIN users u ON ue.user_id = u.id
         JOIN esim_plans ep ON ue.plan_id = ep.id
         LEFT JOIN esim_regions er ON ep.region_id = er.id
         LEFT JOIN orders o ON ue.order_id = o.id
         WHERE ue.id = $1`,
        [provisionResult.userEsimId]
      )

      if (esimDetails.rows.length > 0) {
        const esim = esimDetails.rows[0]
        const dataAmount = esim.data_amount_mb >= 1024
          ? `${(esim.data_amount_mb / 1024).toFixed(1)} GB`
          : `${esim.data_amount_mb} MB`

        await sendEsimDeliveryEmail({
          customerName: esim.user_name || 'Customer',
          email: esim.user_email,
          orderNumber: esim.order_number || orderId.slice(0, 8).toUpperCase(),
          planName: esim.plan_name,
          region: esim.region_name || 'Global',
          dataAmount,
          validityDays: esim.validity_days,
          qrCodeUrl: esim.qr_code_url,
          iccid: esim.iccid || 'N/A',
          smdpAddress: esim.smdp_address,
          matchingId: esim.matching_id
        })
      }
    } catch (emailError) {
      console.error('Failed to send eSIM delivery email:', emailError)
    }

    return {
      itemId: item.item_id,
      productType: 'esim',
      status: 'success',
      provisionedId: provisionResult.userEsimId
    }
  } catch (error: any) {
    console.error(`eSIM provisioning failed for item ${item.item_id}:`, error)

    await query(
      `INSERT INTO esim_provision_log (order_id, order_item_id, user_id, plan_id, status, error_message)
       VALUES ($1, $2, $3, $4, 'failed', $5)
       ON CONFLICT DO NOTHING`,
      [orderId, item.item_id, '', item.product_id, error.message]
    ).catch(() => {})

    return {
      itemId: item.item_id,
      productType: 'esim',
      status: 'failed',
      error: error.message
    }
  }
}

/**
 * Process digital download (script/tool) - grant access and generate license
 */
async function processDigitalDownload(
  orderId: string,
  userId: string,
  item: {
    item_id: string
    product_id: string
    name: string
    license?: string | null
  }
): Promise<FulfillmentResult['details'][0]> {
  try {
    // Idempotency: check if license already exists for this order item
    const existingLicense = await query(
      `SELECT id FROM licenses WHERE order_id = $1 AND order_item_id = $2`,
      [orderId, item.item_id]
    )

    if (existingLicense.rows.length > 0) {
      return {
        itemId: item.item_id,
        productType: 'digital',
        status: 'success',
        provisionedId: existingLicense.rows[0].id
      }
    }

    // Grant user_product_access if not already granted
    const existingAccess = await query(
      `SELECT id FROM user_product_access WHERE user_id = $1 AND product_id = $2`,
      [userId, item.product_id]
    )

    if (existingAccess.rows.length === 0) {
      await query(
        `INSERT INTO user_product_access (user_id, product_id, order_id, access_type)
         VALUES ($1, $2, $3, 'download')`,
        [userId, item.product_id, orderId]
      )
    }

    // Generate license record in licenses table
    const licenseId = await generateLicenseRecord(
      userId, item.product_id, orderId, item.item_id, item.license
    )

    return {
      itemId: item.item_id,
      productType: 'digital',
      status: 'success',
      provisionedId: licenseId
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
 * Process API product - generate API key and grant access + license
 */
async function processApiProduct(
  orderId: string,
  userId: string,
  item: {
    item_id: string
    product_id: string
    name: string
    license?: string | null
  }
): Promise<FulfillmentResult['details'][0]> {
  try {
    // Idempotency: check if license already exists
    const existingLicense = await query(
      `SELECT id FROM licenses WHERE order_id = $1 AND order_item_id = $2`,
      [orderId, item.item_id]
    )

    if (existingLicense.rows.length > 0) {
      return {
        itemId: item.item_id,
        productType: 'api',
        status: 'success',
        provisionedId: existingLicense.rows[0].id
      }
    }

    // Grant user_product_access with API key if not already granted
    const existingAccess = await query(
      `SELECT id FROM user_product_access WHERE user_id = $1 AND product_id = $2`,
      [userId, item.product_id]
    )

    if (existingAccess.rows.length === 0) {
      const apiKey = `zn_${crypto.randomBytes(24).toString('hex')}`
      await query(
        `INSERT INTO user_product_access (user_id, product_id, order_id, access_type, access_key)
         VALUES ($1, $2, $3, 'api', $4)`,
        [userId, item.product_id, orderId, apiKey]
      )
    }

    // Generate license record in licenses table
    const licenseId = await generateLicenseRecord(
      userId, item.product_id, orderId, item.item_id, item.license
    )

    return {
      itemId: item.item_id,
      productType: 'api',
      status: 'success',
      provisionedId: licenseId
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
       LEFT JOIN order_items oi ON oi."productId" = p.id AND oi."orderId" = $2
       WHERE p.id = $1`,
      [item.product_id, orderId]
    )

    let giftCardId: string | null = null
    let denomination: number | null = null

    if (productResult.rows.length > 0) {
      const productMeta = productResult.rows[0].metadata || {}
      const itemMeta = productResult.rows[0].item_metadata || {}

      giftCardId = itemMeta.gift_card_id || productMeta.gift_card_id
      denomination = itemMeta.denomination || productMeta.denomination
    }

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

    const provisionResult = await provisionGiftCard(
      giftCardId,
      denomination,
      userId,
      orderId
    )

    if (!provisionResult.success) {
      throw new Error(provisionResult.error || 'Gift card provisioning failed')
    }

    // Send delivery email
    try {
      const cardDetails = await query(
        `SELECT
           ugc.*,
           u.email as user_email,
           u.name as user_name,
           gc.brand,
           gc.description as redemption_instructions,
           o."orderNumber" as order_number
         FROM user_gift_cards ugc
         JOIN users u ON ugc.user_id = u.id
         JOIN gift_cards gc ON ugc.gift_card_id = gc.id
         LEFT JOIN orders o ON ugc.order_id = o.id
         WHERE ugc.id = $1`,
        [provisionResult.userGiftCardId]
      )

      if (cardDetails.rows.length > 0) {
        const card = cardDetails.rows[0]
        await sendGiftCardDeliveryEmail({
          customerName: card.user_name || 'Customer',
          email: card.user_email,
          orderNumber: card.order_number || orderId.slice(0, 8).toUpperCase(),
          brand: card.brand,
          denomination: parseFloat(card.denomination),
          code: card.code,
          pin: card.pin,
          expiresAt: card.expires_at ? new Date(card.expires_at) : undefined,
          redemptionInstructions: card.redemption_instructions
        })
      }
    } catch (emailError) {
      console.error('Failed to send gift card delivery email:', emailError)
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
 * Process virtual number order item - provision number via Twilio
 */
async function processVirtualNumberItem(
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
      `SELECT id FROM user_virtual_numbers WHERE order_id = $1 AND user_id = $2`,
      [orderId, userId]
    )

    if (existingResult.rows.length > 0) {
      return {
        itemId: item.item_id,
        productType: 'virtual_number',
        status: 'success',
        provisionedId: existingResult.rows[0].id
      }
    }

    const itemResult = await query(
      `SELECT metadata FROM order_items WHERE id = $1`,
      [item.item_id]
    )

    if (itemResult.rows.length === 0) {
      throw new Error('Order item not found')
    }

    const metadata = itemResult.rows[0].metadata || {}

    const phoneNumber = metadata.phone_number || metadata.phoneNumber
    const countryId = metadata.country_id || metadata.countryId
    const planId = metadata.plan_id || metadata.planId
    const numberType = metadata.number_type || metadata.numberType || 'local'
    const durationDays = metadata.duration_days || metadata.durationDays
    const amountPaid = metadata.amount_paid || metadata.amountPaid || 0
    const minuteTier = metadata.minute_tier || metadata.minuteTier
    const minuteTierPrice = metadata.minute_tier_price || metadata.minuteTierPrice

    if (!phoneNumber || !countryId || !planId) {
      throw new Error('Missing required virtual number metadata (phone_number, country_id, plan_id)')
    }

    const provisionResult = await virtualNumberService.provisionNumber(
      userId,
      countryId,
      planId,
      phoneNumber,
      orderId,
      numberType,
      amountPaid,
      minuteTier,
      minuteTierPrice,
      durationDays
    )

    if (!provisionResult.success) {
      throw new Error(provisionResult.error || 'Virtual number provisioning failed')
    }

    // Send delivery email
    try {
      const numberDetails = await query(
        `SELECT
           uvn.*,
           u.email as user_email,
           u.name as user_name,
           vnp.name as plan_name,
           o."orderNumber" as order_number
         FROM user_virtual_numbers uvn
         JOIN users u ON uvn.user_id = u.id
         JOIN virtual_number_plans vnp ON uvn.plan_id = vnp.id
         LEFT JOIN orders o ON uvn.order_id = o.id
         WHERE uvn.id = $1`,
        [provisionResult.userVirtualNumberId]
      )

      if (numberDetails.rows.length > 0) {
        const number = numberDetails.rows[0]
        await sendVirtualNumberDeliveryEmail({
          customerName: number.user_name || 'Customer',
          email: number.user_email,
          orderNumber: number.order_number || orderId.slice(0, 8).toUpperCase(),
          phoneNumber: number.phone_number,
          phoneNumberDisplay: number.phone_number_display || provisionResult.phoneNumberDisplay || number.phone_number,
          planName: number.plan_name,
          expiresAt: new Date(number.expires_at)
        })
      }
    } catch (emailError) {
      console.error('Failed to send virtual number delivery email:', emailError)
    }

    return {
      itemId: item.item_id,
      productType: 'virtual_number',
      status: 'success',
      provisionedId: provisionResult.userVirtualNumberId
    }
  } catch (error: any) {
    console.error(`Virtual number provisioning failed for item ${item.item_id}:`, error)

    await query(
      `INSERT INTO virtual_number_provision_log (user_id, order_id, status, error_message)
       VALUES ($1, $2, 'failed', $3)
       ON CONFLICT DO NOTHING`,
      [userId, orderId, error.message]
    ).catch(() => {})

    return {
      itemId: item.item_id,
      productType: 'virtual_number',
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
