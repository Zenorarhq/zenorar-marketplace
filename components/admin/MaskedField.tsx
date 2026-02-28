'use client'

import { useState } from 'react'

interface MaskedFieldProps {
  maskedValue: string
  onReveal?: () => Promise<string>
}

export default function MaskedField({ maskedValue, onReveal }: MaskedFieldProps) {
  const [revealed, setRevealed] = useState(false)
  const [realValue, setRealValue] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReveal = async () => {
    if (revealed) {
      setRevealed(false)
      return
    }

    if (!onReveal) return

    setLoading(true)
    try {
      const value = await onReveal()
      setRealValue(value)
      setRevealed(true)
      // Auto-hide after 30 seconds
      setTimeout(() => {
        setRevealed(false)
        setRealValue('')
      }, 30000)
    } catch {
      // Failed to reveal
    } finally {
      setLoading(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-sm">{revealed ? realValue : maskedValue}</span>
      {onReveal && (
        <button
          onClick={handleReveal}
          disabled={loading}
          className="text-gray-400 hover:text-white transition-colors p-0.5"
          title={revealed ? 'Hide' : 'Reveal'}
        >
          {loading ? (
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : revealed ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      )}
    </span>
  )
}