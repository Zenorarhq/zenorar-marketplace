// Multi-Provider Email Service
// Supports: SMTP (Nodemailer), Resend, SendGrid

import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import sgMail from '@sendgrid/mail'
import { getActiveEmailProvider } from './db-helpers'

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface OrderConfirmationData {
  orderNumber: string
  customerName: string
  email: string
  items: Array<{ name: string; quantity: number; price: number }>
  subtotal: number
  shipping: number
  tax: number
  total: number
  shippingAddress?: {
    address1: string
    city: string
    state: string
    postalCode: string
    country: string
  }
}

export interface EsimDeliveryData {
  customerName: string
  email: string
  orderNumber: string
  planName: string
  region: string
  dataAmount: string
  validityDays: number
  qrCodeUrl?: string
  iccid: string
  smdpAddress?: string
  matchingId?: string
}

export interface VirtualNumberDeliveryData {
  customerName: string
  email: string
  orderNumber: string
  phoneNumber: string
  phoneNumberDisplay: string
  planName: string
  expiresAt: Date
}

export interface GiftCardDeliveryData {
  customerName: string
  email: string
  orderNumber: string
  brand: string
  denomination: number
  code: string
  pin?: string
  expiresAt?: Date
  redemptionInstructions?: string
}

// ============================================================================
// Email Template Generator
// ============================================================================

function generateOrderConfirmationHTML(data: OrderConfirmationData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - ${data.orderNumber}</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 40px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700;">ZENORAR MARKETPLACE</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Premium Digital Products</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px; background: #ffffff;">
          <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 10px 0;">Order Confirmation</h2>
          <p style="font-size: 28px; font-weight: bold; color: #2563eb; margin: 0 0 20px 0;">Order #${data.orderNumber}</p>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.5;">
            Thank you for your purchase, <strong>${data.customerName}</strong>! Your order has been successfully processed.
          </p>

          <!-- Items Table -->
          <h3 style="border-bottom: 3px solid #e5e7eb; padding-bottom: 12px; color: #1f2937; font-size: 18px; margin: 30px 0 15px 0;">
            Items Ordered
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Product</th>
                <th style="padding: 12px; text-align: center; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                <th style="padding: 12px; text-align: right; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map(item => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 15px 12px; color: #1f2937; font-size: 14px;">${item.name}</td>
                  <td style="padding: 15px 12px; text-align: center; color: #6b7280; font-size: 14px;">×${item.quantity}</td>
                  <td style="padding: 15px 12px; text-align: right; color: #1f2937; font-weight: 600; font-size: 14px;">$${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Pricing Summary -->
          <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
              <span style="color: #6b7280;">Subtotal:</span>
              <span style="color: #1f2937; font-weight: 500;">$${data.subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
              <span style="color: #6b7280;">Shipping:</span>
              <span style="color: #1f2937; font-weight: 500;">$${data.shipping.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #6b7280;">Tax:</span>
              <span style="color: #1f2937; font-weight: 500;">$${data.tax.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 15px 0 8px 0; font-size: 18px;">
              <span style="color: #1f2937; font-weight: 700;">Total:</span>
              <span style="color: #2563eb; font-weight: 700; font-size: 22px;">$${data.total.toFixed(2)}</span>
            </div>
          </div>

          ${data.shippingAddress ? `
            <!-- Shipping Address -->
            <h3 style="border-bottom: 3px solid #e5e7eb; padding-bottom: 12px; color: #1f2937; font-size: 18px; margin: 30px 0 15px 0;">
              Shipping Address
            </h3>
            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb;">
              <p style="margin: 0; line-height: 1.8; color: #1f2937; font-size: 14px;">
                <strong>${data.customerName}</strong><br>
                ${data.shippingAddress.address1}<br>
                ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}<br>
                ${data.shippingAddress.country}
              </p>
            </div>
          ` : ''}

          <!-- Call to Action -->
          <div style="margin-top: 40px; text-align: center;">
            <a href="https://zenorar.com/profile/orders"
               style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
              View Order Details
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 30px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
            Questions? Contact us at
            <a href="mailto:support@zenorar.com" style="color: #2563eb; text-decoration: none; font-weight: 500;">support@zenorar.com</a>
          </p>
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            © ${new Date().getFullYear()} Zenorar Marketplace. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

// ============================================================================
// eSIM Delivery Email Template
// ============================================================================

function generateEsimDeliveryHTML(data: EsimDeliveryData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your eSIM is Ready - ${data.planName}</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Your eSIM is Ready!</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Order #${data.orderNumber}</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px; background: #ffffff;">
          <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
            Hi <strong>${data.customerName}</strong>, your eSIM has been activated and is ready to use!
          </p>

          <!-- Plan Details -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #166534; font-size: 18px;">Plan Details</h3>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Plan:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.planName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Region:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.region}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Data:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.dataAmount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Validity:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.validityDays} days</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">ICCID:</td>
                <td style="padding: 8px 0; color: #1f2937; font-family: monospace; text-align: right;">${data.iccid}</td>
              </tr>
            </table>
          </div>

          ${data.qrCodeUrl ? `
            <!-- QR Code Section -->
            <div style="text-align: center; margin: 30px 0; padding: 30px; background: #f9fafb; border-radius: 12px;">
              <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Scan to Install</h3>
              <img src="${data.qrCodeUrl}" alt="eSIM QR Code" style="max-width: 200px; border-radius: 8px;" />
              <p style="color: #6b7280; font-size: 13px; margin: 15px 0 0 0;">
                Open your camera app and scan this QR code to install the eSIM
              </p>
            </div>
          ` : ''}

          ${data.smdpAddress ? `
            <!-- Manual Installation -->
            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 16px;">Manual Installation</h3>
              <p style="color: #78350f; font-size: 13px; margin: 0 0 10px 0;">If the QR code doesn't work, enter these details manually:</p>
              <p style="color: #1f2937; font-family: monospace; font-size: 13px; margin: 5px 0;">
                <strong>SM-DP+ Address:</strong> ${data.smdpAddress}
              </p>
              ${data.matchingId ? `
                <p style="color: #1f2937; font-family: monospace; font-size: 13px; margin: 5px 0;">
                  <strong>Activation Code:</strong> ${data.matchingId}
                </p>
              ` : ''}
            </div>
          ` : ''}

          <!-- Instructions -->
          <div style="margin: 30px 0;">
            <h3 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0;">Installation Instructions</h3>
            <div style="margin-bottom: 20px;">
              <h4 style="color: #1f2937; font-size: 14px; margin: 0 0 10px 0;">📱 iPhone (iOS 12.1+)</h4>
              <ol style="color: #6b7280; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Go to Settings → Cellular → Add Cellular Plan</li>
                <li>Scan the QR code above</li>
                <li>Follow the on-screen prompts</li>
                <li>Enable Data Roaming when abroad</li>
              </ol>
            </div>
            <div>
              <h4 style="color: #1f2937; font-size: 14px; margin: 0 0 10px 0;">🤖 Android (Pixel, Samsung, etc.)</h4>
              <ol style="color: #6b7280; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Go to Settings → Network & Internet → Mobile Network</li>
                <li>Tap "Add" or "+" → Download SIM</li>
                <li>Scan the QR code above</li>
                <li>Enable Data Roaming when abroad</li>
              </ol>
            </div>
          </div>

          <!-- CTA -->
          <div style="margin-top: 40px; text-align: center;">
            <a href="https://zenorar.com/profile/library"
               style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
              View in My Library
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 30px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
            Need help? Contact us at
            <a href="mailto:support@zenorar.com" style="color: #10b981; text-decoration: none; font-weight: 500;">support@zenorar.com</a>
          </p>
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            © ${new Date().getFullYear()} Zenorar Marketplace. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

// ============================================================================
// Virtual Number Delivery Email Template
// ============================================================================

function generateVirtualNumberDeliveryHTML(data: VirtualNumberDeliveryData): string {
  const expiryDate = new Date(data.expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Virtual Number is Active - ${data.phoneNumberDisplay}</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 40px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Your Number is Active!</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Order #${data.orderNumber}</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px; background: #ffffff;">
          <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
            Hi <strong>${data.customerName}</strong>, your virtual phone number has been activated and is ready to receive calls and messages!
          </p>

          <!-- Phone Number Display -->
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 16px; padding: 30px; margin: 20px 0; text-align: center;">
            <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 10px 0;">Your Virtual Number</p>
            <p style="color: white; font-size: 32px; font-weight: 700; margin: 0; letter-spacing: 2px;">${data.phoneNumberDisplay}</p>
            <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 10px 0 0 0; font-family: monospace;">${data.phoneNumber}</p>
          </div>

          <!-- Plan Details -->
          <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #5b21b6; font-size: 18px;">Plan Details</h3>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Plan:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.planName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Valid Until:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${expiryDate}</td>
              </tr>
            </table>
          </div>

          <!-- Features -->
          <div style="margin: 30px 0;">
            <h3 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0;">What You Can Do</h3>
            <div style="display: grid; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f9fafb; border-radius: 8px;">
                <span style="font-size: 24px;">💬</span>
                <div>
                  <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 14px;">Send & Receive SMS</p>
                  <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 12px;">Text messages from anywhere</p>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f9fafb; border-radius: 8px;">
                <span style="font-size: 24px;">📞</span>
                <div>
                  <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 14px;">Receive Voice Calls</p>
                  <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 12px;">Forward calls to your number</p>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f9fafb; border-radius: 8px;">
                <span style="font-size: 24px;">🔒</span>
                <div>
                  <p style="margin: 0; color: #1f2937; font-weight: 600; font-size: 14px;">Privacy Protection</p>
                  <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 12px;">Keep your real number private</p>
                </div>
              </div>
            </div>
          </div>

          <!-- CTA -->
          <div style="margin-top: 40px; text-align: center;">
            <a href="https://zenorar.com/profile/numbers"
               style="display: inline-block; background: #8b5cf6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Manage Your Number
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 30px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
            Need help? Contact us at
            <a href="mailto:support@zenorar.com" style="color: #8b5cf6; text-decoration: none; font-weight: 500;">support@zenorar.com</a>
          </p>
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            © ${new Date().getFullYear()} Zenorar Marketplace. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

// ============================================================================
// Gift Card Delivery Email Template
// ============================================================================

function generateGiftCardDeliveryHTML(data: GiftCardDeliveryData): string {
  const expiryText = data.expiresAt
    ? `Expires: ${new Date(data.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
    : 'No expiration'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your ${data.brand} Gift Card - $${data.denomination}</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Your Gift Card is Here!</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Order #${data.orderNumber}</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px; background: #ffffff;">
          <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
            Hi <strong>${data.customerName}</strong>, here's your ${data.brand} gift card!
          </p>

          <!-- Gift Card Display -->
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%); border-radius: 16px; padding: 30px; margin: 20px 0; position: relative; overflow: hidden;">
            <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: rgba(255,255,255,0.2); border-radius: 50%;"></div>
            <div style="position: absolute; bottom: -30px; left: -30px; width: 80px; height: 80px; background: rgba(255,255,255,0.15); border-radius: 50%;"></div>

            <div style="position: relative; z-index: 1;">
              <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">${data.brand}</p>
              <p style="color: #78350f; font-size: 36px; font-weight: 700; margin: 0;">$${data.denomination.toFixed(2)}</p>
              <p style="color: #92400e; font-size: 12px; margin: 10px 0 0 0;">${expiryText}</p>
            </div>
          </div>

          <!-- Code Section -->
          <div style="background: #1f2937; border-radius: 12px; padding: 25px; margin: 20px 0; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Gift Card Code</p>
            <p style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; font-family: monospace; letter-spacing: 3px; word-break: break-all;">${data.code}</p>
            ${data.pin ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #374151;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">PIN</p>
                <p style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; font-family: monospace; letter-spacing: 2px;">${data.pin}</p>
              </div>
            ` : ''}
          </div>

          <!-- Redemption Instructions -->
          <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 16px;">How to Redeem</h3>
            ${data.redemptionInstructions
              ? `<p style="color: #78350f; font-size: 14px; margin: 0; line-height: 1.6;">${data.redemptionInstructions}</p>`
              : `
                <ol style="color: #78350f; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Visit the ${data.brand} website or app</li>
                  <li>Sign in or create an account</li>
                  <li>Go to "Redeem Gift Card" or "Add Funds"</li>
                  <li>Enter the code shown above${data.pin ? ' and PIN' : ''}</li>
                  <li>The balance will be added to your account</li>
                </ol>
              `}
          </div>

          <!-- Important Note -->
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 15px; margin: 20px 0;">
            <p style="color: #991b1b; font-size: 13px; margin: 0;">
              <strong>⚠️ Important:</strong> Keep this code secure. Gift card codes cannot be replaced if lost or stolen.
            </p>
          </div>

          <!-- CTA -->
          <div style="margin-top: 40px; text-align: center;">
            <a href="https://zenorar.com/profile/library"
               style="display: inline-block; background: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
              View in My Library
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 30px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
            Need help? Contact us at
            <a href="mailto:support@zenorar.com" style="color: #f59e0b; text-decoration: none; font-weight: 500;">support@zenorar.com</a>
          </p>
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            © ${new Date().getFullYear()} Zenorar Marketplace. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

// ============================================================================
// Provider-Specific Sending Functions
// ============================================================================

// Send via SMTP (Nodemailer)
async function sendViaSMTP(
  config: any,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port),
      secure: config.secure === true,
      auth: {
        user: config.user,
        pass: config.password
      }
    })

    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html
    })

    return true
  } catch (error) {
    console.error('SMTP send error:', error)
    return false
  }
}

// Send via Resend
async function sendViaResend(
  config: any,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const resend = new Resend(config.apiKey)

    await resend.emails.send({
      from: config.from,
      to,
      subject,
      html
    })

    return true
  } catch (error) {
    console.error('Resend send error:', error)
    return false
  }
}

// Send via SendGrid
async function sendViaSendGrid(
  config: any,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    sgMail.setApiKey(config.apiKey)

    await sgMail.send({
      from: config.from,
      to,
      subject,
      html
    })

    return true
  } catch (error) {
    console.error('SendGrid send error:', error)
    return false
  }
}

// ============================================================================
// Public API
// ============================================================================

// Send order confirmation email
export async function sendOrderConfirmationEmail(
  data: OrderConfirmationData
): Promise<boolean> {
  try {
    const provider = await getActiveEmailProvider()

    if (!provider) {
      console.warn('⚠ No active email provider configured - email not sent')
      return false
    }

    const htmlContent = generateOrderConfirmationHTML(data)
    const subject = `Order Confirmation - ${data.orderNumber}`

    switch (provider.provider) {
      case 'smtp':
        return await sendViaSMTP(provider.config, data.email, subject, htmlContent)

      case 'resend':
        return await sendViaResend(provider.config, data.email, subject, htmlContent)

      case 'sendgrid':
        return await sendViaSendGrid(provider.config, data.email, subject, htmlContent)

      default:
        console.error(`✗ Unknown email provider: ${provider.provider}`)
        return false
    }
  } catch (error) {
    console.error('✗ Failed to send order confirmation email:', error)
    return false
  }
}

// Export for future use (order shipped, password reset, etc.)
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const provider = await getActiveEmailProvider()

    if (!provider) {
      console.warn('⚠ No active email provider configured - email not sent')
      return false
    }

    switch (provider.provider) {
      case 'smtp':
        return await sendViaSMTP(provider.config, to, subject, html)

      case 'resend':
        return await sendViaResend(provider.config, to, subject, html)

      case 'sendgrid':
        return await sendViaSendGrid(provider.config, to, subject, html)

      default:
        console.error(`✗ Unknown email provider: ${provider.provider}`)
        return false
    }
  } catch (error) {
    console.error('✗ Failed to send email:', error)
    return false
  }
}

// ============================================================================
// Digital Product Delivery Emails
// ============================================================================

/**
 * Send eSIM delivery email with QR code and installation instructions
 */
export async function sendEsimDeliveryEmail(data: EsimDeliveryData): Promise<boolean> {
  try {
    const provider = await getActiveEmailProvider()

    if (!provider) {
      console.warn('⚠ No active email provider configured - eSIM delivery email not sent')
      return false
    }

    const htmlContent = generateEsimDeliveryHTML(data)
    const subject = `Your eSIM is Ready - ${data.planName}`

    console.log(`→ Sending eSIM delivery email via ${provider.provider} to ${data.email}`)

    switch (provider.provider) {
      case 'smtp':
        return await sendViaSMTP(provider.config, data.email, subject, htmlContent)
      case 'resend':
        return await sendViaResend(provider.config, data.email, subject, htmlContent)
      case 'sendgrid':
        return await sendViaSendGrid(provider.config, data.email, subject, htmlContent)
      default:
        console.error(`✗ Unknown email provider: ${provider.provider}`)
        return false
    }
  } catch (error) {
    console.error('✗ Failed to send eSIM delivery email:', error)
    return false
  }
}

/**
 * Send virtual number delivery email with phone number details
 */
export async function sendVirtualNumberDeliveryEmail(data: VirtualNumberDeliveryData): Promise<boolean> {
  try {
    const provider = await getActiveEmailProvider()

    if (!provider) {
      console.warn('⚠ No active email provider configured - virtual number delivery email not sent')
      return false
    }

    const htmlContent = generateVirtualNumberDeliveryHTML(data)
    const subject = `Your Virtual Number is Active - ${data.phoneNumberDisplay}`

    console.log(`→ Sending virtual number delivery email via ${provider.provider} to ${data.email}`)

    switch (provider.provider) {
      case 'smtp':
        return await sendViaSMTP(provider.config, data.email, subject, htmlContent)
      case 'resend':
        return await sendViaResend(provider.config, data.email, subject, htmlContent)
      case 'sendgrid':
        return await sendViaSendGrid(provider.config, data.email, subject, htmlContent)
      default:
        console.error(`✗ Unknown email provider: ${provider.provider}`)
        return false
    }
  } catch (error) {
    console.error('✗ Failed to send virtual number delivery email:', error)
    return false
  }
}

/**
 * Send gift card delivery email with code and redemption instructions
 */
export async function sendGiftCardDeliveryEmail(data: GiftCardDeliveryData): Promise<boolean> {
  try {
    const provider = await getActiveEmailProvider()

    if (!provider) {
      console.warn('⚠ No active email provider configured - gift card delivery email not sent')
      return false
    }

    const htmlContent = generateGiftCardDeliveryHTML(data)
    const subject = `Your ${data.brand} Gift Card - $${data.denomination}`

    console.log(`→ Sending gift card delivery email via ${provider.provider} to ${data.email}`)

    switch (provider.provider) {
      case 'smtp':
        return await sendViaSMTP(provider.config, data.email, subject, htmlContent)
      case 'resend':
        return await sendViaResend(provider.config, data.email, subject, htmlContent)
      case 'sendgrid':
        return await sendViaSendGrid(provider.config, data.email, subject, htmlContent)
      default:
        console.error(`✗ Unknown email provider: ${provider.provider}`)
        return false
    }
  } catch (error) {
    console.error('✗ Failed to send gift card delivery email:', error)
    return false
  }
}

// ============================================================================
// Admin Alert Emails
// ============================================================================

export interface LowStockAlertData {
  adminEmail: string
  items: Array<{
    brand: string
    denomination: number
    available: number
    threshold: number
  }>
}

export interface SmsForwardingData {
  email: string
  phoneNumber: string
  phoneNumberDisplay: string
  fromNumber: string
  messageBody: string
  receivedAt: Date
  mediaUrls?: string[]
}

function generateLowStockAlertHTML(data: LowStockAlertData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Low Stock Alert - Gift Cards</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 40px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">⚠️ Low Stock Alert</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Gift Card Inventory Warning</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px; background: #ffffff;">
          <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
            The following gift card inventory items are running low and need attention:
          </p>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #fef2f2;">
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #fecaca;">Brand</th>
                <th style="padding: 12px; text-align: center; font-size: 12px; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #fecaca;">Denomination</th>
                <th style="padding: 12px; text-align: center; font-size: 12px; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #fecaca;">Available</th>
                <th style="padding: 12px; text-align: center; font-size: 12px; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #fecaca;">Threshold</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map(item => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 15px 12px; color: #1f2937; font-size: 14px; font-weight: 600;">${item.brand}</td>
                  <td style="padding: 15px 12px; text-align: center; color: #1f2937; font-size: 14px;">$${item.denomination.toFixed(2)}</td>
                  <td style="padding: 15px 12px; text-align: center; color: ${item.available <= 2 ? '#dc2626' : '#f59e0b'}; font-weight: 700; font-size: 14px;">${item.available}</td>
                  <td style="padding: 15px 12px; text-align: center; color: #6b7280; font-size: 14px;">${item.threshold}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Action Required -->
          <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">Action Required</h3>
            <p style="color: #78350f; font-size: 14px; margin: 0; line-height: 1.6;">
              Please restock these items to ensure continuous availability for customers.
              You can import new codes via the admin dashboard.
            </p>
          </div>

          <!-- CTA -->
          <div style="margin-top: 40px; text-align: center;">
            <a href="https://zenorar.com/admin/gift-cards/inventory"
               style="display: inline-block; background: #ef4444; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Manage Inventory
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 30px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            This is an automated alert from Zenorar Marketplace.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Send low stock alert email to admin
 */
export async function sendLowStockAlertEmail(data: LowStockAlertData): Promise<boolean> {
  try {
    const provider = await getActiveEmailProvider()

    if (!provider) {
      console.warn('⚠ No active email provider configured - low stock alert not sent')
      return false
    }

    const htmlContent = generateLowStockAlertHTML(data)
    const subject = `⚠️ Low Stock Alert: ${data.items.length} Gift Card(s) Need Restocking`

    console.log(`→ Sending low stock alert email via ${provider.provider} to ${data.adminEmail}`)

    switch (provider.provider) {
      case 'smtp':
        return await sendViaSMTP(provider.config, data.adminEmail, subject, htmlContent)
      case 'resend':
        return await sendViaResend(provider.config, data.adminEmail, subject, htmlContent)
      case 'sendgrid':
        return await sendViaSendGrid(provider.config, data.adminEmail, subject, htmlContent)
      default:
        console.error(`✗ Unknown email provider: ${provider.provider}`)
        return false
    }
  } catch (error) {
    console.error('✗ Failed to send low stock alert email:', error)
    return false
  }
}

// ============================================================================
// SMS Forwarding Email
// ============================================================================

function generateSmsForwardingHTML(data: SmsForwardingData): string {
  const receivedTime = new Date(data.receivedAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New SMS - ${data.phoneNumberDisplay}</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">💬 New SMS Message</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">To: ${data.phoneNumberDisplay}</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px; background: #ffffff;">
          <!-- Message Info -->
          <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">From:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.fromNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">To:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.phoneNumberDisplay}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Received:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${receivedTime}</td>
              </tr>
            </table>
          </div>

          <!-- Message Content -->
          <div style="background: #1f2937; border-radius: 12px; padding: 25px; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Message</p>
            <p style="color: #ffffff; font-size: 16px; margin: 0; line-height: 1.6; white-space: pre-wrap;">${data.messageBody}</p>
          </div>

          ${data.mediaUrls && data.mediaUrls.length > 0 ? `
            <!-- Media Attachments -->
            <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px 0; font-weight: 600;">📎 Attachments (${data.mediaUrls.length})</p>
              ${data.mediaUrls.map((url, i) => `
                <a href="${url}" style="display: inline-block; margin: 5px; padding: 10px 15px; background: #e5e7eb; border-radius: 8px; color: #1f2937; text-decoration: none; font-size: 14px;">
                  Attachment ${i + 1}
                </a>
              `).join('')}
            </div>
          ` : ''}

          <!-- CTA -->
          <div style="margin-top: 30px; text-align: center;">
            <a href="https://zenorar.com/profile/numbers"
               style="display: inline-block; background: #8b5cf6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
              View in Dashboard
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 20px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            SMS forwarding from your Zenorar virtual number ${data.phoneNumberDisplay}
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Send SMS forwarding notification email
 */
export async function sendSmsForwardingEmail(data: SmsForwardingData): Promise<boolean> {
  try {
    const provider = await getActiveEmailProvider()

    if (!provider) {
      console.warn('⚠ No active email provider configured - SMS forwarding email not sent')
      return false
    }

    const htmlContent = generateSmsForwardingHTML(data)
    const subject = `📱 SMS from ${data.fromNumber} to ${data.phoneNumberDisplay}`

    console.log(`→ Sending SMS forwarding email via ${provider.provider} to ${data.email}`)

    switch (provider.provider) {
      case 'smtp':
        return await sendViaSMTP(provider.config, data.email, subject, htmlContent)
      case 'resend':
        return await sendViaResend(provider.config, data.email, subject, htmlContent)
      case 'sendgrid':
        return await sendViaSendGrid(provider.config, data.email, subject, htmlContent)
      default:
        console.error(`✗ Unknown email provider: ${provider.provider}`)
        return false
    }
  } catch (error) {
    console.error('✗ Failed to send SMS forwarding email:', error)
    return false
  }
}

// ============================================================================
// Voicemail Notification Email
// ============================================================================

export interface VoicemailNotificationData {
  email: string
  customerName: string
  phoneNumber: string
  phoneNumberDisplay: string
  callerNumber: string
  duration: number
  recordingUrl: string
  receivedAt: Date
}

function generateVoicemailNotificationHTML(data: VoicemailNotificationData): string {
  const receivedTime = new Date(data.receivedAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })

  const durationFormatted = data.duration >= 60
    ? `${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}`
    : `${data.duration} seconds`

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Voicemail - ${data.phoneNumberDisplay}</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">📞 New Voicemail</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">To: ${data.phoneNumberDisplay}</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px; background: #ffffff;">
          <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
            Hi <strong>${data.customerName}</strong>, you have a new voicemail on your virtual number.
          </p>

          <!-- Voicemail Info -->
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">From:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.callerNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">To:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${data.phoneNumberDisplay}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Received:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${receivedTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Duration:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${durationFormatted}</td>
              </tr>
            </table>
          </div>

          <!-- Play Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.recordingUrl}"
               style="display: inline-block; background: #ef4444; color: white; padding: 16px 40px; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 16px;">
              🎵 Play Voicemail
            </a>
          </div>

          <!-- CTA -->
          <div style="margin-top: 30px; text-align: center;">
            <a href="https://zenorar.com/profile/numbers"
               style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
              View All Messages
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 20px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            Voicemail notification from your Zenorar virtual number ${data.phoneNumberDisplay}
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Send voicemail notification email
 */
export async function sendVoicemailNotificationEmail(data: VoicemailNotificationData): Promise<boolean> {
  try {
    const provider = await getActiveEmailProvider()

    if (!provider) {
      console.warn('⚠ No active email provider configured - voicemail notification email not sent')
      return false
    }

    const htmlContent = generateVoicemailNotificationHTML(data)
    const subject = `📞 Voicemail from ${data.callerNumber} to ${data.phoneNumberDisplay}`

    console.log(`→ Sending voicemail notification email via ${provider.provider} to ${data.email}`)

    switch (provider.provider) {
      case 'smtp':
        return await sendViaSMTP(provider.config, data.email, subject, htmlContent)
      case 'resend':
        return await sendViaResend(provider.config, data.email, subject, htmlContent)
      case 'sendgrid':
        return await sendViaSendGrid(provider.config, data.email, subject, htmlContent)
      default:
        console.error(`✗ Unknown email provider: ${provider.provider}`)
        return false
    }
  } catch (error) {
    console.error('✗ Failed to send voicemail notification email:', error)
    return false
  }
}
