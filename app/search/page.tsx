'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import Icon from '@/components/ui/Icon'
import ServiceLogo from '@/components/ui/ServiceLogo'
import {
  searchApi,
  UniversalSearchResponse,
  EsimSearchResult,
  GiftCardSearchResult,
  VirtualNumberSearchResult,
  CarrierEsimSearchResult,
} from '@/lib/api'
import { useCart } from '@/lib/cart-context'
import { formatPrice } from '@/lib/currency'

type CategoryTab = 'all' | 'scripts' | 'esims' | 'gift_cards' | 'virtual_numbers' | 'carrier_esims'

const TABS: { key: CategoryTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'scripts', label: 'Scripts' },
  { key: 'esims', label: 'eSIMs' },
  { key: 'gift_cards', label: 'Gift Cards' },
  { key: 'virtual_numbers', label: 'Virtual Numbers' },
  { key: 'carrier_esims', label: 'Carrier eSIMs' },
]

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const searchQuery = searchParams.get('q') || ''
  const categoryParam = (searchParams.get('category') || 'all') as CategoryTab
  const { addItem, showAddedToCartPopup } = useCart()

  const [activeTab, setActiveTab] = useState<CategoryTab>(categoryParam)
  const [data, setData] = useState<UniversalSearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Sync tab from URL
  useEffect(() => {
    const cat = searchParams.get('category') as CategoryTab
    if (cat && TABS.some(t => t.key === cat)) {
      setActiveTab(cat)
    }
  }, [searchParams])

  const fetchResults = useCallback(async () => {
    if (!searchQuery) {
      setData(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const result = await searchApi.universalSearch(searchQuery, activeTab, page, 12)
    if (result.success && result.data) {
      setData(result.data)
      if (result.pagination) {
        setTotalPages(result.pagination.totalPages)
      } else {
        setTotalPages(1)
      }
    } else {
      setData(null)
    }
    setIsLoading(false)
  }, [searchQuery, activeTab, page])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  const handleTabChange = (tab: CategoryTab) => {
    setActiveTab(tab)
    setPage(1)
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'all') {
      params.delete('category')
    } else {
      params.set('category', tab)
    }
    router.replace(`/search?${params.toString()}`, { scroll: false })
  }

  // Reset page on query change
  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const handleAddToCart = async (product: any) => {
    await addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price: Number(product.price),
      rating: 0,
      reviewCount: 0,
      category: product.category?.name || '',
      icon: 'package',
      iconColor: 'text-primary',
      tags: [],
      image: product.image || undefined,
    }, 'standard')
    showAddedToCartPopup({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price: Number(product.price),
      rating: 0,
      reviewCount: 0,
      category: product.category?.name || '',
      icon: 'package',
      iconColor: 'text-primary',
      tags: [],
      image: product.image || undefined,
    }, Number(product.price))
  }

  const getTabCount = (tab: CategoryTab): number => {
    if (!data) return 0
    if (tab === 'all') return data.totalResults
    return data.results[tab]?.total || 0
  }

  return (
    <main className="flex-grow max-w-container mx-auto px-4 lg:px-12 pb-24 w-full">
      <div className="py-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Search Results' },
          ]}
          className="mb-0"
        />
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">
          {searchQuery
            ? `Search results for "${searchQuery}"`
            : 'Search'}
        </h1>
        <p className="text-sm text-slate-500">
          {isLoading ? 'Searching...' : data ? `${data.totalResults} results found` : 'Enter a search term'}
        </p>
      </div>

      {/* Category Tabs */}
      {searchQuery && (
        <div className="mb-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 min-w-max">
            {TABS.map((tab) => {
              const count = getTabCount(tab.key)
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                    isActive
                      ? 'bg-primary text-black'
                      : 'bg-surface-dark border border-border-dark text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {tab.label}
                  {!isLoading && data && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Icon name="loading" size={40} className="animate-spin text-primary" />
        </div>
      )}

      {/* "All" Tab — grouped preview */}
      {!isLoading && data && activeTab === 'all' && (
        <div className="space-y-8">
          {/* Scripts */}
          {data.results.scripts.total > 0 && (
            <CategorySection
              title="Scripts"
              count={data.results.scripts.total}
              onViewAll={() => handleTabChange('scripts')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {data.results.scripts.items.map((product: any) => (
                  <ScriptCard key={product.id} product={product} onAddToCart={handleAddToCart} />
                ))}
              </div>
            </CategorySection>
          )}

          {/* eSIMs */}
          {data.results.esims.total > 0 && (
            <CategorySection
              title="eSIMs"
              count={data.results.esims.total}
              onViewAll={() => handleTabChange('esims')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {data.results.esims.items.map((esim) => (
                  <EsimCard key={esim.id} esim={esim} />
                ))}
              </div>
            </CategorySection>
          )}

          {/* Gift Cards */}
          {data.results.gift_cards.total > 0 && (
            <CategorySection
              title="Gift Cards"
              count={data.results.gift_cards.total}
              onViewAll={() => handleTabChange('gift_cards')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {data.results.gift_cards.items.map((card) => (
                  <GiftCardCard key={card.id} card={card} />
                ))}
              </div>
            </CategorySection>
          )}

          {/* Virtual Numbers */}
          {data.results.virtual_numbers.total > 0 && (
            <CategorySection
              title="Virtual Numbers"
              count={data.results.virtual_numbers.total}
              onViewAll={() => handleTabChange('virtual_numbers')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {data.results.virtual_numbers.items.map((vn) => (
                  <VirtualNumberCard key={vn.id} vn={vn} />
                ))}
              </div>
            </CategorySection>
          )}

          {/* Carrier eSIMs */}
          {data.results.carrier_esims.total > 0 && (
            <CategorySection
              title="Carrier eSIMs"
              count={data.results.carrier_esims.total}
              onViewAll={() => handleTabChange('carrier_esims')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {data.results.carrier_esims.items.map((carrier) => (
                  <CarrierEsimCard key={carrier.id} carrier={carrier} />
                ))}
              </div>
            </CategorySection>
          )}

          {data.totalResults === 0 && <NoResults query={searchQuery} />}
        </div>
      )}

      {/* Specific tab results */}
      {!isLoading && data && activeTab === 'scripts' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.results.scripts.items.map((product: any) => (
              <ScriptCard key={product.id} product={product} onAddToCart={handleAddToCart} />
            ))}
          </div>
          {data.results.scripts.total === 0 && <NoResults query={searchQuery} category="scripts" />}
        </>
      )}

      {!isLoading && data && activeTab === 'esims' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.results.esims.items.map((esim) => (
              <EsimCard key={esim.id} esim={esim} />
            ))}
          </div>
          {data.results.esims.total === 0 && <NoResults query={searchQuery} category="eSIMs" />}
        </>
      )}

      {!isLoading && data && activeTab === 'gift_cards' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.results.gift_cards.items.map((card) => (
              <GiftCardCard key={card.id} card={card} />
            ))}
          </div>
          {data.results.gift_cards.total === 0 && <NoResults query={searchQuery} category="gift cards" />}
        </>
      )}

      {!isLoading && data && activeTab === 'virtual_numbers' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.results.virtual_numbers.items.map((vn) => (
              <VirtualNumberCard key={vn.id} vn={vn} />
            ))}
          </div>
          {data.results.virtual_numbers.total === 0 && <NoResults query={searchQuery} category="virtual numbers" />}
        </>
      )}

      {!isLoading && data && activeTab === 'carrier_esims' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {data.results.carrier_esims.items.map((carrier) => (
              <CarrierEsimCard key={carrier.id} carrier={carrier} />
            ))}
          </div>
          {data.results.carrier_esims.total === 0 && <NoResults query={searchQuery} category="carrier eSIMs" />}
        </>
      )}

      {/* Pagination (specific tabs only) */}
      {!isLoading && data && activeTab !== 'all' && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 bg-surface-dark border border-border-dark rounded text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="chevron-left" size={14} />
            </button>
            <span className="text-xs text-slate-400 px-2">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 bg-surface-dark border border-border-dark rounded text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="chevron-right" size={14} />
            </button>
          </div>
        </div>
      )}

      {/* No query state */}
      {!isLoading && !searchQuery && (
        <div className="text-center py-16">
          <Icon name="search" size={60} className="text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Search across all categories</h2>
          <p className="text-slate-400">
            Find scripts, eSIMs, gift cards, virtual numbers, and more.
          </p>
        </div>
      )}
    </main>
  )
}

// --- Sub-components ---

function CategorySection({ title, count, onViewAll, children }: {
  title: string
  count: number
  onViewAll: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <button
          onClick={onViewAll}
          className="text-xs text-primary hover:underline font-medium"
        >
          View all {count} &rarr;
        </button>
      </div>
      {children}
    </div>
  )
}

function ScriptCard({ product, onAddToCart }: { product: any; onAddToCart: (p: any) => void }) {
  return (
    <div className="bg-charcoal rounded-xl border border-border-dark overflow-hidden group hover:border-primary/50 transition-all">
      {product.image && (
        <div className="aspect-video bg-surface-dark overflow-hidden">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        </div>
      )}
      <div className="p-4">
        {!product.image && (
          <div className="w-10 h-10 mb-3 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <Icon name="package" size={20} />
          </div>
        )}
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
        </Link>
        {product.category && (
          <span className="text-xs text-slate-500 mb-2 block">{product.category.name}</span>
        )}
        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-white">{formatPrice(Number(product.price))}</span>
          <button
            onClick={() => onAddToCart(product)}
            className="p-1.5 rounded-lg bg-surface-dark border border-border-dark hover:bg-primary hover:text-black transition-colors"
          >
            <Icon name="cart" size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function EsimCard({ esim }: { esim: EsimSearchResult }) {
  return (
    <Link href={`/esim`} className="block group">
      <div className="bg-charcoal rounded-xl border border-border-dark p-4 hover:border-primary/50 transition-all h-full">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400">
            <Icon name="globe" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-white group-hover:text-primary transition-colors truncate">{esim.name}</h3>
            <span className="text-xs text-slate-500">{esim.coverageType}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">{esim.dataAmountDisplay}</span>
          <span className="px-2 py-0.5 bg-slate-500/10 text-slate-400 rounded text-xs">{esim.validityDays} days</span>
          <span className="px-2 py-0.5 bg-slate-500/10 text-slate-400 rounded text-xs uppercase">{esim.networkType}</span>
        </div>
        <div className="text-lg font-bold text-white">{formatPrice(esim.retailPrice)}</div>
      </div>
    </Link>
  )
}

function GiftCardCard({ card }: { card: GiftCardSearchResult }) {
  return (
    <Link href="/gift-cards" className="block group">
      <div className="bg-charcoal rounded-xl border border-border-dark overflow-hidden hover:border-primary/50 transition-all h-full">
        {card.imageUrl ? (
          <div className="aspect-video bg-surface-dark overflow-hidden">
            <img src={card.imageUrl} alt={card.brand} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          </div>
        ) : (
          <div className="aspect-video bg-surface-dark flex items-center justify-center">
            <ServiceLogo name={card.brand} size={48} />
          </div>
        )}
        <div className="p-4">
          <h3 className="font-bold text-sm text-white group-hover:text-primary transition-colors mb-1">{card.brand}</h3>
          <span className="text-xs text-slate-500 block mb-2">{card.category}</span>
          {card.discountPercent > 0 && (
            <span className="text-xs text-green-400">{card.discountPercent}% off</span>
          )}
        </div>
      </div>
    </Link>
  )
}

function VirtualNumberCard({ vn }: { vn: VirtualNumberSearchResult }) {
  return (
    <Link href={`/virtual-numbers`} className="block group">
      <div className="bg-charcoal rounded-xl border border-border-dark p-4 hover:border-primary/50 transition-all h-full">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{vn.flagEmoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-white group-hover:text-primary transition-colors">{vn.name}</h3>
            <span className="text-xs text-slate-500">{vn.dialCode}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {vn.smsEnabled && <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-xs">SMS</span>}
          {vn.voiceEnabled && <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs">Voice</span>}
        </div>
        <div className="text-lg font-bold text-white">{formatPrice(vn.retailMonthly)}<span className="text-xs text-slate-500 font-normal">/mo</span></div>
      </div>
    </Link>
  )
}

function CarrierEsimCard({ carrier }: { carrier: CarrierEsimSearchResult }) {
  return (
    <Link href={`/esim?tab=carrier`} className="block group">
      <div className="bg-charcoal rounded-xl border border-border-dark p-4 hover:border-primary/50 transition-all h-full">
        <div className="flex items-center gap-3 mb-3">
          <ServiceLogo name={carrier.carrierName} size={32} />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-white group-hover:text-primary transition-colors truncate">{carrier.planName}</h3>
            <span className="text-xs text-slate-500">{carrier.carrierName}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">{carrier.dataAmountDisplay}</span>
          <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-xs">{carrier.voiceDisplay}</span>
          <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs">{carrier.smsDisplay} SMS</span>
          <span className="px-2 py-0.5 bg-slate-500/10 text-slate-400 rounded text-xs uppercase">{carrier.networkType}</span>
        </div>
        <div className="text-lg font-bold text-white">{formatPrice(carrier.retailPrice)}</div>
      </div>
    </Link>
  )
}

function NoResults({ query, category }: { query: string; category?: string }) {
  return (
    <div className="text-center py-16">
      <Icon name="search" size={60} className="text-slate-600 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">No {category || ''} results found</h2>
      <p className="text-slate-400 mb-6">
        {query ? `No matches for "${query}"${category ? ` in ${category}` : ''}. Try a different search term.` : 'Enter a search term to get started.'}
      </p>
      <Link
        href="/scripts"
        className="inline-flex items-center gap-2 bg-primary text-black font-bold px-6 py-3 rounded-xl hover:brightness-105 transition-all"
      >
        Browse All Products
        <Icon name="arrow-right" size={18} />
      </Link>
    </div>
  )
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-background-dark flex flex-col">
      <Header />
      <CategoryNav />
      <Suspense fallback={<div className="flex-grow flex items-center justify-center"><Icon name="loading" size={40} className="animate-spin text-primary" /></div>}>
        <SearchContent />
      </Suspense>
      <Footer />
    </div>
  )
}
