'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import { apiFetch } from '@/lib/api/client'

interface EmailPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (email: string) => void
}

export default function EmailPromptModal({ isOpen, onClose, onSuccess }: EmailPromptModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    const trimmedEmail = email.trim()

    // Validate email format
    if (!trimmedEmail || !trimmedEmail.includes('@') || trimmedEmail.endsWith('@wallet.local')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await apiFetch('/auth/update-email', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail })
      })

      if (result.success) {
        // Update localStorage with new email
        try {
          const stored = localStorage.getItem('user')
          if (stored) {
            const userData = JSON.parse(stored)
            userData.email = trimmedEmail
            localStorage.setItem('user', JSON.stringify(userData))
          }
        } catch {
          // JSON parse error, ignore
        }
        onSuccess(trimmedEmail)
      } else {
        setError(result.error || 'Failed to update email')
      }
    } catch {
      setError('Failed to update email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#0a0a0a] border border-border-dark rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Icon name="mail" size={32} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-white">Add Your Email</h2>
          <p className="text-slate-400 text-sm mt-2">
            Add your email to receive payment receipts, order updates, and important notifications.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full bg-surface-dark border border-border-dark rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-primary"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-surface-dark text-white font-medium rounded-xl hover:bg-border-dark transition-all"
            >
              Skip for now
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 bg-primary text-black font-bold rounded-xl hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Icon name="loading" size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Email'
              )}
            </button>
          </div>
        </div>

        <p className="text-slate-600 text-xs text-center mt-4">
          You can always update your email later in your profile settings.
        </p>
      </div>
    </div>
  )
}
