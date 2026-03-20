'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  const { isAuthenticated, user } = useAuth()
  const { formatPrice } = usePreferences()
  const [showDepositModal, setShowDepositModal] = useState(false)
  const queryClient = useQueryClient()

  // Fetch wallet balance with React Query caching
  const { data: walletBalance, isLoading: loadingBalance } = useQuery({
    queryKey: ['wallet-balance', user?.id],
    queryFn: async () => {
      const response = await getBalance()
      const balance = response.data?.balance ?? 0
      onBalanceChange?.(balance)
      return balance
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  })

  // Don't render if not authenticated
  if (!isAuthenticated) return null

  if (variant === 'mobile') {
    return (
      <>
        <div className="lg:hidden p-4 bg-surface-dark rounded-xl border border-border-dark">
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
            onClose={() => {
              setShowDepositModal(false)
              // Invalidate and refetch wallet balance after deposit
              queryClient.invalidateQueries({ queryKey: ['wallet-balance'] })
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
          onClose={() => {
            setShowDepositModal(false)
            // Invalidate and refetch wallet balance after deposit
            queryClient.invalidateQueries({ queryKey: ['wallet-balance'] })
          }}
        />
      )}
    </>
  )
}
