'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import CategoryNav from '@/components/layout/CategoryNav'
import Footer from '@/components/layout/Footer'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useNotifications } from '@/hooks/use-notifications'
import { useTimezone } from '@/hooks/use-timezone'
import { formatTimeAgo, formatFullDate } from '@/lib/date-utils'
import { Notification, NotificationType } from '@/lib/api'

const notificationIcons: Record<NotificationType, string> = {
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
}

const notificationColors: Record<NotificationType, string> = {
  ORDER_PLACED: 'bg-blue-500/20 text-blue-400',
  ORDER_CONFIRMED: 'bg-green-500/20 text-green-400',
  ORDER_SHIPPED: 'bg-purple-500/20 text-purple-400',
  ORDER_DELIVERED: 'bg-green-500/20 text-green-400',
  ORDER_CANCELLED: 'bg-red-500/20 text-red-400',
  PAYMENT_RECEIVED: 'bg-green-500/20 text-green-400',
  PAYMENT_FAILED: 'bg-red-500/20 text-red-400',
  REFUND_PROCESSED: 'bg-yellow-500/20 text-yellow-400',
  REVIEW_APPROVED: 'bg-yellow-500/20 text-yellow-400',
  REVIEW_REJECTED: 'bg-red-500/20 text-red-400',
  PRICE_DROP: 'bg-green-500/20 text-green-400',
  BACK_IN_STOCK: 'bg-blue-500/20 text-blue-400',
  PROMOTIONAL: 'bg-purple-500/20 text-purple-400',
  SYSTEM: 'bg-slate-500/20 text-slate-400',
}

const notificationTypeLabels: Record<NotificationType, string> = {
  ORDER_PLACED: 'Order Update',
  ORDER_CONFIRMED: 'Order Update',
  ORDER_SHIPPED: 'Shipping Update',
  ORDER_DELIVERED: 'Delivery Update',
  ORDER_CANCELLED: 'Order Update',
  PAYMENT_RECEIVED: 'Payment',
  PAYMENT_FAILED: 'Payment',
  REFUND_PROCESSED: 'Refund',
  REVIEW_APPROVED: 'Review',
  REVIEW_REJECTED: 'Review',
  PRICE_DROP: 'Price Alert',
  BACK_IN_STOCK: 'Stock Alert',
  PROMOTIONAL: 'Promotion',
  SYSTEM: 'System',
}

function NotificationModal({
  notification,
  onClose,
  onMarkAsRead,
  onDelete,
}: {
  notification: Notification
  onClose: () => void
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const router = useRouter()
  const tz = useTimezone()
  const [isDeleting, setIsDeleting] = useState(false)

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Mark as read when modal opens
  useEffect(() => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id)
    }
  }, [notification.id, notification.isRead, onMarkAsRead])

  const handleViewDetails = () => {
    if (notification.link) {
      router.push(notification.link)
    }
    onClose()
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete(notification.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-[#1a1a1a] rounded-2xl max-w-lg w-full border border-border-dark shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-dark">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${notificationColors[notification.type]}`}>
              <Icon name={notificationIcons[notification.type] || 'bell'} size={20} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {notificationTypeLabels[notification.type]}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-surface-dark"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-3">
            {notification.title}
          </h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            {notification.message}
          </p>
          <p className="text-sm text-slate-500">
            {formatFullDate(notification.createdAt, tz)}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-border-dark bg-[#161616] rounded-b-2xl">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Icon name="delete" size={18} />
            Delete
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
              Close
            </button>
            {notification.link && (
              <button
                onClick={handleViewDetails}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-green-400 text-black font-bold rounded-lg transition-colors text-sm"
              >
                View Details
                <Icon name="arrow-right" size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function NotificationItem({
  notification,
  onSelect,
  onDelete
}: {
  notification: Notification
  onSelect: (notification: Notification) => void
  onDelete: (id: string) => void
}) {
  const tz = useTimezone()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleClick = () => {
    onSelect(notification)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDeleting(true)
    await onDelete(notification.id)
  }

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-4 p-4 md:p-5 rounded-xl transition-all cursor-pointer group ${
        notification.isRead
          ? 'bg-[#121212] hover:bg-[#161616]'
          : 'bg-[#161616] hover:bg-[#1a1a1a] border-l-4 border-primary'
      } ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${notificationColors[notification.type]}`}>
        <Icon name={notificationIcons[notification.type] || 'bell'} size={20} />
      </div>

      <div className="flex-grow min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className={`font-bold ${notification.isRead ? 'text-slate-300' : 'text-white'}`}>
            {notification.title}
          </h3>
          <span className="text-xs text-slate-500 flex-shrink-0">
            {formatTimeAgo(notification.createdAt, tz)}
          </span>
        </div>
        <p className={`text-sm mt-1 line-clamp-2 ${notification.isRead ? 'text-slate-500' : 'text-slate-400'}`}>
          {notification.message}
        </p>
        <span className="text-xs text-primary mt-2 inline-block font-medium">
          Tap to view
        </span>
      </div>

      <button
        onClick={handleDelete}
        className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
        aria-label="Delete notification"
      >
        <Icon name="delete" size={16} />
      </button>
    </div>
  )
}

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications
  } = useNotifications()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  const handleSelectNotification = useCallback((notification: Notification) => {
    setSelectedNotification(notification)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedNotification(null)
  }, [])

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background-dark flex flex-col">
        <Header />
        <CategoryNav />

        <main className="flex-grow max-w-container mx-auto px-4 md:px-8 lg:px-12 w-full pb-24">
          {/* Breadcrumbs - hidden on mobile */}
          <div className="py-4 hidden md:block">
            <Breadcrumbs className="mb-0" />
          </div>

          {/* Main Content Card */}
          <div className="mt-4 md:mt-0 bg-surface-dark rounded-2xl lg:rounded-[2rem] p-5 md:p-8 lg:p-10 border border-border-dark shadow-2xl shadow-black/40">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-6 md:mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Notifications</h1>
                <p className="text-slate-400 text-sm mt-1 hidden md:block">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                </p>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs md:text-sm text-primary hover:text-green-400 font-medium transition-colors whitespace-nowrap"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={refreshNotifications}
                  className="p-2 text-slate-400 hover:text-white transition-colors bg-surface-light rounded-lg"
                  aria-label="Refresh notifications"
                >
                  <Icon name="refresh" size={18} className={isLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-[#1a1a1a] rounded-xl p-2 flex items-center gap-1 mb-6 md:mb-8">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-primary text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'unread'
                    ? 'bg-primary text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </button>
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
              {isLoading && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <Icon name="loading" size={32} className="text-primary animate-spin" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
                    <Icon name="bell" size={32} className="text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                  </h3>
                  <p className="text-slate-500 text-sm">
                    {filter === 'unread'
                      ? "You're all caught up!"
                      : "When you get notifications, they'll show up here"}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onSelect={handleSelectNotification}
                    onDelete={deleteNotification}
                  />
                ))
              )}
            </div>

            {/* Load More */}
            {filteredNotifications.length > 0 && filteredNotifications.length >= 20 && (
              <div className="text-center mt-8">
                <button className="text-primary hover:text-green-400 text-sm font-medium transition-colors">
                  Load more notifications
                </button>
              </div>
            )}
          </div>
        </main>

        <Footer />

        {/* Notification Detail Modal */}
        {selectedNotification && (
          <NotificationModal
            notification={selectedNotification}
            onClose={handleCloseModal}
            onMarkAsRead={markAsRead}
            onDelete={deleteNotification}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
