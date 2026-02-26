'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api/client'
import { useAuth } from '@/contexts/AuthContext'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const { isAuthenticated } = useAuth()
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check if push is supported and if user is already subscribed
  useEffect(() => {
    if (typeof window === 'undefined') return
    const supported = 'serviceWorker' in navigator && 'PushManager' in window
    setIsSupported(supported)

    if (supported && isAuthenticated) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub)
        })
      })
    }
  }, [isAuthenticated])

  // Register service worker on mount
  useEffect(() => {
    if (!isSupported) return
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('SW registration failed:', err)
    })
  }, [isSupported])

  const subscribe = useCallback(async () => {
    if (!isSupported || !isAuthenticated) return false
    setIsLoading(true)

    try {
      // Get VAPID key from backend
      const keyRes = await apiFetch<{ publicKey: string }>('/push/vapid-key')
      if (!keyRes.success || !keyRes.data?.publicKey) {
        console.error('Failed to get VAPID key')
        return false
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyRes.data.publicKey).buffer as ArrayBuffer,
      })

      // Send subscription to backend
      const subJson = subscription.toJSON()
      const res = await apiFetch('/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          subscription: {
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys?.p256dh,
              auth: subJson.keys?.auth,
            },
          },
        }),
      })

      if (res.success) {
        setIsSubscribed(true)
        return true
      }
      return false
    } catch (err) {
      console.error('Push subscribe error:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, isAuthenticated])

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false
    setIsLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Tell backend to remove subscription
        await apiFetch('/push/unsubscribe', {
          method: 'POST',
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }

      setIsSubscribed(false)
      return true
    } catch (err) {
      console.error('Push unsubscribe error:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported])

  return { isSupported, isSubscribed, isLoading, subscribe, unsubscribe }
}
