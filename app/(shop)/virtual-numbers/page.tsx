'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { virtualNumberCountries, virtualNumbers } from '@/lib/mock-data'

type NumberType = 'all' | 'local' | 'toll-free' | 'mobile'

export default function VirtualNumbersPage() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [numberType, setNumberType] = useState<NumberType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredNumbers = virtualNumbers.filter((number) => {
    const matchesCountry = !selectedCountry || number.countryCode.includes(selectedCountry)
    const matchesType = numberType === 'all' || number.type === numberType
    const matchesSearch = !searchQuery ||
      number.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      number.areaCode.includes(searchQuery)
    return matchesCountry && matchesType && matchesSearch
  })

  return (
    <main className="max-w-container mx-auto px-8 lg:px-12 pb-24">
      {/* Breadcrumbs */}
      <div className="py-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Virtual Numbers' }
          ]}
          className="mb-0"
        />
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#43D678]/20 via-[#43D678]/10 to-transparent rounded-3xl p-8 lg:p-12 mb-12">
        <div className="max-w-2xl">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-4">
            Virtual Phone Numbers
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            Get virtual phone numbers from 40+ countries. Perfect for business, privacy, and verification.
          </p>

          {/* Search Bar */}
          <div className="relative">
            <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by country or area code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-surface-dark border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Country Filter */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Select Country</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {virtualNumberCountries.map((country) => (
            <button
              key={country.id}
              onClick={() => setSelectedCountry(selectedCountry === country.code ? null : country.code)}
              className={`p-4 rounded-2xl border transition-all text-center ${
                selectedCountry === country.code
                  ? 'bg-primary/10 border-primary'
                  : 'bg-charcoal border-border-dark hover:border-primary/50'
              }`}
            >
              <span className="text-2xl mb-2 block">{country.flag}</span>
              <h3 className="font-bold text-white text-xs mb-1">{country.name}</h3>
              <p className="text-xs text-primary font-bold">{country.code}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Type Filter */}
      <div className="flex gap-3 mb-8">
        {(['all', 'local', 'toll-free', 'mobile'] as NumberType[]).map((type) => (
          <button
            key={type}
            onClick={() => setNumberType(type)}
            className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
              numberType === type
                ? 'bg-primary text-white'
                : 'bg-charcoal border border-border-dark text-slate-400 hover:text-white'
            }`}
          >
            {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Numbers Grid */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Available Numbers</h2>
          <span className="text-slate-500 text-sm">{filteredNumbers.length} numbers available</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNumbers.map((number) => (
            <div
              key={number.id}
              className={`bg-charcoal border rounded-2xl p-6 transition-all ${
                number.available
                  ? 'border-border-dark hover:border-primary/50'
                  : 'border-border-dark opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{number.flag}</span>
                  <div>
                    <h3 className="font-bold text-white">{number.country}</h3>
                    <p className="text-sm text-slate-500">
                      {number.countryCode} ({number.areaCode})
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  number.type === 'toll-free'
                    ? 'bg-green-500/10 text-green-400'
                    : number.type === 'mobile'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {number.type.toUpperCase()}
                </span>
              </div>

              <div className="space-y-2 mb-6">
                {number.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Icon name="check" size={14} className="text-green-400" />
                    <span className="text-slate-400">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-end justify-between mb-4">
                <div>
                  <span className="text-2xl font-extrabold text-white">${number.price}</span>
                  <span className="text-slate-500 text-sm">/month</span>
                  {number.setupFee > 0 && (
                    <p className="text-xs text-slate-500">+${number.setupFee} setup fee</p>
                  )}
                </div>
                {!number.available && (
                  <span className="text-xs text-red-400 font-bold">SOLD OUT</span>
                )}
              </div>

              <button
                disabled={!number.available}
                className={`w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  number.available
                    ? 'bg-primary text-white hover:brightness-105'
                    : 'bg-surface-dark text-slate-500 cursor-not-allowed'
                }`}
              >
                <Icon name="call" size={18} />
                {number.available ? 'Get Number' : 'Unavailable'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-charcoal border border-border-dark rounded-3xl p-8 lg:p-12">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Virtual Number Benefits</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="shield" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">Privacy Protection</h3>
            <p className="text-slate-500 text-sm">Keep your personal number private. Use virtual numbers for business.</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="globe" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">Global Presence</h3>
            <p className="text-slate-500 text-sm">Get local numbers in 40+ countries for your business.</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="api" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">API Integration</h3>
            <p className="text-slate-500 text-sm">Integrate with your apps via our powerful REST API.</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="message" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">SMS & Voice</h3>
            <p className="text-slate-500 text-sm">Send and receive SMS, make and receive calls.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
