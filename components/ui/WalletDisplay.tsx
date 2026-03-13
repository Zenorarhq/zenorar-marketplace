'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import { useAuth } from '@/contexts/AuthContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { getBalance } from '@/lib/api/wallet'
import DepositModal from '@/components/wallet/DepositModal'

interface WalletDisplayProps {
  variant?: 'desktop' | 'mobile'
  onBalanceChange?: (balance: number | null) => void
}

export default function WalletDisplay({ variant = 'desktop', onBalanceChange }: WalletDisplayProps) {
  const { isAuthenticated } = useAuth()
  const { formatPrice } = usePreferences()
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)

  // Fetch wallet balance when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLoadingBalance(true)
      getBalance()
        .then(response => {
          const balance = response.data?.balance ?? null
          setWalletBalance(balance)
          onBalanceChange?.(balance)
        })
        .catch(console.error)
        .finally(() => setLoadingBalance(false))
    }
  }, [isAuthenticated, onBalanceChange])

  // Don't render if not authenticated
  if (!isAuthenticated) return null

  if (variant === 'mobile') {
    return (
      <>
        <div className="lg:hidden mb-6 p-4 bg-surface-dark rounded-xl border border-border-dark">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon name="wallet" size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Wallet Balance</p>
                <p className="text-lg font-semibold text-white">
                  {loadingBalance ? '...' : formatPrice(walletBalance || 0)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDepositModal(true)}
              className="px-4 py-2 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Add Funds
            </button>
          </div>
        </div>

        {showDepositModal && (
          <DepositModal
            isOpen={showDepositModal}
            onClose={async () => {
              setShowDepositModal(false)
              // Refresh balance after deposit
              const result = await getBalance()
              const newBalance = result.data?.balance ?? null
              setWalletBalance(newBalance)
              onBalanceChange?.(newBalance)
            }}
          />
        )}
      </>
    )
  }

  // Desktop variant
  return (
    <>
      <div className="hidden lg:flex items-center gap-4 bg-surface-dark/50 rounded-xl p-3 border border-border-dark">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="wallet" size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Balance</p>
            <p className="text-sm font-semibold text-white">
              {loadingBalance ? '...' : formatPrice(walletBalance || 0)}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDepositModal(true)}
          className="px-3 py-1.5 bg-primary text-black rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Add Funds
        </button>
      </div>

      {showDepositModal && (
        <DepositModal
          isOpen={showDepositModal}
          onClose={async () => {
            setShowDepositModal(false)
            // Refresh balance after deposit
            const result = await getBalance()
            const newBalance = result.data?.balance ?? null
            setWalletBalance(newBalance)
            onBalanceChange?.(newBalance)
          }}
        />
      )}
    </>
  )
}
