'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Icon from '@/components/ui/Icon'

export default function TestModeBanner() {
  const { isAuthenticated } = useAuth()
  const [testModeEnabled, setTestModeEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="mb-4 p-4 rounded-xl border bg-yellow-500/10 border-yellow-500/30">
      <div className="flex items-center gap-3">
        <Icon name="code" size={20} className="text-yellow-400" />
        <div>
          <p className="font-bold text-sm text-yellow-400">Sandbox Mode Active</p>
          <p className="text-slate-500 text-xs">
            You are in test mode. Purchases use mock data — no real provider APIs are called. Wallet charges are real. All test data is cleaned up when sandbox mode is turned off.
          </p>
        </div>
      </div>
    </div>
  )
}
