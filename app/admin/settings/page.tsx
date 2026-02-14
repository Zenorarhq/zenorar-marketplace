'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { profileApi } from '@/lib/api/profile'
import { settingsApi } from '@/lib/api/settings'
import { mediaApi } from '@/lib/api/media'
import { apiFetch } from '@/lib/api/client'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'

type SettingsTab = 'profile' | 'general' | 'security' | 'notifications' | 'payments' | 'api'

const tabs: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'payments', label: 'Payments', icon: 'credit-card' },
  { id: 'api', label: 'API Keys', icon: 'key' },
]

export default function AdminSettingsPage() {
  const { user, updateUser, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  // Profile Settings State
  const [profileSettings, setProfileSettings] = useState({
    name: user?.name || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Sync profile settings with user data
  useEffect(() => {
    if (user) {
      setProfileSettings((prev) => ({
        ...prev,
        name: user.name,
      }))
    }
  }, [user])

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
    timezone: 'auto',
    currency: 'USD',
    maintenanceMode: false,
    logoUrl: '',
    logoMediaId: '',
    faviconUrl: '',
    faviconMediaId: '',
    promoBannerCode: '',
  })
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)

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

  // Send Notification State
  const [sendNotif, setSendNotif] = useState({ type: 'SYSTEM' as 'SYSTEM' | 'PROMOTIONAL', title: '', message: '' })
  const [sendingNotif, setSendingNotif] = useState(false)

  // Sent Notifications State
  const [sentNotifications, setSentNotifications] = useState<any[]>([])
  const [loadingSent, setLoadingSent] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null)
  const [recipients, setRecipients] = useState<any[]>([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)

  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState({
    stripeEnabled: false,
    stripeMode: 'test' as 'test' | 'live',
    stripeTestPublicKey: '',
    stripeTestSecretKey: '',
    stripeTestWebhookSecret: '',
    stripeLivePublicKey: '',
    stripeLiveSecretKey: '',
    stripeLiveWebhookSecret: '',
    cryptoEnabled: false,
    paypalEnabled: false,
    autoWithdraw: false,
    withdrawThreshold: '100',
  })
  const [showStripeSecrets, setShowStripeSecrets] = useState<Record<string, boolean>>({})

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

  // Twilio Settings State
  const [twilioSettings, setTwilioSettings] = useState({
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_phone_number: '',
  })
  const [twilioSaving, setTwilioSaving] = useState(false)

  // Load general settings from API on mount
  useEffect(() => {
    settingsApi.getSettingsByGroup('general').then((res) => {
      if (res.success && res.data) {
        const d = res.data
        setGeneralSettings((prev) => ({
          ...prev,
          siteName: d.siteName ?? prev.siteName,
          siteDescription: d.siteDescription ?? prev.siteDescription,
          supportEmail: d.supportEmail ?? prev.supportEmail,
          timezone: d.timezone ?? prev.timezone,
          currency: d.currency ?? prev.currency,
          maintenanceMode: d.maintenanceMode ?? prev.maintenanceMode,
          logoUrl: d.logoUrl ?? prev.logoUrl,
          logoMediaId: d.logoMediaId ?? prev.logoMediaId,
          faviconUrl: d.faviconUrl ?? prev.faviconUrl,
          faviconMediaId: d.faviconMediaId ?? prev.faviconMediaId,
          promoBannerCode: d.promoBannerCode ?? prev.promoBannerCode,
        }))
      }
    })
  }, [])

  // Load security settings from API on mount
  useEffect(() => {
    settingsApi.getSettingsByGroup('security').then((res) => {
      if (res.success && res.data) {
        const d = res.data
        setSecuritySettings((prev) => ({
          ...prev,
          twoFactorAuth: d.twoFactorAuth ?? prev.twoFactorAuth,
          sessionTimeout: d.sessionTimeout ?? prev.sessionTimeout,
          loginAttempts: d.loginAttempts ?? prev.loginAttempts,
          passwordExpiry: d.passwordExpiry ?? prev.passwordExpiry,
          ipWhitelist: d.ipWhitelist ?? prev.ipWhitelist,
        }))
      }
    })
  }, [])

  // Load notification settings from API on mount
  useEffect(() => {
    settingsApi.getSettingsByGroup('notifications').then((res) => {
      if (res.success && res.data) {
        const d = res.data
        setNotificationSettings((prev) => ({
          ...prev,
          emailNewOrder: d.emailNewOrder ?? prev.emailNewOrder,
          emailNewUser: d.emailNewUser ?? prev.emailNewUser,
          emailLowStock: d.emailLowStock ?? prev.emailLowStock,
          emailTicket: d.emailTicket ?? prev.emailTicket,
          pushEnabled: d.pushEnabled ?? prev.pushEnabled,
          slackWebhook: d.slackWebhook ?? prev.slackWebhook,
        }))
      }
    })
    // Load sent notifications
    fetchSentNotifications()
    // Load payment settings
    settingsApi.getSettingsByGroup('payments').then((res) => {
      if (res.success && res.data) {
        const d = res.data
        setPaymentSettings((prev) => ({
          ...prev,
          stripeEnabled: d.stripeEnabled ?? prev.stripeEnabled,
          stripeMode: d.stripeMode ?? prev.stripeMode,
          stripeTestPublicKey: d.stripeTestPublicKey ?? prev.stripeTestPublicKey,
          stripeTestSecretKey: d.stripeTestSecretKey ?? prev.stripeTestSecretKey,
          stripeTestWebhookSecret: d.stripeTestWebhookSecret ?? prev.stripeTestWebhookSecret,
          stripeLivePublicKey: d.stripeLivePublicKey ?? prev.stripeLivePublicKey,
          stripeLiveSecretKey: d.stripeLiveSecretKey ?? prev.stripeLiveSecretKey,
          stripeLiveWebhookSecret: d.stripeLiveWebhookSecret ?? prev.stripeLiveWebhookSecret,
          cryptoEnabled: d.cryptoEnabled ?? prev.cryptoEnabled,
          paypalEnabled: d.paypalEnabled ?? prev.paypalEnabled,
          autoWithdraw: d.autoWithdraw ?? prev.autoWithdraw,
          withdrawThreshold: d.withdrawThreshold ?? prev.withdrawThreshold,
        }))
      }
    })
    // Load Twilio settings
    settingsApi.getSettingsByGroup('api').then((res) => {
      if (res.success && res.data) {
        const d = res.data
        setTwilioSettings((prev) => ({
          twilio_account_sid: d.twilio_account_sid ?? prev.twilio_account_sid,
          twilio_auth_token: d.twilio_auth_token ?? prev.twilio_auth_token,
          twilio_phone_number: d.twilio_phone_number ?? prev.twilio_phone_number,
        }))
      }
    })
  }, [])

  // Fetch sent notifications
  const fetchSentNotifications = async () => {
    setLoadingSent(true)
    try {
      const data = await apiFetch<any[]>('/notifications/sent?limit=20')
      if (data.success) {
        setSentNotifications(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch sent notifications:', error)
    }
    setLoadingSent(false)
  }

  // Fetch recipients for a batch
  const fetchRecipients = async (batchId: string) => {
    setLoadingRecipients(true)
    try {
      const data = await apiFetch<any[]>(`/notifications/sent/${batchId}/recipients`)
      if (data.success) {
        setRecipients(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch recipients:', error)
    }
    setLoadingRecipients(false)
  }

  // Delete a notification batch
  const deleteBatch = async (batchId: string) => {
    if (!confirm('Are you sure? This will delete this notification from all users.')) return
    try {
      const data = await apiFetch<{ count: number }>(`/notifications/sent/${batchId}`, {
        method: 'DELETE',
      })
      if (data.success) {
        setMessage({ type: 'success', text: `Deleted ${data.data?.count || 0} notifications` })
        fetchSentNotifications() // Refresh list
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete notification batch' })
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Avatar file size must be less than 5MB' })
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Avatar must be an image file' })
      return
    }

    setSaving(true)
    setMessage(null)

    // Remove old avatar from Cloudinary before uploading new one
    if (user?.avatar) {
      await profileApi.removeAvatar()
    }
    const result = await profileApi.uploadAvatar(file)

    if (result.success && result.data) {
      updateUser(result.data)
      setMessage({ type: 'success', text: 'Avatar updated successfully!' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to upload avatar' })
    }

    setSaving(false)
  }

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your avatar?')) return

    setSaving(true)
    setMessage(null)

    const result = await profileApi.removeAvatar()

    if (result.success && result.data) {
      updateUser(result.data)
      setMessage({ type: 'success', text: 'Avatar removed successfully!' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to remove avatar' })
    }

    setSaving(false)
  }

  const handleUpdateProfile = async () => {
    if (!profileSettings.name.trim()) {
      setMessage({ type: 'error', text: 'Name is required' })
      return
    }

    setSaving(true)
    setMessage(null)

    const result = await profileApi.update({ name: profileSettings.name })

    if (result.success && result.data) {
      updateUser(result.data)
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update profile' })
    }

    setSaving(false)
  }

  const handleUpdatePassword = async () => {
    // Validate inputs
    if (!profileSettings.currentPassword) {
      setMessage({ type: 'error', text: 'Current password is required' })
      return
    }

    if (!profileSettings.newPassword) {
      setMessage({ type: 'error', text: 'New password is required' })
      return
    }

    if (profileSettings.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }

    if (profileSettings.newPassword !== profileSettings.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    setSaving(true)
    setMessage(null)

    const result = await profileApi.updatePassword({
      currentPassword: profileSettings.currentPassword,
      newPassword: profileSettings.newPassword,
    })

    if (result.success) {
      // Update password_changed_at timestamp for expiry tracking
      apiFetch('/auth/password-changed', {
        method: 'POST',
      }).catch(() => {}) // Non-critical
      setMessage({ type: 'success', text: 'Password updated successfully!' })
      setProfileSettings({
        ...profileSettings,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update password' })
    }

    setSaving(false)
  }

  // Logo upload handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Logo file must be less than 5MB' })
      return
    }
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Logo must be an image file' })
      return
    }
    setUploadingLogo(true)
    setMessage(null)
    const result = await mediaApi.upload(file, { title: 'Site Logo' })
    if (result.success && result.data) {
      setGeneralSettings((prev) => ({ ...prev, logoUrl: result.data!.url, logoMediaId: result.data!.id }))
      setMessage({ type: 'success', text: 'Logo uploaded! Click Save Changes to apply.' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to upload logo' })
    }
    setUploadingLogo(false)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  // Favicon upload handler
  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Favicon file must be less than 2MB' })
      return
    }
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Favicon must be an image file' })
      return
    }
    setUploadingFavicon(true)
    setMessage(null)
    const result = await mediaApi.upload(file, { title: 'Site Favicon' })
    if (result.success && result.data) {
      setGeneralSettings((prev) => ({ ...prev, faviconUrl: result.data!.url, faviconMediaId: result.data!.id }))
      setMessage({ type: 'success', text: 'Favicon uploaded! Click Save Changes to apply.' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to upload favicon' })
    }
    setUploadingFavicon(false)
    if (faviconInputRef.current) faviconInputRef.current.value = ''
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    const settingsToSave = [
      { key: 'siteName', value: generalSettings.siteName, group: 'general', isPublic: true },
      { key: 'siteDescription', value: generalSettings.siteDescription, group: 'general', isPublic: true },
      { key: 'supportEmail', value: generalSettings.supportEmail, group: 'general', isPublic: true },
      { key: 'timezone', value: generalSettings.timezone, group: 'general', isPublic: true },
      { key: 'currency', value: generalSettings.currency, group: 'general', isPublic: true },
      { key: 'maintenanceMode', value: generalSettings.maintenanceMode, group: 'general', isPublic: true },
      { key: 'logoUrl', value: generalSettings.logoUrl, group: 'general', isPublic: true },
      { key: 'logoMediaId', value: generalSettings.logoMediaId, group: 'general', isPublic: false },
      { key: 'faviconUrl', value: generalSettings.faviconUrl, group: 'general', isPublic: true },
      { key: 'faviconMediaId', value: generalSettings.faviconMediaId, group: 'general', isPublic: false },
      { key: 'promoBannerCode', value: generalSettings.promoBannerCode, group: 'general', isPublic: true },
      // Security settings
      { key: 'twoFactorAuth', value: securitySettings.twoFactorAuth, group: 'security', isPublic: false },
      { key: 'sessionTimeout', value: securitySettings.sessionTimeout, group: 'security', isPublic: false },
      { key: 'loginAttempts', value: securitySettings.loginAttempts, group: 'security', isPublic: false },
      { key: 'passwordExpiry', value: securitySettings.passwordExpiry, group: 'security', isPublic: false },
      { key: 'ipWhitelist', value: securitySettings.ipWhitelist, group: 'security', isPublic: false },
      // Notification settings
      { key: 'emailNewOrder', value: notificationSettings.emailNewOrder, group: 'notifications', isPublic: false },
      { key: 'emailNewUser', value: notificationSettings.emailNewUser, group: 'notifications', isPublic: false },
      { key: 'emailLowStock', value: notificationSettings.emailLowStock, group: 'notifications', isPublic: false },
      { key: 'emailTicket', value: notificationSettings.emailTicket, group: 'notifications', isPublic: false },
      { key: 'pushEnabled', value: notificationSettings.pushEnabled, group: 'notifications', isPublic: false },
      { key: 'slackWebhook', value: notificationSettings.slackWebhook, group: 'notifications', isPublic: false },
      // Twilio API settings
      { key: 'twilio_account_sid', value: twilioSettings.twilio_account_sid, group: 'api', isPublic: false },
      { key: 'twilio_auth_token', value: twilioSettings.twilio_auth_token, group: 'api', isPublic: false },
      { key: 'twilio_phone_number', value: twilioSettings.twilio_phone_number, group: 'api', isPublic: false },
      // Payment settings
      { key: 'stripeEnabled', value: paymentSettings.stripeEnabled, group: 'payments', isPublic: false },
      { key: 'stripeMode', value: paymentSettings.stripeMode, group: 'payments', isPublic: false },
      { key: 'stripeTestPublicKey', value: paymentSettings.stripeTestPublicKey, group: 'payments', isPublic: false },
      { key: 'stripeTestSecretKey', value: paymentSettings.stripeTestSecretKey, group: 'payments', isPublic: false },
      { key: 'stripeTestWebhookSecret', value: paymentSettings.stripeTestWebhookSecret, group: 'payments', isPublic: false },
      { key: 'stripeLivePublicKey', value: paymentSettings.stripeLivePublicKey, group: 'payments', isPublic: false },
      { key: 'stripeLiveSecretKey', value: paymentSettings.stripeLiveSecretKey, group: 'payments', isPublic: false },
      { key: 'stripeLiveWebhookSecret', value: paymentSettings.stripeLiveWebhookSecret, group: 'payments', isPublic: false },
      { key: 'cryptoEnabled', value: paymentSettings.cryptoEnabled, group: 'payments', isPublic: false },
      { key: 'paypalEnabled', value: paymentSettings.paypalEnabled, group: 'payments', isPublic: false },
      { key: 'autoWithdraw', value: paymentSettings.autoWithdraw, group: 'payments', isPublic: false },
      { key: 'withdrawThreshold', value: paymentSettings.withdrawThreshold, group: 'payments', isPublic: false },
    ]

    const result = await settingsApi.updateSettings(settingsToSave)

    if (result.success) {
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to save settings' })
    }

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
          {/* Success/Error Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <Icon name="user" size={40} className="text-slate-600" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAvatarClick}
                      disabled={saving}
                      className="bg-[#1a1a1a] hover:bg-white/5 text-white text-xs px-3 py-1.5 rounded-lg transition-colors border border-[#2a2a2a] disabled:opacity-50"
                    >
                      Change
                    </button>
                    {user?.avatar && (
                      <button
                        onClick={handleRemoveAvatar}
                        disabled={saving}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-lg transition-colors border border-red-500/20 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 w-full space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Full Name</label>
                    <input
                      type="text"
                      value={profileSettings.name}
                      onChange={(e) => setProfileSettings({ ...profileSettings, name: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Email Address</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-500">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Role</label>
                    <input
                      type="text"
                      value={user?.role || ''}
                      disabled
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <button
                    onClick={handleUpdateProfile}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-[#2a2a2a] space-y-4">
                <h3 className="text-white font-medium mb-4">Change Password</h3>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Current Password</label>
                  <input
                    type="password"
                    value={profileSettings.currentPassword}
                    onChange={(e) => setProfileSettings({ ...profileSettings, currentPassword: e.target.value })}
                    placeholder="Enter your current password"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">New Password</label>
                    <input
                      type="password"
                      value={profileSettings.newPassword}
                      onChange={(e) => setProfileSettings({ ...profileSettings, newPassword: e.target.value })}
                      placeholder="Enter new password"
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Confirm New Password</label>
                    <input
                      type="password"
                      value={profileSettings.confirmPassword}
                      onChange={(e) => setProfileSettings({ ...profileSettings, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-400 text-sm">
                    <strong>Password requirements:</strong> At least 8 characters, including uppercase, lowercase, number, and special character.
                  </p>
                </div>

                <button
                  onClick={handleUpdatePassword}
                  disabled={saving || !profileSettings.currentPassword || !profileSettings.newPassword || !profileSettings.confirmPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          )}

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
                    <option value="auto">Default (User&apos;s Location)</option>
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Promo Banner Code</label>
                <input
                  type="text"
                  value={generalSettings.promoBannerCode}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, promoBannerCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. WELCOME10"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 font-mono"
                />
                <p className="text-slate-500 text-xs">Enter an active discount code to display on the homepage promo banner. Leave empty to hide the banner.</p>
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

              {/* Logo & Favicon Uploads */}
              <div className="pt-6 border-t border-[#2a2a2a]">
                <h3 className="text-white font-medium mb-4">Branding</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo Upload */}
                  <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
                    <p className="text-white font-medium mb-1">Site Logo</p>
                    <p className="text-slate-500 text-xs mb-4">Displayed in the header and footer. Recommended: 200-400px wide, 50-80px tall. PNG or SVG, max 5MB.</p>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-[#141414] border border-[#2a2a2a] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {generalSettings.logoUrl ? (
                          <img src={generalSettings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <Icon name="image" size={24} className="text-slate-600" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => logoInputRef.current?.click()}
                          disabled={uploadingLogo}
                          className="bg-[#222] hover:bg-white/5 text-white text-xs px-3 py-1.5 rounded-lg transition-colors border border-[#2a2a2a] disabled:opacity-50"
                        >
                          {uploadingLogo ? 'Uploading...' : generalSettings.logoUrl ? 'Change Logo' : 'Upload Logo'}
                        </button>
                        {generalSettings.logoUrl && (
                          <button
                            onClick={async () => {
                              if (generalSettings.logoMediaId) {
                                await mediaApi.delete(generalSettings.logoMediaId)
                              }
                              setGeneralSettings((prev) => ({ ...prev, logoUrl: '', logoMediaId: '' }))
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-lg transition-colors border border-red-500/20"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Favicon Upload */}
                  <div className="p-5 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
                    <p className="text-white font-medium mb-1">Favicon</p>
                    <p className="text-slate-500 text-xs mb-4">Browser tab icon. Recommended: 512x512px square. PNG or ICO, max 2MB.</p>
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFaviconUpload}
                      className="hidden"
                    />
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-[#141414] border border-[#2a2a2a] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {generalSettings.faviconUrl ? (
                          <img src={generalSettings.faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
                        ) : (
                          <Icon name="globe" size={24} className="text-slate-600" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => faviconInputRef.current?.click()}
                          disabled={uploadingFavicon}
                          className="bg-[#222] hover:bg-white/5 text-white text-xs px-3 py-1.5 rounded-lg transition-colors border border-[#2a2a2a] disabled:opacity-50"
                        >
                          {uploadingFavicon ? 'Uploading...' : generalSettings.faviconUrl ? 'Change Favicon' : 'Upload Favicon'}
                        </button>
                        {generalSettings.faviconUrl && (
                          <button
                            onClick={async () => {
                              if (generalSettings.faviconMediaId) {
                                await mediaApi.delete(generalSettings.faviconMediaId)
                              }
                              setGeneralSettings((prev) => ({ ...prev, faviconUrl: '', faviconMediaId: '' }))
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-lg transition-colors border border-red-500/20"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
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

              {/* Send Notification */}
              <div className="pt-4 border-t border-[#2a2a2a]">
                <h3 className="text-white font-medium mb-4">Send Notification</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Type</label>
                    <select
                      value={sendNotif.type}
                      onChange={(e) => setSendNotif({ ...sendNotif, type: e.target.value as 'SYSTEM' | 'PROMOTIONAL' })}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                    >
                      <option value="SYSTEM">System</option>
                      <option value="PROMOTIONAL">Promotional</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Title</label>
                    <input
                      type="text"
                      value={sendNotif.title}
                      onChange={(e) => setSendNotif({ ...sendNotif, title: e.target.value })}
                      placeholder="Notification title..."
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Message</label>
                    <textarea
                      value={sendNotif.message}
                      onChange={(e) => setSendNotif({ ...sendNotif, message: e.target.value })}
                      placeholder="Notification message..."
                      rows={3}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 resize-none"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!sendNotif.title || !sendNotif.message) {
                        setMessage({ type: 'error', text: 'Title and message are required' })
                        return
                      }
                      setSendingNotif(true)
                      setMessage(null)
                      try {
                        const data = await apiFetch<{ message: string }>('/notifications/broadcast', {
                          method: 'POST',
                          body: JSON.stringify(sendNotif),
                        })
                        if (data.success) {
                          setMessage({ type: 'success', text: data.data?.message || 'Notification sent!' })
                          setSendNotif({ type: 'SYSTEM', title: '', message: '' })
                          fetchSentNotifications() // Refresh sent notifications list
                        } else {
                          setMessage({ type: 'error', text: data.error || 'Failed to send notification' })
                        }
                      } catch {
                        setMessage({ type: 'error', text: 'Failed to send notification' })
                      }
                      setSendingNotif(false)
                    }}
                    disabled={sendingNotif}
                    className="w-full bg-primary hover:bg-primary/90 text-black font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {sendingNotif ? 'Sending...' : 'Send to All Users'}
                  </button>
                </div>
              </div>

              {/* Sent Notifications History */}
              <div className="pt-6 border-t border-[#2a2a2a]">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                    className="flex items-center gap-2 text-white font-medium hover:text-primary transition-colors"
                  >
                    <Icon name={isHistoryExpanded ? 'chevron-up' : 'chevron-down'} size={18} />
                    <span>Sent Notifications History</span>
                  </button>
                  <button
                    onClick={fetchSentNotifications}
                    disabled={loadingSent}
                    className="text-sm text-primary hover:text-primary/80 disabled:opacity-50"
                  >
                    {loadingSent ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {isHistoryExpanded && (
                  <>
                    {loadingSent ? (
                      <div className="text-center py-8 text-slate-500">Loading sent notifications...</div>
                    ) : sentNotifications.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">No notifications sent yet</div>
                    ) : (
                      <div className="space-y-2">
                        {sentNotifications.map((batch) => (
                          <div key={batch.batchId} className="p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      batch.type === 'PROMOTIONAL' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                                    }`}
                                  >
                                    {batch.type}
                                  </span>
                                  <span className="text-sm text-white font-medium truncate">{batch.title}</span>
                                </div>
                                <p className="text-sm text-slate-400 line-clamp-1">{batch.message}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                  <span>{batch.stats.total} recipients</span>
                                  <span
                                    className={`px-2 py-0.5 rounded ${
                                      batch.stats.unread > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                                    }`}
                                  >
                                    {batch.stats.unread} unread / {batch.stats.total} total
                                  </span>
                                  <span>{new Date(batch.sentAt).toLocaleString()}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedBatch(batch)
                                    fetchRecipients(batch.batchId)
                                  }}
                                  className="text-sm px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors"
                                >
                                  View Recipients
                                </button>
                                <button
                                  onClick={() => deleteBatch(batch.batchId)}
                                  className="text-sm px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Recipients Modal */}
              {selectedBatch && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedBatch(null)}>
                  <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] max-w-3xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="p-6 border-b border-[#2a2a2a]">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                selectedBatch.type === 'PROMOTIONAL' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              {selectedBatch.type}
                            </span>
                            <h3 className="text-lg font-medium text-white">{selectedBatch.title}</h3>
                          </div>
                          <p className="text-slate-400 text-sm mb-2">{selectedBatch.message}</p>
                          <p className="text-xs text-slate-500">Sent: {new Date(selectedBatch.sentAt).toLocaleString()}</p>
                        </div>
                        <button onClick={() => setSelectedBatch(null)} className="text-slate-400 hover:text-white">
                          <Icon name="x" size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[60vh]">
                      {loadingRecipients ? (
                        <div className="text-center py-8 text-slate-500">Loading recipients...</div>
                      ) : recipients.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">No recipients found</div>
                      ) : (
                        <div className="space-y-2">
                          {recipients.map((recipient) => (
                            <div key={recipient.id} className="flex items-center justify-between p-3 bg-[#141414] rounded-lg">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-white font-medium">{recipient.name || 'Unknown'}</span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      recipient.isRead ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                    }`}
                                  >
                                    {recipient.isRead ? 'Read' : 'Unread'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500">{recipient.email}</p>
                                {recipient.readAt && (
                                  <p className="text-xs text-slate-600 mt-0.5">Read: {new Date(recipient.readAt).toLocaleString()}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
                  <div className="space-y-4 pt-4 border-t border-[#2a2a2a]">
                    {/* Test / Live Toggle */}
                    <div className="flex items-center gap-3">
                      <div className="flex bg-[#141414] rounded-lg border border-[#2a2a2a] p-1">
                        <button
                          type="button"
                          onClick={() => setPaymentSettings({ ...paymentSettings, stripeMode: 'test' })}
                          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            paymentSettings.stripeMode === 'test'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Test Mode
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentSettings({ ...paymentSettings, stripeMode: 'live' })}
                          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            paymentSettings.stripeMode === 'live'
                              ? 'bg-green-500/20 text-green-400'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Live Mode
                        </button>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        paymentSettings.stripeMode === 'test'
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          : 'bg-green-500/10 text-green-400 border-green-500/20'
                      }`}>
                        {paymentSettings.stripeMode === 'test' ? 'TEST MODE' : 'LIVE'}
                      </span>
                    </div>

                    {/* Key Fields */}
                    {(() => {
                      const prefix = paymentSettings.stripeMode === 'test' ? 'stripeTest' : 'stripeLive'
                      const pkPlaceholder = paymentSettings.stripeMode === 'test' ? 'pk_test_...' : 'pk_live_...'
                      const skPlaceholder = paymentSettings.stripeMode === 'test' ? 'sk_test_...' : 'sk_live_...'
                      const fields = [
                        { key: `${prefix}PublicKey` as keyof typeof paymentSettings, label: 'Publishable Key', placeholder: pkPlaceholder, secret: false },
                        { key: `${prefix}SecretKey` as keyof typeof paymentSettings, label: 'Secret Key', placeholder: skPlaceholder, secret: true },
                        { key: `${prefix}WebhookSecret` as keyof typeof paymentSettings, label: 'Webhook Secret', placeholder: 'whsec_...', secret: true },
                      ]
                      return (
                        <div className="space-y-3">
                          {fields.map((field) => (
                            <div key={field.key} className="space-y-1.5">
                              <label className="text-sm font-medium text-slate-300">{field.label}</label>
                              <div className="relative">
                                <input
                                  type={field.secret && !showStripeSecrets[field.key] ? 'password' : 'text'}
                                  value={paymentSettings[field.key] as string}
                                  onChange={(e) => setPaymentSettings({ ...paymentSettings, [field.key]: e.target.value })}
                                  placeholder={field.placeholder}
                                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-primary/50 pr-12"
                                />
                                {field.secret && (
                                  <button
                                    type="button"
                                    onClick={() => setShowStripeSecrets((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    <Icon name={showStripeSecrets[field.key] ? 'eye-off' : 'eye'} size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
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

                  {/* Twilio SMS Configuration */}
                  <div className="border-t border-[#2a2a2a] pt-6">
                    <h3 className="text-white font-medium mb-4">Twilio SMS Configuration</h3>
                    <p className="text-slate-500 text-sm mb-4">Required for SMS-based two-factor authentication. Get your credentials from your Twilio dashboard.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Account SID</label>
                        <input
                          type="text"
                          value={twilioSettings.twilio_account_sid}
                          onChange={(e) => setTwilioSettings({ ...twilioSettings, twilio_account_sid: e.target.value })}
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Auth Token</label>
                        <input
                          type="password"
                          value={twilioSettings.twilio_auth_token}
                          onChange={(e) => setTwilioSettings({ ...twilioSettings, twilio_auth_token: e.target.value })}
                          placeholder="Your Twilio Auth Token"
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Phone Number</label>
                        <input
                          type="text"
                          value={twilioSettings.twilio_phone_number}
                          onChange={(e) => setTwilioSettings({ ...twilioSettings, twilio_phone_number: e.target.value })}
                          placeholder="+1234567890"
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                        />
                      </div>
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
