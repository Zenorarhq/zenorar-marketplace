'use client'

import { useState } from 'react'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useNotifications } from '@/hooks/use-notifications'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { formatTimeAgo } from '@/lib/date-utils'

const TYPE_LABELS: Record<string, string> = {
  ORDER_PLACED: 'Order',
  ORDER_CONFIRMED: 'Order',
  ORDER_SHIPPED: 'Shipping',
  ORDER_DELIVERED: 'Delivery',
  ORDER_CANCELLED: 'Order',
  PAYMENT_RECEIVED: 'Payment',
  PAYMENT_FAILED: 'Payment',
  REFUND_PROCESSED: 'Refund',
  REVIEW_APPROVED: 'Review',
  REVIEW_REJECTED: 'Review',
  PRICE_DROP: 'Deal',
  BACK_IN_STOCK: 'Stock',
  PROMOTIONAL: 'Promo',
  SYSTEM: 'System',
}

const TYPE_COLORS: Record<string, string> = {
  ORDER_PLACED: 'bg-blue-500/20 text-blue-400',
  ORDER_CONFIRMED: 'bg-green-500/20 text-green-400',
  ORDER_SHIPPED: 'bg-purple-500/20 text-purple-400',
  ORDER_DELIVERED: 'bg-green-500/20 text-green-400',
  ORDER_CANCELLED: 'bg-red-500/20 text-red-400',
  PAYMENT_RECEIVED: 'bg-green-500/20 text-green-400',
  PAYMENT_FAILED: 'bg-red-500/20 text-red-400',
  REFUND_PROCESSED: 'bg-yellow-500/20 text-yellow-400',
  REVIEW_APPROVED: 'bg-green-500/20 text-green-400',
  REVIEW_REJECTED: 'bg-red-500/20 text-red-400',
  PRICE_DROP: 'bg-orange-500/20 text-orange-400',
  BACK_IN_STOCK: 'bg-blue-500/20 text-blue-400',
  PROMOTIONAL: 'bg-pink-500/20 text-pink-400',
  SYSTEM: 'bg-slate-500/20 text-slate-400',
}

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification, refreshNotifications } = useNotifications()
  const { isSupported, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications

  const handleTogglePush = async () => {
    if (isSubscribed) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await deleteNotification(id)
    setDeletingId(null)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0D0D0D]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Notifications' }]} />

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-slate-400 mt-1">{unreadCount} unread</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {/* Push Notification Banner */}
          {isSupported && (
            <div className="mt-6 flex items-center justify-between bg-black/40 rounded-2xl p-4 sm:p-5 border border-border-dark">
              <div>
                <h4 className="font-bold text-white text-sm">Browser Push Notifications</h4>
                <p className="text-xs text-slate-500 mt-1">
                  {isSubscribed
                    ? 'You will receive push notifications in your browser.'
                    : 'Enable to get real-time alerts even when this tab is closed.'}
                </p>
              </div>
              <button
                onClick={handleTogglePush}
                disabled={pushLoading}
                className={`relative w-12 h-7 rounded-full transition-colors border ${
                  isSubscribed
                    ? 'bg-primary border-primary'
                    : 'bg-surface-dark border-border-dark'
                } ${pushLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div
                  className={`absolute top-[3px] w-5 h-5 bg-white rounded-full transition-all ${
                    isSubscribed ? 'left-[22px]' : 'left-[3px]'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-black'
                  : 'bg-[#1a1a1a] text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-primary text-black'
                  : 'bg-[#1a1a1a] text-slate-400 hover:text-white'
              }`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {/* Notification List */}
          <div className="mt-6 space-y-3">
            {isLoading && notifications.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-slate-500 mt-3 text-sm">Loading notifications...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-slate-500 text-sm">
                  {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
                </p>
              </div>
            ) : (
              filtered.map((notification) => (
                <div
                  key={notification.id}
                  className={`relative bg-black/40 rounded-xl p-4 border transition-colors ${
                    notification.isRead
                      ? 'border-border-dark'
                      : 'border-primary/30 bg-primary/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[notification.type] || TYPE_COLORS.SYSTEM}`}>
                          {TYPE_LABELS[notification.type] || notification.type}
                        </span>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-white">{notification.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{notification.message}</p>
                      <p className="text-[11px] text-slate-600 mt-2">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-slate-500 hover:text-primary px-2 py-1 rounded transition-colors"
                          title="Mark as read"
                        >
                          Read
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        disabled={deletingId === notification.id}
                        className="text-xs text-slate-600 hover:text-red-400 px-2 py-1 rounded transition-colors"
                        title="Delete"
                      >
                        {deletingId === notification.id ? '...' : '✕'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
