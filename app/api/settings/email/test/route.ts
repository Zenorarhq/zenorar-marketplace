// Test Email API
// POST: Send a test email using the active provider — with template preview support

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthenticatedUser } from '@/lib/auth-middleware'
import { getActiveEmailProvider } from '@/lib/db-helpers'
import nodemailer from 'nodemailer'

// Available test templates
const TEMPLATE_TYPES = [
  'basic',
  'order-confirmation',
  'order-shipped',
  'order-cancelled',
  'welcome',
  'password-reset',
  'deposit-success',
  'wallet-credit',
  'wallet-frozen',
  'referral-reward',
  'welcome-bonus',
  'esim-delivery',
  'virtual-number',
  'gift-card',
] as const

type TemplateType = (typeof TEMPLATE_TYPES)[number]

// Generate test email HTML for a given template type
function getTestTemplate(templateType: TemplateType, config: Record<string, any>): { subject: string; html: string } {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zenorahq.com'
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@zenorahq.com'

  // Shared branded wrapper
  function wrap(title: string, content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 32px; font-weight: 700;">ZENORAR</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Premium Digital Products</p>
          </div>
          <div style="padding: 40px 30px; background: #ffffff;">
            ${content}
          </div>
          <div style="padding: 30px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
              Questions? Contact us at
              <a href="mailto:${supportEmail}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${supportEmail}</a>
            </p>
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Zenorar Marketplace. All rights reserved.
            </p>
            <p style="margin: 10px 0 0 0; color: #d1d5db; font-size: 11px; font-style: italic;">
              This is a test email — template preview: "${templateType}"
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  switch (templateType) {
    case 'order-confirmation':
      return {
        subject: 'Order Confirmation - #ZEN-TEST-12345',
        html: wrap('Order Confirmation', `
          <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 10px 0;">Order Confirmation</h2>
          <p style="font-size: 28px; font-weight: bold; color: #2563eb; margin: 0 0 20px 0;">Order #ZEN-TEST-12345</p>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.5;">
            Thank you for your purchase, <strong>Test User</strong>! Your order has been successfully processed.
          </p>

          <h3 style="border-bottom: 3px solid #e5e7eb; padding-bottom: 12px; color: #1f2937; font-size: 18px; margin: 30px 0 15px 0;">Items Ordered</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Product</th>
                <th style="padding: 12px; text-align: center; font-size: 12px; color: #6b7280; text-transform: uppercase;">Qty</th>
                <th style="padding: 12px; text-align: right; font-size: 12px; color: #6b7280; text-transform: uppercase;">Price</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 15px 12px; color: #1f2937; font-size: 14px;">Premium Script Bundle</td>
                <td style="padding: 15px 12px; text-align: center; color: #6b7280;">&times;2</td>
                <td style="padding: 15px 12px; text-align: right; color: #1f2937; font-weight: 600;">$59.98</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 15px 12px; color: #1f2937; font-size: 14px;">eSIM Data Plan - Europe 10GB</td>
                <td style="padding: 15px 12px; text-align: center; color: #6b7280;">&times;1</td>
                <td style="padding: 15px 12px; text-align: right; color: #1f2937; font-weight: 600;">$49.99</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
            <table style="width: 100%;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Subtotal:</td><td style="text-align: right; color: #1f2937; font-weight: 500;">$109.97</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Shipping:</td><td style="text-align: right; color: #1f2937; font-weight: 500;">$0.00</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Tax:</td><td style="text-align: right; color: #1f2937; font-weight: 500; border-bottom: 1px solid #e5e7eb;">$9.20</td></tr>
              <tr><td style="padding: 15px 0 8px; color: #1f2937; font-weight: 700; font-size: 18px;">Total:</td><td style="padding: 15px 0 8px; text-align: right; color: #2563eb; font-weight: 700; font-size: 22px;">$119.17</td></tr>
            </table>
          </div>
          <div style="margin-top: 40px; text-align: center;">
            <a href="${siteUrl}/profile/orders" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Order Details</a>
          </div>
        `),
      }

    case 'order-shipped':
      return {
        subject: 'Your Order Has Shipped - #ZEN-TEST-12345',
        html: wrap('Order Shipped', `
          <h2 style="color: #10b981; font-size: 24px; margin: 0 0 20px 0;">Your Order Has Shipped!</h2>
          <p style="color: #6b7280; font-size: 16px;">Hi <strong>Test User</strong>,</p>
          <p style="color: #6b7280; font-size: 16px;">Great news! Your order <strong>#ZEN-TEST-12345</strong> has been shipped and is on its way to you.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #166534;"><strong>Tracking Number:</strong> 1Z999AA10123456784</p>
          </div>
          <div style="margin-top: 40px; text-align: center;">
            <a href="${siteUrl}/profile/orders" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Track Order</a>
          </div>
        `),
      }

    case 'order-cancelled':
      return {
        subject: 'Order Cancelled - #ZEN-TEST-12345',
        html: wrap('Order Cancelled', `
          <h2 style="color: #dc2626; font-size: 24px; margin: 0 0 20px 0;">Order Cancelled</h2>
          <p style="color: #6b7280; font-size: 16px;">Hi <strong>Test User</strong>,</p>
          <p style="color: #6b7280; font-size: 16px;">Your order <strong>#ZEN-TEST-12345</strong> has been cancelled.</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p style="margin: 0; color: #991b1b;"><strong>Cancellation Reason:</strong></p>
            <p style="margin: 10px 0 0 0; color: #1f2937;">Item out of stock — full refund has been processed.</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact our support team.</p>
        `),
      }

    case 'welcome':
      return {
        subject: 'Welcome to Zenorar!',
        html: wrap('Welcome', `
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2563eb; font-size: 28px; margin: 0;">Welcome to Zenorar!</h2>
          </div>
          <p style="color: #6b7280; font-size: 16px;">Hi <strong>Test User</strong>,</p>
          <p style="color: #6b7280; font-size: 16px;">Thank you for creating an account with us. We're excited to have you as part of our community!</p>
          <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="color: #1f2937; font-weight: 600; margin: 0 0 15px 0;">With your account, you can:</p>
            <div style="padding: 10px; background: white; border-radius: 8px; margin-bottom: 8px;">📦 Track your orders</div>
            <div style="padding: 10px; background: white; border-radius: 8px; margin-bottom: 8px;">❤️ Save items to your wishlist</div>
            <div style="padding: 10px; background: white; border-radius: 8px; margin-bottom: 8px;">⚡ Enjoy a faster checkout experience</div>
            <div style="padding: 10px; background: white; border-radius: 8px;">💰 Refer friends and earn rewards</div>
          </div>
          <div style="margin-top: 40px; text-align: center;">
            <a href="${siteUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Start Shopping</a>
          </div>
        `),
      }

    case 'password-reset':
      return {
        subject: 'Password Reset Request',
        html: wrap('Password Reset', `
          <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0;">Password Reset Request</h2>
          <p style="color: #6b7280; font-size: 16px;">Hi <strong>Test User</strong>,</p>
          <p style="color: #6b7280; font-size: 16px;">We received a request to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${siteUrl}/reset-password?token=test-token-preview" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
          <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour.</p>
        `),
      }

    case 'deposit-success':
      return {
        subject: 'Deposit Successful - Funds Added to Wallet',
        html: wrap('Deposit Successful', `
          <h2 style="color: #10b981; font-size: 24px; margin: 0 0 20px 0;">Deposit Successful</h2>
          <p style="color: #6b7280; font-size: 16px;">Hi <strong>Test User</strong>,</p>
          <p style="color: #6b7280; font-size: 16px;">Your deposit has been successfully processed and credited to your wallet.</p>
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center; color: white;">
            <p style="margin: 0 0 10px 0; font-size: 16px; opacity: 0.9;">Amount Deposited</p>
            <p style="margin: 0; font-size: 48px; font-weight: bold;">$50.00</p>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">via Stripe</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${siteUrl}/profile/wallet" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Wallet</a>
          </div>
        `),
      }

    case 'wallet-credit':
      return {
        subject: 'Wallet Credit Added',
        html: wrap('Wallet Credit Added', `
          <h2 style="color: #2563eb; font-size: 24px; margin: 0 0 20px 0;">Wallet Credit Added</h2>
          <p style="color: #6b7280; font-size: 16px;">Hi <strong>Test User</strong>,</p>
          <p style="color: #6b7280; font-size: 16px;"><strong>$25.00</strong> has been added to your wallet.</p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 0; color: #1f2937;"><strong>Reason:</strong> Promotional credit — thank you for being a loyal customer!</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${siteUrl}/profile/wallet" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Wallet</a>
          </div>
        `),
      }

    case 'wallet-frozen':
      return {
        subject: 'Your Wallet Has Been Frozen',
        html: wrap('Wallet Frozen', `
          <h2 style="color: #dc2626; font-size: 24px; margin: 0 0 20px 0;">Wallet Frozen</h2>
          <p style="color: #6b7280; font-size: 16px;">Hi <strong>Test User</strong>,</p>
          <p style="color: #6b7280; font-size: 16px;">Your wallet has been temporarily frozen by our admin team.</p>
          <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> Suspicious activity detected — please contact support to verify your identity.</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">While your wallet is frozen, you will not be able to make purchases using your wallet balance.</p>
        `),
      }

    case 'referral-reward':
      return {
        subject: 'You Earned a Referral Reward!',
        html: wrap('Referral Reward', `
          <div style="text-align: center; margin-bottom: 20px;">
            <p style="font-size: 36px; margin: 0;">🎉</p>
            <h2 style="color: #2563eb; margin: 10px 0 0 0; font-size: 24px;">You Earned a Referral Reward!</h2>
          </div>
          <p style="color: #6b7280; font-size: 16px;">Hi <strong>Test User</strong>,</p>
          <p style="color: #6b7280; font-size: 16px;">Great news! <strong>Jane Doe</strong> just made their first purchase using your referral code!</p>
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center; color: white;">
            <p style="margin: 0 0 10px 0; font-size: 16px; opacity: 0.9;">Your Reward</p>
            <p style="margin: 0; font-size: 48px; font-weight: bold;">$10.00</p>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Added to your wallet balance</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${siteUrl}/profile/wallet" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Wallet</a>
          </div>
        `),
      }

    case 'welcome-bonus':
      return {
        subject: 'Your Welcome Bonus is Ready!',
        html: wrap('Welcome Bonus', `
          <div style="text-align: center; margin-bottom: 20px;">
            <p style="font-size: 36px; margin: 0;">🎁</p>
            <h2 style="color: #2563eb; margin: 10px 0 0 0; font-size: 24px;">Welcome Bonus Activated!</h2>
          </div>
          <p style="color: #6b7280; font-size: 16px;">Hi <strong>Test User</strong>,</p>
          <p style="color: #6b7280; font-size: 16px;">Thank you for making your first purchase! As a special welcome gift, we've credited your account:</p>
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center; color: white;">
            <p style="margin: 0 0 10px 0; font-size: 16px; opacity: 0.9;">Welcome Bonus</p>
            <p style="margin: 0; font-size: 48px; font-weight: bold;">$5.00</p>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Added to your wallet balance</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${siteUrl}/profile/wallet" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Wallet</a>
          </div>
        `),
      }

    case 'esim-delivery':
      return {
        subject: 'Your eSIM is Ready - Europe 10GB',
        html: wrap('eSIM Delivery', `
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; padding: 30px; margin: 0 0 20px 0; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 24px;">Your eSIM is Ready!</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Order #ZEN-TEST-12345</p>
          </div>
          <p style="color: #6b7280; font-size: 16px;">Hi <strong>Test User</strong>, your eSIM has been activated and is ready to use!</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #166534;">Plan Details</h3>
            <table style="width: 100%;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Plan:</td><td style="text-align: right; color: #1f2937; font-weight: 600;">Europe 10GB</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Region:</td><td style="text-align: right; color: #1f2937; font-weight: 600;">Europe (39 countries)</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Data:</td><td style="text-align: right; color: #1f2937; font-weight: 600;">10 GB</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Validity:</td><td style="text-align: right; color: #1f2937; font-weight: 600;">30 days</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">ICCID:</td><td style="text-align: right; color: #1f2937; font-family: monospace;">8901234567890123456</td></tr>
            </table>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${siteUrl}/profile/library" style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">View in My Library</a>
          </div>
        `),
      }

    case 'virtual-number':
      return {
        subject: 'Your Virtual Number is Active - +1 (555) 123-4567',
        html: wrap('Virtual Number', `
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 16px; padding: 30px; margin: 0 0 20px 0; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 24px;">Your Number is Active!</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Order #ZEN-TEST-12345</p>
          </div>
          <p style="color: #6b7280; font-size: 16px;">Hi <strong>Test User</strong>, your virtual phone number is ready!</p>
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 16px; padding: 30px; margin: 20px 0; text-align: center;">
            <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 10px 0;">Your Virtual Number</p>
            <p style="color: white; font-size: 32px; font-weight: 700; margin: 0; letter-spacing: 2px;">+1 (555) 123-4567</p>
          </div>
          <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Plan:</td><td style="text-align: right; color: #1f2937; font-weight: 600;">US Number — 30 days</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Valid Until:</td><td style="text-align: right; color: #1f2937; font-weight: 600;">April 8, 2026</td></tr>
            </table>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${siteUrl}/profile/numbers" style="display: inline-block; background: #8b5cf6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">Manage Your Number</a>
          </div>
        `),
      }

    case 'gift-card':
      return {
        subject: 'Your Amazon Gift Card - $50.00',
        html: wrap('Gift Card', `
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 16px; padding: 30px; margin: 0 0 20px 0; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 24px;">Your Gift Card is Here!</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Order #ZEN-TEST-12345</p>
          </div>
          <p style="color: #6b7280; font-size: 16px;">Hi <strong>Test User</strong>, here's your Amazon gift card!</p>
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%); border-radius: 16px; padding: 30px; margin: 20px 0;">
            <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">Amazon</p>
            <p style="color: #78350f; font-size: 36px; font-weight: 700; margin: 0;">$50.00</p>
            <p style="color: #92400e; font-size: 12px; margin: 10px 0 0 0;">No expiration</p>
          </div>
          <div style="background: #1f2937; border-radius: 12px; padding: 25px; margin: 20px 0; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Gift Card Code</p>
            <p style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; font-family: monospace; letter-spacing: 3px;">ABCD-EFGH-JKLM-NOPQ</p>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #374151;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase;">PIN</p>
              <p style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; font-family: monospace;">1234</p>
            </div>
          </div>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 15px; margin: 20px 0;">
            <p style="color: #991b1b; font-size: 13px; margin: 0;">
              <strong>Important:</strong> Keep this code secure. Gift card codes cannot be replaced if lost or stolen.
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${siteUrl}/profile/library" style="display: inline-block; background: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">View in My Library</a>
          </div>
        `),
      }

    default: // 'basic'
      return {
        subject: 'Zenorar Test Email — Configuration Working',
        html: wrap('Test Email', `
          <div style="text-align: center; margin-bottom: 30px;">
            <p style="font-size: 48px; margin: 0;">✅</p>
            <h2 style="color: #10b981; font-size: 24px; margin: 10px 0 0 0;">Email Configuration Working!</h2>
          </div>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.5;">
            This is a test email from your Zenorar marketplace admin panel. Your email settings are correctly configured.
          </p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Provider:</td><td style="text-align: right; color: #1f2937; font-weight: 600;">${config.host ? 'SMTP' : 'API'}</td></tr>
              ${config.host ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Host:</td><td style="text-align: right; color: #1f2937; font-weight: 600;">${config.host}</td></tr>` : ''}
              ${config.port ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Port:</td><td style="text-align: right; color: #1f2937; font-weight: 600;">${config.port}</td></tr>` : ''}
              <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">From:</td><td style="text-align: right; color: #1f2937; font-weight: 600;">${config.from}</td></tr>
            </table>
          </div>
          <p style="color: #10b981; font-weight: bold; font-size: 16px; text-align: center;">Email delivery is working correctly.</p>
        `),
      }
  }
}

// GET /api/settings/email/test - Return available template types
export const GET = requireAdmin(async (_req: NextRequest, _user: AuthenticatedUser) => {
  return NextResponse.json({
    success: true,
    data: TEMPLATE_TYPES.map(t => ({
      value: t,
      label: t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    })),
  })
})

// POST /api/settings/email/test - Send test email
export const POST = requireAdmin(async (req: NextRequest, user: AuthenticatedUser) => {
  try {
    const body = await req.json()
    const { testEmail, templateType = 'basic' } = body

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

    // Validate template type
    if (!TEMPLATE_TYPES.includes(templateType)) {
      return NextResponse.json(
        { success: false, error: `Invalid template type. Must be one of: ${TEMPLATE_TYPES.join(', ')}` },
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

    const config = provider.config

    // 2. Get the template
    const { subject, html } = getTestTemplate(templateType as TemplateType, config)

    // 3. Send via the active provider
    if (provider.provider === 'smtp') {
      if (!config.host) return NextResponse.json({ success: false, error: 'SMTP host is missing in config' }, { status: 400 })
      if (!config.port) return NextResponse.json({ success: false, error: 'SMTP port is missing in config' }, { status: 400 })
      if (!config.user) return NextResponse.json({ success: false, error: 'SMTP username is missing in config' }, { status: 400 })
      if (!config.password) return NextResponse.json({ success: false, error: 'SMTP password is missing in config' }, { status: 400 })
      if (!config.from) return NextResponse.json({ success: false, error: 'SMTP "from" address is missing in config' }, { status: 400 })

      const transporter = nodemailer.createTransport({
        host: config.host,
        port: Number(config.port) || 587,
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

      await transporter.sendMail({
        from: config.from,
        to: testEmail,
        subject,
        html,
      })
    } else {
      // Resend / SendGrid — use generic sendEmail
      const { sendEmail } = await import('@/lib/email-service')
      const sent = await sendEmail(testEmail, subject, html)

      if (!sent) {
        return NextResponse.json(
          { success: false, error: `Failed to send via ${provider.provider}. Check API key and from address.` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: `Test email (${templateType}) sent successfully to ${testEmail}`,
    })
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