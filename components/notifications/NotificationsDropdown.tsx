'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Icon from '@/components/ui/Icon'
import { useNotifications } from '@/hooks/use-notifications'
import { useTimezone } from '@/hooks/use-timezone'
import { formatTimeAgo } from '@/lib/date-utils'
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

interface NotificationsDropdownProps {
  isOpen: boolean
  onClose: () => void
  variant?: 'dropdown' | 'modal'
}

export default function NotificationsDropdown({ isOpen, onClose, variant = 'dropdown' }: NotificationsDropdownProps) {
  const router = useRouter()
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications()
  const tz = useTimezone()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && dropdownRef.current.offsetParent !== null && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (expandedId) {
          setExpandedId(null)
        } else {
          onClose()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, expandedId])

  if (!isOpen) return null

  const recent = notifications.slice(0, 10)

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    setExpandedId(expandedId === notification.id ? null : notification.id)
  }

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
            <Icon name="bell" size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-white text-sm font-bold">Notifications</h2>
            {unreadCount > 0 && (
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-primary hover:text-green-400 font-medium transition-colors"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[360px] overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Icon name="loading" size={24} className="text-primary animate-spin" />
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
              <Icon name="bell" size={24} className="text-slate-600" />
            </div>
            <p className="text-slate-400 text-sm font-medium">No notifications yet</p>
            <p className="text-slate-600 text-xs mt-1">When you get notifications, they'll show up here</p>
          </div>
        ) : (
          recent.map((notification) => {
            const isExpanded = expandedId === notification.id
            return (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-white/5 ${
                  !notification.isRead ? 'bg-white/[0.02] border-l-2 border-primary' : 'border-l-2 border-transparent'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${notificationColors[notification.type]}`}>
                  <Icon name={notificationIcons[notification.type] || 'bell'} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${isExpanded ? '' : 'truncate'} ${notification.isRead ? 'text-slate-300' : 'text-white'}`}>
                      {notification.title}
                    </p>
                    <span className="text-[10px] text-slate-500 flex-shrink-0 mt-0.5">
                      {formatTimeAgo(notification.createdAt, tz)}
                    </span>
                  </div>
                  <p className={`text-xs text-slate-500 mt-0.5 ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-1'}`}>
                    {notification.message}
                  </p>
                  {isExpanded && notification.link && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        onClose()
                        router.push(notification.link!)
                      }}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-green-400 font-medium mt-2 cursor-pointer"
                    >
                      View Details
                      <Icon name="arrow-right" size={12} />
                    </span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 p-3">
        <Link
          href="/notifications"
          onClick={onClose}
          className="block w-full text-center text-sm text-primary hover:text-green-400 font-medium py-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          View All Notifications
        </Link>
      </div>
    </>
  )

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div
          ref={dropdownRef}
          className="relative w-[380px] max-w-[calc(100vw-2rem)] bg-[#0D0D0D] rounded-2xl shadow-2xl border border-white/10 z-[101] max-h-[80vh] overflow-y-auto"
        >
          {content}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-[380px] bg-[#0D0D0D] rounded-2xl shadow-2xl border border-white/10 z-[70]"
    >
      {content}
    </div>
  )
}
