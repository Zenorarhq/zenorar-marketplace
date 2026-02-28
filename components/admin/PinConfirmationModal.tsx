'use client'

import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/api/client'

interface PinConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (pin: string) => void
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
}

export default function PinConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
}: PinConfirmationModalProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setPin('')
      setError('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin || pin.length < 4) {
      setError('Enter your 4-6 digit PIN')
      return
    }

    setVerifying(true)
    setError('')

    try {
      const res = await apiFetch('/admin/pin/verify', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      })

      if (res.success) {
        onConfirm(pin)
        setPin('')
      } else {
        setError(res.message || res.error || 'Invalid PIN')
      }
    } catch {
      setError('Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-white mb-2">
          {destructive ? '⚠️ ' : ''}{title}
        </h3>
        <p className="text-sm text-gray-400 mb-4">{description}</p>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm text-gray-300 mb-1">Enter your security PIN</label>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '')
              setPin(val)
              setError('')
            }}
            className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded text-white text-center text-lg tracking-widest focus:border-blue-500 focus:outline-none"
            placeholder="••••••"
            disabled={verifying}
          />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#2a2a2a] text-gray-300 rounded hover:bg-[#333] transition-colors"
              disabled={verifying}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={verifying || pin.length < 4}
              className={`flex-1 px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 ${
                destructive
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {verifying ? 'Verifying...' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}