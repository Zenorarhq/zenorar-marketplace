'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Icon from '@/components/ui/Icon'
import { ordersApi, Order } from '@/lib/api/orders'
import { usePreferences } from '@/contexts/PreferencesContext'

function getStatusBadge(status: string) {
  const styles: Record<string, { bg: string; text: string; dot?: string; icon?: string }> = {
    DELIVERED: { bg: 'bg-green-900/30 border-green-500/20', text: 'text-green-500', dot: 'bg-green-500' },
    CONFIRMED: { bg: 'bg-blue-900/30 border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400' },
    PROCESSING: { bg: 'bg-yellow-900/30 border-yellow-500/20', text: 'text-yellow-500', dot: 'bg-yellow-500' },
    PENDING: { bg: 'bg-yellow-900/30 border-yellow-500/20', text: 'text-yellow-500', dot: 'bg-yellow-500' },
    SHIPPED: { bg: 'bg-blue-900/30 border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400' },
    CANCELLED: { bg: 'bg-red-900/30 border-red-500/20', text: 'text-red-500', icon: 'close' },
    REFUNDED: { bg: 'bg-red-900/30 border-red-500/20', text: 'text-red-500', icon: 'refresh' },
  }
  const s = styles[status] || { bg: 'bg-slate-900/30 border-slate-500/20', text: 'text-slate-400' }
  const label = status.charAt(0) + status.slice(1).toLowerCase()

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.bg} ${s.text} border`}>
      {s.icon ? <Icon name={s.icon} size={14} /> : s.dot && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>}
      {label}
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { formatPrice } = usePreferences()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = params.id as string
    if (!id) return

    setIsLoading(true)
    ordersApi
      .getById(id)
      .then((result) => {
        if (result.success && result.data) {
          setOrder(result.data)
        } else {
          setError(result.error || 'Order not found')
        }
      })
      .catch(() => {
        setError('Network error. Please try again.')
      })
      .finally(() => setIsLoading(false))
  }, [params.id])

  return (
    <ProfileLayout>
      {/* Back Button */}
      <button
        onClick={() => router.push('/profile/orders')}
        className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <Icon name="chevron-left" size={18} />
        Back to Orders
      </button>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading order details...</p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="text-center py-16">
          <Icon name="alert-circle" size={60} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Order not found</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link
            href="/profile/orders"
            className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Orders
          </Link>
        </div>
      )}

      {/* Order Detail */}
      {!isLoading && !error && order && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-[#121212] border border-border-dark rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Order #{order.orderNumber}</h1>
                <p className="text-slate-400 text-sm">Placed on {formatDate(order.createdAt)}</p>
              </div>
              {getStatusBadge(order.status)}
            </div>

            {/* Order Meta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border-dark">
              {order.paymentMethod && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Payment</div>
                  <div className="text-slate-300 text-sm">{order.paymentMethod}</div>
                </div>
              )}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Payment Status</div>
                <div className="text-slate-300 text-sm capitalize">{order.paymentStatus.toLowerCase()}</div>
              </div>
              {order.trackingNumber && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Tracking</div>
                  <div className="text-slate-300 text-sm font-mono">{order.trackingNumber}</div>
                </div>
              )}
              {order.shippedAt && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Shipped</div>
                  <div className="text-slate-300 text-sm">{formatDate(order.shippedAt)}</div>
                </div>
              )}
              {order.deliveredAt && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Delivered</div>
                  <div className="text-slate-300 text-sm">{formatDate(order.deliveredAt)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border-dark bg-[#161616]">
              <h2 className="text-white font-bold">Items ({order.items.length})</h2>
            </div>
            <div className="p-6 space-y-6">
              {order.items.map((item, index) => (
                <div
                  key={item.id || index}
                  className={`flex items-start gap-5 ${
                    index > 0 ? 'border-t border-dashed border-border-dark pt-6' : ''
                  }`}
                >
                  <div className="h-16 w-16 rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {(() => {
                      const imageUrl = item.product?.images?.[0]?.url
                        || (item.product as any)?.image
                        || (item.product as any)?.imageUrl
                        || (item as any).metadata?.imageUrl
                      const isGiftCard = (item as any).product_type === 'gift_card'
                        || (item as any).metadata?.productType === 'gift_card'
                      return imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null
                    })()}
                    <div className={`${item.product?.images?.[0]?.url || (item.product as any)?.image || (item.product as any)?.imageUrl || (item as any).metadata?.imageUrl ? 'hidden' : ''} flex items-center justify-center w-full h-full`}>
                      <Icon name={(item as any).product_type === 'gift_card' || (item as any).metadata?.productType === 'gift_card' ? 'gift' : 'box'} size={36} className="text-slate-500" />
                    </div>
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-white font-bold text-lg leading-tight mb-1">{item.name}</h3>
                        {item.variant && <p className="text-slate-400 text-sm">{item.variant.name}</p>}
                        {item.sku && <p className="text-slate-500 text-xs">SKU: {item.sku}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-white font-bold">{formatPrice(Number(item.price))}</div>
                        {item.quantity > 1 && (
                          <div className="text-slate-500 text-xs">x{item.quantity}</div>
                        )}
                        {item.quantity > 1 && (
                          <div className="text-slate-300 text-sm mt-1">{formatPrice(Number(item.total))}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border-dark bg-[#161616]">
              <h2 className="text-white font-bold">Order Summary</h2>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-slate-300">{formatPrice(Number(order.subtotal))}</span>
              </div>
              {Number(order.shippingCost) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Shipping</span>
                  <span className="text-slate-300">{formatPrice(Number(order.shippingCost))}</span>
                </div>
              )}
              {Number(order.taxAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tax</span>
                  <span className="text-slate-300">{formatPrice(Number(order.taxAmount))}</span>
                </div>
              )}
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Discount</span>
                  <span className="text-green-500">-{formatPrice(Number(order.discountAmount))}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-border-dark">
                <span className="text-white font-bold text-lg">Total</span>
                <span className="text-white font-bold text-lg">{formatPrice(Number(order.total))}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-dark bg-[#161616]">
                <h2 className="text-white font-bold">Shipping Address</h2>
              </div>
              <div className="p-6 text-sm text-slate-300 space-y-1">
                <p className="text-white font-medium">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                </p>
                {order.shippingAddress.company && <p>{order.shippingAddress.company}</p>}
                <p>{order.shippingAddress.address1}</p>
                {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
                <p>
                  {order.shippingAddress.city}
                  {order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''}{' '}
                  {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
                {order.shippingAddress.phone && <p>Phone: {order.shippingAddress.phone}</p>}
              </div>
            </div>
          )}

          {/* Customer Note */}
          {order.customerNote && (
            <div className="bg-[#121212] border border-border-dark rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-dark bg-[#161616]">
                <h2 className="text-white font-bold">Your Note</h2>
              </div>
              <div className="p-6">
                <p className="text-slate-300 text-sm">{order.customerNote}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </ProfileLayout>
  )
}
