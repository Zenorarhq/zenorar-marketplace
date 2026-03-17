'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Icon from '@/components/ui/Icon'

interface TestModeBannerProps {
  productType: 'esim' | 'gift_card' | 'virtual_card' | 'instant_card' | 'virtual_number'
  onTestPurchase: () => void
  isPurchasing?: boolean
  description?: string
  buttonLabel?: string
}

export default function TestModeBanner({ productType, onTestPurchase, isPurchasing, description, buttonLabel }: TestModeBannerProps) {
  const { isAuthenticated } = useAuth()
  const [testModeEnabled, setTestModeEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return }
    const token = localStorage.getItem('auth_token')
    fetch('/api/test-mode', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data.success) setTestModeEnabled(data.data.enabled) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  if (loading || !testModeEnabled) return null

  const labels: Record<string, { title: string; desc: string; btn: string }> = {
    esim: { title: 'eSIM', desc: 'Create a test eSIM with mock QR code and ICCID. Wallet will be charged.', btn: 'Create Test eSIM' },
    gift_card: { title: 'Gift Card', desc: 'Create a test gift card with mock code and PIN. Wallet will be charged.', btn: 'Create Test Gift Card' },
    virtual_card: { title: 'Virtual Card', desc: 'Create a test virtual card with mock card details. Wallet will be charged ($3 creation fee).', btn: 'Create Test Virtual Card' },
    instant_card: { title: 'Instant Card', desc: 'Create a test instant card with mock card details. Wallet will be charged.', btn: 'Create Test Instant Card' },
    virtual_number: { title: 'Virtual Number', desc: 'Create a test number for testing settings, SMS forwarding, and messages.', btn: 'Create Test Number' },
  }

  const label = labels[productType]

  return (
    <div className={`mb-4 p-4 rounded-xl border bg-yellow-500/10 border-yellow-500/30`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon name="code" size={20} className="text-yellow-400" />
          <div>
            <p className="font-bold text-sm text-yellow-400">Sandbox Mode Active</p>
            <p className="text-slate-500 text-xs">
              {description || label.desc}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-4 py-2 rounded-lg font-bold text-sm bg-yellow-500 text-black hover:bg-yellow-400 transition-all"
        >
          {expanded ? 'Hide' : 'Test'}
        </button>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-yellow-500/20 flex items-center justify-between">
          <p className="text-yellow-400/80 text-xs">
            Click the button to create a test {label.title.toLowerCase()}. You&apos;ll be able to test the full flow. All test data is cleaned up when sandbox mode is turned off.
          </p>
          <button
            onClick={onTestPurchase}
            disabled={isPurchasing}
            className="ml-4 px-4 py-2 bg-primary text-black font-bold text-sm rounded-lg hover:brightness-105 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {isPurchasing ? 'Creating...' : (buttonLabel || label.btn)}
          </button>
        </div>
      )}
    </div>
  )
}
