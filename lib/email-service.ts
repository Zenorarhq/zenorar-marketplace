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
