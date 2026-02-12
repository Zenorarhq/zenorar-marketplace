'use client'

import { useEffect, useCallback, useRef } from 'react'

const ACTIVITY_KEY = 'last_activity'

export function useSessionTimeout(
  onTimeout: () => void,
  enabled: boolean = true
) {
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  const getTimeoutMinutes = useCallback((): number => {
    if (typeof window === 'undefined') return 0
    const val = localStorage.getItem('sessionTimeout')
    return val ? parseInt(val, 10) : 0
  }, [])

  const updateActivity = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVITY_KEY, Date.now().toString())
    }
  }, [])

  const checkTimeout = useCallback(() => {
    const timeoutMinutes = getTimeoutMinutes()
    if (!enabled || timeoutMinutes <= 0) return

    const lastActivity = localStorage.getItem(ACTIVITY_KEY)
    if (!lastActivity) return

    const elapsed = Date.now() - parseInt(lastActivity, 10)
    if (elapsed > timeoutMinutes * 60 * 1000) {
      localStorage.removeItem(ACTIVITY_KEY)
      localStorage.removeItem('sessionTimeout')
      onTimeoutRef.current()
    }
  }, [enabled, getTimeoutMinutes])

  useEffect(() => {
    if (!enabled) return

    const timeoutMinutes = getTimeoutMinutes()
    if (timeoutMinutes <= 0) return

    // Record activity on user interaction
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((e) =>
      window.addEventListener(e, updateActivity, { passive: true })
    )
    updateActivity()

    // Check every 60 seconds
    const interval = setInterval(checkTimeout, 60_000)

    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity))
      clearInterval(interval)
    }
  }, [enabled, getTimeoutMinutes, updateActivity, checkTimeout])
}
