import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth-utils'

/**
 * Get or create a product by type
 */
async function getOrCreateProduct(productType: string, productId?: string): Promise<string> {
  // If productId is provided, try to use it
  if (productId && !productId.startsWith('gc-') && !productId.startsWith('vn-')) {
    const existing = await query(`SELECT id FROM products WHERE id = $1`, [productId])
    if (existing.rows.length > 0) {
      return existing.rows[0].id
    }
  }

  // Fallback to creating/getting a generic product for this type
  const config: Record<string, { slug: string; name: string; description: string }> = {
    virtual_number: {
      slug: 'virtual-number',
      name: 'Virtual Number',
      description: 'Virtual phone number rental service'
    },
    gift_card: {
      slug: 'gift-card-service',
      name: 'Gift Card',
      description: 'Digital gift card delivery service'
    },
    esim: {
      slug: 'esim-service',
      name: 'eSIM',
      description: 'Digital eSIM service'
    },
    default: {
      slug: 'digital-product',
      name: 'Digital Product',
      description: 'Digital product'
    }
  }

  const productConfig = config[productType] || config.default

  const existing = await query(
    `SELECT id FROM products WHERE slug = $1`,
    [productConfig.slug]
  )

  if (existing.rows.length > 0) {
    return existing.rows[0].id
  }

  const result = await query(
    `INSERT INTO products (
       id, name, slug, description, price, stock, status,
       "is_digital", product_type, "createdAt", "updatedAt"
     ) VALUES (
       gen_random_uuid()::text, $1, $2, $3, 0, 999999, 'ACTIVE', true, $4, NOW(), NOW()
     )
     ON CONFLICT (slug) DO UPDATE SET "updatedAt" = NOW()
     RETURNING id`,
    [productConfig.name, productConfig.slug, productConfig.description, productType]
  )

  return result.rows[0].id
}

/**
 * POST /api/orders/create
 * Creates an order for all payment methods (Stripe, Paystack, Crypto, PayPal)
 * Does NOT process payment - returns order info for payment processing
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      items,
      total,
      subtotal,
      paymentMethod,
      shippingData,
      discountCode,
      discountAmount,
      sessionId
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items provided' },
        { status: 400 }
      )
    }

    // Try to get authenticated user (optional for checkout)
    let userId: string | null = null
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const payload = verifyAccessToken(token)
      if (payload) {
        userId = payload.userId
      }
    }

    // Calculate total from items
    const calculatedTotal = items.reduce((sum: number, item: any) => {
      return sum + ((item.price || 0) * (item.quantity || 1))
    }, 0)

    const finalTotal = total || calculatedTotal
    const finalSubtotal = subtotal || calculatedTotal

    // Get email from user or shipping data
    let email = shippingData?.email || 'guest@zenorar.com'
    if (userId) {
      const userResult = await query(`SELECT email FROM users WHERE id = $1`, [userId])
      if (userResult.rows.length > 0) {
        email = userResult.rows[0].email
      }
    }

    // Generate order number
    const orderNumber = `ZN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    // Map payment method to enum value
    const paymentMethodMap: Record<string, string> = {
      'stripe': 'STRIPE',
      'paystack': 'PAYSTACK',
      'paypal': 'PAYPAL',
      'manual-crypto': 'CRYPTO',
      'crypto': 'CRYPTO',
      'wallet': 'WALLET',
      'wallet_credits': 'WALLET',
    }
    const dbPaymentMethod = paymentMethodMap[paymentMethod] || 'OTHER'

    // Create order
    const orderResult = await query(
      `INSERT INTO orders (
         id, "orderNumber", "userId", status, subtotal, total, email,
         "paymentMethod", "paymentStatus", "discountCode", "discountAmount",
         "createdAt", "updatedAt"
       ) VALUES (
         gen_random_uuid()::text, $1, $2, 'PENDING', $3, $4, $5,
         $6, 'PENDING', $7, $8, NOW(), NOW()
       ) RETURNING id, "orderNumber"`,
      [
        orderNumber,
        userId,
        finalSubtotal,
        finalTotal,
        email,
        dbPaymentMethod,
        discountCode || null,
        discountAmount || 0
      ]
    )

    const orderId = orderResult.rows[0].id
    const finalOrderNumber = orderResult.rows[0].orderNumber

    // Create order items
    for (const item of items) {
      const itemQuantity = item.quantity || 1
      const itemPrice = item.price || 0
      const itemTotal = itemPrice * itemQuantity
      const productType = item.productType || item.metadata?.productType || 'default'

      // Get product ID
      const productId = await getOrCreateProduct(productType, item.productId || item.id)

      // Build metadata based on product type
      let metadata: Record<string, any> = {
        ...item.metadata,
        originalProductId: item.productId || item.id,
        license: item.license,
      }

      // Normalize gift card metadata for fulfillment
      if (productType === 'gift_card') {
        // Round denomination to 2 decimal places to avoid floating point issues
        const rawDenom = item.metadata?.denomination || itemPrice
        const cleanDenom = Math.round(Number(rawDenom) * 100) / 100
        metadata = {
          ...metadata,
          gift_card_id: item.metadata?.gift_card_id || item.metadata?.giftCardId || item.productId || item.id,
          denomination: cleanDenom,
          brand: item.metadata?.brand,
          imageUrl: item.metadata?.imageUrl,
        }
      } else if (productType === 'esim') {
        metadata = {
          ...metadata,
          esim_plan_id: item.metadata?.esim_plan_id || item.productId || item.id,
          countryIsoCode: item.metadata?.countryIsoCode,
        }
      }

      // Determine proper item name
      let itemName = item.name || 'Product'
      if (productType === 'gift_card') {
        const brand = item.metadata?.brand || 'Gift Card'
        const rawDenom = item.metadata?.denomination || itemPrice
        const cleanDenom = Math.round(Number(rawDenom) * 100) / 100
        itemName = `${brand} Gift Card ($${cleanDenom})`
      }

      await query(
        `INSERT INTO order_items (
           id, "orderId", "productId", name, quantity, price, total, license, metadata, product_type
         ) VALUES (
           gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9
         )`,
        [
          orderId,
          productId,
          itemName,
          itemQuantity,
          itemPrice,
          itemTotal,
          productType === 'gift_card' ? null : (item.license || 'standard'),
          JSON.stringify(metadata),
          productType
        ]
      )
    }

    // Store session ID if provided (for guest tracking)
    if (sessionId && !userId) {
      await query(
        `UPDATE orders SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{sessionId}', $1::jsonb) WHERE id = $2`,
        [JSON.stringify(sessionId), orderId]
      ).catch(() => {}) // Ignore if metadata column doesn't exist
    }

    return NextResponse.json({
      success: true,
      data: {
        id: orderId,
        orderNumber: finalOrderNumber,
        total: finalTotal,
        subtotal: finalSubtotal,
        email,
        paymentMethod: dbPaymentMethod,
      }
    })

  } catch (error: any) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create order' },
      { status: 500 }
    )
  }
}
