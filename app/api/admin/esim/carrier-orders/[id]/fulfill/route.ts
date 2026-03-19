import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth-middleware'
import { query } from '@/lib/db'
import { sendEsimDeliveryEmail } from '@/lib/email-service'

/**
 * POST /api/admin/esim/carrier-orders/[id]/fulfill
 * Admin fulfills a carrier eSIM order by uploading QR code / entering SMDP address
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { iccid, smdpAddress, qrCodeData, activationCode, adminNotes } = body

    if (!qrCodeData && !smdpAddress) {
      return NextResponse.json(
        { success: false, error: 'QR code data or SMDP address is required' },
        { status: 400 }
      )
    }

    // Get carrier order
    const orderResult = await query(
      `SELECT ceo.*, cep.carrier_name, cep.plan_name, cep.data_amount_display,
              cep.network_type, cep.country,
              u.email as user_email, u.name as user_name
       FROM carrier_esim_orders ceo
       JOIN carrier_esim_plans cep ON ceo.carrier_plan_id = cep.id
       JOIN users u ON ceo.user_id = u.id
       WHERE ceo.id = $1`,
      [params.id]
    )

    if (orderResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    const order = orderResult.rows[0]

    if (order.status !== 'pending_fulfillment') {
      return NextResponse.json(
        { success: false, error: `Order cannot be fulfilled (status: ${order.status})` },
        { status: 400 }
      )
    }

    // Update carrier order as fulfilled
    await query(
      `UPDATE carrier_esim_orders
       SET status = 'fulfilled', fulfilled_at = NOW(), fulfilled_by = $1,
           iccid = $2, smdp_address = $3, qr_code_data = $4, activation_code = $5,
           admin_notes = $6, updated_at = NOW()
       WHERE id = $7`,
      [user.id, iccid, smdpAddress, qrCodeData, activationCode, adminNotes, params.id]
    )

    // Generate installation instructions
    const installManual = {
      ios: {
        automatic: [
          'Open Settings on your iPhone',
          'Tap Cellular → Add eSIM',
          'Tap "Use QR Code"',
          'Scan the QR code provided',
          'Wait for the eSIM to activate',
        ],
        manual: [
          'Open Settings → Cellular → Add eSIM',
          'Tap "Enter Details Manually"',
          `Enter SM-DP+ Address: ${smdpAddress || 'N/A'}`,
          `Enter Activation Code: ${activationCode || 'N/A'}`,
          'Tap Next and wait for activation',
        ],
      },
      android: {
        automatic: [
          'Open Settings → Network & Internet → SIMs',
          'Tap "+" or "Add SIM"',
          'Choose "Download a SIM instead"',
          'Scan the QR code provided',
          'Wait for the eSIM to activate',
        ],
        manual: [
          'Open Settings → Network & Internet → SIMs',
          'Tap "+" → "Download a SIM"',
          'Tap "Need help?" or "Enter code manually"',
          `Enter code: ${smdpAddress || ''}${iccid ? `$${iccid}` : ''}`,
          'Wait for the eSIM to activate',
        ],
      },
    }

    // Create user_esims record for library display
    const userEsimResult = await query(
      `INSERT INTO user_esims
        (user_id, carrier_plan_id, carrier_order_id, order_id, order_item_id,
         source_type, iccid, smdp_address, qr_code_data, activation_code,
         installation_manual, status, delivery_method, delivered_at)
       VALUES ($1, $2, $3, $4, $5,
               'carrier', $6, $7, $8, $9,
               $10::jsonb, 'active', 'qr', NOW())
       RETURNING id`,
      [
        order.user_id, order.carrier_plan_id, params.id, order.order_id, order.order_item_id,
        iccid, smdpAddress, qrCodeData, activationCode,
        JSON.stringify(installManual),
      ]
    )

    // Send in-app notification
    query(
      `INSERT INTO notifications (id, "userId", type, title, message, metadata)
       VALUES (gen_random_uuid()::text, $1, 'ORDER_CONFIRMED'::"NotificationType",
               'Carrier eSIM Delivered',
               'Your ' || $2 || ' eSIM is ready! Check your library for QR code and setup instructions.',
               $3::jsonb)`,
      [
        order.user_id,
        order.carrier_name,
        JSON.stringify({ orderId: order.order_id, carrierOrderId: params.id, userEsimId: userEsimResult.rows[0].id }),
      ]
    ).catch(err => console.error('Failed to send fulfillment notification:', err))

    // Send delivery email
    try {
      const dataDisplay = order.data_amount_display || 'Data included'
      await sendEsimDeliveryEmail({
        customerName: order.user_name || 'Customer',
        email: order.user_email || order.customer_email,
        orderNumber: order.order_id.slice(0, 8).toUpperCase(),
        planName: `${order.carrier_name} ${order.plan_name}`,
        region: order.country,
        dataAmount: dataDisplay,
        validityDays: 30,
        qrCodeUrl: undefined,
        iccid: iccid || 'N/A',
        smdpAddress,
        matchingId: activationCode,
      })
    } catch (emailError) {
      console.error('Failed to send carrier eSIM delivery email:', emailError)
    }

    return NextResponse.json({
      success: true,
      data: { userEsimId: userEsimResult.rows[0].id },
    })
  } catch (error: any) {
    console.error('Carrier order fulfillment error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
