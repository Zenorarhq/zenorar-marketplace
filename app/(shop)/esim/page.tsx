'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { esimRegions, esimPlans } from '@/lib/mock-data'

export default function EsimPage() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPlans = esimPlans.filter((plan) => {
    const matchesRegion = !selectedRegion || plan.region.toLowerCase().includes(selectedRegion.toLowerCase())
    const matchesSearch = !searchQuery ||
      plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.countries.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesRegion && matchesSearch
  })

  return (
    <main className="max-w-container mx-auto px-8 lg:px-12 pb-24">
      {/* Breadcrumbs */}
      <div className="py-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'eSIMs' }
          ]}
          className="mb-0"
        />
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-3xl p-8 lg:p-12 mb-12">
        <div className="max-w-2xl">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-4">
            Travel eSIM Plans
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            Stay connected anywhere in the world with instant eSIM activation. No physical SIM card needed.
          </p>

          {/* Search Bar */}
          <div className="relative">
            <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by country or region..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-surface-dark border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Region Filter */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Browse by Region</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {esimRegions.map((region) => (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(selectedRegion === region.id ? null : region.id)}
              className={`p-4 rounded-2xl border transition-all text-left ${
                selectedRegion === region.id
                  ? 'bg-primary/10 border-primary'
                  : 'bg-charcoal border-border-dark hover:border-primary/50'
              }`}
            >
              <span className="text-2xl mb-2 block">{region.flag}</span>
              <h3 className="font-bold text-white text-sm mb-1">{region.name}</h3>
              <p className="text-xs text-slate-500">{region.planCount} plans</p>
              <p className="text-xs text-primary font-bold mt-1">From ${region.startingPrice}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {selectedRegion ? `${esimRegions.find(r => r.id === selectedRegion)?.name} Plans` : 'All eSIM Plans'}
          </h2>
          <span className="text-slate-500 text-sm">{filteredPlans.length} plans available</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-charcoal border rounded-2xl p-6 hover:border-primary/50 transition-all relative ${
                plan.popular ? 'border-primary' : 'border-border-dark'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-black text-xs font-bold px-3 py-1 rounded-full">
                    POPULAR
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white">{plan.name}</h3>
                  <p className="text-sm text-slate-500">{plan.region}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon name="sim-card" size={20} className="text-primary" />
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <Icon name="wifi" size={16} className="text-slate-500" />
                  <span className="text-white font-bold">{plan.data}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Icon name="clock" size={16} className="text-slate-500" />
                  <span className="text-slate-400">{plan.validity}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Icon name="globe" size={16} className="text-slate-500" />
                  <span className="text-slate-400 text-sm">{plan.countries.join(', ')}</span>
                </div>
              </div>

              <div className="flex items-end justify-between mb-4">
                <div>
                  <span className="text-2xl font-extrabold text-white">${plan.price}</span>
                  {plan.originalPrice && (
                    <span className="text-sm text-slate-500 line-through ml-2">${plan.originalPrice}</span>
                  )}
                </div>
              </div>

              <button className="w-full bg-primary text-black font-bold py-3 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2">
                <Icon name="cart" size={18} />
                Buy Now
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-charcoal border border-border-dark rounded-3xl p-8 lg:p-12">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Choose Our eSIMs?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="flash" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">Instant Activation</h3>
            <p className="text-slate-500 text-sm">Get connected within minutes of purchase. No waiting for delivery.</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="globe" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">Global Coverage</h3>
            <p className="text-slate-500 text-sm">Stay connected in 100+ countries with reliable network coverage.</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="shield" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">Secure & Private</h3>
            <p className="text-slate-500 text-sm">Your data is encrypted and your privacy is protected.</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="headphones" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">24/7 Support</h3>
            <p className="text-slate-500 text-sm">Our support team is always here to help you.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
