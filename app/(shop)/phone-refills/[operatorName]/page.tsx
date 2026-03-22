'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import ServiceLogo from '@/components/ui/ServiceLogo'
import { usePreferences } from '@/contexts/PreferencesContext'

interface TopupOffer {
  offerId: string
  priceType: string
  price: number
  priceCurrency: string
  sendAmount: number
  sendCurrency: string
  priceMin?: number
  priceMax?: number
  sendMin?: number
  sendMax?: number
  notes: string
  shortNotes: string
}

interface Operator {
  id: string
  name: string
  country: string
  regions: string[]
  offers: TopupOffer[]
}

export default function PhoneRefillOperatorPage() {
  const params = useParams()
  const operatorName = decodeURIComponent(params.operatorName as string)
  const { formatPrice } = usePreferences()
  const [operator, setOperator] = useState<Operator | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/phone-refills/operators')
      .then(r => r.json())
      .then(data => {
        const found = (data.data as Operator[])?.find(
          o => o.name.toLowerCase() === operatorName.toLowerCase()
        ) || null
        setOperator(found)
      })
      .catch(() => setOperator(null))
      .finally(() => setLoading(false))
  }, [operatorName])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-surface-dark rounded-2xl" />
          <div className="h-8 bg-surface-dark rounded w-2/3" />
          <div className="h-48 bg-surface-dark rounded-2xl" />
          <div className="h-12 bg-surface-dark rounded-xl" />
        </div>
      </div>
    )
  }

  if (!operator) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <Icon name="phone" size={48} className="text-slate-600 mx-auto mb-4" />
        <h2 className="text-white font-bold text-xl mb-2">Operator not found</h2>
        <p className="text-slate-500 mb-6">This operator may no longer be available.</p>
        <Link href="/phone-refills" className="bg-primary text-black font-bold px-6 py-3 rounded-xl">Browse Operators</Link>
      </div>
    )
  }

  const fixedOffers = operator.offers.filter(o => o.priceType === 'FIXED')
  const rangeOffer = operator.offers.find(o => o.priceType === 'RANGE')

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <Link href="/phone-refills" className="hover:text-white transition-colors">Phone Refills</Link>
        <span>/</span>
        <span className="text-white">{operator.name}</span>
      </nav>

      {/* Operator logo hero */}
      <div className="w-full h-40 rounded-2xl bg-surface-dark border border-border-dark flex items-center justify-center mb-6 overflow-hidden">
        <ServiceLogo name={operator.name} size={100} />
      </div>

      <h1 className="text-2xl font-extrabold text-white mb-1">{operator.name}</h1>
      <p className="text-slate-400 mb-6">
        {operator.country}
        {operator.regions?.length > 0 && ` · ${operator.regions.slice(0, 2).join(', ')}`}
      </p>

      {/* Available offers */}
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 mb-6">
        <h2 className="text-white font-bold mb-4">Available Top-Ups</h2>

        {rangeOffer && (
          <div className="mb-4 p-4 border border-primary/30 rounded-xl bg-primary/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-primary font-bold text-sm uppercase">Flexible Amount</span>
              <span className="text-white font-bold">
                {formatPrice(rangeOffer.priceMin!)} – {formatPrice(rangeOffer.priceMax!)}
              </span>
            </div>
            {rangeOffer.shortNotes && <p className="text-slate-400 text-xs">{rangeOffer.shortNotes}</p>}
          </div>
        )}

        {fixedOffers.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {fixedOffers.slice(0, 12).map(offer => (
              <div key={offer.offerId} className="p-3 border border-border-dark rounded-xl">
                <div className="text-white font-bold">{formatPrice(offer.price)}</div>
                {offer.shortNotes && (
                  <div className="text-slate-400 text-xs mt-0.5 line-clamp-1">{offer.shortNotes}</div>
                )}
              </div>
            ))}
          </div>
        ) : !rangeOffer ? (
          <p className="text-slate-500 text-sm">No offers currently available.</p>
        ) : null}
      </div>

      {/* CTA */}
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6">
        <Link
          href={`/phone-refills?search=${encodeURIComponent(operator.name)}`}
          className="block w-full text-center bg-primary text-black font-bold py-3 rounded-xl hover:brightness-105 transition-all mb-3"
        >
          Top Up Now
        </Link>
        <Link
          href="/phone-refills"
          className="block w-full text-center bg-transparent border border-border-dark text-white font-bold py-3 rounded-xl hover:border-primary/50 transition-all"
        >
          Browse All Operators
        </Link>
      </div>
    </div>
  )
}
