// Test Email API
// POST: Send a test email using the active provider — with detailed error reporting

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthenticatedUser } from '@/lib/auth-middleware'
import { getActiveEmailProvider } from '@/lib/db-helpers'
import nodemailer from 'nodemailer'

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

    // 1. Check if there's an active provider
    const provider = await getActiveEmailProvider()
    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'No active email provider configured. Please enable SMTP, Resend, or SendGrid first.' },
        { status: 400 }
      )
    }

    // 2. Validate provider config
    const config = provider.config
    if (provider.provider === 'smtp') {
      if (!config.host) return NextResponse.json({ success: false, error: 'SMTP host is missing in config' }, { status: 400 })
      if (!config.port) return NextResponse.json({ success: false, error: 'SMTP port is missing in config' }, { status: 400 })
      if (!config.user) return NextResponse.json({ success: false, error: 'SMTP username is missing in config' }, { status: 400 })
      if (!config.password) return NextResponse.json({ success: false, error: 'SMTP password is missing in config' }, { status: 400 })
      if (!config.from) return NextResponse.json({ success: false, error: 'SMTP "from" address is missing in config' }, { status: 400 })

      // 3. Attempt SMTP connection and send — with detailed error
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: parseInt(config.port),
        secure: config.secure === true || config.secure === 'true',
        auth: {
          user: config.user,
          pass: config.password,
        },
        tls: { rejectUnauthorized: false },
      })

      // Verify SMTP connection first
      try {
        await transporter.verify()
      } catch (verifyError: any) {
        console.error('SMTP verification failed:', verifyError)
        return NextResponse.json(
          {
            success: false,
            error: `SMTP connection failed: ${verifyError.message}. Check host, port, username, and password.`,
          },
          { status: 500 }
        )
      }

      // Send the test email
      await transporter.sendMail({
        from: config.from,
        to: testEmail,
        subject: 'Zenorar Test Email - SMTP Configuration Working',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">SMTP Configuration Working!</h1>
            <p>This is a test email from your Zenorar marketplace admin panel.</p>
            <p>Your SMTP settings are correctly configured:</p>
            <ul>
              <li><strong>Host:</strong> ${config.host}</li>
              <li><strong>Port:</strong> ${config.port}</li>
              <li><strong>From:</strong> ${config.from}</li>
            </ul>
            <p style="color: #10b981; font-weight: bold;">Email delivery is working correctly.</p>
          </div>
        `,
      })

      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
      })
    } else {
      // For Resend/SendGrid, use the generic email service
      const { sendOrderConfirmationEmail } = await import('@/lib/email-service')
      const sent = await sendOrderConfirmationEmail({
        orderNumber: 'ZEN-TEST-12345',
        customerName: 'Test User',
        email: testEmail,
        items: [
          { name: 'Sample Product 1', quantity: 2, price: 29.99 },
          { name: 'Sample Product 2', quantity: 1, price: 49.99 },
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
          country: 'US',
        },
      })

      if (sent) {
        return NextResponse.json({
          success: true,
          message: `Test email sent successfully to ${testEmail}`,
        })
      } else {
        return NextResponse.json(
          { success: false, error: `Failed to send via ${provider.provider}. Check API key and from address.` },
          { status: 500 }
        )
      }
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
