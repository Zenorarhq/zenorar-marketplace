'use client'

import { useState, useEffect } from 'react'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'
import { profileApi, LoginHistoryEntry } from '@/lib/api/profile'
import { authApi } from '@/lib/api/auth'

type TwoFaStep = 'idle' | 'totp-qr' | 'totp-verify' | 'sms-phone' | 'sms-verify' | 'backup-codes' | 'disable'

export default function SecurityPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // 2FA State
  const [twoFaStatus, setTwoFaStatus] = useState<{ enabled: boolean; method: string | null; phone: string | null }>({ enabled: false, method: null, phone: null })
  const [twoFaStep, setTwoFaStep] = useState<TwoFaStep>('idle')
  const [twoFaError, setTwoFaError] = useState<string | null>(null)
  const [twoFaLoading, setTwoFaLoading] = useState(false)
  const [totpSecret, setTotpSecret] = useState('')
  const [totpQrUrl, setTotpQrUrl] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [smsPhone, setSmsPhone] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [disablePassword, setDisablePassword] = useState('')

  useEffect(() => {
    profileApi.getLoginHistory().then(res => {
      if (res.success && res.data) {
        setLoginHistory(res.data)
      }
      setHistoryLoading(false)
    }).catch(() => setHistoryLoading(false))

    authApi.get2faStatus().then(res => {
      if (res.success && res.data) {
        setTwoFaStatus(res.data)
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    if (!currentPassword.trim()) {
      setPasswordError('Current password is required')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    setIsLoading(true)
    const res = await profileApi.updatePassword({ currentPassword, newPassword })
    setIsLoading(false)
    if (res.success) {
      setSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setPasswordError(res.error || 'Failed to update password')
    }
  }

  return (
    <ProfileLayout>
      {/* Header */}
      <div className="mb-10 pb-6 border-b border-border-dark">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Security Settings</h1>
        <p className="text-slate-400">
          Manage your password, login history, and 2FA settings to secure your account.
        </p>
      </div>

      {/* 2FA Section */}
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Icon name="lock" size={20} className="text-primary" />
              Two-Factor Authentication (2FA)
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              {twoFaStatus.enabled
                ? `Enabled via ${twoFaStatus.method === 'TOTP' ? 'Authenticator App' : 'SMS'}${twoFaStatus.phone ? ` (${twoFaStatus.phone})` : ''}`
                : 'Add an extra layer of security to your account.'}
            </p>
          </div>
          {twoFaStatus.enabled && (
            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">Active</span>
          )}
        </div>

        {twoFaError && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-sm">{twoFaError}</p>
          </div>
        )}

        {/* Idle state — show setup or disable options */}
        {twoFaStep === 'idle' && !twoFaStatus.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6 flex flex-col justify-between group hover:border-primary/50 transition-colors">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-surface-dark flex items-center justify-center text-primary">
                    <Icon name="qr-code" size={20} />
                  </div>
                  <h4 className="font-bold text-white">Authenticator App</h4>
                </div>
                <p className="text-slate-500 text-sm mb-4">
                  Use an app like Google Authenticator or Authy to generate verification codes.{' '}
                  <span className="text-primary text-xs ml-1">(Recommended)</span>
                </p>
              </div>
              <button
                type="button"
                disabled={twoFaLoading}
                onClick={async () => {
                  setTwoFaLoading(true)
                  setTwoFaError(null)
                  const res = await authApi.setupTotp()
                  setTwoFaLoading(false)
                  if (res.success && res.data) {
                    setTotpSecret(res.data.secret)
                    setTotpQrUrl(res.data.qrCodeUrl)
                    setTwoFaStep('totp-qr')
                  } else {
                    setTwoFaError(res.error || 'Failed to start setup')
                  }
                }}
                className="w-full py-3 rounded-xl border border-border-dark text-slate-300 font-medium hover:bg-surface-dark hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
              >
                {twoFaLoading ? 'Loading...' : 'Setup'}
              </button>
            </div>

            <div className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6 flex flex-col justify-between group hover:border-primary/50 transition-colors">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-surface-dark flex items-center justify-center text-primary">
                    <Icon name="message" size={20} />
                  </div>
                  <h4 className="font-bold text-white">SMS Verification</h4>
                </div>
                <p className="text-slate-500 text-sm mb-4">
                  Receive verification codes via SMS to your phone number.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setTwoFaStep('sms-phone'); setTwoFaError(null) }}
                className="w-full py-3 rounded-xl border border-border-dark text-slate-300 font-medium hover:bg-surface-dark hover:text-white hover:border-slate-600 transition-colors"
              >
                Setup
              </button>
            </div>
          </div>
        )}

        {/* Already enabled — show disable option */}
        {twoFaStep === 'idle' && twoFaStatus.enabled && (
          <button
            type="button"
            onClick={() => { setTwoFaStep('disable'); setTwoFaError(null); setDisablePassword('') }}
            className="px-6 py-3 rounded-xl border border-red-500/30 text-red-400 font-medium hover:bg-red-500/10 transition-colors"
          >
            Disable Two-Factor Authentication
          </button>
        )}

        {/* TOTP: Show QR Code */}
        {twoFaStep === 'totp-qr' && (
          <div className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6 max-w-md">
            <h4 className="font-bold text-white mb-3">Scan QR Code</h4>
            <p className="text-slate-500 text-sm mb-4">Open your authenticator app and scan this QR code.</p>
            <div className="bg-white rounded-xl p-4 mb-4 flex justify-center">
              <img src={totpQrUrl} alt="QR Code" className="w-48 h-48" />
            </div>
            <p className="text-slate-500 text-xs mb-4">
              Or enter this code manually: <code className="text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">{totpSecret}</code>
            </p>
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">Enter the 6-digit code from your app</label>
              <input
                type="text"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full bg-[#1a1a1a] border border-border-dark rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setTwoFaStep('idle'); setVerifyCode('') }}
                  className="flex-1 py-3 rounded-xl border border-border-dark text-slate-400 font-medium hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={verifyCode.length !== 6 || twoFaLoading}
                  onClick={async () => {
                    setTwoFaLoading(true)
                    setTwoFaError(null)
                    const res = await authApi.enableTotp(totpSecret, verifyCode)
                    setTwoFaLoading(false)
                    if (res.success && res.data) {
                      setBackupCodes(res.data.backupCodes)
                      setTwoFaStep('backup-codes')
                      setTwoFaStatus({ enabled: true, method: 'TOTP', phone: null })
                    } else {
                      setTwoFaError(res.error || 'Invalid code')
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-primary text-black font-bold hover:bg-green-400 transition-colors disabled:opacity-50"
                >
                  {twoFaLoading ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SMS: Enter phone number */}
        {twoFaStep === 'sms-phone' && (
          <div className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6 max-w-md">
            <h4 className="font-bold text-white mb-3">SMS Verification Setup</h4>
            <p className="text-slate-500 text-sm mb-4">Enter your phone number to receive verification codes.</p>
            <div className="space-y-3">
              <input
                type="tel"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder="+1 234 567 8900"
                className="w-full bg-[#1a1a1a] border border-border-dark rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setTwoFaStep('idle'); setSmsPhone('') }}
                  className="flex-1 py-3 rounded-xl border border-border-dark text-slate-400 font-medium hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!smsPhone.trim() || twoFaLoading}
                  onClick={async () => {
                    setTwoFaLoading(true)
                    setTwoFaError(null)
                    const res = await authApi.setupSms(smsPhone)
                    setTwoFaLoading(false)
                    if (res.success) {
                      setTwoFaStep('sms-verify')
                    } else {
                      setTwoFaError(res.error || 'Failed to send SMS')
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-primary text-black font-bold hover:bg-green-400 transition-colors disabled:opacity-50"
                >
                  {twoFaLoading ? 'Sending...' : 'Send Code'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SMS: Verify code */}
        {twoFaStep === 'sms-verify' && (
          <div className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6 max-w-md">
            <h4 className="font-bold text-white mb-3">Enter Verification Code</h4>
            <p className="text-slate-500 text-sm mb-4">We sent a 6-digit code to {smsPhone}</p>
            <div className="space-y-3">
              <input
                type="text"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full bg-[#1a1a1a] border border-border-dark rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setTwoFaStep('idle'); setVerifyCode('') }}
                  className="flex-1 py-3 rounded-xl border border-border-dark text-slate-400 font-medium hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={verifyCode.length !== 6 || twoFaLoading}
                  onClick={async () => {
                    setTwoFaLoading(true)
                    setTwoFaError(null)
                    const res = await authApi.enableSms(smsPhone, verifyCode)
                    setTwoFaLoading(false)
                    if (res.success && res.data) {
                      setBackupCodes(res.data.backupCodes)
                      setTwoFaStep('backup-codes')
                      setTwoFaStatus({ enabled: true, method: 'SMS', phone: `****${smsPhone.slice(-4)}` })
                    } else {
                      setTwoFaError(res.error || 'Invalid code')
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-primary text-black font-bold hover:bg-green-400 transition-colors disabled:opacity-50"
                >
                  {twoFaLoading ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Show backup codes */}
        {twoFaStep === 'backup-codes' && (
          <div className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6 max-w-md">
            <h4 className="font-bold text-white mb-3 flex items-center gap-2">
              <Icon name="check-circle" size={20} className="text-primary" />
              2FA Enabled Successfully
            </h4>
            <p className="text-slate-500 text-sm mb-4">
              Save these backup codes in a safe place. You can use them to access your account if you lose your device.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {backupCodes.map((code, i) => (
                <code key={i} className="bg-[#1a1a1a] border border-border-dark rounded-lg px-3 py-2 text-center text-slate-300 text-sm font-mono">
                  {code}
                </code>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(backupCodes.join('\n'))
              }}
              className="w-full py-2 rounded-xl border border-border-dark text-slate-400 font-medium hover:text-white transition-colors text-sm mb-3"
            >
              Copy All Codes
            </button>
            <button
              type="button"
              onClick={() => { setTwoFaStep('idle'); setVerifyCode(''); setBackupCodes([]) }}
              className="w-full py-3 rounded-xl bg-primary text-black font-bold hover:bg-green-400 transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {/* Disable 2FA */}
        {twoFaStep === 'disable' && (
          <div className="bg-black border border-border-dark rounded-2xl p-4 sm:p-6 max-w-md">
            <h4 className="font-bold text-white mb-3">Disable Two-Factor Authentication</h4>
            <p className="text-slate-500 text-sm mb-4">Enter your password to confirm.</p>
            <div className="space-y-3">
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Your password"
                className="w-full bg-[#1a1a1a] border border-border-dark rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setTwoFaStep('idle'); setDisablePassword('') }}
                  className="flex-1 py-3 rounded-xl border border-border-dark text-slate-400 font-medium hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!disablePassword.trim() || twoFaLoading}
                  onClick={async () => {
                    setTwoFaLoading(true)
                    setTwoFaError(null)
                    const res = await authApi.disable2fa(disablePassword)
                    setTwoFaLoading(false)
                    if (res.success) {
                      setTwoFaStatus({ enabled: false, method: null, phone: null })
                      setTwoFaStep('idle')
                      setDisablePassword('')
                    } else {
                      setTwoFaError(res.error || 'Failed to disable 2FA')
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {twoFaLoading ? 'Disabling...' : 'Disable'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change Password Section */}
      <form onSubmit={handleSubmit} className="mb-12">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Icon name="key" size={20} className="text-primary" />
          Change Password
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 md:col-span-2">
            <label htmlFor="currentPassword" className="text-sm font-semibold text-slate-300 ml-1">
              Current Password
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showPasswords.current ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  setSaved(false)
                  setPasswordError(null)
                }}
                placeholder="Enter current password"
                className="w-full bg-black border border-border-dark rounded-2xl px-4 py-3 sm:px-5 sm:py-4 pr-12 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords((prev) => ({ ...prev, current: !prev.current }))
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <Icon name={showPasswords.current ? 'visibility-off' : 'eye'} size={20} />
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <label htmlFor="newPassword" className="text-sm font-semibold text-slate-300 ml-1">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPasswords.new ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setSaved(false)
                  setPasswordError(null)
                }}
                placeholder="Enter new password"
                className="w-full bg-black border border-border-dark rounded-2xl px-4 py-3 sm:px-5 sm:py-4 pr-12 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <Icon name={showPasswords.new ? 'visibility-off' : 'eye'} size={20} />
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-300 ml-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setSaved(false)
                  setPasswordError(null)
                }}
                placeholder="Confirm new password"
                className="w-full bg-black border border-border-dark rounded-2xl px-4 py-3 sm:px-5 sm:py-4 pr-12 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <Icon name={showPasswords.confirm ? 'visibility-off' : 'eye'} size={20} />
              </button>
            </div>
          </div>
        </div>

        {passwordError && (
          <div className="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-sm">{passwordError}</p>
          </div>
        )}
      </form>

      {/* Login History */}
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Icon name="history" size={20} className="text-primary" />
          Login History
        </h3>

        <div className="overflow-x-auto rounded-2xl border border-border-dark">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="text-xs uppercase bg-black text-slate-200">
              <tr>
                <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold">Device</th>
                <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold">IP Address</th>
                <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold">Date</th>
                <th className="px-3 py-3 sm:px-6 sm:py-4 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark bg-black/20">
              {historyLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading...</td>
                </tr>
              ) : loginHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No login history yet</td>
                </tr>
              ) : (
                loginHistory.map((entry) => (
                  <tr key={entry.id} className="hover:bg-black/40 transition-colors">
                    <td className="px-3 py-3 sm:px-6 sm:py-4 font-medium text-white flex items-center gap-3">
                      <Icon name={entry.deviceType === 'Mobile' ? 'smartphone' : entry.deviceType === 'Tablet' ? 'tablet' : 'computer'} size={18} />
                      {entry.browserName || 'Unknown'} on {entry.deviceType || 'Unknown'}
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">{entry.ipAddress}</td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                      {new Date(entry.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-right">
                      {entry.success ? (
                        <span className="text-primary bg-primary/10 px-2 py-1 rounded text-xs font-bold border border-primary/20">
                          Success
                        </span>
                      ) : (
                        <span className="text-red-400 bg-red-400/10 px-2 py-1 rounded text-xs font-bold border border-red-400/20">
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-10 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sm:gap-4">
        {saved && (
          <span className="text-primary text-sm font-medium flex items-center gap-1">
            <Icon name="check-circle" size={18} />
            Changes saved
          </span>
        )}
        <button
          type="button"
          className="text-slate-400 font-bold px-4 py-3 sm:px-6 sm:py-3.5 rounded-xl hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="bg-primary hover:bg-green-400 text-black font-bold px-6 py-3 sm:px-10 sm:py-3.5 rounded-xl transition-all shadow-lg shadow-green-900/20 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 w-full sm:w-auto"
        >
          {isLoading ? 'Saving...' : 'Save Security'}
        </button>
      </div>
    </ProfileLayout>
  )
}
