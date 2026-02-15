import { NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { query } from '@/lib/db'

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
    const productId = params.id

    // Verify product exists and user previously purchased it
    const productCheck = await query(
      `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.price,
        COUNT(oi.id) as purchase_count
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o."userId" = $1 AND o.payment_status = 'PAID'
      WHERE p.id = $2
      GROUP BY p.id, p.name, p.slug, p.price
      `,
      [userId, productId]
    )

    if (productCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const product = productCheck.rows[0]

    // Check if user has an active cart
    let cartResult = await query(
      `
      SELECT id FROM carts WHERE user_id = $1 LIMIT 1
      `,
      [userId]
    )

    let cartId
    if (cartResult.rows.length === 0) {
      // Create new cart
      const newCart = await query(
        `
        INSERT INTO carts (user_id, session_id)
        VALUES ($1, $2)
        RETURNING id
        `,
        [userId, `user_${userId}_${Date.now()}`]
      )
      cartId = newCart.rows[0].id
    } else {
      cartId = cartResult.rows[0].id
    }

    // Check if product is already in cart
    const existingItem = await query(
      `
      SELECT id, quantity FROM cart_items
      WHERE cart_id = $1 AND product_id = $2
      `,
      [cartId, productId]
    )

    if (existingItem.rows.length > 0) {
      // Product already in cart
      return NextResponse.json({
        success: true,
        data: {
          message: 'Product already in cart',
          cartId: cartId,
          redirectUrl: '/cart',
          isRenewal: true,
        },
      })
    }

    // Add product to cart for renewal
    await query(
      `
      INSERT INTO cart_items (cart_id, product_id, quantity, price)
      VALUES ($1, $2, 1, $3)
      `,
      [cartId, productId, product.price]
    )

    // Mark as renewal in user_product_access (optional metadata)
    await query(
      `
      UPDATE user_product_access
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{renewal_requested}',
        'true'::jsonb
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND product_id = $2
      `,
      [userId, productId]
    )

    return NextResponse.json({
      success: true,
      data: {
        message: 'Product added to cart for renewal',
        productName: product.name,
        cartId: cartId,
        redirectUrl: '/cart',
        isRenewal: true,
      },
    })
  } catch (error: any) {
    console.error('Renewal error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process renewal',
      },
      { status: 500 }
    )
  }
}
