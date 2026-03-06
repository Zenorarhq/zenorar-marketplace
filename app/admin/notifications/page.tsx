'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import Icon from '@/components/ui/Icon'
import { apiFetch } from '@/lib/api/client'
import { formatTimeAgo } from '@/lib/date-utils'
import { useQueryClient } from '@tanstack/react-query'

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
  DEPOSIT_SUCCESS: 'Deposit',
  DEPOSIT_FAILED: 'Deposit',
  WALLET_CREDIT_ADDED: 'Wallet',
  TICKET_CREATED: 'Ticket',
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
  DEPOSIT_SUCCESS: 'bg-green-500/20 text-green-400',
  DEPOSIT_FAILED: 'bg-red-500/20 text-red-400',
  WALLET_CREDIT_ADDED: 'bg-green-500/20 text-green-400',
  TICKET_CREATED: 'bg-blue-500/20 text-blue-400',
}

const TYPE_ICONS: Record<string, string> = {
  ORDER_PLACED: 'cart',
  ORDER_CONFIRMED: 'verified',
  ORDER_SHIPPED: 'delivery',
  ORDER_DELIVERED: 'package',
  ORDER_CANCELLED: 'cancel',
  PAYMENT_RECEIVED: 'credit-card',
  PAYMENT_FAILED: 'alert',
  REFUND_PROCESSED: 'refresh',
  REVIEW_APPROVED: 'star',
  REVIEW_REJECTED: 'cancel',
  PRICE_DROP: 'discount',
  BACK_IN_STOCK: 'bell',
  PROMOTIONAL: 'gift',
  SYSTEM: 'info',
  DEPOSIT_SUCCESS: 'wallet',
  DEPOSIT_FAILED: 'alert',
  WALLET_CREDIT_ADDED: 'wallet',
  TICKET_CREATED: 'ticket',
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

export default function AdminNotificationsPage() {
  const queryClient = useQueryClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadNotifications = useCallback(async () => {
    const res = await apiFetch<Notification[]>('/notifications?limit=50')
    if (res.success && res.data) {
      setNotifications(res.data)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const unreadCount = notifications.filter(n => !n.isRead).length
  const filtered = filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications

  const markAsRead = async (id: string) => {
    await apiFetch(`/notifications/${id}/read`, { method: 'POST' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    queryClient.invalidateQueries({ queryKey: ['admin-notif-count'] })
    queryClient.invalidateQueries({ queryKey: ['admin-notif-list'] })
  }

  const markAllAsRead = async () => {
    await apiFetch('/notifications/read-all', { method: 'POST' })
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    queryClient.invalidateQueries({ queryKey: ['admin-notif-count'] })
    queryClient.invalidateQueries({ queryKey: ['admin-notif-list'] })
  }

  const deleteNotification = async (id: string) => {
    setDeletingId(id)
    await apiFetch(`/notifications/${id}`, { method: 'DELETE' })
    setNotifications(prev => prev.filter(n => n.id !== id))
    queryClient.invalidateQueries({ queryKey: ['admin-notif-count'] })
    queryClient.invalidateQueries({ queryKey: ['admin-notif-list'] })
    setDeletingId(null)
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
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
                className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
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
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-16">
              <Icon name="loading" size={24} className="text-primary animate-spin mx-auto" />
              <p className="text-slate-500 mt-3 text-sm">Loading notifications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
                <Icon name="bell" size={24} className="text-slate-600" />
              </div>
              <p className="text-slate-400 text-sm font-medium">
                {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
              </p>
              <p className="text-slate-600 text-xs mt-1">Activity will show up here</p>
            </div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                className={`relative bg-[#111111] rounded-xl p-4 border transition-colors ${
                  n.isRead
                    ? 'border-[#1f1f1f]'
                    : 'border-primary/30 bg-primary/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${TYPE_COLORS[n.type] || TYPE_COLORS.SYSTEM}`}>
                    <Icon name={TYPE_ICONS[n.type] || 'bell'} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[n.type] || TYPE_COLORS.SYSTEM}`}>
                        {TYPE_LABELS[n.type] || n.type}
                      </span>
                      {!n.isRead && (
                        <span className="w-2 h-2 bg-primary rounded-full" />
                      )}
                      <span className="text-[11px] text-slate-600 ml-auto">{formatTimeAgo(n.createdAt)}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-white">{n.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">{n.message}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.isRead && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-xs text-slate-500 hover:text-primary px-2 py-1 rounded transition-colors"
                        title="Mark as read"
                      >
                        Read
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(n.id)}
                      disabled={deletingId === n.id}
                      className="text-xs text-slate-600 hover:text-red-400 px-2 py-1 rounded transition-colors"
                      title="Delete"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
