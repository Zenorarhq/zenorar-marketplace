'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import FlagIcon from '@/components/ui/FlagIcon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useCart } from '@/lib/cart-context'
import { useRouter } from 'next/navigation'
import WalletDisplay from '@/components/ui/WalletDisplay'
import * as esimApi from '@/lib/api/esim'
import type { EsimRegion, EsimPlan } from '@/lib/api/esim'
import type { Product } from '@/lib/types'

export default function EsimPage() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  const { addItem, showAddedToCartPopup } = useCart()
  const router = useRouter()

  // Fetch regions with React Query caching
  const { data: regions = [] } = useQuery({
    queryKey: ['esim-regions'],
    queryFn: async () => {
      const result = await esimApi.getRegions()
      if (result.success && result.data) {
        return result.data
      }
      return []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Fetch plans with React Query caching (re-fetches when region changes)
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['esim-plans', selectedRegion],
    queryFn: async () => {
      const result = await esimApi.getPlans({
        regionSlug: selectedRegion || undefined,
      })
      if (result.success && result.data) {
        return result.data
      }
      return []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Filter plans by search
  const filteredPlans = plans.filter((plan) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      plan.name.toLowerCase().includes(query) ||
      plan.regionName?.toLowerCase().includes(query) ||
      plan.countries?.some((c) => c.toLowerCase().includes(query))
    )
  })

  // Convert eSIM plan to Product format for cart
  const planToProduct = (plan: EsimPlan): Product => ({
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: `${plan.dataAmountDisplay} data, valid for ${plan.validityDays} days. Coverage: ${plan.regionName}`,
    price: plan.retailPrice,
    rating: 5,
    reviewCount: 0,
    category: 'esim',
    categoryId: 'esim',
    icon: 'sim-card',
    iconColor: '#43D678',
    tags: ['esim', plan.regionSlug || '', ...plan.countries.slice(0, 3)],
    badge: plan.isFeatured ? 'Featured' : undefined,
  })

  // Handle buy now
  const handleBuyNow = async (plan: EsimPlan) => {
    setAddingToCart(plan.id)
    try {
      const product = planToProduct(plan)
      await addItem(product, 'standard', plan.retailPrice)
      router.push('/checkout')
    } catch (error) {
      console.error('Failed to add eSIM to cart:', error)
    } finally {
      setAddingToCart(null)
    }
  }

  // Get starting price for a region
  const getRegionStartingPrice = (regionSlug: string): number => {
    const regionPlans = plans.filter((p) => p.regionSlug === regionSlug)
    if (regionPlans.length === 0) return 0
    return Math.min(...regionPlans.map((p) => p.retailPrice))
  }

  // Get plan count for a region
  const getRegionPlanCount = (regionSlug: string): number => {
    return plans.filter((p) => p.regionSlug === regionSlug).length
  }

  return (
    <main className="max-w-container mx-auto px-4 lg:px-12 pb-24">
      {/* Breadcrumbs */}
      <div className="py-4">
        <Breadcrumbs
          items={[{ label: 'Home', href: '/' }, { label: 'eSIMs' }]}
          className="mb-0"
        />
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#43D678]/20 via-[#43D678]/10 to-transparent rounded-2xl lg:rounded-3xl p-6 lg:p-12 mb-8 lg:mb-12">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl lg:text-4xl font-extrabold text-white mb-2">
              Travel eSIM Plans
            </h1>
            <p className="text-slate-500 text-sm lg:text-base max-w-2xl">
              Stay connected anywhere in the world with instant eSIM activation. No physical SIM card needed.
            </p>
          </div>

          {/* Wallet Balance - Desktop */}
          <WalletDisplay variant="desktop" />
        </header>
      </div>

      {/* Wallet Balance - Mobile */}
      <WalletDisplay variant="mobile" />

      {/* Region Filter */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Browse by Region</h2>
        {selectedRegion ? (
          /* Selected Region - Show only this region with X button */
          <div className="bg-primary/10 border border-primary rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {selectedRegion.length === 2 ? (
                <FlagIcon countryCode={selectedRegion.toUpperCase()} className="w-10 h-10 rounded" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Icon name="globe" size={24} className="text-primary" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-white">{regions.find(r => r.slug === selectedRegion)?.name}</h3>
                <p className="text-sm text-slate-400">{filteredPlans.length} plans available</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedRegion(null)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Clear selection"
            >
              <Icon name="x" size={20} className="text-white" />
            </button>
          </div>
        ) : (
          /* No Selection - Show all regions */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {regions.map((region) => (
              <button
                key={region.id}
                onClick={() => setSelectedRegion(region.slug)}
                className="p-4 rounded-2xl border transition-all text-left bg-charcoal border-border-dark hover:border-primary/50"
              >
                <div className="flex justify-center mb-2">
                  {region.slug.length === 2 ? (
                    <FlagIcon countryCode={region.slug.toUpperCase()} className="w-8 h-8 rounded" />
                  ) : (
                    <Icon name="globe" size={32} className="text-primary" />
                  )}
                </div>
                <h3 className="font-bold text-white text-sm mb-1">{region.name}</h3>
                <p className="text-xs text-slate-500">
                  {getRegionPlanCount(region.slug) || region.countryCount} plans
                </p>
                {getRegionStartingPrice(region.slug) > 0 && (
                  <p className="text-xs text-primary font-bold mt-1">
                    From ${getRegionStartingPrice(region.slug).toFixed(2)}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {selectedRegion
              ? `${regions.find((r) => r.slug === selectedRegion)?.name} Plans`
              : 'All eSIM Plans'}
          </h2>
          <span className="text-slate-500 text-sm">{filteredPlans.length} plans available</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-charcoal border border-border-dark rounded-2xl p-6 animate-pulse"
              >
                <div className="h-6 bg-slate-700 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-slate-700 rounded w-1/2 mb-6"></div>
                <div className="space-y-3 mb-6">
                  <div className="h-4 bg-slate-700 rounded"></div>
                  <div className="h-4 bg-slate-700 rounded w-2/3"></div>
                </div>
                <div className="h-10 bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="search" size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-white font-bold mb-2">No plans found</h3>
            <p className="text-slate-500">
              Try adjusting your search or selecting a different region.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-charcoal border rounded-2xl p-6 hover:border-primary/50 transition-all relative ${
                  plan.isFeatured ? 'border-primary' : 'border-border-dark'
                }`}
              >
                {plan.isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-black text-xs font-bold px-3 py-1 rounded-full">
                      POPULAR
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-white">{plan.name}</h3>
                    <p className="text-sm text-slate-500">{plan.regionName}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon name="sim-card" size={20} className="text-primary" />
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3">
                    <Icon name="wifi" size={16} className="text-slate-500" />
                    <span className="text-white font-bold">{plan.dataAmountDisplay}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Icon name="clock" size={16} className="text-slate-500" />
                    <span className="text-slate-400">{plan.validityDays} days</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Icon name="globe" size={16} className="text-slate-500" />
                    <span className="text-slate-400 text-sm">
                      {plan.countries?.slice(0, 3).join(', ')}
                      {plan.countries?.length > 3 && ` +${plan.countries.length - 3} more`}
                    </span>
                  </div>
                  {plan.networkType && (
                    <div className="flex items-center gap-3">
                      <Icon name="signal" size={16} className="text-slate-500" />
                      <span className="text-slate-400 text-sm uppercase">
                        {plan.networkType}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-end justify-between mb-4">
                  <div>
                    <span className="text-2xl font-extrabold text-white">
                      ${plan.retailPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleBuyNow(plan)}
                  disabled={addingToCart === plan.id}
                  className="w-full bg-primary text-black font-bold py-3 rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {addingToCart === plan.id ? (
                    <Icon name="loading" size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Icon name="cart" size={18} />
                      Buy Now
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="bg-charcoal border border-border-dark rounded-2xl lg:rounded-3xl p-4 lg:p-12">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Choose Our eSIMs?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="flash" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">Instant Activation</h3>
            <p className="text-slate-500 text-sm">
              Get connected within minutes of purchase. No waiting for delivery.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="globe" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">Global Coverage</h3>
            <p className="text-slate-500 text-sm">
              Stay connected in 100+ countries with reliable network coverage.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="shield" size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-white mb-2">Secure & Private</h3>
            <p className="text-slate-500 text-sm">
              Your data is encrypted and your privacy is protected.
            </p>
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
