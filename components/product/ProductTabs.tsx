'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Product } from '@/lib/types'
import StarRating from '@/components/ui/StarRating'

interface ProductTabsProps {
  product: Product
}

type TabId = 'overview' | 'specs' | 'reviews'

export default function ProductTabs({ product }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'specs', label: 'Technical Specifications' },
    { id: 'reviews', label: 'Reviews' },
  ]

  return (
    <div className="bg-charcoal rounded-2xl border border-border-dark overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-border-dark px-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-5 text-sm font-bold cursor-pointer border-b-2 transition-all hover:text-white ${
              activeTab === tab.id
                ? 'text-primary border-primary'
                : 'text-slate-500 border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-10">
            {/* Product Description */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Product Overview</h2>
              <p className="text-slate-400 leading-relaxed text-sm">
                {product.description || 'The Python Automation Suite is a comprehensive collection of production-ready scripts designed to streamline your development workflow. From advanced web scraping and data processing to automated deployment and cloud management, this suite provides everything you need to build scalable, automated systems.'}
              </p>
            </div>

            {/* Product Demo */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Product Demo</h2>

              {/* Screenshot Gallery */}
              <div className="overflow-x-auto no-scrollbar flex gap-4 pb-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="min-w-[400px] h-[240px] rounded-xl border border-border-dark overflow-hidden bg-background-dark shrink-0"
                  >
                    <Image
                      src={product.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvwgfYMEvcI_nX3811VEyCy34SMnKHy9dmdnqG3nSMOUjjKLHrwM1Buu7vIN4sHUv_IHj3lxtx8AuvVgtQJrjdBjilef-qD6NbH3AMwpj-xP3Cl3XD4r8kxRx3ZJzJe8Y-Z4MqVrZdrhg60-dWHm_iNTlUzZhPqmEvucOUsNN2Cqq1nlRE-lUiK6PR4GpN2-YM32iXvk86ERNf_KfTr8v3fkU0u395JRo_hw-hlhfenuygiypi5Pyn0V13zGizBFBqXGrkP8TTlHSx'}
                      alt={`Screenshot ${i}`}
                      width={400}
                      height={240}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>

              {/* Demo Info */}
              <div className="bg-surface-dark/50 p-6 rounded-xl border border-border-dark">
                <h4 className="text-white font-bold mb-2 text-sm">Demo Information</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Experience the full power of the product through our live cloud-hosted sandbox. The demo includes access to all features and a trial period. No local installation required for the initial evaluation.
                </p>
              </div>

              {/* Demo Link Button */}
              <button className="w-full bg-primary text-black font-extrabold py-4 rounded-xl flex items-center justify-center gap-3 hover:brightness-105 transition-all text-sm uppercase tracking-wider">
                Link to Demo
                <span className="material-symbols-outlined font-bold">open_in_new</span>
              </button>
            </div>

            {/* Key Features */}
            {product.features && product.features.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Key Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {product.features.map((feature, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 border border-primary/20">
                        <span className="material-symbols-outlined text-[32px]">{feature.icon}</span>
                      </div>
                      <div>
                        <h4 className="text-white font-bold mb-1">{feature.title}</h4>
                        <p className="text-slate-500 text-xs">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Specs Tab */}
        {activeTab === 'specs' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Technical Specifications</h2>
            <div className="space-y-4">
              {(product.specs || [
                { label: 'Language', value: 'Python 3.10+' },
                { label: 'Dependencies', value: 'Pandas, Scrapy, Selenium, PyYAML' },
                { label: 'License', value: 'Commercial / Extended' },
                { label: 'Last Updated', value: 'Oct 24, 2024' },
                { label: 'OS Compatibility', value: 'Windows, Linux, macOS' },
              ]).map((spec, index) => (
                <div
                  key={index}
                  className="flex justify-between py-3 border-b border-border-dark text-sm"
                >
                  <span className="text-slate-500">{spec.label}</span>
                  <span className="text-white font-medium">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-white">User Reviews</h2>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{product.rating}</span>
                <StarRating rating={product.rating} size="md" />
                <span className="text-slate-500 text-sm">({product.reviewCount} reviews)</span>
              </div>
            </div>

            <div className="space-y-6">
              {(product.reviews || [
                { id: '1', author: 'Alex R.', rating: 5, content: 'Best automation toolkit I\'ve ever purchased. The documentation is top-notch and saved me weeks of development time.', date: '2024-10-15' },
                { id: '2', author: 'Sarah L.', rating: 5, content: 'Excellent support team. Had a minor issue with the config and they responded within an hour with a fix.', date: '2024-10-10' },
              ]).map((review) => (
                <div key={review.id} className="border-b border-border-dark pb-6">
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-white text-sm">{review.author}</span>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">&quot;{review.content}&quot;</p>
                </div>
              ))}
            </div>

            <button className="w-full mt-6 py-3 border border-border-dark rounded-xl text-slate-400 font-bold hover:text-white hover:border-slate-600 transition-all text-sm">
              View All Reviews
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
