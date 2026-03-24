'use client'

import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { formatCurrency } from '@/lib/formatNumber'
import { formatDateShort } from '@/lib/date-utils'
import { localApiFetch } from '@/lib/api/client'

interface PhoneRefillOrder {
  id: string
  order_id: string
  price: string
  status: string
  created_at: string
  user_email: string
  operator_name: string
  recipient_phone: string
  country: string
  send_amount: number
  send_currency: string
  offer_id: string
}

interface PhoneRefillStats {
  total_orders: number
  total_revenue: number
  unique_operators: number
  unique_countries: number
}

function PhoneRefillsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 20

  const { data: statsData } = useQuery({
    queryKey: ['admin-phone-refill-stats'],
    queryFn: () => localApiFetch('/admin/phone-refills/stats'),
    staleTime: 5 * 60 * 1000,
  })

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['admin-phone-refill-orders', page],
    queryFn: () => localApiFetch(`/admin/phone-refills/orders?page=${page}&limit=${pageSize}`),
    staleTime: 60 * 1000,
  })

  const stats: PhoneRefillStats = (statsData as any)?.data ?? { total_orders: 0, total_revenue: 0, unique_operators: 0, unique_countries: 0 }
  const orders: PhoneRefillOrder[] = (ordersData as any)?.data ?? []
  const total: number = (ordersData as any)?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: stats.total_orders, icon: 'shopping-cart' },
          { label: 'Total Revenue', value: formatCurrency(stats.total_revenue), icon: 'wallet' },
          { label: 'Operators Used', value: stats.unique_operators, icon: 'smartphone' },
          { label: 'Countries', value: stats.unique_countries, icon: 'globe' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-dark border border-border-dark rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
                <Icon name={s.icon as any} size={16} className="text-blue-400" />
              </div>
              <span className="text-xs text-slate-400">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-dark">
          <h2 className="text-sm font-semibold text-white">Phone Refill Orders</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Icon name="loading" size={32} className="animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Icon name="smartphone" size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No phone refill orders yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-dark">
                    {['Date', 'Customer', 'Operator', 'Recipient', 'Country', 'Send Amount', 'Paid', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs">
                        {formatDateShort(order.created_at)}
                      </td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap max-w-[160px] truncate text-xs">
                        {order.user_email}
                      </td>
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                        {order.operator_name}
                      </td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap font-mono text-xs">
                        {order.recipient_phone}
                      </td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs uppercase">
                        {order.country}
                      </td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs">
                        {order.send_amount} {order.send_currency}
                      </td>
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                        {formatCurrency(parseFloat(order.price))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'CONFIRMED' ? 'bg-green-500/20 text-green-400' :
                          order.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-border-dark flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`?page=${page - 1}`)}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-xs bg-surface-dark border border-border-dark rounded-lg text-slate-300 disabled:opacity-40 hover:border-primary/50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => router.push(`?page=${page + 1}`)}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-xs bg-surface-dark border border-border-dark rounded-lg text-slate-300 disabled:opacity-40 hover:border-primary/50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function PhoneRefillsAdminPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Phone Refills</h1>
            <p className="text-sm text-slate-400 mt-1">Mobile airtime and data top-up orders</p>
          </div>
        </div>
        <Suspense fallback={<div className="flex items-center justify-center py-16"><Icon name="loading" size={32} className="animate-spin text-primary" /></div>}>
          <PhoneRefillsContent />
        </Suspense>
      </div>
    </AdminLayout>
  )
}
