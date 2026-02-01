'use client'

import { useState } from 'react'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'

type OrderStatus = 'all' | 'processing' | 'shipped' | 'completed' | 'cancelled'

interface OrderItem {
  name: string
  description: string
  icon: string
  price: string
  quantity?: number
}

interface Order {
  id: string
  date: string
  status: 'completed' | 'processing' | 'cancelled'
  items: OrderItem[]
  total: string
  refundStatus?: string
}

const orders: Order[] = [
  {
    id: '#ORD-7721',
    date: 'Oct 24, 2023 at 4:30 PM',
    status: 'completed',
    items: [
      {
        name: 'Premium Scripts Bundle',
        description: 'Space Black, Ultimate Edition, Lifetime License',
        icon: 'inventory_2',
        price: '$149.00',
        quantity: 1,
      },
    ],
    total: '$149.00',
  },
  {
    id: '#ORD-8812',
    date: 'Oct 26, 2023 at 9:15 AM',
    status: 'processing',
    items: [
      {
        name: 'Global eSIM Data Plan (50GB)',
        description: 'Worldwide Coverage, 30 Days Validity',
        icon: 'sim_card',
        price: '$29.99',
        quantity: 1,
      },
      {
        name: 'Virtual Number (US)',
        description: 'VOIP Enabled, SMS Capable, 1 Month',
        icon: 'smartphone',
        price: '$15.00',
        quantity: 1,
      },
    ],
    total: '$44.99',
  },
  {
    id: '#ORD-9901',
    date: 'Oct 10, 2023 at 2:00 PM',
    status: 'cancelled',
    items: [
      {
        name: 'API Monthly Access',
        description: 'Enterprise Plan, Unlimited Requests',
        icon: 'api',
        price: '$59.00',
      },
    ],
    total: '$59.00',
    refundStatus: 'Refunded to Original Payment Method',
  },
]

export default function OrdersPage() {
  const [activeFilter, setActiveFilter] = useState<OrderStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredOrders = orders.filter((order) => {
    const matchesFilter = activeFilter === 'all' || order.status === activeFilter
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-900/30 text-green-500 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Completed
          </div>
        )
      case 'processing':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-900/30 text-yellow-500 border border-yellow-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span> Processing
          </div>
        )
      case 'cancelled':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-900/30 text-red-500 border border-red-500/20">
            <Icon name="close" size={14} /> Cancelled
          </div>
        )
      default:
        return null
    }
  }

  const filterButtons: { key: OrderStatus; label: string }[] = [
    { key: 'all', label: 'All Orders' },
    { key: 'processing', label: 'Processing' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <ProfileLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Order History</h1>
            <p className="text-slate-400">View and manage your recent transactions and returns.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-sm text-slate-300 hover:bg-[#262626] transition-colors">
              <Icon name="filter" size={18} />
              Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark rounded-lg text-sm text-slate-300 hover:bg-[#262626] transition-colors">
              <Icon name="calendar" size={18} />
              Select Dates
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
              placeholder="Search orders by ID, product name..."
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full md:w-auto p-1">
            {filterButtons.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === filter.key
                    ? 'bg-primary text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="shopping-bag" size={60} className="text-slate-600 mb-4" />
            <p className="text-slate-400">No orders found matching your criteria.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden shadow-lg"
            >
              {/* Order Header */}
              <div className="px-6 py-4 border-b border-border-dark/50 flex flex-wrap justify-between items-center gap-4 bg-[#161616]">
                <div className="flex gap-8">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                      Order ID
                    </div>
                    <div className="text-white font-mono font-bold">{order.id}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                      Date Placed
                    </div>
                    <div className="text-slate-300 text-sm">{order.date}</div>
                  </div>
                </div>
                {getStatusBadge(order.status)}
              </div>

              {/* Order Items */}
              <div
                className={`p-6 border-b border-border-dark/50 ${
                  order.status === 'cancelled' ? 'opacity-60' : ''
                }`}
              >
                <div className="space-y-6">
                  {order.items.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-5 ${
                        index > 0 ? 'border-t border-dashed border-border-dark pt-6' : ''
                      }`}
                    >
                      <div className="h-16 w-16 rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center flex-shrink-0 text-slate-500">
                        <Icon name={item.icon === 'inventory_2' ? 'box' : item.icon === 'sim_card' ? 'sim-card' : item.icon === 'smartphone' ? 'smartphone' : 'api'} size={36} />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg leading-tight mb-1">
                          {item.name}
                        </h3>
                        <p className="text-slate-400 text-sm mb-2">{item.description}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-white font-bold">{item.price}</span>
                          {item.quantity && (
                            <span className="text-slate-500 text-xs">x{item.quantity}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Footer */}
              <div className="px-6 py-4 bg-[#161616] flex flex-wrap items-center justify-between gap-4">
                {order.status === 'cancelled' && order.refundStatus ? (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm">Refund Status:</span>
                    <span className="text-primary font-medium text-sm">{order.refundStatus}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">Total Amount:</span>
                    <span className="text-white font-bold text-lg">{order.total}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  {order.status === 'cancelled' ? (
                    <button className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white text-sm font-medium transition-colors">
                      <Icon name="refresh" size={18} /> Buy
                      Again
                    </button>
                  ) : (
                    <>
                      <button className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white text-sm font-medium transition-colors">
                        <Icon name="file" size={18} />{' '}
                        Invoice
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-border-dark hover:bg-border-dark/50 rounded-lg text-white text-sm font-medium transition-colors">
                        <Icon name="eye" size={18} />{' '}
                        View Details
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {filteredOrders.length > 0 && (
        <div className="mt-10 flex justify-center">
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-border-dark text-slate-500 hover:text-white hover:border-slate-500 transition-colors">
              <Icon name="chevron-left" size={18} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary text-black font-bold">
              1
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-border-dark text-slate-500 hover:text-white hover:border-slate-500 transition-colors">
              2
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-border-dark text-slate-500 hover:text-white hover:border-slate-500 transition-colors">
              3
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-border-dark text-slate-500 hover:text-white hover:border-slate-500 transition-colors">
              <Icon name="chevron-right" size={18} />
            </button>
          </div>
        </div>
      )}
    </ProfileLayout>
  )
}
