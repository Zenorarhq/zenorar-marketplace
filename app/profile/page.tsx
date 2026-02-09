'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'
import { useAuth } from '@/contexts/AuthContext'
import { profileApi } from '@/lib/api/profile'

export default function ProfileSettingsPage() {
  const { user, updateUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    displayName: '',
    email: '',
    bio: '',
  })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  // Initialize form data from user when available
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.name || '',
        displayName: user.name?.toLowerCase().replace(/\s+/g, '_') || '',
        email: user.email || '',
        bio: '',
      })
      setAvatarPreview(user.avatar || null)
    }
  }, [user])

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

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be less than 5MB')
      return
    }

    setAvatarError('')
    setIsUploadingAvatar(true)

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)

    try {
      const result = await profileApi.uploadAvatar(file)
      if (result.success && result.data) {
        setAvatarPreview(result.data.avatar || null)
        updateUser({ avatar: result.data.avatar }) // Update user context immediately
      } else {
        setAvatarError(result.error || 'Failed to upload avatar')
        // Revert preview on error
        setAvatarPreview(user?.avatar || null)
      }
    } catch {
      setAvatarError('Failed to upload avatar. Please try again.')
      setAvatarPreview(user?.avatar || null)
    } finally {
      setIsUploadingAvatar(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    if (!avatarPreview) return

    setIsUploadingAvatar(true)
    setAvatarError('')

    try {
      const result = await profileApi.removeAvatar()
      if (result.success) {
        setAvatarPreview(null)
        updateUser({ avatar: null }) // Update user context immediately
      } else {
        setAvatarError(result.error || 'Failed to remove avatar')
      }
    } catch {
      setAvatarError('Failed to remove avatar. Please try again.')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await profileApi.update({
        name: formData.fullName,
      })

      if (result.success && result.data) {
        updateUser({ name: result.data.name })
        setSaved(true)
      }
    } catch {
      // Handle error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProfileLayout>
      {/* Avatar Section */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12 pb-10 border-b border-border-dark">
        <div className="relative group">
          <div
            className="w-28 h-28 rounded-3xl overflow-hidden bg-black ring-4 ring-black shadow-xl flex items-center justify-center cursor-pointer"
            onClick={handleAvatarClick}
          >
            {isUploadingAvatar ? (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-3xl">
                <Icon name="loading" size={32} className="text-primary animate-spin" />
              </div>
            ) : null}
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt={formData.fullName || 'Profile'}
                fill
                className="object-cover"
              />
            ) : (
              <Icon name="user" size={60} className="text-slate-700" />
            )}
          </div>
          <button
            onClick={handleAvatarClick}
            disabled={isUploadingAvatar}
            className="absolute -bottom-3 -right-3 w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-green-500/20 disabled:opacity-50"
          >
            <Icon name="edit" size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        <div className="flex-1 text-center md:text-left mt-2">
          <h1 className="text-3xl font-bold text-white mb-1">{formData.fullName}</h1>
          <p className="text-slate-400 mb-6 font-medium">{formData.email}</p>
          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <button
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
              className="text-xs font-bold text-primary border border-primary/30 px-5 py-2.5 rounded-xl hover:bg-primary/10 transition-colors uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
            >
              <Icon name="upload" size={14} />
              {avatarPreview ? 'Change Avatar' : 'Upload Avatar'}
            </button>
            {avatarPreview && (
              <button
                onClick={handleRemoveAvatar}
                disabled={isUploadingAvatar}
                className="text-xs font-bold text-red-400 border border-red-400/30 px-5 py-2.5 rounded-xl hover:bg-red-400/10 transition-colors uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
              >
                <Icon name="delete" size={14} />
                Remove
              </button>
            )}
          </div>
          {avatarError && (
            <p className="text-red-400 text-xs mt-3">{avatarError}</p>
          )}
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
              disabled
              className="w-full bg-black border border-border-dark rounded-2xl px-5 py-4 text-slate-400 placeholder-slate-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 ml-1">Email cannot be changed</p>
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
