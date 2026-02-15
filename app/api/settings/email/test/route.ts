// Test Email API
// POST: Send a test email using the active provider

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthenticatedUser } from '@/lib/auth-middleware'
import { sendOrderConfirmationEmail } from '@/lib/email-service'

// POST /api/settings/email/test - Send test email
export const POST = requireAdmin(async (req: NextRequest, user: AuthenticatedUser) => {
  try {
    const body = await req.json()
    const { testEmail } = body

    // Validate email
    if (!testEmail || typeof testEmail !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Test email address is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Send test order confirmation email
    const sent = await sendOrderConfirmationEmail({
      orderNumber: 'ZEN-TEST-12345',
      customerName: 'Test User',
      email: testEmail,
      items: [
        { name: 'Sample Product 1', quantity: 2, price: 29.99 },
        { name: 'Sample Product 2', quantity: 1, price: 49.99 }
      ],
      subtotal: 109.97,
      shipping: 5.00,
      tax: 9.20,
      total: 124.17,
      shippingAddress: {
        address1: '123 Test Street',
        city: 'Test City',
        state: 'TC',
        postalCode: '12345',
        country: 'US'
      }
    })

    if (sent) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send test email. Check email provider configuration and console logs.',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test email',
      },
      { status: 500 }
    )
  }
})
