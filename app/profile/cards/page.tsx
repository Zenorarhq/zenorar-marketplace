'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import ProfileLayout from '@/components/profile/ProfileLayout'
import { CardItem, CardDetailsModal, CardTopUpModal } from '@/components/cards'
import { usePreferences } from '@/contexts/PreferencesContext'
import { getBalance } from '@/lib/api/wallet'
import DepositModal from '@/components/wallet/DepositModal'

interface Card {
  id: string
  provider: string
  cardType: string
  cardBrand: string
  cardLastFour?: string
  cardExpiry?: string
  balance: number
  denomination?: number
  status: string
  nickname?: string
  isPremium: boolean
  createdAt: string
  expiresAt?: string
}

export default function ProfileCardsPage() {
  const router = useRouter()
  const { formatPrice } = usePreferences()

  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0)

  // Modal states
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Fetch cards
  useEffect(() => {
    fetchCards()
    fetchWalletBalance()
  }, [])

  const fetchCards = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/cards')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch cards')
      }

      setCards(data.data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchWalletBalance = async () => {
    try {
      const response = await getBalance()
      setWalletBalance(response.data?.balance ?? 0)
    } catch (err) {
      console.error('Error fetching wallet balance:', err)
    }
  }

  const handleFreeze = async (cardId: string) => {
    setActionLoading(cardId)
    try {
      const response = await fetch(`/api/cards/${cardId}/freeze`, {
        method: 'POST'
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to freeze card')
      }

      // Update card status locally
      setCards(cards.map(c =>
        c.id === cardId ? { ...c, status: 'frozen' } : c
      ))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnfreeze = async (cardId: string) => {
    setActionLoading(cardId)
    try {
      const response = await fetch(`/api/cards/${cardId}/unfreeze`, {
        method: 'POST'
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to unfreeze card')
      }

      // Update card status locally
      setCards(cards.map(c =>
        c.id === cardId ? { ...c, status: 'active' } : c
      ))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleTopUpSuccess = (newBalance: number) => {
    if (selectedCardId) {
      setCards(cards.map(c =>
        c.id === selectedCardId ? { ...c, balance: newBalance } : c
      ))
    }
    fetchWalletBalance()
  }

  const selectedCard = cards.find(c => c.id === selectedCardId)
  const virtualCards = cards.filter(c => c.cardType === 'virtual')
  const instantCards = cards.filter(c => c.cardType === 'instant')

  return (
    <ProfileLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Cards</h1>
            <p className="text-slate-400">
              Manage your virtual and instant cards
            </p>
          </div>
          <button
            onClick={() => router.push('/cards')}
            className="px-4 py-2 bg-primary text-black rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Icon name="plus" size={18} />
            Get Card
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Icon name="credit-card" size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Virtual Cards</p>
                <p className="text-xl font-semibold text-white">{virtualCards.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Icon name="zap" size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Instant Cards</p>
                <p className="text-xl font-semibold text-white">{instantCards.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#0f0f0f] rounded-xl border border-[#1f1f1f] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon name="wallet" size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Balance</p>
                <p className="text-xl font-semibold text-white">
                  {formatPrice(virtualCards.reduce((sum, c) => sum + c.balance, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Icon name="loader" size={32} className="text-primary animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && cards.length === 0 && (
          <div className="text-center py-20 bg-[#0f0f0f] rounded-xl border border-[#1f1f1f]">
            <Icon name="credit-card" size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">
              No cards yet
            </h3>
            <p className="text-slate-400 mb-6">
              Get your first virtual or instant card
            </p>
            <button
              onClick={() => router.push('/cards')}
              className="px-6 py-3 bg-primary text-black rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              Browse Cards
            </button>
          </div>
        )}

        {/* Virtual Cards Section */}
        {virtualCards.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Icon name="credit-card" size={20} className="text-blue-400" />
              Virtual Cards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {virtualCards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  formatPrice={formatPrice}
                  onReveal={(id) => {}}
                  onTopUp={(id) => {
                    setSelectedCardId(id)
                    setShowTopUpModal(true)
                  }}
                  onFreeze={handleFreeze}
                  onUnfreeze={handleUnfreeze}
                  onViewDetails={(id) => {
                    setSelectedCardId(id)
                    setShowDetailsModal(true)
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Instant Cards Section */}
        {instantCards.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Icon name="zap" size={20} className="text-emerald-400" />
              Instant Cards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {instantCards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  formatPrice={formatPrice}
                  onReveal={(id) => {}}
                  onViewDetails={(id) => {
                    setSelectedCardId(id)
                    setShowDetailsModal(true)
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedCardId && (
        <CardDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedCardId(null)
          }}
          cardId={selectedCardId}
          formatPrice={formatPrice}
        />
      )}

      {/* Top Up Modal */}
      {showTopUpModal && selectedCardId && selectedCard && (
        <CardTopUpModal
          isOpen={showTopUpModal}
          onClose={() => {
            setShowTopUpModal(false)
            setSelectedCardId(null)
          }}
          cardId={selectedCardId}
          cardProvider={selectedCard.provider}
          currentBalance={selectedCard.balance}
          formatPrice={formatPrice}
          walletBalance={walletBalance}
          onSuccess={handleTopUpSuccess}
        />
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <DepositModal
          isOpen={showDepositModal}
          onClose={() => {
            setShowDepositModal(false)
            fetchWalletBalance()
          }}
        />
      )}
    </ProfileLayout>
  )
}
