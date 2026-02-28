'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiFetch } from '@/lib/api/client'

function ResetPinForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const userId = searchParams.get('userId') || ''

  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token || !userId) {
      setError('Invalid reset link')
      return
    }

    if (newPin.length < 4 || newPin.length > 6) {
      setError('PIN must be 4-6 digits')
      return
    }

    if (newPin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    setSaving(true)
    try {
      const res = await apiFetch('/admin/pin/reset', {
        method: 'POST',
        body: JSON.stringify({ userId, token, newPin }),
      })

      if (res.success) {
        setSuccess(true)
      } else {
        setError(res.message || res.error || 'Reset link is invalid or expired')
      }
    } catch {
      setError('Failed to reset PIN')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-8 w-full max-w-md">
      <h1 className="text-xl font-bold text-white mb-2">Reset Security PIN</h1>

      {success ? (
        <div>
          <p className="text-green-400 mb-4">PIN reset successfully.</p>
          <a
            href="/admin/settings"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
          >
            Return to Settings
          </a>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-6">Enter a new 4-6 digit security PIN.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">New PIN (4-6 digits)</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded text-white focus:border-blue-500 focus:outline-none"
                placeholder="Enter new PIN"
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

            <button
              type="submit"
              disabled={saving || newPin.length < 4}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Resetting...' : 'Reset PIN'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export default function ResetPinPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-gray-400">Loading...</div>}>
        <ResetPinForm />
      </Suspense>
    </div>
  )
}