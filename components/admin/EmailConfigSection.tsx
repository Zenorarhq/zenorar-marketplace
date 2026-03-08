'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import { getAccessToken } from '@/lib/api/client'

interface EmailProvider {
  provider: 'smtp' | 'resend' | 'sendgrid'
  is_active: boolean
  config: any
}

export default function EmailConfigSection() {
  const [providers, setProviders] = useState<EmailProvider[]>([])
  const [activeProvider, setActiveProvider] = useState<string | null>(null)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testTemplate, setTestTemplate] = useState('basic')
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')

  // Load email settings on mount
  useEffect(() => {
    loadEmailSettings()
  }, [])

  async function loadEmailSettings() {
    try {
      const res = await fetch('/api/settings/email', {
        headers: {
          'Content-Type': 'application/json',
          ...(getAccessToken() && {
            Authorization: `Bearer ${getAccessToken()}`,
          }),
        },
      })

      if (!res.ok) {
        setError('Failed to load email settings. The email_settings table may not exist — run migration 020.')
        return
      }

      const data = await res.json()

      if (data.success && data.data) {
        setProviders(data.data)
        const active = data.data.find((p: EmailProvider) => p.is_active)
        setActiveProvider(active?.provider || null)
        setExpandedProvider(active?.provider || null)
      } else {
        setError(data.error || 'Failed to load email settings')
      }
    } catch (err) {
      console.error('Failed to load email settings:', err)
      setError('Failed to connect to the email settings API')
    } finally {
      setLoading(false)
    }
  }

  // Save email provider configuration
  const handleSave = async (provider: string, config: any, isActive: boolean) => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(getAccessToken() && {
            Authorization: `Bearer ${getAccessToken()}`,
          }),
        },
        body: JSON.stringify({ provider, config, isActive })
      })

      const data = await res.json()

      if (data.success) {
        setActiveProvider(isActive ? provider : null)
        // Update local state
        setProviders(prev =>
          prev.map(p =>
            p.provider === provider
              ? { ...p, config, is_active: isActive }
              : { ...p, is_active: false }
          )
        )
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to save email settings:', error)
      alert('Failed to save settings. Check console for details.')
    } finally {
      setSaving(false)
    }
  }

  // Send test email
  const handleTestEmail = async () => {
    if (!testEmail.trim()) {
      setTestMessage('Please enter an email address')
      setTestStatus('error')
      setTimeout(() => setTestStatus('idle'), 3000)
      return
    }

    setTestStatus('sending')
    setTestMessage('')

    try {
      const res = await fetch('/api/settings/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAccessToken() && {
            Authorization: `Bearer ${getAccessToken()}`,
          }),
        },
        body: JSON.stringify({ testEmail: testEmail.trim(), templateType: testTemplate })
      })

      const data = await res.json()

      if (data.success) {
        setTestStatus('success')
        setTestMessage(data.message || 'Test email sent successfully!')
      } else {
        setTestStatus('error')
        setTestMessage(data.error || 'Failed to send test email')
      }

      setTimeout(() => {
        setTestStatus('idle')
        setTestMessage('')
      }, 5000)
    } catch (error) {
      setTestStatus('error')
      setTestMessage('Network error. Check console for details.')
      setTimeout(() => {
        setTestStatus('idle')
        setTestMessage('')
      }, 5000)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Icon name="loading" size={32} className="text-primary animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading email settings...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Icon name="alert" size={24} className="text-red-400 flex-shrink-0" />
          <div>
            <h3 className="text-red-400 font-bold mb-1">Email Settings Error</h3>
            <p className="text-red-400/80 text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Email Service Provider</h2>
        <p className="text-slate-400 text-sm">
          Configure email delivery for order confirmations and notifications. Only one provider can be active at a time.
        </p>
      </div>

      {/* Provider Sections */}
      <div className="space-y-4">
        {providers.map((provider) => (
          <ProviderSection
            key={provider.provider}
            provider={provider}
            isActive={activeProvider === provider.provider}
            isExpanded={expandedProvider === provider.provider}
            onToggleExpand={() => setExpandedProvider(
              expandedProvider === provider.provider ? null : provider.provider
            )}
            onSave={(config) => handleSave(provider.provider, config, true)}
            onDeactivate={() => handleSave(provider.provider, provider.config, false)}
            saving={saving}
          />
        ))}
      </div>

      {/* Test Email Section */}
      {activeProvider && (
        <div className="bg-charcoal border border-border-dark rounded-xl p-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Icon name="mail" size={20} className="text-primary" />
            Test Email Configuration
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Send a test email to verify your {activeProvider.toUpperCase()} configuration and preview templates.
          </p>
          <div className="mb-3">
            <label className="block text-slate-300 text-sm font-medium mb-2">Email Template</label>
            <select
              value={testTemplate}
              onChange={(e) => setTestTemplate(e.target.value)}
              className="w-full bg-background-dark border border-border-dark rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            >
              <option value="basic">Basic Test Email</option>
              <option value="order-confirmation">Order Confirmation</option>
              <option value="order-shipped">Order Shipped</option>
              <option value="order-cancelled">Order Cancelled</option>
              <option value="welcome">Welcome</option>
              <option value="password-reset">Password Reset</option>
              <option value="deposit-success">Deposit Success</option>
              <option value="wallet-credit">Wallet Credit</option>
              <option value="wallet-frozen">Wallet Frozen</option>
              <option value="referral-reward">Referral Reward</option>
              <option value="welcome-bonus">Welcome Bonus</option>
              <option value="esim-delivery">eSIM Delivery</option>
              <option value="virtual-number">Virtual Number</option>
              <option value="gift-card">Gift Card</option>
            </select>
          </div>
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTestEmail()}
              placeholder="Enter email address to send test to"
              className="flex-grow bg-background-dark border border-border-dark rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
            <button
              onClick={handleTestEmail}
              disabled={testStatus === 'sending' || !testEmail.trim()}
              className="bg-primary text-black px-8 py-3 rounded-lg font-bold hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testStatus === 'sending' ? (
                <>
                  <Icon name="loading" size={20} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Icon name="send" size={20} />
                  Send Test
                </>
              )}
            </button>
          </div>
          {testMessage && (
            <div
              className={`mt-3 p-3 rounded-lg text-sm flex items-center gap-2 ${
                testStatus === 'success'
                  ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                  : 'bg-red-400/10 text-red-400 border border-red-400/20'
              }`}
            >
              <Icon name={testStatus === 'success' ? 'check' : 'alert'} size={16} />
              {testMessage}
            </div>
          )}
        </div>
      )}

      {/* No Active Provider Warning */}
      {!activeProvider && (
        <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Icon name="alert" size={24} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-amber-400 font-bold mb-1">No Active Email Provider</h3>
              <p className="text-amber-400/80 text-sm">
                Order confirmation emails will not be sent until you configure and activate an email provider above.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Individual Provider Section Component
// ============================================================================

interface ProviderSectionProps {
  provider: EmailProvider
  isActive: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onSave: (config: any) => void
  onDeactivate: () => void
  saving: boolean
}

function ProviderSection({
  provider,
  isActive,
  isExpanded,
  onToggleExpand,
  onSave,
  onDeactivate,
  saving
}: ProviderSectionProps) {
  const [config, setConfig] = useState(provider.config)
  const [showPassword, setShowPassword] = useState(false)

  const providerInfo = {
    smtp: {
      name: 'SMTP / Nodemailer',
      description: 'Works with any SMTP server (Gmail, SendGrid SMTP, custom servers)',
      icon: 'server' as const
    },
    resend: {
      name: 'Resend',
      description: 'Modern email API with great deliverability (100 emails/day free)',
      icon: 'mail' as const
    },
    sendgrid: {
      name: 'SendGrid',
      description: 'Enterprise-grade email delivery (100 emails/day free)',
      icon: 'send' as const
    }
  }

  const info = providerInfo[provider.provider]

  return (
    <div className={`bg-surface-dark border rounded-xl p-6 transition-all ${
      isExpanded ? 'border-primary' : 'border-border-dark'
    }`}>
      {/* Provider Header - clickable to expand/collapse */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              isActive ? 'border-primary bg-primary' : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            {isActive && <div className="w-3 h-3 bg-black rounded-full" />}
          </div>
          <Icon name={info.icon} size={24} className={isExpanded ? 'text-primary' : 'text-slate-500'} />
          <div>
            <h3 className="text-white font-bold text-lg">{info.name}</h3>
            <p className="text-slate-400 text-xs">{info.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isActive && (
            <span className="text-xs bg-primary text-black px-3 py-1 rounded-full font-bold">
              ACTIVE
            </span>
          )}
          <Icon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            className="text-slate-400"
          />
        </div>
      </div>

      {/* Configuration Fields (shown when expanded) */}
      {isExpanded && (
        <div className="space-y-4 mt-6 pt-6 border-t border-border-dark">
          {provider.provider === 'smtp' && (
            <>
              <InputField
                label="SMTP Host"
                value={config.host}
                onChange={(v) => setConfig({ ...config, host: v })}
                placeholder="smtp.gmail.com"
                hint="SMTP server hostname"
              />
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="SMTP Port"
                  value={config.port}
                  onChange={(v) => setConfig({ ...config, port: Number(v) })}
                  type="number"
                  placeholder="587"
                  hint="Usually 587 (STARTTLS) or 465 (SSL)"
                />
                <div className="flex items-center gap-2 pt-8">
                  <input
                    type="checkbox"
                    id="smtp-secure"
                    checked={config.secure === true}
                    onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
                    className="w-5 h-5 rounded border-border-dark bg-background-dark text-primary focus:ring-primary"
                  />
                  <label htmlFor="smtp-secure" className="text-slate-400 text-sm cursor-pointer">
                    Use SSL/TLS
                  </label>
                </div>
              </div>
              <InputField
                label="Username"
                value={config.user}
                onChange={(v) => setConfig({ ...config, user: v })}
                placeholder="your-email@gmail.com"
                hint="SMTP authentication username"
              />
              <InputField
                label="Password"
                value={config.password}
                onChange={(v) => setConfig({ ...config, password: v })}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••••••"
                hint="For Gmail: use App Password, not regular password"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} />
                  </button>
                }
              />
              <InputField
                label="From Address"
                value={config.from}
                onChange={(v) => setConfig({ ...config, from: v })}
                placeholder="noreply@zenorar.com"
                hint="Email address to send from"
              />
            </>
          )}

          {provider.provider === 'resend' && (
            <>
              <InputField
                label="API Key"
                value={config.apiKey}
                onChange={(v) => setConfig({ ...config, apiKey: v })}
                type={showPassword ? 'text' : 'password'}
                placeholder="re_..."
                hint="Get your API key from resend.com/api-keys"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} />
                  </button>
                }
              />
              <InputField
                label="From Address"
                value={config.from}
                onChange={(v) => setConfig({ ...config, from: v })}
                placeholder="noreply@zenorar.com"
                hint="Must be from a verified domain or use onboarding@resend.dev for testing"
              />
            </>
          )}

          {provider.provider === 'sendgrid' && (
            <>
              <InputField
                label="API Key"
                value={config.apiKey}
                onChange={(v) => setConfig({ ...config, apiKey: v })}
                type={showPassword ? 'text' : 'password'}
                placeholder="SG...."
                hint="Get your API key from app.sendgrid.com/settings/api_keys"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} />
                  </button>
                }
              />
              <InputField
                label="From Address"
                value={config.from}
                onChange={(v) => setConfig({ ...config, from: v })}
                placeholder="noreply@zenorar.com"
                hint="Must match a verified sender in SendGrid"
              />
            </>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => onSave(config)}
              disabled={saving}
              className="flex-1 bg-primary text-black px-6 py-3 rounded-lg font-bold hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Icon name="loading" size={20} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Icon name="save" size={20} />
                  {isActive ? 'Save Configuration' : 'Save & Activate'}
                </>
              )}
            </button>
            {isActive && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeactivate(); }}
                disabled={saving}
                className="px-6 py-3 rounded-lg font-bold border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
              >
                Deactivate
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Input Field Component
// ============================================================================

interface InputFieldProps {
  label: string
  value: any
  onChange: (value: any) => void
  type?: string
  placeholder?: string
  hint?: string
  rightElement?: React.ReactNode
}

function InputField({ label, value, onChange, type = 'text', placeholder, hint, rightElement }: InputFieldProps) {
  return (
    <div>
      <label className="block text-slate-300 text-sm font-medium mb-2">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-background-dark border border-border-dark rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary transition-all pr-12"
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {hint && <p className="text-slate-500 text-xs mt-1.5">{hint}</p>}
    </div>
  )
}
