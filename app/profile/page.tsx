'use client'

import { useState } from 'react'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'

export default function ProfileSettingsPage() {
  const [formData, setFormData] = useState({
    fullName: 'Alex Morgan',
    displayName: 'alexm_dev',
    email: 'alex.morgan@example.com',
    bio: 'Senior Full Stack Developer passionate about building scalable web applications and exploring new technologies in the web3 space.',
  })
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [publicProfile, setPublicProfile] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setSaved(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsLoading(false)
    setSaved(true)
  }

  return (
    <ProfileLayout>
      {/* Avatar Section */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12 pb-10 border-b border-border-dark">
        <div className="relative group cursor-pointer">
          <div className="w-28 h-28 rounded-3xl overflow-hidden bg-black ring-4 ring-black shadow-xl flex items-center justify-center">
            <Icon name="user" size={60} className="text-slate-700" />
          </div>
          <button className="absolute -bottom-3 -right-3 w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-green-500/20">
            <Icon name="edit" size={20} />
          </button>
        </div>
        <div className="flex-1 text-center md:text-left mt-2">
          <h1 className="text-3xl font-bold text-white mb-1">{formData.fullName}</h1>
          <p className="text-slate-400 mb-6 font-medium">{formData.email}</p>
          <button className="text-xs font-bold text-primary border border-primary/30 px-5 py-2.5 rounded-xl hover:bg-primary/10 transition-colors uppercase tracking-wider flex items-center gap-2 mx-auto md:mx-0">
            <Icon name="upload" size={14} />
            Change Avatar
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label htmlFor="fullName" className="text-sm font-semibold text-slate-300 ml-1">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleInputChange}
              className="w-full bg-black border border-border-dark rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="space-y-3">
            <label htmlFor="displayName" className="text-sm font-semibold text-slate-300 ml-1">
              Display Name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              value={formData.displayName}
              onChange={handleInputChange}
              className="w-full bg-black border border-border-dark rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="space-y-3 md:col-span-2">
            <label htmlFor="email" className="text-sm font-semibold text-slate-300 ml-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full bg-black border border-border-dark rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="space-y-3 md:col-span-2">
            <label htmlFor="bio" className="text-sm font-semibold text-slate-300 ml-1">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              className="w-full bg-black border border-border-dark rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Preferences */}
        <div className="pt-2">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Icon name="settings" size={20} className="text-primary" />
            Preferences
          </h3>
          <div className="space-y-6 bg-black/40 rounded-2xl p-6 border border-border-dark/50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">Email Notifications</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Receive updates about your account activity and deals.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => {
                    setEmailNotifications(e.target.checked)
                    setSaved(false)
                  }}
                  className="sr-only peer"
                />
                <div className="w-12 h-7 bg-surface-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border-dark peer-checked:border-primary"></div>
              </label>
            </div>
            <div className="w-full h-px bg-border-dark/50"></div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">Public Profile</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Allow other users to see your purchases and badges.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={publicProfile}
                  onChange={(e) => {
                    setPublicProfile(e.target.checked)
                    setSaved(false)
                  }}
                  className="sr-only peer"
                />
                <div className="w-12 h-7 bg-surface-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border-dark peer-checked:border-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 flex items-center justify-end gap-4">
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
            type="submit"
            disabled={isLoading}
            className="bg-primary hover:bg-green-400 text-black font-bold px-10 py-3.5 rounded-xl transition-all shadow-lg shadow-green-900/20 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </ProfileLayout>
  )
}
