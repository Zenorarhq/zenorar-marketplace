'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api/client'
import Icon from '@/components/ui/Icon'

interface PricingSettings {
  durationMultiplier1d: number
  durationMultiplier7d: number
  durationMultiplier30d: number
  numberMarkupPercent: number
  minuteMarkupPercent: number
  minPrice1d: number
  minPrice7d: number
  minPrice30d: number
  smsLimit1d: number
  smsLimit7d: number
  smsLimit30d: number
  businessAddon1d: number
  businessAddon7d: number
  businessAddon30d: number
  minutePackages: { minutes: number; basePrice: number }[]
}

interface ProviderConfig {
  id: string
  name: string
  slug: string
  isEnabled: boolean
  isDefault: boolean
  hasCredentials: boolean
  accountSid?: string
  supportsSms: boolean
  supportsVoice: boolean
  supportsMms: boolean
  healthStatus: string
}

export default function VirtualNumberPricingSection() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [pricing, setPricing] = useState<PricingSettings>({
    durationMultiplier1d: 20,
    durationMultiplier7d: 50,
    durationMultiplier30d: 100,
    numberMarkupPercent: 500,
    minuteMarkupPercent: 300,
    minPrice1d: 2,
    minPrice7d: 5,
    minPrice30d: 10,
    smsLimit1d: 50,
    smsLimit7d: 200,
    smsLimit30d: 500,
    businessAddon1d: 3,
    businessAddon7d: 12,
    businessAddon30d: 30,
    minutePackages: [
      { minutes: 30, basePrice: 0.81 },
      { minutes: 60, basePrice: 1.62 },
      { minutes: 120, basePrice: 3.24 },
    ],
  })

  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)

  // Provider credential editing
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [providerCreds, setProviderCreds] = useState({
    accountSid: '',
    authToken: '',
    apiKey: '',
    apiSecret: '',
  })

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState({
    pricing: true,
    providers: false,
    minuteTiers: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await apiFetch<{ pricing: PricingSettings; providers: ProviderConfig[] }>(
        '/admin/virtual-numbers/settings'
      )
      if (res.success && res.data) {
        setPricing(res.data.pricing)
        setProviders(res.data.providers || [])
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
    setLoading(false)
  }

  const savePricing = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await apiFetch('/admin/virtual-numbers/settings', {
        method: 'PUT',
        body: JSON.stringify({ pricing }),
      })
      if (res.success) {
        setMessage({ type: 'success', text: 'Pricing settings saved' })
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to save' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save' })
    }
    setSaving(false)
  }

  const saveProvider = async (slug: string, updates: any) => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await apiFetch('/admin/virtual-numbers/settings', {
        method: 'PUT',
        body: JSON.stringify({ provider: { slug, ...updates } }),
      })
      if (res.success) {
        setMessage({ type: 'success', text: 'Provider settings saved' })
        setEditingProvider(null)
        loadSettings() // Refresh
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to save' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save' })
    }
    setSaving(false)
  }

  const toggleProviderEnabled = async (slug: string, enabled: boolean) => {
    await saveProvider(slug, { isEnabled: enabled })
  }

  const setDefaultProvider = async (slug: string) => {
    await saveProvider(slug, { isDefault: true })
  }

  // Calculate example prices
  const calculateExamplePrice = (baseCost: number, durationMultiplier: number, markup: number) => {
    const basePrice = baseCost * (durationMultiplier / 100) * (1 + markup / 100)
    return Math.max(basePrice, 0.01).toFixed(2)
  }

  if (loading) {
    return (
      <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
        }`}>
          <Icon name={message.type === 'success' ? 'check' : 'alert'} size={18} />
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Pricing Configuration */}
      <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
        <button
          onClick={() => toggleSection('pricing')}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="tag" size={24} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-lg">Pricing Configuration</p>
              <p className="text-slate-500 text-sm">Markups, duration multipliers, and minimum prices</p>
            </div>
          </div>
          <Icon
            name={expandedSections.pricing ? 'chevron-up' : 'chevron-down'}
            size={20}
            className="text-slate-400 flex-shrink-0"
          />
        </button>

        {expandedSections.pricing && (
          <div className="mt-6 pt-6 border-t border-[#1f1f1f] space-y-6">
            {/* Profit Markups */}
            <div>
              <h4 className="text-white font-medium mb-4">Profit Markups</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Number Markup %</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={pricing.numberMarkupPercent}
                      onChange={(e) => setPricing({ ...pricing, numberMarkupPercent: Number(e.target.value) })}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                  <p className="text-xs text-slate-600">500% = 6× the provider cost</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Minute Rate Markup %</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={pricing.minuteMarkupPercent}
                      onChange={(e) => setPricing({ ...pricing, minuteMarkupPercent: Number(e.target.value) })}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                  <p className="text-xs text-slate-600">300% = 4× the per-minute cost</p>
                </div>
              </div>
            </div>

            {/* Duration Multipliers */}
            <div>
              <h4 className="text-white font-medium mb-4">Duration Multipliers</h4>
              <p className="text-slate-500 text-sm mb-4">What percentage of monthly provider cost to charge per duration</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">24 Hours</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={pricing.durationMultiplier1d}
                      onChange={(e) => setPricing({ ...pricing, durationMultiplier1d: Number(e.target.value) })}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">7 Days</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={pricing.durationMultiplier7d}
                      onChange={(e) => setPricing({ ...pricing, durationMultiplier7d: Number(e.target.value) })}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">30 Days</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={pricing.durationMultiplier30d}
                      onChange={(e) => setPricing({ ...pricing, durationMultiplier30d: Number(e.target.value) })}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Minimum Prices */}
            <div>
              <h4 className="text-white font-medium mb-4">Minimum Prices (Floor)</h4>
              <p className="text-slate-500 text-sm mb-4">Final price will never be lower than these values</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">24 Hours Min</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={pricing.minPrice1d}
                      onChange={(e) => setPricing({ ...pricing, minPrice1d: Number(e.target.value) })}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">7 Days Min</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={pricing.minPrice7d}
                      onChange={(e) => setPricing({ ...pricing, minPrice7d: Number(e.target.value) })}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">30 Days Min</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={pricing.minPrice30d}
                      onChange={(e) => setPricing({ ...pricing, minPrice30d: Number(e.target.value) })}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SMS Limits */}
            <div>
              <h4 className="text-white font-medium mb-4">SMS Limits (Basic Plan)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">24 Hours</label>
                  <input
                    type="number"
                    value={pricing.smsLimit1d}
                    onChange={(e) => setPricing({ ...pricing, smsLimit1d: Number(e.target.value) })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">7 Days</label>
                  <input
                    type="number"
                    value={pricing.smsLimit7d}
                    onChange={(e) => setPricing({ ...pricing, smsLimit7d: Number(e.target.value) })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">30 Days</label>
                  <input
                    type="number"
                    value={pricing.smsLimit30d}
                    onChange={(e) => setPricing({ ...pricing, smsLimit30d: Number(e.target.value) })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>
            </div>

            {/* Business Plan Addons */}
            <div>
              <h4 className="text-white font-medium mb-4">Business Plan Add-ons</h4>
              <p className="text-slate-500 text-sm mb-4">Extra charge on top of Basic price for voice/forwarding</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">24 Hours Add-on</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">+$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={pricing.businessAddon1d}
                      onChange={(e) => setPricing({ ...pricing, businessAddon1d: Number(e.target.value) })}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">7 Days Add-on</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">+$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={pricing.businessAddon7d}
                      onChange={(e) => setPricing({ ...pricing, businessAddon7d: Number(e.target.value) })}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">30 Days Add-on</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">+$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={pricing.businessAddon30d}
                      onChange={(e) => setPricing({ ...pricing, businessAddon30d: Number(e.target.value) })}
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Price Preview */}
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Price Preview (assuming $1/mo provider cost)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 mb-1">24hr Basic</p>
                  <p className="text-primary font-bold">
                    ${Math.max(
                      Number(calculateExamplePrice(1, pricing.durationMultiplier1d, pricing.numberMarkupPercent)),
                      pricing.minPrice1d
                    ).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">7d Basic</p>
                  <p className="text-primary font-bold">
                    ${Math.max(
                      Number(calculateExamplePrice(1, pricing.durationMultiplier7d, pricing.numberMarkupPercent)),
                      pricing.minPrice7d
                    ).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">30d Basic</p>
                  <p className="text-primary font-bold">
                    ${Math.max(
                      Number(calculateExamplePrice(1, pricing.durationMultiplier30d, pricing.numberMarkupPercent)),
                      pricing.minPrice30d
                    ).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">24hr Business</p>
                  <p className="text-blue-400 font-bold">
                    ${(Math.max(
                      Number(calculateExamplePrice(1, pricing.durationMultiplier1d, pricing.numberMarkupPercent)),
                      pricing.minPrice1d
                    ) + pricing.businessAddon1d).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">7d Business</p>
                  <p className="text-blue-400 font-bold">
                    ${(Math.max(
                      Number(calculateExamplePrice(1, pricing.durationMultiplier7d, pricing.numberMarkupPercent)),
                      pricing.minPrice7d
                    ) + pricing.businessAddon7d).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">30d Business</p>
                  <p className="text-blue-400 font-bold">
                    ${(Math.max(
                      Number(calculateExamplePrice(1, pricing.durationMultiplier30d, pricing.numberMarkupPercent)),
                      pricing.minPrice30d
                    ) + pricing.businessAddon30d).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={savePricing}
                disabled={saving}
                className="px-6 py-3 bg-primary text-black font-bold rounded-lg hover:brightness-105 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Pricing Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Providers Configuration */}
      <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
        <button
          onClick={() => toggleSection('providers')}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Icon name="server" size={24} className="text-blue-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-lg">Phone Number Providers</p>
              <p className="text-slate-500 text-sm">Configure Twilio, Vonage, Plivo, and other providers</p>
            </div>
          </div>
          <Icon
            name={expandedSections.providers ? 'chevron-up' : 'chevron-down'}
            size={20}
            className="text-slate-400 flex-shrink-0"
          />
        </button>

        {expandedSections.providers && (
          <div className="mt-6 pt-6 border-t border-[#1f1f1f] space-y-4">
            <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Icon name="info" size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-300 text-sm">
                    <strong className="text-white">Multi-Provider System:</strong> Enable multiple providers for redundancy.
                    The default provider is used for auto-purchasing numbers. Other enabled providers can be used as fallbacks.
                  </p>
                </div>
              </div>
            </div>

            {providers.map((provider) => (
              <div
                key={provider.slug}
                className={`border rounded-lg p-4 transition-all ${
                  provider.isDefault
                    ? 'border-primary bg-primary/5'
                    : provider.isEnabled
                    ? 'border-green-500/50 bg-green-500/5'
                    : 'border-[#2a2a2a] bg-[#1a1a1a]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      provider.slug === 'twilio' ? 'bg-red-500/10' :
                      provider.slug === 'vonage' ? 'bg-purple-500/10' :
                      provider.slug === 'plivo' ? 'bg-green-500/10' :
                      provider.slug === 'bandwidth' ? 'bg-blue-500/10' :
                      'bg-slate-500/10'
                    }`}>
                      <Icon name="phone" size={20} className={
                        provider.slug === 'twilio' ? 'text-red-400' :
                        provider.slug === 'vonage' ? 'text-purple-400' :
                        provider.slug === 'plivo' ? 'text-green-400' :
                        provider.slug === 'bandwidth' ? 'text-blue-400' :
                        'text-slate-400'
                      } />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{provider.name}</p>
                        {provider.isDefault && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Default</span>
                        )}
                        {provider.isEnabled && !provider.isDefault && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Enabled</span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm">
                        {provider.hasCredentials ? 'Credentials configured' : 'No credentials set'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Health Status */}
                    <div className={`w-2 h-2 rounded-full ${
                      provider.healthStatus === 'healthy' ? 'bg-green-400' :
                      provider.healthStatus === 'degraded' ? 'bg-yellow-400' :
                      provider.healthStatus === 'down' ? 'bg-red-400' :
                      'bg-slate-400'
                    }`} title={provider.healthStatus} />

                    {/* Toggle Enable */}
                    <button
                      onClick={() => toggleProviderEnabled(provider.slug, !provider.isEnabled)}
                      disabled={saving}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        provider.isEnabled ? 'bg-green-500' : 'bg-[#2a2a2a]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          provider.isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>

                    {/* Configure Button */}
                    <button
                      onClick={() => setExpandedProvider(expandedProvider === provider.slug ? null : provider.slug)}
                      className="text-slate-400 hover:text-white"
                    >
                      <Icon name="settings" size={18} />
                    </button>
                  </div>
                </div>

                {/* Expanded Configuration */}
                {expandedProvider === provider.slug && (
                  <div className="mt-4 pt-4 border-t border-[#2a2a2a] space-y-4">
                    {/* Twilio-specific fields */}
                    {provider.slug === 'twilio' && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Account SID</label>
                            <input
                              type="text"
                              defaultValue={provider.accountSid}
                              placeholder="ACxxxxxxxxxxxxxxx"
                              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Auth Token</label>
                            <input
                              type="password"
                              placeholder="Enter auth token"
                              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-slate-600">
                          Get credentials at <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.twilio.com</a>
                        </p>
                      </>
                    )}

                    {/* Generic API key fields for other providers */}
                    {provider.slug !== 'twilio' && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">API Key</label>
                            <input
                              type="text"
                              placeholder="Enter API key"
                              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">API Secret</label>
                            <input
                              type="password"
                              placeholder="Enter API secret"
                              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-slate-600">
                          Provider integration coming soon. Contact support for early access.
                        </p>
                      </>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        {!provider.isDefault && provider.isEnabled && (
                          <button
                            onClick={() => setDefaultProvider(provider.slug)}
                            disabled={saving}
                            className="text-sm text-primary hover:underline"
                          >
                            Set as Default
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          // Would save the provider credentials here
                          setExpandedProvider(null)
                        }}
                        className="px-4 py-2 bg-primary text-black font-bold rounded-lg text-sm hover:brightness-105"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Minute Tiers Configuration */}
      <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-6">
        <button
          onClick={() => toggleSection('minuteTiers')}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Icon name="clock" size={24} className="text-green-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-lg">Minute Packages</p>
              <p className="text-slate-500 text-sm">Call forwarding minute tiers for Business plans</p>
            </div>
          </div>
          <Icon
            name={expandedSections.minuteTiers ? 'chevron-up' : 'chevron-down'}
            size={20}
            className="text-slate-400 flex-shrink-0"
          />
        </button>

        {expandedSections.minuteTiers && (
          <div className="mt-6 pt-6 border-t border-[#1f1f1f] space-y-4">
            <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4">
              <p className="text-slate-400 text-sm">
                Base prices are the provider cost (Twilio: ~$0.027/min for US calls).
                Final price = Base × (1 + Minute Markup %)
              </p>
            </div>

            {pricing.minutePackages.map((pkg, idx) => {
              const finalPrice = Math.ceil(pkg.basePrice * (1 + pricing.minuteMarkupPercent / 100))
              return (
                <div key={idx} className="flex items-center gap-4 p-4 bg-[#1a1a1a] rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Minutes</label>
                      <input
                        type="number"
                        value={pkg.minutes}
                        onChange={(e) => {
                          const newPackages = [...pricing.minutePackages]
                          newPackages[idx].minutes = Number(e.target.value)
                          setPricing({ ...pricing, minutePackages: newPackages })
                        }}
                        className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Base Cost</label>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={pkg.basePrice}
                          onChange={(e) => {
                            const newPackages = [...pricing.minutePackages]
                            newPackages[idx].basePrice = Number(e.target.value)
                            setPricing({ ...pricing, minutePackages: newPackages })
                          }}
                          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Final Price</label>
                      <p className="text-lg font-bold text-green-400 py-2">${finalPrice}</p>
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="flex justify-end">
              <button
                onClick={savePricing}
                disabled={saving}
                className="px-6 py-3 bg-primary text-black font-bold rounded-lg hover:brightness-105 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Minute Packages'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
