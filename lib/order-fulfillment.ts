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
import { zenditTopupProvider } from './phone-refills/provider'
import {
  sendEsimDeliveryEmail,
  sendVirtualNumberDeliveryEmail,
  sendGiftCardDeliveryEmail
} from './email-service'
import {
  getProviderPricing,
  createCardRecord,
  recordTransaction,
  calculateInstantCardPrice
} from './cards/service'
import { getProvider } from './cards/providers'
import type { CardProvider, CardType, CardBrand } from './cards/types'
import { isTestModeEnabled } from './test-mode'

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
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::"LicenseType", $7, $8::jsonb, $9, true, 'ACTIVE'::"LicenseStatus", 0)
     RETURNING id`,
    [userId, productId, orderId, orderItemId, licenseKey, cfg.type, cfg.domains, JSON.stringify([]), supportExpiry]
  )

  // Upsert user_product_access with license key and type (avoids unique constraint
  // violation when a previous failed attempt already inserted a row for this user+product)
  await query(
    `INSERT INTO user_product_access (user_id, product_id, order_id, access_type, access_key)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, product_id, access_type) DO UPDATE SET access_key = EXCLUDED.access_key`,
    [userId, productId, orderId, `license_${cfg.type.toLowerCase()}`, licenseKey]
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
    // Use COALESCE to prefer order_items.product_type (for dynamic products) over products.product_type
    const itemsResult = await query(
      `SELECT
         oi.id as item_id,
         oi."productId" as product_id,
         oi.name,
         oi.quantity,
         oi.license,
         COALESCE(oi.product_type, p.product_type) as product_type,
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

    // Tag order_items with test_mode if sandbox is active (for cleanup)
    const isTest = await isTestModeEnabled()
    if (isTest) {
      await query(
        `UPDATE order_items SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"test_mode":"true"}'::jsonb WHERE "orderId" = $1`,
        [orderId]
      )
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

      case 'instant_card':
      case 'virtual_card':
        // Provision card for cart checkout (instant checkout handles this via /api/cards/purchase)
        return await processCardItem(orderId, userId, item, productType === 'virtual_card' ? 'virtual' : 'instant')

      case 'phone_refill':
        return await processPhoneRefillItem(orderId, userId, item)

      case 'carrier_esim':
        return await processCarrierEsimItem(orderId, userId, item)

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

    // Look up the eSIM plan from order item metadata
    const orderItemResult = await query(
      `SELECT metadata FROM order_items
       WHERE "orderId" = $1 AND "productId" = $2`,
      [orderId, item.product_id]
    )

    let planId: string

    if (orderItemResult.rows.length > 0 && orderItemResult.rows[0].metadata?.esim_plan_id) {
      planId = orderItemResult.rows[0].metadata.esim_plan_id
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

    let provisionResult: any

    // In sandbox mode, create mock eSIM directly (no real provider call)
    const testMode = await isTestModeEnabled()
    if (testMode) {
      const testIccid = `8901${Math.floor(10000000000000 + Math.random() * 90000000000000)}`
      const testQrCode = `LPA:1$test.smdp.example.com$TEST${Date.now()}`
      const mockResult = await query(
        `INSERT INTO user_esims (user_id, plan_id, order_id, order_item_id, source_type, iccid, smdp_address, qr_code_data, activation_code, status, delivery_method, delivered_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'test', $5, 'test.smdp.example.com', $6, $7, 'active', 'qr', NOW(), NOW(), NOW()) RETURNING id`,
        [userId, planId, orderId, item.item_id, testIccid, testQrCode, `TEST-${testIccid.slice(-8)}`]
      )
      provisionResult = { success: true, userEsimId: mockResult.rows[0].id }
    } else {
      provisionResult = await esimProvisioningService.provisionEsim(
        userId,
        planId,
        orderId,
        item.item_id
      )
    }

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
      `INSERT INTO esim_provision_log (order_id, order_item_id, user_id, plan_id, status, attempt_type, error_message)
       VALUES ($1, $2, $3, $4, 'failed', 'api', $5)
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
 * Process virtual card order item - provision card via provider
 */
async function processCardItem(
  orderId: string,
  userId: string,
  item: {
    item_id: string
    product_id: string
    name: string
    price?: number
    metadata?: any
  },
  cardType: CardType
): Promise<FulfillmentResult['details'][0]> {
  try {
    // Idempotency: check if card already exists for this order
    const existingResult = await query(
      `SELECT id FROM user_cards WHERE metadata->>'orderId' = $1`,
      [orderId]
    )

    if (existingResult.rows.length > 0) {
      return {
        itemId: item.item_id,
        productType: cardType,
        status: 'success',
        provisionedId: existingResult.rows[0].id
      }
    }

    // Get metadata from order item
    const orderItemResult = await query(
      `SELECT metadata, price FROM order_items WHERE id = $1`,
      [item.item_id]
    )

    const metadata = orderItemResult.rows[0]?.metadata || item.metadata || {}
    const price = orderItemResult.rows[0]?.price || item.price || 0

    // Determine card details from metadata
    const providerName: CardProvider = metadata.provider || 'reloadly'
    const cardBrand: CardBrand = metadata.cardBrand || 'visa'
    const denomination = cardType === 'instant' ? (metadata.denomination || price) : undefined
    const isPremium = metadata.isPremium || providerName === 'lithic'

    let result: any
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + (cardType === 'instant' ? 1 : 3))

    // Get provider pricing (needed for cost calculation below)
    const pricing = await getProviderPricing(providerName).catch(() => null)

    // In sandbox mode, use mock card data
    const testMode = await isTestModeEnabled()
    if (testMode) {
      result = {
        success: true,
        cardId: `TEST-${Date.now()}`,
        cardNumber: '4111111111111111',
        cvv: '123',
        expiry: `12/${new Date().getFullYear() + 3}`,
        lastFour: '1111',
        balance: cardType === 'virtual' ? (denomination || 0) : 0,
      }
    } else {
      if (!pricing || !pricing.isEnabled) {
        throw new Error('Card provider is not available')
      }

      // Get provider implementation
      const provider = getProvider(providerName)
      if (!provider) {
        throw new Error(`Provider ${providerName} not found`)
      }

      // Create the card with the provider
      result = await provider.createCard({
        userId,
        currency: 'USD',
        denomination,
        cardBrand
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to create card')
      }
    }

    // Save card to database
    const card = await createCardRecord(
      userId,
      testMode ? 'test' as CardProvider : providerName,
      result.cardId || null,
      cardType,
      cardBrand,
      result.lastFour || '',
      result.cardNumber || null,
      result.cvv || null,
      result.expiry || '',
      result.balance || 0,
      cardType === 'instant' ? denomination ?? null : null,
      isPremium,
      expiresAt,
      { nickname: metadata.nickname, orderId }
    )

    // Record the creation transaction
    const totalCost = cardType === 'instant'
      ? calculateInstantCardPrice(denomination!, pricing?.instantMarkupPercent || 0)
      : (pricing?.creationFee || 0)

    await recordTransaction(
      card.id,
      userId,
      testMode ? 'test' as CardProvider : providerName,
      'creation',
      totalCost,
      cardType === 'virtual' ? (pricing?.creationFee || 0) : 0,
      result.cardId,
      undefined,
      undefined,
      `Created ${cardType} card via checkout`
    )

    // Send card delivery notification
    const brandDisplay = cardBrand === 'mastercard' ? 'Mastercard' : 'Visa'
    const valueDisplay = denomination ? `$${denomination}` : 'Virtual Card'

    await query(
      `INSERT INTO notifications (id, "userId", type, title, message, metadata)
       VALUES (gen_random_uuid()::text, $1, 'ORDER_CONFIRMED'::"NotificationType",
               'Card Delivered',
               $2,
               $3::jsonb)`,
      [userId, `Your ${brandDisplay} ${valueDisplay} is ready!`, JSON.stringify({ orderId, cardId: card.id })]
    ).catch(err => console.error('Failed to send card notification:', err))

    return {
      itemId: item.item_id,
      productType: cardType,
      status: 'success',
      provisionedId: card.id
    }
  } catch (error: any) {
    console.error(`Card provisioning failed for item ${item.item_id}:`, error)

    return {
      itemId: item.item_id,
      productType: cardType,
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

    // Get gift card details from order item metadata
    // Use item_id for precise lookup (productId may be shared across gift card items)
    const orderItemResult = await query(
      `SELECT metadata FROM order_items WHERE id = $1`,
      [item.item_id]
    )

    let giftCardId: string | null = null
    let denomination: number | null = null
    let reservedCodeId: string | undefined

    if (orderItemResult.rows.length > 0) {
      const itemMeta = orderItemResult.rows[0].metadata || {}

      giftCardId = itemMeta.gift_card_id
      denomination = itemMeta.denomination
      reservedCodeId = itemMeta.reservedCodeId || undefined
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

    console.log('[OrderFulfillment] Calling provisionGiftCard:', {
      giftCardId,
      denomination,
      userId,
      orderId,
      reservedCodeId
    })

    let provisionResult: any

    // In sandbox mode, create mock gift card directly (no real provider call)
    const testMode = await isTestModeEnabled()
    if (testMode) {
      const testCode = `TEST-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
      const testPin = Math.floor(1000 + Math.random() * 9000).toString()
      const gcResult = await query(
        `SELECT brand, category, image_url FROM gift_cards WHERE id = $1`, [giftCardId]
      )
      const gc = gcResult.rows[0] || {}
      const mockResult = await query(
        `INSERT INTO user_gift_cards (user_id, gift_card_id, order_id, brand, category, image_url, denomination, code, pin, status, source, delivered_at, created_at)
         VALUES ($1, $2, $3::uuid, $4, $5, $6, $7, $8, $9, 'delivered', 'test', NOW(), NOW()) RETURNING id`,
        [userId, giftCardId, orderId, gc.brand || 'Test Brand', gc.category || 'Test', gc.image_url || null, denomination, testCode, testPin]
      )
      provisionResult = { success: true, userGiftCardId: mockResult.rows[0].id }
    } else {
      provisionResult = await provisionGiftCard(
        giftCardId,
        denomination,
        userId,
        orderId,
        reservedCodeId
      )
    }

    console.log('[OrderFulfillment] provisionGiftCard result:', {
      success: provisionResult.success,
      userGiftCardId: provisionResult.userGiftCardId,
      error: provisionResult.error
    })

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
 * Process phone refill order item - deliver mobile top-up via Zendit
 */
async function processPhoneRefillItem(
  orderId: string,
  userId: string,
  item: { item_id: string; product_id: string; name: string; quantity: number }
): Promise<FulfillmentResult['details'][0]> {
  try {
    // Read metadata from order_items
    const orderItemResult = await query(
      `SELECT metadata FROM order_items WHERE id = $1`,
      [item.item_id]
    )

    const metadata = orderItemResult.rows[0]?.metadata || {}

    // Idempotency: already fulfilled if transaction ID is recorded
    if (metadata.zendit_transaction_id) {
      return {
        itemId: item.item_id,
        productType: 'phone_refill',
        status: 'success',
        provisionedId: metadata.zendit_transaction_id
      }
    }

    const { offerId, recipientPhone, value } = metadata

    if (!offerId || !recipientPhone) {
      throw new Error('Missing offerId or recipientPhone in order metadata')
    }

    const result = await zenditTopupProvider.purchase({ offerId, recipientPhone, value })

    if (!result.success) {
      throw new Error(result.error || 'Zendit topup failed')
    }

    // Record transaction ID for idempotency
    await query(
      `UPDATE order_items SET metadata = metadata || $1 WHERE id = $2`,
      [JSON.stringify({ zendit_transaction_id: result.transactionId }), item.item_id]
    )

    return {
      itemId: item.item_id,
      productType: 'phone_refill',
      status: 'success',
      provisionedId: result.transactionId
    }
  } catch (error: any) {
    console.error('processPhoneRefillItem error:', error)
    return {
      itemId: item.item_id,
      productType: 'phone_refill',
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

    // Log metadata for debugging
    console.log('Virtual number metadata:', JSON.stringify(metadata, null, 2))

    const phoneNumber = metadata.phone_number || metadata.phoneNumber
    const countryId = metadata.country_id || metadata.countryId
    const planId = metadata.plan_id || metadata.planId || metadata.planCategory
    const numberType = metadata.number_type || metadata.numberType || 'local'
    const durationDays = metadata.duration_days || metadata.durationDays
    const amountPaid = metadata.amount_paid || metadata.amountPaid || 0
    const minuteTier = metadata.minute_tier || metadata.minuteTier
    const minuteTierPrice = metadata.minute_tier_price || metadata.minuteTierPrice
    const smsLimit = metadata.sms_limit || metadata.smsLimit
    const minuteIncluded = metadata.minute_included || metadata.minuteIncluded

    console.log('Extracted values:', { phoneNumber, countryId, planId, numberType, durationDays })

    if (!phoneNumber || !countryId || !planId) {
      throw new Error(`Missing required virtual number metadata: phone=${phoneNumber}, country=${countryId}, plan=${planId}`)
    }

    // Validate countryId exists in database
    const countryCheck = await query(
      `SELECT id FROM virtual_number_countries WHERE id = $1`,
      [countryId]
    )
    if (countryCheck.rows.length === 0) {
      throw new Error(`Invalid country ID: ${countryId}`)
    }

    let provisionResult: any

    // In sandbox mode, create mock record directly (no real provider call)
    const testMode = await isTestModeEnabled()
    if (testMode || metadata.test_mode === 'true') {
      const mockResult = await query(
        `INSERT INTO user_virtual_numbers (
           user_id, phone_number, phone_number_display, number_type, provider,
           country_id, status, plan_id, plan_category, plan_duration_days, sms_limit,
           expires_at, order_id, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, 'test',
           $5, 'active', $6, $6, $7, $8,
           NOW() + INTERVAL '1 day' * $7, $9, NOW(), NOW()
         ) RETURNING id, phone_number_display`,
        [userId, phoneNumber, phoneNumber, numberType, countryId, planId, durationDays || 30, smsLimit || 500, orderId]
      )
      provisionResult = {
        success: true,
        userVirtualNumberId: mockResult.rows[0].id,
        phoneNumberDisplay: mockResult.rows[0].phone_number_display
      }
    } else {
      provisionResult = await virtualNumberService.provisionNumber(
        userId,
        countryId,
        planId,
        phoneNumber,
        orderId,
        numberType,
        amountPaid,
        minuteTier,
        minuteTierPrice,
        durationDays,
        smsLimit,
        minuteIncluded
      )
    }

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
           COALESCE(vnp.name, INITCAP(uvn.plan_category) || ' Plan') as plan_name,
           o."orderNumber" as order_number
         FROM user_virtual_numbers uvn
         JOIN users u ON uvn.user_id = u.id
         LEFT JOIN virtual_number_plans vnp ON uvn.plan_id::text = vnp.id::text
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
 * Process carrier eSIM order item — creates a pending fulfillment record for admin to fulfill manually
 */
async function processCarrierEsimItem(
  orderId: string,
  userId: string,
  item: {
    item_id: string
    product_id: string
    name: string
  }
): Promise<FulfillmentResult['details'][0]> {
  try {
    // Idempotency: check if carrier order already exists
    const existing = await query(
      `SELECT id FROM carrier_esim_orders WHERE order_id = $1 AND order_item_id = $2`,
      [orderId, item.item_id]
    )

    if (existing.rows.length > 0) {
      return {
        itemId: item.item_id,
        productType: 'carrier_esim',
        status: 'success',
        provisionedId: existing.rows[0].id,
      }
    }

    // Get metadata from order item
    const orderItemResult = await query(
      `SELECT metadata FROM order_items WHERE id = $1`,
      [item.item_id]
    )

    const metadata = orderItemResult.rows[0]?.metadata || {}

    // Insert carrier eSIM order with 24h fulfillment deadline
    const insertResult = await query(
      `INSERT INTO carrier_esim_orders
        (user_id, order_id, order_item_id, carrier_plan_id, status,
         customer_name, customer_email, customer_phone,
         device_imei, device_eid, device_model,
         billing_address, special_instructions,
         fulfillment_deadline)
       VALUES ($1, $2, $3, $4::uuid, 'pending_fulfillment',
               $5, $6, $7, $8, $9, $10, $11::jsonb, $12,
               NOW() + INTERVAL '24 hours')
       RETURNING id`,
      [
        userId, orderId, item.item_id, metadata.carrier_plan_id,
        metadata.customer_name, metadata.customer_email, metadata.customer_phone,
        metadata.device_imei, metadata.device_eid, metadata.device_model,
        JSON.stringify(metadata.billing_address || {}), metadata.special_instructions,
      ]
    )

    // Send in-app notification
    query(
      `INSERT INTO notifications (id, "userId", type, title, message, metadata)
       VALUES (gen_random_uuid()::text, $1, 'ORDER_CONFIRMED'::"NotificationType",
               'Carrier eSIM Order Received',
               'Your carrier eSIM order is being prepared. We''ll deliver it within 24 hours.',
               $2::jsonb)`,
      [userId, JSON.stringify({ orderId, carrierOrderId: insertResult.rows[0].id })]
    ).catch(err => console.error('Failed to send carrier eSIM notification:', err))

    return {
      itemId: item.item_id,
      productType: 'carrier_esim',
      status: 'success',
      provisionedId: insertResult.rows[0].id,
    }
  } catch (error: any) {
    console.error(`Carrier eSIM order creation failed for item ${item.item_id}:`, error)
    return {
      itemId: item.item_id,
      productType: 'carrier_esim',
      status: 'failed',
      error: error.message,
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
