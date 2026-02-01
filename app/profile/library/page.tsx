'use client'

import { useState } from 'react'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'

type LibraryFilter = 'all' | 'scripts' | 'esims' | 'tools' | 'api'

interface LibraryItem {
  id: string
  name: string
  description: string
  category: 'scripts' | 'esims' | 'tools' | 'api'
  icon: string
  purchaseDate: string
  version?: string
  expiresAt?: string
  downloadCount?: number
  status: 'active' | 'expired' | 'update-available'
}

const libraryItems: LibraryItem[] = [
  {
    id: '1',
    name: 'Premium Scripts Bundle',
    description: 'Ultimate Edition with all automation scripts and lifetime updates',
    category: 'scripts',
    icon: 'code',
    purchaseDate: 'Oct 24, 2023',
    version: 'v3.2.1',
    downloadCount: 5,
    status: 'update-available',
  },
  {
    id: '2',
    name: 'Global eSIM Data Plan',
    description: '50GB worldwide coverage with 30-day validity',
    category: 'esims',
    icon: 'sim-card',
    purchaseDate: 'Oct 26, 2023',
    expiresAt: 'Nov 26, 2023',
    status: 'active',
  },
  {
    id: '3',
    name: 'Web Scraping Toolkit',
    description: 'Advanced web scraping tools with proxy rotation',
    category: 'tools',
    icon: 'terminal',
    purchaseDate: 'Sep 15, 2023',
    version: 'v2.1.0',
    downloadCount: 3,
    status: 'active',
  },
  {
    id: '4',
    name: 'API Access - Enterprise',
    description: 'Unlimited API requests with premium support',
    category: 'api',
    icon: 'api',
    purchaseDate: 'Aug 10, 2023',
    expiresAt: 'Sep 10, 2023',
    status: 'expired',
  },
  {
    id: '5',
    name: 'Discord Bot Framework',
    description: 'Complete Discord bot development framework with examples',
    category: 'scripts',
    icon: 'code',
    purchaseDate: 'Oct 01, 2023',
    version: 'v1.8.2',
    downloadCount: 2,
    status: 'active',
  },
]

export default function LibraryPage() {
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredItems = libraryItems.filter((item) => {
    const matchesFilter = activeFilter === 'all' || item.category === activeFilter
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-900/30 text-green-500 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
          </div>
        )
      case 'update-available':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-900/30 text-blue-400 border border-blue-500/20">
            <Icon name="download" size={12} /> Update Available
          </div>
        )
      case 'expired':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-900/30 text-red-500 border border-red-500/20">
            <Icon name="alert" size={12} /> Expired
          </div>
        )
      default:
        return null
    }
  }

  const filterButtons: { key: LibraryFilter; label: string; icon: string }[] = [
    { key: 'all', label: 'All Items', icon: 'grid-view' },
    { key: 'scripts', label: 'Scripts', icon: 'code' },
    { key: 'esims', label: 'eSIMs', icon: 'sim-card' },
    { key: 'tools', label: 'Tools', icon: 'terminal' },
    { key: 'api', label: 'API', icon: 'api' },
  ]

  return (
    <ProfileLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Library</h1>
            <p className="text-slate-400">Access and manage all your purchased digital products.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-sm text-slate-300 hover:bg-[#262626] transition-colors">
              <Icon name="download" size={18} />
              Download All
            </button>
          </div>
        </div>

        {/* Search and Filter Tabs */}
        <div className="bg-[#1a1a1a] rounded-xl p-2 flex flex-col md:flex-row items-center gap-2">
          <div className="relative flex-grow w-full md:w-auto pl-2">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-slate-300 text-sm py-2 pl-9 pr-4 placeholder:text-slate-600 focus:ring-0"
              placeholder="Search your library..."
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full md:w-auto p-1">
            {filterButtons.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === filter.key
                    ? 'bg-primary text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon name={filter.icon} size={16} />
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Library Items */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="library" size={64} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No items found in your library.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-[#121212] border border-border-dark rounded-xl overflow-hidden shadow-lg ${
                item.status === 'expired' ? 'opacity-60' : ''
              }`}
            >
              <div className="p-6 flex flex-col lg:flex-row lg:items-center gap-6">
                {/* Icon */}
                <div className="h-16 w-16 rounded-xl bg-surface-dark border border-border-dark flex items-center justify-center flex-shrink-0 text-primary">
                  <Icon name={item.icon} size={32} />
                </div>

                {/* Info */}
                <div className="flex-grow">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-white font-bold text-lg">{item.name}</h3>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-slate-400 text-sm mb-3">{item.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Icon name="calendar" size={14} />
                      Purchased: {item.purchaseDate}
                    </span>
                    {item.version && (
                      <span className="flex items-center gap-1">
                        <Icon name="code" size={14} />
                        {item.version}
                      </span>
                    )}
                    {item.expiresAt && (
                      <span className={`flex items-center gap-1 ${item.status === 'expired' ? 'text-red-500' : ''}`}>
                        <Icon name="clock" size={14} />
                        {item.status === 'expired' ? 'Expired:' : 'Expires:'} {item.expiresAt}
                      </span>
                    )}
                    {item.downloadCount !== undefined && (
                      <span className="flex items-center gap-1">
                        <Icon name="download" size={14} />
                        {item.downloadCount} downloads
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 flex-shrink-0">
                  {item.status === 'expired' ? (
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all">
                      <Icon name="refresh" size={18} />
                      Renew
                    </button>
                  ) : (
                    <>
                      {(item.category === 'scripts' || item.category === 'tools') && (
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all">
                          <Icon name="download" size={18} />
                          {item.status === 'update-available' ? 'Update' : 'Download'}
                        </button>
                      )}
                      {item.category === 'esims' && (
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all">
                          <Icon name="qr" size={18} />
                          View QR
                        </button>
                      )}
                      {item.category === 'api' && (
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black font-bold rounded-lg hover:brightness-105 transition-all">
                          <Icon name="key" size={18} />
                          API Key
                        </button>
                      )}
                      <button className="flex items-center gap-2 px-4 py-2.5 bg-surface-dark border border-border-dark rounded-lg text-slate-300 hover:text-white hover:bg-[#262626] transition-colors">
                        <Icon name="more-horizontal" size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats Summary */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#121212] border border-border-dark rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Icon name="package" size={16} />
            Total Items
          </div>
          <p className="text-2xl font-bold text-white">{libraryItems.length}</p>
        </div>
        <div className="bg-[#121212] border border-border-dark rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Icon name="check-circle" size={16} />
            Active
          </div>
          <p className="text-2xl font-bold text-green-500">
            {libraryItems.filter((i) => i.status === 'active' || i.status === 'update-available').length}
          </p>
        </div>
        <div className="bg-[#121212] border border-border-dark rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Icon name="download" size={16} />
            Updates
          </div>
          <p className="text-2xl font-bold text-blue-400">
            {libraryItems.filter((i) => i.status === 'update-available').length}
          </p>
        </div>
        <div className="bg-[#121212] border border-border-dark rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Icon name="alert" size={16} />
            Expired
          </div>
          <p className="text-2xl font-bold text-red-500">
            {libraryItems.filter((i) => i.status === 'expired').length}
          </p>
        </div>
      </div>
    </ProfileLayout>
  )
}
