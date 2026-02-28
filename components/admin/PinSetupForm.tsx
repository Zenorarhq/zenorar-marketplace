'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api/client'

interface PinSetupFormProps {
  hasExistingPin: boolean
  onSuccess: () => void
  onCancel?: () => void
  /** If true, renders as a full-screen blocking modal */
  fullScreen?: boolean
}

export default function PinSetupForm({ hasExistingPin, onSuccess, onCancel, fullScreen = false }: PinSetupFormProps) {
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPin.length < 4 || newPin.length > 6) {
      setError('PIN must be 4-6 digits')
      return
    }

    if (newPin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    if (hasExistingPin && !currentPin) {
      setError('Enter your current PIN')
      return
    }

    setSaving(true)
    try {
      const body: any = { pin: newPin }
      if (hasExistingPin) body.currentPin = currentPin

      const res = await apiFetch('/admin/pin/setup', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      if (res.success) {
        onSuccess()
        setCurrentPin('')
        setNewPin('')
        setConfirmPin('')
      } else {
        setError(res.message || res.error || 'Failed to set PIN')
      }
    } catch {
      setError('Failed to set PIN')
    } finally {
      setSaving(false)
    }
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {hasExistingPin && (
        <div>
          <label className="block text-sm text-gray-300 mb-1">Current PIN</label>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
            className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded text-white focus:border-blue-500 focus:outline-none"
            placeholder="Enter current PIN"
          />
        </div>
      )}

      <div>
        <label className="block text-sm text-gray-300 mb-1">
          {hasExistingPin ? 'New PIN' : 'PIN'} (4-6 digits)
        </label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
          className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded text-white focus:border-blue-500 focus:outline-none"
          placeholder="Enter PIN"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Confirm PIN</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
          className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded text-white focus:border-blue-500 focus:outline-none"
          placeholder="Re-enter PIN"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-[#2a2a2a] text-gray-300 rounded hover:bg-[#333] transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving || newPin.length < 4}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : hasExistingPin ? 'Change PIN' : 'Set PIN'}
        </button>
      </div>
    </form>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 w-full max-w-md mx-4">
          <h2 className="text-xl font-bold text-white mb-2">Set Up Your Security PIN</h2>
          <p className="text-sm text-gray-400 mb-6">
            Before you can access admin features, you need to set a security PIN.
            This PIN is required for sensitive actions and cannot be recovered — only reset via email.
          </p>
          {formContent}
        </div>
      </div>
    )
  }

  return formContent
}