'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'
import { apiFetch } from '@/lib/api/client'

// ── Types ─────────────────────────────────────────────────────────────────────

type ScriptStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'DEMO_APPROVED' | 'AWAITING_UPLOAD' | 'LIVE' | 'REJECTED'

interface ContributorBalance {
  available: number
  lifetimeEarned: number
  totalPaid: number
  scriptsLive: number
  minPayoutAmount: number
}

interface Script {
  id: string
  title: string
  status: ScriptStatus
  admin_note: string | null
  product_id: string | null
  asking_price: number
  created_at: string
}

interface Commission {
  id: string
  orderId: string
  productName: string
  amount: number
  status: 'AVAILABLE' | 'PAID' | 'REVERSED'
  createdAt: string
}

interface PayoutMethod {
  id: string
  network: string
  walletAddress: string
  isPrimary: boolean
  createdAt: string
}

interface Payout {
  id: string
  amount: number
  status: 'PENDING' | 'PAID' | 'REJECTED'
  method: string
  walletAddress: string
  adminNote: string | null
  createdAt: string
  paidAt: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cFetch<T>(path: string, opts?: RequestInit) {
  return apiFetch<T>(`/contributor${path}`, opts)
}

function fmt(n: number) { return `$${n.toFixed(2)}` }
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const NETWORK_LABELS: Record<string, string> = {
  BTC: 'Bitcoin (BTC)',
  ETH: 'Ethereum (ETH)',
  USDT_TRC20: 'USDT — TRC20',
  USDT_ERC20: 'USDT — ERC20',
  USDT_BEP20: 'USDT — BEP20',
  BNB: 'BNB',
  SOL: 'Solana (SOL)',
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'text-green-400 bg-green-400/10',
  PAID: 'text-primary bg-primary/10',
  REVERSED: 'text-red-400 bg-red-400/10',
  PENDING: 'text-yellow-400 bg-yellow-400/10',
  REJECTED: 'text-red-400 bg-red-400/10',
  SUBMITTED: 'text-blue-400 bg-blue-400/10',
  UNDER_REVIEW: 'text-yellow-400 bg-yellow-400/10',
  DEMO_APPROVED: 'text-cyan-400 bg-cyan-400/10',
  AWAITING_UPLOAD: 'text-purple-400 bg-purple-400/10',
  LIVE: 'text-green-400 bg-green-400/10',
  REJECTED_SCRIPT: 'text-red-400 bg-red-400/10',
}

const SCRIPT_STEPS: ScriptStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'DEMO_APPROVED', 'AWAITING_UPLOAD', 'LIVE']
const STEP_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  DEMO_APPROVED: 'Demo Approved',
  AWAITING_UPLOAD: 'Awaiting Upload',
  LIVE: 'Live',
}

// ── Script Status Stepper ─────────────────────────────────────────────────────

function ScriptStepper({ status }: { status: ScriptStatus }) {
  if (status === 'REJECTED') {
    return (
      <div className="flex items-center gap-2 mt-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full">
          <Icon name="x" size={12} /> Rejected
        </span>
      </div>
    )
  }
  const currentIdx = status === 'LIVE' ? SCRIPT_STEPS.length : SCRIPT_STEPS.indexOf(status)
  return (
    <div className="flex items-center gap-0 mt-3 overflow-x-auto pb-1">
      {SCRIPT_STEPS.map((step, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                done ? 'bg-primary text-black' : active ? 'bg-primary/30 text-primary border border-primary' : 'bg-border-dark text-slate-500'
              }`}>
                {done ? <Icon name="check" size={12} /> : i + 1}
              </div>
              <span className={`text-[10px] mt-1 whitespace-nowrap ${active ? 'text-primary font-medium' : done ? 'text-slate-400' : 'text-slate-600'}`}>
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < SCRIPT_STEPS.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 mb-4 ${i < currentIdx ? 'bg-primary' : 'bg-border-dark'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Add Payout Method Modal ───────────────────────────────────────────────────

function AddMethodModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [network, setNetwork] = useState('USDT_TRC20')
  const [walletAddress, setWalletAddress] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!walletAddress.trim()) { setError('Wallet address is required'); return }
    setSaving(true); setError(null)
    try {
      const res = await cFetch<any>('/payout-methods', {
        method: 'POST',
        body: JSON.stringify({ network, walletAddress: walletAddress.trim(), isPrimary }),
      })
      if (!res.success) throw new Error(res.error || 'Failed to save')
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-white">Add Payout Wallet</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><Icon name="x" size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Network</label>
            <select value={network} onChange={(e) => setNetwork(e.target.value)}
              className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary">
              {Object.entries(NETWORK_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Wallet Address</label>
            <input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Your wallet address"
              className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="accent-primary" />
            Set as primary payout wallet
          </label>
          <p className="text-slate-500 text-xs">Network fees will be deducted from your payout amount.</p>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-border-dark text-slate-300 rounded-xl py-2.5 font-medium hover:border-primary hover:text-primary transition-all">Cancel</button>
            <button onClick={save} disabled={saving}
              className="flex-1 bg-primary text-black rounded-xl py-2.5 font-bold hover:brightness-110 transition-all disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Wallet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Request Payout Modal ──────────────────────────────────────────────────────

function RequestPayoutModal({
  available, minPayout, methods, onClose, onRequested,
}: { available: number; minPayout: number; methods: PayoutMethod[]; onClose: () => void; onRequested: () => void }) {
  const [methodId, setMethodId] = useState(methods.find((m) => m.isPrimary)?.id ?? methods[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    const amt = Number(amount)
    if (!methodId) { setError('Select a payout wallet'); return }
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return }
    if (amt > available) { setError('Amount exceeds available balance'); return }
    if (amt < minPayout) { setError(`Minimum payout is $${minPayout}`); return }
    setSubmitting(true); setError(null)
    try {
      const res = await cFetch<any>('/payouts', { method: 'POST', body: JSON.stringify({ methodId, amount: amt }) })
      if (!res.success) throw new Error(res.error || 'Request failed')
      onRequested()
    } catch (e: any) { setError(e.message) } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-white">Request Payout</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><Icon name="x" size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="bg-background-dark rounded-xl p-3 flex items-center justify-between">
            <span className="text-slate-400 text-sm">Available</span>
            <span className="text-white font-bold">{fmt(available)}</span>
          </div>
          {methods.length === 0 ? (
            <p className="text-yellow-400 text-sm">Add a payout wallet first from the Methods tab.</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Payout Wallet</label>
                <select value={methodId} onChange={(e) => setMethodId(e.target.value)}
                  className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary">
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>{NETWORK_LABELS[m.network] ?? m.network} — {m.walletAddress.slice(0, 10)}…</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Amount (USD)</label>
                <input type="number" min={minPayout} max={available} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Min $${minPayout}`}
                  className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary" />
              </div>
              <p className="text-slate-500 text-xs">Payouts are processed bi-weekly. Network fees are deducted.</p>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 border border-border-dark text-slate-300 rounded-xl py-2.5 font-medium hover:border-primary hover:text-primary transition-all">Cancel</button>
                <button onClick={submit} disabled={submitting}
                  className="flex-1 bg-primary text-black rounded-xl py-2.5 font-bold hover:brightness-110 transition-all disabled:opacity-50">
                  {submitting ? 'Requesting...' : 'Request Payout'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

// ── Submit Script Modal ───────────────────────────────────────────────────────

const CATEGORIES = ['Automation', 'Data Processing', 'Web Scraping', 'API Integration', 'Security', 'Productivity', 'DevOps', 'Other']

function SubmitScriptModal({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const [form, setForm] = useState({
    title: '', shortDescription: '', fullDescription: '', category: CATEGORIES[0],
    demoUrl: '', languagePlatform: '', askingPrice: '', tags: '',
    offersSupport: false, exclusive: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.title.trim() || !form.shortDescription.trim() || !form.fullDescription.trim() || !form.demoUrl.trim() || !form.languagePlatform.trim() || !form.askingPrice) {
      setError('Please fill in all required fields'); return
    }
    setSaving(true); setError(null)
    try {
      const res = await cFetch<any>('/scripts', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title.trim(),
          shortDescription: form.shortDescription.trim(),
          fullDescription: form.fullDescription.trim(),
          category: form.category,
          demoUrl: form.demoUrl.trim(),
          languagePlatform: form.languagePlatform.trim(),
          askingPrice: Number(form.askingPrice),
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          offersSupport: form.offersSupport,
          exclusive: form.exclusive,
        }),
      })
      if (!res.success) throw new Error(res.error || 'Failed to submit')
      onSubmitted()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-white">Submit a Script</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><Icon name="x" size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Title <span className="text-red-400">*</span></label>
            <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Auto Email Responder"
              className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Short Description <span className="text-red-400">*</span></label>
            <input type="text" value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="One-line summary (shown in listings)"
              className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Description <span className="text-red-400">*</span></label>
            <textarea value={form.fullDescription} onChange={(e) => set('fullDescription', e.target.value)} rows={4} placeholder="Detailed description, use cases, requirements..."
              className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Category <span className="text-red-400">*</span></label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}
                className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Language / Platform <span className="text-red-400">*</span></label>
              <input type="text" value={form.languagePlatform} onChange={(e) => set('languagePlatform', e.target.value)} placeholder="e.g. Python 3, Node.js"
                className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Demo URL <span className="text-red-400">*</span></label>
              <input type="url" value={form.demoUrl} onChange={(e) => set('demoUrl', e.target.value)} placeholder="https://..."
                className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Asking Price (USD) <span className="text-red-400">*</span></label>
              <input type="number" min="1" step="0.01" value={form.askingPrice} onChange={(e) => set('askingPrice', e.target.value)} placeholder="e.g. 29.99"
                className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Tags (comma-separated)</label>
            <input type="text" value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="automation, email, python"
              className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
              <input type="checkbox" checked={form.offersSupport} onChange={(e) => set('offersSupport', e.target.checked)} className="accent-primary" />
              I will offer post-purchase support to buyers
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
              <input type="checkbox" checked={form.exclusive} onChange={(e) => set('exclusive', e.target.checked)} className="accent-primary" />
              Exclusive — sell only on Zenorar (not on other platforms)
            </label>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-border-dark text-slate-300 rounded-xl py-2.5 font-medium hover:border-primary hover:text-primary transition-all">Cancel</button>
            <button onClick={submit} disabled={saving}
              className="flex-1 bg-primary text-black rounded-xl py-2.5 font-bold hover:brightness-110 transition-all disabled:opacity-50">
              {saving ? 'Submitting...' : 'Submit Script'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Upload Script Modal ───────────────────────────────────────────────────────

function UploadScriptModal({ scriptId, scriptTitle, onClose, onUploaded }: { scriptId: string; scriptTitle: string; onClose: () => void; onUploaded: () => void }) {
  const [cloudinaryUrl, setCloudinaryUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!cloudinaryUrl.trim()) { setError('Cloudinary URL is required'); return }
    setSaving(true); setError(null)
    try {
      const res = await cFetch<any>(`/scripts/${scriptId}/upload`, {
        method: 'POST',
        body: JSON.stringify({ cloudinaryUrl: cloudinaryUrl.trim() }),
      })
      if (!res.success) throw new Error(res.error || 'Upload failed')
      onUploaded()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-white">Upload Script File</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><Icon name="x" size={20} /></button>
        </div>
        <p className="text-slate-400 text-sm mb-4">Upload <strong className="text-white">{scriptTitle}</strong> to Cloudinary and paste the URL below.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Cloudinary URL <span className="text-red-400">*</span></label>
            <input type="url" value={cloudinaryUrl} onChange={(e) => setCloudinaryUrl(e.target.value)} placeholder="https://res.cloudinary.com/..."
              className="w-full bg-background-dark border border-border-dark rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-border-dark text-slate-300 rounded-xl py-2.5 font-medium hover:border-primary hover:text-primary transition-all">Cancel</button>
            <button onClick={submit} disabled={saving}
              className="flex-1 bg-primary text-black rounded-xl py-2.5 font-bold hover:brightness-110 transition-all disabled:opacity-50">
              {saving ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ContributorDashboard() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'scripts' | 'earnings' | 'payouts' | 'methods'>('scripts')
  const [showAddMethod, setShowAddMethod] = useState(false)
  const [showRequestPayout, setShowRequestPayout] = useState(false)
  const [showSubmitScript, setShowSubmitScript] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<{ id: string; title: string } | null>(null)
  const [scriptPage, setScriptPage] = useState(1)
  const [earningsPage, setEarningsPage] = useState(1)
  const [payoutPage, setPayoutPage] = useState(1)

  const { data: balanceData } = useQuery({
    queryKey: ['contributor-balance'],
    queryFn: () => cFetch<ContributorBalance>('/balance'),
    refetchInterval: 60_000,
  })
  const balance: ContributorBalance = balanceData?.data ?? { available: 0, lifetimeEarned: 0, totalPaid: 0, scriptsLive: 0, minPayoutAmount: 100 }

  const { data: scriptsData, isLoading: scriptsLoading } = useQuery({
    queryKey: ['contributor-scripts', scriptPage],
    queryFn: () => cFetch<any>(`/scripts?page=${scriptPage}&limit=20`),
  })

  const { data: earningsData, isLoading: earningsLoading } = useQuery({
    queryKey: ['contributor-earnings', earningsPage],
    queryFn: () => cFetch<any>(`/commissions?page=${earningsPage}&limit=20`),
    enabled: activeTab === 'earnings',
  })

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery({
    queryKey: ['contributor-payouts', payoutPage],
    queryFn: () => cFetch<any>(`/payouts?page=${payoutPage}&limit=20`),
    enabled: activeTab === 'payouts',
  })

  const { data: methodsData } = useQuery({
    queryKey: ['contributor-methods'],
    queryFn: () => cFetch<any>('/payout-methods'),
    enabled: activeTab === 'methods' || activeTab === 'payouts',
  })
  const methods: PayoutMethod[] = methodsData?.data ?? []

  const deleteMethod = useMutation({
    mutationFn: (id: string) => cFetch<any>(`/payout-methods/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contributor-methods'] }),
  })

  const deleteScript = useMutation({
    mutationFn: (id: string) => cFetch<any>(`/scripts/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contributor-scripts'] }),
  })

  const tabs = [
    { key: 'scripts',  label: 'Scripts',  icon: 'code' },
    { key: 'earnings', label: 'Earnings', icon: 'trending-up' },
    { key: 'payouts',  label: 'Payouts',  icon: 'send' },
    { key: 'methods',  label: 'Methods',  icon: 'wallet' },
  ] as const

  return (
    <ProfileLayout>
      <div className="space-y-6">
        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Available to Withdraw', value: fmt(balance.available), icon: 'dollar-sign', accent: true },
            { label: 'Lifetime Earned', value: fmt(balance.lifetimeEarned), icon: 'trending-up' },
            { label: 'Scripts Live', value: String(balance.scriptsLive), icon: 'zap' },
          ].map((card) => (
            <div key={card.label} className={`bg-surface-dark rounded-2xl p-5 border ${card.accent ? 'border-primary/30' : 'border-border-dark'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-sm">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.accent ? 'bg-primary/15 text-primary' : 'bg-border-dark text-slate-400'}`}>
                  <Icon name={card.icon} size={16} />
                </div>
              </div>
              <div className={`text-2xl font-bold ${card.accent ? 'text-primary' : 'text-white'}`}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-dark rounded-xl p-1 border border-border-dark overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                activeTab === tab.key ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon name={tab.icon} size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Scripts Tab ─────────────────────────────────────────────── */}
        {activeTab === 'scripts' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowSubmitScript(true)}
                className="bg-primary text-black px-4 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2"
              >
                <Icon name="plus" size={15} />
                Submit Script
              </button>
            </div>
            {scriptsLoading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : !scriptsData?.data?.length ? (
              <div className="bg-surface-dark rounded-2xl border border-border-dark p-12 text-center">
                <Icon name="code" size={32} className="text-slate-600 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">No scripts submitted yet</h3>
                <p className="text-slate-400 text-sm">Your approved scripts will appear here with status tracking.</p>
              </div>
            ) : (
              scriptsData.data.map((script: Script) => (
                <div key={script.id} className="bg-surface-dark rounded-2xl border border-border-dark p-5">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <h3 className="text-white font-semibold leading-tight">{script.title}</h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[script.status] ?? 'text-slate-400 bg-slate-400/10'}`}>
                        {script.status.replace('_', ' ')}
                      </span>
                      {script.status === 'SUBMITTED' && (
                        <button
                          onClick={() => { if (confirm('Delete this script submission? This cannot be undone.')) deleteScript.mutate(script.id) }}
                          className="text-slate-600 hover:text-red-400 transition-colors"
                          title="Delete submission"
                        >
                          <Icon name="trash-2" size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs mb-1">Submitted {fmtDate(script.created_at)} · Asking {fmt(script.asking_price)}</p>

                  <ScriptStepper status={script.status} />

                  {script.admin_note && (
                    <div className="mt-3 bg-background-dark rounded-xl p-3 border border-border-dark">
                      <p className="text-slate-300 text-xs leading-relaxed"><span className="text-slate-500">Admin note: </span>{script.admin_note}</p>
                    </div>
                  )}
                  {script.status === 'AWAITING_UPLOAD' && (
                    <div className="mt-3 bg-purple-900/20 border border-purple-800/30 rounded-xl p-3 flex items-center justify-between gap-3">
                      <p className="text-purple-300 text-xs font-medium">Action required: Upload your script file to complete the submission.</p>
                      <button
                        onClick={() => setUploadTarget({ id: script.id, title: script.title })}
                        className="bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-purple-500 transition-colors flex-shrink-0 flex items-center gap-1.5"
                      >
                        <Icon name="upload" size={12} />
                        Upload File
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
            {scriptsData?.pagination && scriptsData.pagination.total > 20 && (
              <div className="flex justify-center gap-2">
                <button disabled={scriptPage === 1} onClick={() => setScriptPage(scriptPage - 1)}
                  className="px-4 py-2 rounded-lg border border-border-dark text-slate-400 hover:border-primary hover:text-primary disabled:opacity-40 text-sm">← Prev</button>
                <span className="px-4 py-2 text-slate-400 text-sm">Page {scriptPage}</span>
                <button disabled={scriptPage * 20 >= scriptsData.pagination.total} onClick={() => setScriptPage(scriptPage + 1)}
                  className="px-4 py-2 rounded-lg border border-border-dark text-slate-400 hover:border-primary hover:text-primary disabled:opacity-40 text-sm">Next →</button>
              </div>
            )}
          </div>
        )}

        {/* ── Earnings Tab ────────────────────────────────────────────── */}
        {activeTab === 'earnings' && (
          <div className="space-y-4">
            {earningsLoading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : !earningsData?.data?.length ? (
              <div className="bg-surface-dark rounded-2xl border border-border-dark p-12 text-center">
                <Icon name="trending-up" size={32} className="text-slate-600 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">No earnings yet</h3>
                <p className="text-slate-400 text-sm">Commission records will appear here when your scripts sell.</p>
              </div>
            ) : (
              <div className="bg-surface-dark rounded-2xl border border-border-dark overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-dark text-slate-400">
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4 hidden sm:table-cell">Script</th>
                      <th className="text-right py-3 px-4">Amount</th>
                      <th className="text-right py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark">
                    {(earningsData.data as Commission[]).map((c) => (
                      <tr key={c.id} className="text-slate-300 hover:bg-white/2">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                        <td className="py-3 px-4 hidden sm:table-cell text-slate-300 max-w-xs truncate">{c.productName}</td>
                        <td className="py-3 px-4 text-right font-semibold text-primary">{fmt(c.amount)}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status] ?? ''}`}>{c.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {earningsData?.pagination && earningsData.pagination.total > 20 && (
              <div className="flex justify-center gap-2">
                <button disabled={earningsPage === 1} onClick={() => setEarningsPage(earningsPage - 1)}
                  className="px-4 py-2 rounded-lg border border-border-dark text-slate-400 hover:border-primary hover:text-primary disabled:opacity-40 text-sm">← Prev</button>
                <span className="px-4 py-2 text-slate-400 text-sm">Page {earningsPage}</span>
                <button disabled={earningsPage * 20 >= earningsData.pagination.total} onClick={() => setEarningsPage(earningsPage + 1)}
                  className="px-4 py-2 rounded-lg border border-border-dark text-slate-400 hover:border-primary hover:text-primary disabled:opacity-40 text-sm">Next →</button>
              </div>
            )}
          </div>
        )}

        {/* ── Payouts Tab ─────────────────────────────────────────────── */}
        {activeTab === 'payouts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-slate-400 text-sm">Available: <span className="text-white font-bold">{fmt(balance.available)}</span></p>
                <p className="text-slate-500 text-xs">Min payout: ${balance.minPayoutAmount} · Bi-weekly</p>
              </div>
              <button
                onClick={() => setShowRequestPayout(true)}
                disabled={balance.available < balance.minPayoutAmount}
                className="bg-primary text-black px-4 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Request Payout
              </button>
            </div>

            {payoutsLoading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : !payoutsData?.data?.length ? (
              <div className="bg-surface-dark rounded-2xl border border-border-dark p-12 text-center">
                <Icon name="send" size={32} className="text-slate-600 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">No payouts yet</h3>
                <p className="text-slate-400 text-sm">Payout requests will appear here once submitted.</p>
              </div>
            ) : (
              <div className="bg-surface-dark rounded-2xl border border-border-dark overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-dark text-slate-400">
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4 hidden sm:table-cell">Method</th>
                      <th className="text-right py-3 px-4">Amount</th>
                      <th className="text-right py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark">
                    {(payoutsData.data as Payout[]).map((p) => (
                      <tr key={p.id} className="text-slate-300 hover:bg-white/2">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                        <td className="py-3 px-4 hidden sm:table-cell text-slate-400">{NETWORK_LABELS[p.method] ?? p.method}</td>
                        <td className="py-3 px-4 text-right font-semibold">{fmt(p.amount)}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[p.status] ?? ''}`}>{p.status}</span>
                          {p.status === 'REJECTED' && p.adminNote && (
                            <p className="text-red-400/70 text-xs mt-1">{p.adminNote}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {payoutsData?.pagination && payoutsData.pagination.total > 20 && (
              <div className="flex justify-center gap-2">
                <button disabled={payoutPage === 1} onClick={() => setPayoutPage(payoutPage - 1)}
                  className="px-4 py-2 rounded-lg border border-border-dark text-slate-400 hover:border-primary hover:text-primary disabled:opacity-40 text-sm">← Prev</button>
                <span className="px-4 py-2 text-slate-400 text-sm">Page {payoutPage}</span>
                <button disabled={payoutPage * 20 >= payoutsData.pagination.total} onClick={() => setPayoutPage(payoutPage + 1)}
                  className="px-4 py-2 rounded-lg border border-border-dark text-slate-400 hover:border-primary hover:text-primary disabled:opacity-40 text-sm">Next →</button>
              </div>
            )}
          </div>
        )}

        {/* ── Methods Tab ─────────────────────────────────────────────── */}
        {activeTab === 'methods' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-slate-400 text-sm">{methods.length}/3 wallets saved</p>
              <button
                onClick={() => setShowAddMethod(true)}
                disabled={methods.length >= 3}
                className="bg-primary text-black px-4 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Add Wallet
              </button>
            </div>

            {methods.length === 0 ? (
              <div className="bg-surface-dark rounded-2xl border border-border-dark p-12 text-center">
                <Icon name="wallet" size={32} className="text-slate-600 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">No payout wallets saved</h3>
                <p className="text-slate-400 text-sm">Add a crypto wallet to request payouts.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {methods.map((m) => (
                  <div key={m.id} className="bg-surface-dark rounded-xl border border-border-dark p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white font-medium text-sm">{NETWORK_LABELS[m.network] ?? m.network}</span>
                        {m.isPrimary && <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Primary</span>}
                      </div>
                      <p className="text-slate-500 text-xs font-mono truncate">{m.walletAddress}</p>
                    </div>
                    <button
                      onClick={() => { if (confirm('Remove this wallet?')) deleteMethod.mutate(m.id) }}
                      className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Icon name="trash-2" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        {showAddMethod && (
          <AddMethodModal
            onClose={() => setShowAddMethod(false)}
            onSaved={() => { setShowAddMethod(false); qc.invalidateQueries({ queryKey: ['contributor-methods'] }) }}
          />
        )}
        {showRequestPayout && (
          <RequestPayoutModal
            available={balance.available}
            minPayout={balance.minPayoutAmount}
            methods={methods}
            onClose={() => setShowRequestPayout(false)}
            onRequested={() => {
              setShowRequestPayout(false)
              qc.invalidateQueries({ queryKey: ['contributor-balance'] })
              qc.invalidateQueries({ queryKey: ['contributor-payouts'] })
            }}
          />
        )}
        {showSubmitScript && (
          <SubmitScriptModal
            onClose={() => setShowSubmitScript(false)}
            onSubmitted={() => {
              setShowSubmitScript(false)
              qc.invalidateQueries({ queryKey: ['contributor-scripts'] })
            }}
          />
        )}
        {uploadTarget && (
          <UploadScriptModal
            scriptId={uploadTarget.id}
            scriptTitle={uploadTarget.title}
            onClose={() => setUploadTarget(null)}
            onUploaded={() => {
              setUploadTarget(null)
              qc.invalidateQueries({ queryKey: ['contributor-scripts'] })
            }}
          />
        )}
      </div>
    </ProfileLayout>
  )
}
