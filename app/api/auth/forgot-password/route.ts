import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { query } from '@/lib/db'
import { sendEmail } from '@/lib/email-service'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Look up user by email
    const result = await query(
      `SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email.trim()]
    )

    const user = result.rows[0]

    if (user) {
      // Generate reset token
      const resetToken = randomBytes(32).toString('hex')
      const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour

      // Store token in DB
      await query(
        `UPDATE users SET "resetToken" = $1, "resetTokenExpiry" = $2 WHERE id = $3`,
        [resetToken, resetTokenExpiry, user.id]
      )

      // Build reset URL and email
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zenorahq.com'
      const resetUrl = `${siteUrl}/reset-password?token=${resetToken}`

      const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700;">ZENORAR</h1>
              <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Premium Digital Products</p>
            </div>
            <div style="padding: 40px 30px; background: #ffffff;">
              <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0;">Password Reset Request</h2>
              <p style="color: #6b7280; font-size: 16px; line-height: 1.5;">Hi <strong>${user.name}</strong>,</p>
              <p style="color: #6b7280; font-size: 16px; line-height: 1.5;">We received a request to reset your password. Click the button below to set a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Reset Password</a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
              <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour.</p>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">&copy; ${new Date().getFullYear()} Zenorar Marketplace. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `

      // Send via marketplace email service (runs on Vercel — SMTP works here)
      sendEmail(user.email, 'Password Reset Request', html).catch((err) => {
        console.error('[ForgotPassword] Failed to send email:', err)
      })
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    })
  } catch (error) {
    console.error('[ForgotPassword] Error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    )
  }
}
