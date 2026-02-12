'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { notificationsApi, Notification } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  refreshNotifications: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    setIsLoading(true)
    const [notifResult, countResult] = await Promise.all([
      notificationsApi.get({ limit: 20 }),
      notificationsApi.getUnreadCount(),
    ])

    if (notifResult.success && notifResult.data) {
      setNotifications(notifResult.data)
    }
    if (countResult.success && countResult.data) {
      setUnreadCount(countResult.data.count)
    }
    setIsLoading(false)
  }, [isAuthenticated])

  useEffect(() => {
    refreshNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(refreshNotifications, 30000)
    return () => clearInterval(interval)
  }, [refreshNotifications])

  const markAsRead = useCallback(async (id: string) => {
    await notificationsApi.markAsRead(id)
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(async () => {
    await notificationsApi.markAllAsRead()
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    )
    setUnreadCount(0)
  }, [])

  const deleteNotification = useCallback(async (id: string) => {
    await notificationsApi.delete(id)
    const notif = notifications.find(n => n.id === id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (notif && !notif.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }, [notifications])

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return context
}
