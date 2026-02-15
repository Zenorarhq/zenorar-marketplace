// Email Settings API
// GET: Fetch all email provider configurations
// PUT: Update email provider configuration

import { NextRequest, NextResponse } from 'next/server'
import { getEmailSettings, updateEmailProvider } from '@/lib/db-helpers'
import { requireAdmin, AuthenticatedUser } from '@/lib/auth-middleware'

// GET /api/settings/email - Fetch all email provider configurations
export const GET = requireAdmin(async (req: NextRequest, user: AuthenticatedUser) => {
  try {
    const settings = await getEmailSettings()
    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('Failed to fetch email settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch email settings' },
      { status: 500 }
    )
  }
})

// PUT /api/settings/email - Update email provider configuration
export const PUT = requireAdmin(async (req: NextRequest, user: AuthenticatedUser) => {
  try {
    const body = await req.json()
    const { provider, config, isActive } = body

    // Validate provider
    if (!['smtp', 'resend', 'sendgrid'].includes(provider)) {
      return NextResponse.json(
        { success: false, error: 'Invalid provider. Must be smtp, resend, or sendgrid' },
        { status: 400 }
      )
    }

    // Validate config object
    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid config. Must be an object' },
        { status: 400 }
      )
    }

    // Provider-specific validation
    if (provider === 'smtp') {
      if (!config.host || !config.port || !config.from) {
        return NextResponse.json(
          { success: false, error: 'SMTP requires host, port, and from fields' },
          { status: 400 }
        )
      }
    } else if (provider === 'resend' || provider === 'sendgrid') {
      if (!config.apiKey || !config.from) {
        return NextResponse.json(
          { success: false, error: `${provider} requires apiKey and from fields` },
          { status: 400 }
        )
      }
    }

    // Update email provider
    await updateEmailProvider(provider, config, isActive === true)

    return NextResponse.json({
      success: true,
      message: `Email provider '${provider}' updated successfully`,
    })
  } catch (error) {
    console.error('Failed to update email settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update email settings' },
      { status: 500 }
    )
  }
})
