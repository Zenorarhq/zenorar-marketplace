'use client'

import { useState, useRef } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'

type SettingsTab = 'general' | 'security' | 'notifications' | 'payments' | 'api'

const tabs: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'payments', label: 'Payments', icon: 'credit-card' },
  { id: 'api', label: 'API Keys', icon: 'key' },
]

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [saving, setSaving] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  const handleTabClick = (tabId: SettingsTab, index: number) => {
    setActiveTab(tabId)
    // Scroll the clicked tab into view within the container
    if (tabsRef.current) {
      const container = tabsRef.current
      const tabElements = container.children
      if (tabElements[index]) {
        const tab = tabElements[index] as HTMLElement
        const scrollLeft = tab.offsetLeft - container.offsetWidth / 2 + tab.offsetWidth / 2
        container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' })
      }
    }
  }

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'Zenorar Marketplace',
    siteDescription: 'Premium digital marketplace for scripts, plugins, and eSIMs',
    supportEmail: 'support@zenorar.com',
    timezone: 'UTC',
    currency: 'USD',
    maintenanceMode: false,
  })

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    sessionTimeout: '30',
    ipWhitelist: '',
    loginAttempts: '5',
    passwordExpiry: '90',
  })

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailNewOrder: true,
    emailNewUser: true,
    emailLowStock: false,
    emailTicket: true,
    pushEnabled: true,
    slackWebhook: '',
  })

  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState({
    stripeEnabled: true,
    stripePublicKey: 'pk_live_xxxxxxxxxxxxx',
    cryptoEnabled: true,
    paypalEnabled: false,
    autoWithdraw: false,
    withdrawThreshold: '100',
  })

  // API Settings State
  const [apiSettings, setApiSettings] = useState({
    apiEnabled: true,
    rateLimit: '1000',
    webhookUrl: '',
    apiKeys: [
      { id: '1', name: 'Production API Key', key: 'sk_live_xxxx...xxxx', created: '2024-01-15', lastUsed: '2 hours ago' },
      { id: '2', name: 'Development Key', key: 'sk_test_xxxx...xxxx', created: '2024-02-01', lastUsed: '5 days ago' },
    ],
  })

  const handleSave = async () => {
    setSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
  }

  return (
    <AdminLayout>
      <div className="max-w-full overflow-hidden">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1">Settings</h1>
          <p className="text-slate-500 text-xs sm:text-sm">Manage your marketplace configuration and preferences</p>
        </div>

        {/* Tabs Navigation - Pill style like Reports page */}
        <div
          ref={tabsRef}
          className="flex gap-2 mb-6 overflow-x-auto max-w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, index)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-primary text-black'
                  : 'bg-[#1a1a1a] text-slate-400 hover:text-white border border-[#2a2a2a]'
              }`}
            >
              <Icon name={tab.icon} size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-4 sm:p-6 mb-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Site Name</label>
                  <input
                    type="text"
                    value={generalSettings.siteName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Support Email</label>
                  <input
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Site Description</label>
                <textarea
                  value={generalSettings.siteDescription}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })}
                  rows={3}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Timezone</label>
                  <select
                    value={generalSettings.timezone}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Currency</label>
                  <select
                    value={generalSettings.currency}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, currency: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="BTC">BTC (₿)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                <div>
                  <p className="text-white font-medium">Maintenance Mode</p>
                  <p className="text-slate-500 text-sm">Temporarily disable the marketplace for visitors</p>
                </div>
                <button
                  onClick={() => setGeneralSettings({ ...generalSettings, maintenanceMode: !generalSettings.maintenanceMode })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    generalSettings.maintenanceMode ? 'bg-primary' : 'bg-[#2a2a2a]'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      generalSettings.maintenanceMode ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon name="shield" size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Two-Factor Authentication</p>
                    <p className="text-slate-500 text-sm">Require 2FA for all admin accounts</p>
                  </div>
                </div>
                <button
                  onClick={() => setSecuritySettings({ ...securitySettings, twoFactorAuth: !securitySettings.twoFactorAuth })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    securitySettings.twoFactorAuth ? 'bg-primary' : 'bg-[#2a2a2a]'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      securitySettings.twoFactorAuth ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Max Login Attempts</label>
                  <input
                    type="number"
                    value={securitySettings.loginAttempts}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, loginAttempts: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Password Expiry (days)</label>
                <input
                  type="number"
                  value={securitySettings.passwordExpiry}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, passwordExpiry: e.target.value })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                  placeholder="0 to disable"
                />
                <p className="text-slate-500 text-xs">Set to 0 to disable password expiration</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">IP Whitelist</label>
                <textarea
                  value={securitySettings.ipWhitelist}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, ipWhitelist: e.target.value })}
                  rows={3}
                  placeholder="Enter IP addresses, one per line..."
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 resize-none font-mono text-sm"
                />
                <p className="text-slate-500 text-xs">Leave empty to allow all IPs</p>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-white font-medium">Email Notifications</h3>

                {[
                  { key: 'emailNewOrder', label: 'New Order', description: 'Receive email when a new order is placed' },
                  { key: 'emailNewUser', label: 'New User Registration', description: 'Receive email when a new user signs up' },
                  { key: 'emailLowStock', label: 'Low Stock Alert', description: 'Receive email when product stock is low' },
                  { key: 'emailTicket', label: 'Support Ticket', description: 'Receive email for new support tickets' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                    <div>
                      <p className="text-white font-medium">{item.label}</p>
                      <p className="text-slate-500 text-sm">{item.description}</p>
                    </div>
                    <button
                      onClick={() => setNotificationSettings({ ...notificationSettings, [item.key]: !notificationSettings[item.key as keyof typeof notificationSettings] })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notificationSettings[item.key as keyof typeof notificationSettings] ? 'bg-primary' : 'bg-[#2a2a2a]'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          notificationSettings[item.key as keyof typeof notificationSettings] ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#2a2a2a]">
                <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Icon name="bell" size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Push Notifications</p>
                      <p className="text-slate-500 text-sm">Enable browser push notifications</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotificationSettings({ ...notificationSettings, pushEnabled: !notificationSettings.pushEnabled })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      notificationSettings.pushEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        notificationSettings.pushEnabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Slack Webhook URL</label>
                  <input
                    type="url"
                    value={notificationSettings.slackWebhook}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, slackWebhook: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                  />
                  <p className="text-slate-500 text-xs">Send notifications to a Slack channel</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Settings */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Stripe */}
              <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Icon name="credit-card" size={20} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Stripe</p>
                      <p className="text-slate-500 text-sm">Accept credit card payments</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPaymentSettings({ ...paymentSettings, stripeEnabled: !paymentSettings.stripeEnabled })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      paymentSettings.stripeEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        paymentSettings.stripeEnabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {paymentSettings.stripeEnabled && (
                  <div className="space-y-2 pt-4 border-t border-[#2a2a2a]">
                    <label className="text-sm font-medium text-slate-300">Publishable Key</label>
                    <input
                      type="text"
                      value={paymentSettings.stripePublicKey}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, stripePublicKey: e.target.value })}
                      className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-primary/50"
                    />
                  </div>
                )}
              </div>

              {/* Crypto */}
              <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Icon name="bitcoin" size={20} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Cryptocurrency</p>
                      <p className="text-slate-500 text-sm">Accept BTC, ETH, USDT payments</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPaymentSettings({ ...paymentSettings, cryptoEnabled: !paymentSettings.cryptoEnabled })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      paymentSettings.cryptoEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        paymentSettings.cryptoEnabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* PayPal */}
              <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Icon name="wallet" size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">PayPal</p>
                      <p className="text-slate-500 text-sm">Accept PayPal payments</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPaymentSettings({ ...paymentSettings, paypalEnabled: !paymentSettings.paypalEnabled })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      paymentSettings.paypalEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        paymentSettings.paypalEnabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Auto Withdraw */}
              <div className="pt-4 border-t border-[#2a2a2a]">
                <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] mb-4">
                  <div>
                    <p className="text-white font-medium">Auto Withdraw</p>
                    <p className="text-slate-500 text-sm">Automatically withdraw funds when threshold is reached</p>
                  </div>
                  <button
                    onClick={() => setPaymentSettings({ ...paymentSettings, autoWithdraw: !paymentSettings.autoWithdraw })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      paymentSettings.autoWithdraw ? 'bg-primary' : 'bg-[#2a2a2a]'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        paymentSettings.autoWithdraw ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {paymentSettings.autoWithdraw && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Withdrawal Threshold ($)</label>
                    <input
                      type="number"
                      value={paymentSettings.withdrawThreshold}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, withdrawThreshold: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* API Settings */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon name="code" size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-white font-medium">API Access</p>
                    <p className="text-slate-500 text-sm">Enable API access for third-party integrations</p>
                  </div>
                </div>
                <button
                  onClick={() => setApiSettings({ ...apiSettings, apiEnabled: !apiSettings.apiEnabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    apiSettings.apiEnabled ? 'bg-primary' : 'bg-[#2a2a2a]'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      apiSettings.apiEnabled ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {apiSettings.apiEnabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Rate Limit (requests/hour)</label>
                      <input
                        type="number"
                        value={apiSettings.rateLimit}
                        onChange={(e) => setApiSettings({ ...apiSettings, rateLimit: e.target.value })}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Webhook URL</label>
                      <input
                        type="url"
                        value={apiSettings.webhookUrl}
                        onChange={(e) => setApiSettings({ ...apiSettings, webhookUrl: e.target.value })}
                        placeholder="https://your-server.com/webhook"
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>

                  {/* API Keys Table */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-medium">API Keys</h3>
                      <button className="bg-primary hover:bg-primary/90 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                        <Icon name="add" size={16} />
                        Generate New Key
                      </button>
                    </div>

                    <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      <table className="w-full min-w-[500px]">
                        <thead>
                          <tr className="border-b border-[#2a2a2a]">
                            <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Name</th>
                            <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Key</th>
                            <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Created</th>
                            <th className="text-left text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Last Used</th>
                            <th className="text-right text-slate-500 text-xs font-medium px-5 py-3 uppercase tracking-wide">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apiSettings.apiKeys.map((apiKey) => (
                            <tr key={apiKey.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/5">
                              <td className="px-5 py-4 text-white text-sm">{apiKey.name}</td>
                              <td className="px-5 py-4">
                                <code className="text-slate-400 text-sm bg-[#141414] px-2 py-1 rounded">{apiKey.key}</code>
                              </td>
                              <td className="px-5 py-4 text-slate-400 text-sm">{apiKey.created}</td>
                              <td className="px-5 py-4 text-slate-500 text-sm">{apiKey.lastUsed}</td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                                    <Icon name="copy" size={16} />
                                  </button>
                                  <button className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                    <Icon name="trash" size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mt-6">
          <button className="px-4 sm:px-6 py-2.5 sm:py-3 text-slate-400 hover:text-white transition-colors text-sm sm:text-base order-2 sm:order-1">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-black font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base order-1 sm:order-2"
          >
            {saving ? (
              <>
                <Icon name="loading" size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Icon name="check" size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}
