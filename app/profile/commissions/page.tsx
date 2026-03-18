'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'
import { apiFetch } from '@/lib/api/client'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

interface VendorBalance {
  locked: number
  available: number
  lifetimeEarned: number
  minPayoutAmount: number
}

interface Commission {
  id: string
  orderId: string
  orderNumber: string
  amount: number
  status: 'LOCKED' | 'AVAILABLE' | 'PAID' | 'REVERSED'
  unlocksAt: string
  createdAt: string
}

interface PayoutMethod {
  id: string
  type: 'BTC' | 'USDT_TRC20' | 'USDT_ERC20' | 'USDT_BEP20'
  walletAddress: string
  label: string | null
  isDefault: boolean
}

interface Payout {
  id: string
  amount: number
  status: 'PENDING' | 'PAID' | 'REJECTED' | 'CANCELLED'
  method: string
  walletAddress: string
  txHash: string | null
  note: string | null
  createdAt: string
  paidAt: string | null
}

// ── Helper ────────────────────────────────────────────────────────────────────

function vFetch<T>(path: string, opts?: RequestInit) {
  return apiFetch<T>(`/vendor${path}`, opts)
}

function fmt(n: number) {
  return `$${n.toFixed(2)}`
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const METHOD_LABELS: Record<string, string> = {
  BTC: 'Bitcoin (BTC)',
  USDT_TRC20: 'USDT — TRC20',
  USDT_ERC20: 'USDT — ERC20',
  USDT_BEP20: 'USDT — BEP20',
}

const STATUS_COLORS: Record<string, string> = {
  LOCKED: 'text-yellow-400 bg-yellow-400/10',
  AVAILABLE: 'text-green-400 bg-green-400/10',
  PAID: 'text-primary bg-primary/10',
  REVERSED: 'text-red-400 bg-red-400/10',
  PENDING: 'text-yellow-400 bg-yellow-400/10',
  REJECTED: 'text-red-400 bg-red-400/10',
  CANCELLED: 'text-slate-400 bg-slate-400/10',
}

// ── Add Payout Method Modal ───────────────────────────────────────────────────

function AddMethodModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<string>('USDT_TRC20')
  const [walletAddress, setWalletAddress] = useState('')
  const [label, setLabel] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!walletAddress.trim()) { setError('Wallet address is required'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await vFetch<any>('/payout-methods', {
        method: 'POST',
        body: JSON.stringify({ type, walletAddress: walletAddress.trim(), label: label.trim() || null, isDefault }),
      })
      if (!res.success) throw new Error(res.error || 'Failed to save')
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-white">Add Payout Method</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><Icon name="x" size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Network</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary"
            >
              {Object.entries(METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Your wallet address"
              className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. My main wallet"
              className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="accent-primary"
            />
            Set as default payout method
          </label>

          <p className="text-slate-500 text-xs">Network fees will be deducted from your payout amount.</p>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-border-dark text-slate-300 rounded-xl py-2.5 font-medium hover:border-primary hover:text-primary transition-all">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 bg-primary text-black rounded-xl py-2.5 font-bold hover:brightness-110 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Method'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Request Payout Modal ──────────────────────────────────────────────────────

function RequestPayoutModal({
  onClose,
  onRequested,
  available,
  minPayout,
  methods,
}: {
  onClose: () => void
  onRequested: () => void
  available: number
  minPayout: number
  methods: PayoutMethod[]
}) {
  const [methodId, setMethodId] = useState(methods.find((m) => m.isDefault)?.id || methods[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    const amt = Number(amount)
    if (!methodId) { setError('Select a payout method'); return }
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return }
    if (amt > available) { setError('Amount exceeds available balance'); return }
    if (amt < minPayout) { setError(`Minimum payout is ${fmt(minPayout)}`); return }

    setSubmitting(true)
    setError(null)
    try {
      const res = await vFetch<any>('/payouts', {
        method: 'POST',
        body: JSON.stringify({ methodId, amount: amt }),
      })
      if (!res.success) throw new Error(res.error || 'Request failed')
      onRequested()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-white">Request Payout</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><Icon name="x" size={20} /></button>
        </div>

        {methods.length === 0 ? (
          <p className="text-slate-400 text-sm">You need to add a payout method before requesting a payout.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Payout Method</label>
              <select
                value={methodId}
                onChange={(e) => setMethodId(e.target.value)}
                className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary"
              >
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {METHOD_LABELS[m.type] || m.type} — {m.walletAddress.slice(0, 12)}...{m.walletAddress.slice(-6)}
                    {m.isDefault ? ' (default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Amount <span className="text-slate-500 font-normal">(available: {fmt(available)})</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min. ${fmt(minPayout)}`}
                min={minPayout}
                max={available}
                step="0.01"
                className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary"
              />
            </div>

            <p className="text-slate-500 text-xs">Network fees will be deducted from the payout amount.</p>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 border border-border-dark text-slate-300 rounded-xl py-2.5 font-medium hover:border-primary hover:text-primary transition-all">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 bg-primary text-black rounded-xl py-2.5 font-bold hover:brightness-110 transition-all disabled:opacity-50"
              >
                {submitting ? 'Requesting...' : 'Request Payout'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'commissions' | 'payouts' | 'methods'

export default function CommissionsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('commissions')
  const [showAddMethod, setShowAddMethod] = useState(false)
  const [showRequestPayout, setShowRequestPayout] = useState(false)

  const { data: balance, isLoading: balLoading } = useQuery({
    queryKey: ['vendor-balance'],
    queryFn: async () => {
      const res = await vFetch<VendorBalance>('/balance')
      if (!res.success) throw new Error(res.error)
      return res.data!
    },
    enabled: !!user?.isVendor,
  })

  const { data: commissions, isLoading: commLoading } = useQuery({
    queryKey: ['vendor-commissions'],
    queryFn: async () => {
      const res = await vFetch<Commission[]>('/commissions?limit=50')
      return res.success ? (res.data || []) : []
    },
    enabled: tab === 'commissions' && !!user?.isVendor,
  })

  const { data: payouts, isLoading: payoutsLoading } = useQuery({
    queryKey: ['vendor-payouts'],
    queryFn: async () => {
      const res = await vFetch<Payout[]>('/payouts?limit=50')
      return res.success ? (res.data || []) : []
    },
    enabled: tab === 'payouts' && !!user?.isVendor,
  })

  const { data: methods, isLoading: methodsLoading } = useQuery({
    queryKey: ['vendor-payout-methods'],
    queryFn: async () => {
      const res = await vFetch<PayoutMethod[]>('/payout-methods')
      return res.success ? (res.data || []) : []
    },
    enabled: !!user?.isVendor,
  })

  const deleteMethod = useMutation({
    mutationFn: (id: string) => vFetch(`/payout-methods/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-payout-methods'] }),
  })

  const cancelPayout = useMutation({
    mutationFn: (id: string) => vFetch(`/payouts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-payouts'] })
      qc.invalidateQueries({ queryKey: ['vendor-balance'] })
    },
  })

  // Non-vendor: show the apply prompt
  if (!user?.isVendor) {
    return (
      <ProfileLayout>
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-surface-dark rounded-full flex items-center justify-center mx-auto mb-4 border border-border-dark">
            <Icon name="trending-up" size={28} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Vendor Access Only</h2>
          <p className="text-slate-400 mb-6 max-w-sm mx-auto">
            This page is for approved vendors. Apply to join the Zenorar Vendor Programme to earn commission on your orders.
          </p>
          <Link
            href="/become-a-vendor"
            className="bg-primary text-black px-6 py-3 rounded-xl font-bold hover:brightness-110 transition-all"
          >
            Learn About Vendor Programme
          </Link>
        </div>
      </ProfileLayout>
    )
  }

  return (
    <ProfileLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Commissions</h1>
            <p className="text-slate-400 text-sm mt-1">Track your earnings and manage payouts</p>
          </div>
          <button
            onClick={() => setShowRequestPayout(true)}
            disabled={!balance || balance.available <= 0}
            className="bg-primary text-black px-5 py-2.5 rounded-xl font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Request Payout
          </button>
        </div>

        {/* Balance Cards */}
        {balLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-background-dark rounded-xl p-5 border border-border-dark h-20 animate-pulse" />
            ))}
          </div>
        ) : balance ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-background-dark rounded-xl p-5 border border-border-dark">
              <p className="text-slate-500 text-xs mb-1">Available to Withdraw</p>
              <p className="text-2xl font-bold text-primary">{fmt(balance.available)}</p>
            </div>
            <div className="bg-background-dark rounded-xl p-5 border border-border-dark">
              <p className="text-slate-500 text-xs mb-1">Locked (7-day window)</p>
              <p className="text-2xl font-bold text-yellow-400">{fmt(balance.locked)}</p>
            </div>
            <div className="bg-background-dark rounded-xl p-5 border border-border-dark">
              <p className="text-slate-500 text-xs mb-1">Lifetime Earned</p>
              <p className="text-2xl font-bold text-white">{fmt(balance.lifetimeEarned)}</p>
            </div>
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border-dark pb-0">
          {([
            { key: 'commissions', label: 'Commission History' },
            { key: 'payouts', label: 'Payout History' },
            { key: 'methods', label: 'Payout Methods' },
          ] as { key: Tab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Commission History */}
        {tab === 'commissions' && (
          commLoading ? (
            <div className="text-slate-400 text-sm text-center py-10">Loading...</div>
          ) : !commissions?.length ? (
            <div className="text-center py-16 text-slate-400">
              <Icon name="trending-up" size={32} className="mx-auto mb-3 opacity-30" />
              <p>No commissions yet. Commission is earned when your orders are placed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-dark text-slate-400">
                    <th className="text-left py-3 px-2">Order</th>
                    <th className="text-right py-3 px-2">Amount</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2 hidden sm:table-cell">Unlocks</th>
                    <th className="text-left py-3 px-2 hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark">
                  {commissions.map((c) => (
                    <tr key={c.id} className="text-slate-300">
                      <td className="py-3 px-2 font-mono text-xs text-slate-400">{c.orderNumber}</td>
                      <td className="py-3 px-2 text-right font-semibold text-white">{fmt(c.amount)}</td>
                      <td className="py-3 px-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[c.status] || ''}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-400 text-xs hidden sm:table-cell">
                        {c.status === 'LOCKED' ? fmtDate(c.unlocksAt) : '—'}
                      </td>
                      <td className="py-3 px-2 text-slate-500 text-xs hidden md:table-cell">{fmtDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Payout History */}
        {tab === 'payouts' && (
          payoutsLoading ? (
            <div className="text-slate-400 text-sm text-center py-10">Loading...</div>
          ) : !payouts?.length ? (
            <div className="text-center py-16 text-slate-400">
              <Icon name="wallet" size={32} className="mx-auto mb-3 opacity-30" />
              <p>No payouts yet. Request your first payout once you have available balance.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-dark text-slate-400">
                    <th className="text-right py-3 px-2">Amount</th>
                    <th className="text-left py-3 px-2">Method</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2 hidden sm:table-cell">Tx Hash</th>
                    <th className="text-left py-3 px-2 hidden md:table-cell">Date</th>
                    <th className="py-3 px-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark">
                  {payouts.map((p) => (
                    <tr key={p.id} className="text-slate-300">
                      <td className="py-3 px-2 text-right font-semibold text-white">{fmt(p.amount)}</td>
                      <td className="py-3 px-2 text-slate-400 text-xs">{METHOD_LABELS[p.method] || p.method}</td>
                      <td className="py-3 px-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[p.status] || ''}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-400 text-xs hidden sm:table-cell font-mono">
                        {p.txHash ? `${p.txHash.slice(0, 10)}...` : '—'}
                      </td>
                      <td className="py-3 px-2 text-slate-500 text-xs hidden md:table-cell">{fmtDate(p.createdAt)}</td>
                      <td className="py-3 px-2 text-right">
                        {p.status === 'PENDING' && (
                          <button
                            onClick={() => cancelPayout.mutate(p.id)}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Payout Methods */}
        {tab === 'methods' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-slate-400 text-sm">Up to 3 payout wallets saved.</p>
              {(methods?.length ?? 0) < 3 && (
                <button
                  onClick={() => setShowAddMethod(true)}
                  className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  <Icon name="plus" size={14} />
                  Add Method
                </button>
              )}
            </div>

            {methodsLoading ? (
              <div className="text-slate-400 text-sm text-center py-10">Loading...</div>
            ) : !methods?.length ? (
              <div className="text-center py-10 text-slate-400">
                <p className="mb-4">No payout methods saved yet.</p>
                <button
                  onClick={() => setShowAddMethod(true)}
                  className="bg-primary text-black px-5 py-2.5 rounded-xl font-semibold text-sm hover:brightness-110 transition-all"
                >
                  Add Your First Method
                </button>
              </div>
            ) : (
              methods.map((m) => (
                <div key={m.id} className="bg-background-dark rounded-xl border border-border-dark p-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white text-sm">{METHOD_LABELS[m.type] || m.type}</span>
                      {m.isDefault && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Default</span>
                      )}
                      {m.label && (
                        <span className="text-xs text-slate-500">{m.label}</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs font-mono break-all">{m.walletAddress}</p>
                  </div>
                  <button
                    onClick={() => deleteMethod.mutate(m.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Remove method"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddMethod && (
        <AddMethodModal
          onClose={() => setShowAddMethod(false)}
          onSaved={() => {
            setShowAddMethod(false)
            qc.invalidateQueries({ queryKey: ['vendor-payout-methods'] })
          }}
        />
      )}

      {showRequestPayout && balance && methods && (
        <RequestPayoutModal
          onClose={() => setShowRequestPayout(false)}
          onRequested={() => {
            setShowRequestPayout(false)
            qc.invalidateQueries({ queryKey: ['vendor-balance'] })
            qc.invalidateQueries({ queryKey: ['vendor-payouts'] })
            setTab('payouts')
          }}
          available={balance.available}
          minPayout={balance.minPayoutAmount}
          methods={methods}
        />
      )}
    </ProfileLayout>
  )
}