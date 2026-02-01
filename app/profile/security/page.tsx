'use client'

import { useState } from 'react'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'

const loginHistory = [
  {
    device: 'MacBook Pro',
    icon: 'laptop_mac',
    location: 'San Francisco, US',
    date: 'Today, 10:23 AM',
    status: 'active',
  },
  {
    device: 'iPhone 13',
    icon: 'smartphone',
    location: 'San Francisco, US',
    date: 'Yesterday, 8:45 PM',
    status: 'signed_out',
  },
  {
    device: 'Windows PC',
    icon: 'desktop_windows',
    location: 'New York, US',
    date: 'Oct 24, 2023',
    status: 'signed_out',
  },
]

export default function SecurityPage() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match')
      return
    }
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
    setSaved(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <ProfileLayout>
      {/* Header */}
      <div className="mb-10 pb-6 border-b border-border-dark">
        <h1 className="text-3xl font-bold text-white mb-2">Security Settings</h1>
        <p className="text-slate-400">
          Manage your password, login history, and 2FA settings to secure your account.
        </p>
      </div>

      {/* 2FA Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Icon name="lock" size={20} className="text-primary" />
              Two-Factor Authentication (2FA)
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Add an extra layer of security to your account.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={twoFactorEnabled}
              onChange={(e) => setTwoFactorEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-8 bg-black peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary border border-border-dark peer-checked:border-primary"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-black border border-border-dark rounded-2xl p-6 flex flex-col justify-between group hover:border-primary/50 transition-colors">
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
              className="w-full py-3 rounded-xl border border-border-dark text-slate-300 font-medium hover:bg-surface-dark hover:text-white hover:border-slate-600 transition-colors"
            >
              Setup
            </button>
          </div>

          <div className="bg-black border border-border-dark rounded-2xl p-6 flex flex-col justify-between group hover:border-primary/50 transition-colors">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-surface-dark flex items-center justify-center text-primary">
                  <Icon name="message" size={20} />
                </div>
                <h4 className="font-bold text-white">SMS Recovery</h4>
              </div>
              <p className="text-slate-500 text-sm mb-4">
                Receive verification codes via SMS as a backup method.
              </p>
            </div>
            <button
              type="button"
              className="w-full py-3 rounded-xl border border-border-dark text-slate-300 font-medium hover:bg-surface-dark hover:text-white hover:border-slate-600 transition-colors"
            >
              Setup
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <form onSubmit={handleSubmit} className="mb-12">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
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
                }}
                placeholder="Enter current password"
                className="w-full bg-black border border-border-dark rounded-2xl px-5 py-4 pr-12 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
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
                }}
                placeholder="Enter new password"
                className="w-full bg-black border border-border-dark rounded-2xl px-5 py-4 pr-12 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
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
                }}
                placeholder="Confirm new password"
                className="w-full bg-black border border-border-dark rounded-2xl px-5 py-4 pr-12 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
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
      </form>

      {/* Login History */}
      <div>
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Icon name="history" size={20} className="text-primary" />
          Login History
        </h3>

        <div className="overflow-x-auto rounded-2xl border border-border-dark">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="text-xs uppercase bg-black text-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold">Device</th>
                <th className="px-6 py-4 font-bold">Location</th>
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/50 bg-black/20">
              {loginHistory.map((session, index) => (
                <tr key={index} className="hover:bg-black/40 transition-colors">
                  <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                    <Icon name={session.icon === 'laptop_mac' ? 'laptop' : session.icon === 'smartphone' ? 'smartphone' : 'computer'} size={18} />
                    {session.device}
                  </td>
                  <td className="px-6 py-4">{session.location}</td>
                  <td className="px-6 py-4">{session.date}</td>
                  <td className="px-6 py-4 text-right">
                    {session.status === 'active' ? (
                      <span className="text-primary bg-primary/10 px-2 py-1 rounded text-xs font-bold border border-primary/20">
                        Active Now
                      </span>
                    ) : (
                      <span className="text-slate-400">Signed out</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-10 flex items-center justify-end gap-4">
        {saved && (
          <span className="text-primary text-sm font-medium flex items-center gap-1">
            <Icon name="check-circle" size={18} />
            Changes saved
          </span>
        )}
        <button
          type="button"
          className="text-slate-400 font-bold px-6 py-3.5 rounded-xl hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="bg-primary hover:bg-green-400 text-black font-bold px-10 py-3.5 rounded-xl transition-all shadow-lg shadow-green-900/20 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Security'}
        </button>
      </div>
    </ProfileLayout>
  )
}
