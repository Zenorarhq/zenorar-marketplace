'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { usePreferences } from '@/contexts/PreferencesContext'

interface Country {
  id: string
  name: string
  isoCode: string
  dialCode: string
  flagEmoji: string
  smsEnabled: boolean
  voiceEnabled: boolean
  mmsEnabled: boolean
  retailMonthly: number
  isActive: boolean
}

export default function VirtualNumberCountryPage() {
  const params = useParams()
  const countryId = params.countryId as string
  const { formatPrice } = usePreferences()
  const [country, setCountry] = useState<Country | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/virtual-numbers/countries')
      .then(r => r.json())
      .then(data => {
        const found = (data.data as Country[])?.find(c => c.id === countryId) || null
        setCountry(found)
      })
      .catch(() => setCountry(null))
      .finally(() => setLoading(false))
  }, [countryId])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-surface-dark rounded-2xl" />
          <div className="h-8 bg-surface-dark rounded w-2/3" />
          <div className="h-32 bg-surface-dark rounded-2xl" />
          <div className="h-12 bg-surface-dark rounded-xl" />
        </div>
      </div>
    )
  }

  if (!country) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <Icon name="phone" size={48} className="text-slate-600 mx-auto mb-4" />
        <h2 className="text-white font-bold text-xl mb-2">Country not found</h2>
        <p className="text-slate-500 mb-6">This virtual number option is no longer available.</p>
        <Link href="/virtual-numbers" className="bg-primary text-black font-bold px-6 py-3 rounded-xl">Browse Numbers</Link>
      </div>
    )
  }

  const flagUrl = `https://flagcdn.com/w320/${country.isoCode.toLowerCase()}.png`

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <Link href="/virtual-numbers" className="hover:text-white transition-colors">Virtual Numbers</Link>
        <span>/</span>
        <span className="text-white">{country.name}</span>
      </nav>

      {/* Flag hero */}
      <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-6 border border-border-dark">
        <img
          src={flagUrl}
          alt={country.name}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-4 left-4 flex items-center gap-3">
          <span className="text-4xl">{country.flagEmoji}</span>
          <div>
            <span className="text-xs uppercase font-bold text-primary tracking-widest">Virtual Number</span>
            <h1 className="text-2xl font-extrabold text-white">{country.name}</h1>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="phone" size={18} className="text-primary" />
            <span className="text-slate-400">Dial Code</span>
          </div>
          <span className="text-white font-bold">{country.dialCode}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="message" size={18} className="text-primary" />
            <span className="text-slate-400">SMS</span>
          </div>
          <span className={`font-bold ${country.smsEnabled ? 'text-green-400' : 'text-slate-600'}`}>
            {country.smsEnabled ? 'Included' : 'Not available'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="phone" size={18} className="text-primary" />
            <span className="text-slate-400">Voice</span>
          </div>
          <span className={`font-bold ${country.voiceEnabled ? 'text-green-400' : 'text-slate-600'}`}>
            {country.voiceEnabled ? 'Included' : 'Not available'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="clock" size={18} className="text-primary" />
            <span className="text-slate-400">Billing</span>
          </div>
          <span className="text-white font-bold">Monthly</span>
        </div>
      </div>

      {/* Price + CTA */}
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-400">Monthly price</span>
          <span className="text-3xl font-extrabold text-white">{formatPrice(country.retailMonthly)}</span>
        </div>
        <Link
          href={`/virtual-numbers?country=${country.id}`}
          className="block w-full text-center bg-primary text-black font-bold py-3 rounded-xl hover:brightness-105 transition-all mb-3"
        >
          Select Your Number
        </Link>
        <Link
          href="/virtual-numbers"
          className="block w-full text-center bg-transparent border border-border-dark text-white font-bold py-3 rounded-xl hover:border-primary/50 transition-all"
        >
          Browse All Countries
        </Link>
      </div>
    </div>
  )
}
