'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'
import { useAuth } from '@/contexts/AuthContext'
import {
  getUserNumber,
  getMessages,
  sendSms,
  updateSettings,
  markMessagesRead,
  cancelNumber,
  sendTestSms,
  getRenewalPrice,
  renewNumber,
} from '@/lib/api/virtual-numbers'

export default function VirtualNumberPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const numberId = params.id as string
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prevMessageCount = useRef(0)
  const isAdmin = user?.role === 'ADMIN'

  const [activeTab, setActiveTab] = useState<'inbox' | 'settings'>('inbox')
  const [newMessage, setNewMessage] = useState({ to: '', body: '' })
  const [showSendModal, setShowSendModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showTestSmsModal, setShowTestSmsModal] = useState(false)
  const [testSmsData, setTestSmsData] = useState({ fromNumber: '+15559876543', message: '' })
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [renewPriceData, setRenewPriceData] = useState<{ price: number; durationDays: number; walletBalance: number; canPayWithWallet: boolean } | null>(null)
  const [renewLoading, setRenewLoading] = useState(false)
  const [renewError, setRenewError] = useState<string | null>(null)
  const [renewSuccess, setRenewSuccess] = useState<string | null>(null)

  // Forwarding settings state
  const [settings, setSettings] = useState({
    smsForwardingEnabled: false,
    smsForwardTo: '',
    smsForwardEmail: '',
    voiceForwardingEnabled: false,
    voiceForwardTo: '',
    voicemailEnabled: false,
    nickname: '',
  })

  // Fetch number details
  const {
    data: numberData,
    isLoading: numberLoading,
    error: numberError,
  } = useQuery({
    queryKey: ['virtual-number', numberId],
    queryFn: async () => {
      const result = await getUserNumber(numberId)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch number')
      }
      return result.data
    },
    enabled: !!numberId,
  })

  // Fetch messages
  const {
    data: messagesData,
    isLoading: messagesLoading,
  } = useQuery({
    queryKey: ['virtual-number-messages', numberId],
    queryFn: async () => {
      const result = await getMessages(numberId)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch messages')
      }
      return result.data
    },
    enabled: !!numberId,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Update settings state when data loads
  useEffect(() => {
    if (numberData) {
      setSettings({
        smsForwardingEnabled: numberData.smsForwardingEnabled,
        smsForwardTo: numberData.smsForwardTo || '',
        smsForwardEmail: numberData.smsForwardEmail || '',
        voiceForwardingEnabled: numberData.voiceForwardingEnabled,
        voiceForwardTo: numberData.voiceForwardTo || '',
        voicemailEnabled: numberData.voicemailEnabled,
        nickname: numberData.nickname || '',
      })
    }
  }, [numberData])

  // Auto-scroll inbox to bottom only when new messages arrive
  useEffect(() => {
    const count = messagesData?.messages?.length ?? 0
    if (count > prevMessageCount.current && activeTab === 'inbox') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCount.current = count
  }, [messagesData, activeTab])

  // Mark messages as read when viewing inbox
  useEffect(() => {
    if (messagesData?.messages && activeTab === 'inbox') {
      const unreadIds = messagesData.messages
        .filter((m) => !m.isRead && m.direction === 'inbound')
        .map((m) => m.id)
      if (unreadIds.length > 0) {
        markMessagesRead(numberId, unreadIds)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['virtual-number-messages', numberId] })
          })
          .catch(() => {})
      }
    }
  }, [messagesData, activeTab, numberId, queryClient])

  // Send SMS mutation
  const sendSmsMutation = useMutation({
    mutationFn: async () => {
      const result = await sendSms(numberId, newMessage.to, newMessage.body)
      if (!result.success) {
        throw new Error(result.error || 'Failed to send SMS')
      }
      return result.data
    },
    onSuccess: () => {
      setNewMessage({ to: '', body: '' })
      setShowSendModal(false)
      queryClient.invalidateQueries({ queryKey: ['virtual-number-messages', numberId] })
    },
  })

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      const result = await updateSettings(numberId, settings)
      if (!result.success) {
        throw new Error(result.error || 'Failed to update settings')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-number', numberId] })
    },
  })

  const updateSetting = (patch: Partial<typeof settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    updateSettingsMutation.reset()
  }

  // Cancel number mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const result = await cancelNumber(numberId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel number')
      }
    },
    onSuccess: () => {
      router.push('/profile/library')
    },
  })

  // Test SMS mutation (admin only)
  const testSmsMutation = useMutation({
    mutationFn: async () => {
      const result = await sendTestSms(numberId, testSmsData.message, testSmsData.fromNumber)
      if (!result.success) {
        throw new Error(result.error || 'Failed to send test SMS')
      }
      return result.data
    },
    onSuccess: () => {
      setTestSmsData({ fromNumber: '+15559876543', message: '' })
      setShowTestSmsModal(false)
      queryClient.invalidateQueries({ queryKey: ['virtual-number-messages', numberId] })
      queryClient.invalidateQueries({ queryKey: ['virtual-number', numberId] })
    },
  })

  // Renew number
  const renewMutation = useMutation({
    mutationFn: async () => {
      const result = await renewNumber(numberId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to renew number')
      }
      return result.data
    },
    onSuccess: (data) => {
      setRenewSuccess(`Renewed! New expiry: ${new Date(data!.newExpiresAt).toLocaleDateString()}`)
      queryClient.invalidateQueries({ queryKey: ['virtual-number', numberId] })
    },
  })

  const handleOpenRenewModal = async () => {
    setRenewError(null)
    setRenewSuccess(null)
    setRenewPriceData(null)
    renewMutation.reset()
    setRenewLoading(true)
    setShowRenewModal(true)
    try {
      const result = await getRenewalPrice(numberId)
      if (!result.success) {
        setRenewError(result.error || 'Failed to get renewal price')
      } else {
        setRenewPriceData({
          price: result.price!,
          durationDays: result.durationDays!,
          walletBalance: result.walletBalance!,
          canPayWithWallet: result.canPayWithWallet!,
        })
      }
    } catch (err: any) {
      setRenewError(err.message || 'Failed to get renewal price')
    } finally {
      setRenewLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (numberLoading) {
    return (
      <ProfileLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </ProfileLayout>
    )
  }

  if (numberError || !numberData) {
    return (
      <ProfileLayout>
        <div className="text-center py-16">
          <Icon name="alert-circle" size={64} className="text-red-500 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">Failed to load virtual number</p>
          <button
            onClick={() => router.push('/profile/library')}
            className="px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-slate-300 hover:text-white"
          >
            Back to Library
          </button>
        </div>
      </ProfileLayout>
    )
  }

  const usagePercent = numberData.currentPeriodSms / (numberData.smsIncluded || 1) * 100

  return (
    <ProfileLayout>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/profile/library?filter=virtual-numbers')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <Icon name="arrow-left" size={18} />
          Back to Library
        </button>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-primary font-mono">
                {numberData.phoneNumberDisplay}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  numberData.status === 'active'
                    ? 'bg-green-900/30 text-green-500 border border-green-500/20'
                    : numberData.status === 'expired'
                    ? 'bg-red-900/30 text-red-500 border border-red-500/20'
                    : 'bg-yellow-900/30 text-yellow-500 border border-yellow-500/20'
                }`}
              >
                {numberData.status}
              </span>
            </div>
            <p className="text-slate-400">
              {numberData.planName} - {numberData.countryName}
              {numberData.nickname && (
                <span className="ml-2 text-slate-500">({numberData.nickname})</span>
              )}
            </p>
          </div>

          <div className="flex gap-3">
            {isAdmin && (
              <button
                onClick={() => setShowTestSmsModal(true)}
                disabled={numberData.status !== 'active'}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/50 text-orange-400 font-bold rounded-lg hover:bg-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="zap" size={18} />
                Test Receive SMS
              </button>
            )}
            {numberData.status !== 'cancelled' && (
              <button
                onClick={handleOpenRenewModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 font-bold rounded-lg hover:bg-blue-600/30 transition-all"
              >
                <Icon name="refresh-cw" size={18} />
                Renew
              </button>
            )}
            <button
              onClick={() => setShowSendModal(true)}
              disabled={numberData.status !== 'active'}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="send" size={18} />
              Send SMS
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
          <div className="text-slate-400 text-sm mb-1">SMS This Period</div>
          <div className="text-2xl font-bold text-white">
            {numberData.currentPeriodSms}
            <span className="text-sm text-slate-500 ml-1">
              / {numberData.smsIncluded === 0 ? '∞' : numberData.smsIncluded}
            </span>
          </div>
          {numberData.smsIncluded > 0 && (
            <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-yellow-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          )}
        </div>

        <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
          <div className="text-slate-400 text-sm mb-1">Total Received</div>
          <div className="text-2xl font-bold text-white">{numberData.smsReceivedCount}</div>
        </div>

        <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
          <div className="text-slate-400 text-sm mb-1">Total Sent</div>
          <div className="text-2xl font-bold text-white">{numberData.smsSentCount}</div>
        </div>

        <div className="bg-[#121212] border border-border-dark rounded-xl p-4">
          <div className="text-slate-400 text-sm mb-1">Expires</div>
          <div className="text-lg font-bold text-white">
            {numberData.expiresAt
              ? new Date(numberData.expiresAt).toLocaleDateString()
              : 'Never'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border-dark">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'inbox'
              ? 'text-primary border-b-2 border-primary'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Icon name="inbox" size={18} className="inline mr-2" />
          Inbox
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'settings'
              ? 'text-primary border-b-2 border-primary'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Icon name="settings" size={18} className="inline mr-2" />
          Settings
        </button>
      </div>

      {/* Inbox Tab */}
      {activeTab === 'inbox' && (
        <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
          {messagesLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : !messagesData?.messages || messagesData.messages.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="inbox" size={48} className="text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No messages yet</p>
              <p className="text-slate-500 text-sm mt-1">
                SMS messages sent to this number will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-dark max-h-[500px] overflow-y-auto">
              {messagesData.messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 ${
                    message.direction === 'outbound' ? 'bg-surface-dark/50' : ''
                  } ${!message.isRead && message.direction === 'inbound' ? 'border-l-2 border-primary' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-slate-400 text-sm">
                          {message.direction === 'inbound' ? (
                            <>
                              <Icon name="arrow-down-left" size={14} className="inline text-green-500" />{' '}
                              From: <span className="text-white font-mono">{message.fromNumber}</span>
                            </>
                          ) : (
                            <>
                              <Icon name="arrow-up-right" size={14} className="inline text-blue-500" />{' '}
                              To: <span className="text-white font-mono">{message.toNumber}</span>
                            </>
                          )}
                        </span>
                        <span className="text-slate-500 text-xs">{formatDate(message.createdAt)}</span>
                      </div>
                      <p className="text-white whitespace-pre-wrap">{message.body}</p>
                    </div>
                    {message.direction === 'inbound' && (
                      <button
                        onClick={() => {
                          setNewMessage({ to: message.fromNumber, body: '' })
                          setShowSendModal(true)
                        }}
                        className="text-slate-400 hover:text-primary p-2"
                        title="Reply"
                      >
                        <Icon name="reply" size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Nickname */}
          <div className="bg-[#121212] border border-border-dark rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Number Label</h3>
            <input
              type="text"
              value={settings.nickname}
              onChange={(e) => updateSetting({ nickname: e.target.value })}
              placeholder="e.g., Business, Tinder, Verifications"
              className="w-full bg-black border border-border-dark rounded-lg px-4 py-3 text-white placeholder:text-slate-600"
            />
          </div>

          {/* SMS Forwarding */}
          <div className="bg-[#121212] border border-border-dark rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">SMS Forwarding</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.smsForwardingEnabled}
                  onChange={(e) =>
                    updateSetting({ smsForwardingEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            {settings.smsForwardingEnabled && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Forward to Email</label>
                  <input
                    type="email"
                    value={settings.smsForwardEmail}
                    onChange={(e) => updateSetting({ smsForwardEmail: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full bg-black border border-border-dark rounded-lg px-4 py-3 text-white placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Forward to Phone (SMS)</label>
                  <input
                    type="tel"
                    value={settings.smsForwardTo}
                    onChange={(e) => updateSetting({ smsForwardTo: e.target.value })}
                    placeholder="+1234567890"
                    className="w-full bg-black border border-border-dark rounded-lg px-4 py-3 text-white placeholder:text-slate-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Voice Settings */}
          <div className="bg-[#121212] border border-border-dark rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Voice Forwarding</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.voiceForwardingEnabled}
                  onChange={(e) =>
                    updateSetting({ voiceForwardingEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            {settings.voiceForwardingEnabled && (
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Forward calls to</label>
                <input
                  type="tel"
                  value={settings.voiceForwardTo}
                  onChange={(e) => updateSetting({ voiceForwardTo: e.target.value })}
                  placeholder="+1234567890"
                  className="w-full bg-black border border-border-dark rounded-lg px-4 py-3 text-white placeholder:text-slate-600"
                />
              </div>
            )}
            {!settings.voiceForwardingEnabled && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-dark">
                <div>
                  <div className="text-white font-medium">Voicemail</div>
                  <div className="text-slate-500 text-sm">Send missed calls to voicemail</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.voicemailEnabled}
                    onChange={(e) =>
                      updateSetting({ voicemailEnabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={() => updateSettingsMutation.mutate()}
            disabled={updateSettingsMutation.isPending}
            className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all disabled:opacity-50"
          >
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
          {updateSettingsMutation.isSuccess && (
            <p className="text-green-500 text-sm text-center">Settings saved successfully.</p>
          )}
          {updateSettingsMutation.isError && (
            <p className="text-red-500 text-sm text-center">
              {(updateSettingsMutation.error as Error).message}
            </p>
          )}

          {/* Danger Zone */}
          <div className="bg-[#121212] border border-red-500/20 rounded-xl p-6">
            <h3 className="text-lg font-bold text-red-500 mb-2">Danger Zone</h3>
            <p className="text-slate-400 text-sm mb-4">
              Canceling this number will release it immediately. You will lose access to all messages
              and the number may be reassigned to someone else.
            </p>
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              Cancel Number
            </button>
          </div>
        </div>
      )}

      {/* Send SMS Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark rounded-2xl p-6 max-w-md w-full border border-border-dark">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Send SMS</h3>
              <button
                onClick={() => { setShowSendModal(false); sendSmsMutation.reset() }}
                className="text-slate-400 hover:text-white"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">From</label>
                <div className="bg-black border border-border-dark rounded-lg px-4 py-3 text-primary font-mono">
                  {numberData.phoneNumberDisplay}
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">To</label>
                <input
                  type="tel"
                  value={newMessage.to}
                  onChange={(e) => setNewMessage({ ...newMessage, to: e.target.value })}
                  placeholder="+1234567890"
                  className="w-full bg-black border border-border-dark rounded-lg px-4 py-3 text-white placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Message</label>
                <textarea
                  value={newMessage.body}
                  onChange={(e) => setNewMessage({ ...newMessage, body: e.target.value })}
                  placeholder="Type your message..."
                  rows={4}
                  maxLength={160}
                  className="w-full bg-black border border-border-dark rounded-lg px-4 py-3 text-white placeholder:text-slate-600 resize-none"
                />
                <div className={`text-xs mt-1 text-right ${newMessage.body.length >= 160 ? 'text-red-400' : 'text-slate-500'}`}>
                  {newMessage.body.length} / 160 characters
                </div>
              </div>
              <button
                onClick={() => sendSmsMutation.mutate()}
                disabled={!newMessage.to || !newMessage.body || sendSmsMutation.isPending}
                className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendSmsMutation.isPending ? 'Sending...' : 'Send Message'}
              </button>
              {sendSmsMutation.isError && (
                <p className="text-red-500 text-sm text-center">
                  {(sendSmsMutation.error as Error).message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark rounded-2xl p-6 max-w-md w-full border border-border-dark">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-red-500">Cancel Number</h3>
              <button
                onClick={() => { setShowCancelModal(false); cancelMutation.reset() }}
                className="text-slate-400 hover:text-white"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <p className="text-slate-300 mb-6">
              Are you sure you want to cancel <strong className="text-primary">{numberData.phoneNumberDisplay}</strong>?
              This action cannot be undone.
            </p>
            {cancelMutation.isError && (
              <p className="text-red-500 text-sm text-center mb-4">
                {(cancelMutation.error as Error).message}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCancelModal(false); cancelMutation.reset() }}
                className="flex-1 py-3 bg-surface-dark border border-border-dark rounded-xl text-slate-300 hover:text-white transition-colors"
              >
                Keep Number
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Canceling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test SMS Modal (Admin Only) */}
      {showTestSmsModal && isAdmin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark rounded-2xl p-6 max-w-md w-full border border-orange-500/30">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Icon name="zap" size={20} className="text-orange-400" />
                <h3 className="text-xl font-bold text-orange-400">Simulate Incoming SMS</h3>
              </div>
              <button
                onClick={() => setShowTestSmsModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4">
              <p className="text-orange-300 text-sm">
                This simulates receiving an SMS to test the inbox functionality.
                The message will appear in the inbox as if someone sent it to this number.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">To (Your Virtual Number)</label>
                <div className="bg-black border border-border-dark rounded-lg px-4 py-3 text-primary font-mono">
                  {numberData.phoneNumberDisplay}
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">From (Simulated Sender)</label>
                <input
                  type="tel"
                  value={testSmsData.fromNumber}
                  onChange={(e) => setTestSmsData({ ...testSmsData, fromNumber: e.target.value })}
                  placeholder="+15559876543"
                  className="w-full bg-black border border-border-dark rounded-lg px-4 py-3 text-white placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Message Content</label>
                <textarea
                  value={testSmsData.message}
                  onChange={(e) => setTestSmsData({ ...testSmsData, message: e.target.value })}
                  placeholder="Your verification code is 123456"
                  rows={3}
                  className="w-full bg-black border border-border-dark rounded-lg px-4 py-3 text-white placeholder:text-slate-600 resize-none"
                />
              </div>
              <button
                onClick={() => testSmsMutation.mutate()}
                disabled={!testSmsData.message || testSmsMutation.isPending}
                className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testSmsMutation.isPending ? 'Sending...' : 'Simulate Incoming SMS'}
              </button>
              {testSmsMutation.isError && (
                <p className="text-red-500 text-sm text-center">
                  {(testSmsMutation.error as Error).message}
                </p>
              )}
              {testSmsMutation.isSuccess && (
                <p className="text-green-500 text-sm text-center">
                  Test SMS sent successfully! Check the inbox.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Renew Modal */}
      {showRenewModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark rounded-2xl p-6 max-w-md w-full border border-border-dark">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Renew Number</h3>
              <button
                onClick={() => { setShowRenewModal(false); setRenewSuccess(null); setRenewError(null) }}
                className="text-slate-400 hover:text-white"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {renewLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : renewSuccess ? (
              <div className="text-center py-4">
                <Icon name="check-circle" size={48} className="text-green-500 mx-auto mb-3" />
                <p className="text-green-400 font-bold">{renewSuccess}</p>
                <button
                  onClick={() => { setShowRenewModal(false); setRenewSuccess(null) }}
                  className="mt-4 px-6 py-2 bg-primary text-black font-bold rounded-xl hover:brightness-105"
                >
                  Done
                </button>
              </div>
            ) : renewError ? (
              <div className="text-center py-4">
                <p className="text-red-500 text-sm mb-4">{renewError}</p>
                <button
                  onClick={handleOpenRenewModal}
                  className="px-6 py-2 bg-primary text-black font-bold rounded-xl hover:brightness-105"
                >
                  Try Again
                </button>
              </div>
            ) : renewPriceData ? (
              <>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Renewal period</span>
                    <span className="text-white">{renewPriceData.durationDays} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Renewal price</span>
                    <span className="text-white font-bold">${renewPriceData.price.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border-dark pt-3 flex justify-between text-sm">
                    <span className="text-slate-400">Wallet balance</span>
                    <span className={renewPriceData.canPayWithWallet ? 'text-green-400' : 'text-red-400'}>
                      ${renewPriceData.walletBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
                {!renewPriceData.canPayWithWallet && (
                  <p className="text-red-400 text-sm mb-4">Insufficient wallet balance. Please top up your wallet first.</p>
                )}
                {renewMutation.isError && (
                  <p className="text-red-500 text-sm mb-4">{(renewMutation.error as Error).message}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowRenewModal(false); setRenewPriceData(null) }}
                    className="flex-1 py-3 bg-surface-dark border border-border-dark rounded-xl text-slate-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => renewMutation.mutate()}
                    disabled={!renewPriceData.canPayWithWallet || renewMutation.isPending}
                    className="flex-1 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {renewMutation.isPending ? 'Processing...' : `Pay $${renewPriceData.price.toFixed(2)}`}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </ProfileLayout>
  )
}
