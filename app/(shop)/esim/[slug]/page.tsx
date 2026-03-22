'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { useCart } from '@/lib/cart-context'
import { usePreferences } from '@/contexts/PreferencesContext'
import { useAuth } from '@/contexts/AuthContext'

interface Plan {
  id: string
  name: string
  slug: string
  description?: string
  regionName: string
  regionSlug: string
  coverageType: string
  countries: string[]
  dataAmountGb: number
  dataAmountDisplay: string
  validityDays: number
  isUnlimited: boolean
  voiceMinutes: number
  smsCount: number
  networkType: string
  speedDescription?: string
  hotspotAllowed: boolean
  supportsTopup: boolean
  retailPrice: number
  isFeatured: boolean
}

export default function EsimPlanPage() {
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()
  const { addItem, showAddedToCartPopup } = useCart()
  const { formatPrice } = usePreferences()
  const { isAuthenticated } = useAuth()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    fetch(`/api/esim/plans`)
      .then(r => r.json())
      .then(data => {
        const found = (data.data as Plan[])?.find(p => p.slug === slug) || null
        setPlan(found)
      })
      .catch(() => setPlan(null))
      .finally(() => setLoading(false))
  }, [slug])

  const handleAddToCart = () => {
    if (!plan) return
    const product: any = {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: `${plan.dataAmountDisplay} data, valid for ${plan.validityDays} days. ${plan.regionName}`,
      price: plan.retailPrice,
      rating: 0,
      reviewCount: 0,
      category: 'eSIM',
      categoryId: 'esim',
      icon: 'sim-card',
      iconColor: 'primary',
      tags: ['esim'],
      product_type: 'esim',
      metadata: {
        productType: 'esim',
        esim_plan_id: plan.id,
        countryIsoCode: plan.countries.length === 1 ? plan.countries[0] : undefined,
      },
    }
    addItem(product)
    showAddedToCartPopup(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const flagUrl = plan?.countries?.[0]
    ? `https://flagcdn.com/w320/${plan.countries[0].toLowerCase()}.png`
    : null

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-surface-dark rounded-2xl" />
          <div className="h-8 bg-surface-dark rounded w-2/3" />
          <div className="h-4 bg-surface-dark rounded w-1/2" />
          <div className="h-32 bg-surface-dark rounded-2xl" />
          <div className="h-12 bg-surface-dark rounded-xl" />
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <Icon name="sim-card" size={48} className="text-slate-600 mx-auto mb-4" />
        <h2 className="text-white font-bold text-xl mb-2">Plan not found</h2>
        <p className="text-slate-500 mb-6">This eSIM plan is no longer available.</p>
        <Link href="/esim" className="bg-primary text-black font-bold px-6 py-3 rounded-xl">Browse Plans</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <Link href="/esim" className="hover:text-white transition-colors">eSIM</Link>
        <span>/</span>
        <span className="text-white">{plan.name}</span>
      </nav>

      {/* Flag hero */}
      {flagUrl && (
        <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-6 border border-border-dark">
          <img
            src={flagUrl}
            alt={plan.countries[0]}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <span className="text-xs uppercase font-bold text-primary tracking-widest">{plan.regionName}</span>
            <h1 className="text-2xl font-extrabold text-white mt-1">{plan.name}</h1>
          </div>
          {plan.isFeatured && (
            <span className="absolute top-3 right-3 bg-primary text-black text-xs font-bold px-2 py-1 rounded-full">POPULAR</span>
          )}
        </div>
      )}

      {!flagUrl && (
        <div className="mb-6">
          <span className="text-xs uppercase font-bold text-primary tracking-widest">{plan.regionName}</span>
          <h1 className="text-2xl font-extrabold text-white mt-1">{plan.name}</h1>
        </div>
      )}

      {/* Specs */}
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="wifi" size={18} className="text-primary" />
            <span className="text-slate-400">Data</span>
          </div>
          <span className="text-white font-bold">{plan.dataAmountDisplay}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="clock" size={18} className="text-primary" />
            <span className="text-slate-400">Validity</span>
          </div>
          <span className="text-white font-bold">{plan.validityDays} days</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="globe" size={18} className="text-primary" />
            <span className="text-slate-400">Coverage</span>
          </div>
          <span className="text-white font-bold text-right max-w-[60%] text-sm">
            {plan.countries.slice(0, 5).join(', ')}
            {plan.countries.length > 5 && ` +${plan.countries.length - 5} more`}
          </span>
        </div>
        {plan.networkType && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="wifi" size={18} className="text-primary" />
              <span className="text-slate-400">Network</span>
            </div>
            <span className="text-white font-bold uppercase">{plan.networkType}</span>
          </div>
        )}
        {plan.hotspotAllowed && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="wifi" size={18} className="text-primary" />
              <span className="text-slate-400">Hotspot</span>
            </div>
            <span className="text-green-400 font-bold">Allowed</span>
          </div>
        )}
      </div>

      {/* Price + CTA */}
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-400">Price</span>
          <span className="text-3xl font-extrabold text-white">{formatPrice(plan.retailPrice)}</span>
        </div>
        <button
          onClick={handleAddToCart}
          className="w-full bg-primary text-black font-bold py-3 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2 mb-3"
        >
          <Icon name="cart" size={18} />
          {added ? 'Added!' : 'Add to Cart'}
        </button>
        <Link
          href="/esim"
          className="block w-full text-center bg-transparent border border-border-dark text-white font-bold py-3 rounded-xl hover:border-primary/50 transition-all"
        >
          Browse All Plans
        </Link>
      </div>
    </div>
  )
}
