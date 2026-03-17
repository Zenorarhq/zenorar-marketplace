'use client'

import { useEffect, useRef } from 'react'
import {
  setLandingPageAttribution,
  getLandingPageAttribution,
  getDeviceType,
  getOrCreateVisitorId,
} from '@/lib/landing-page-attribution'

interface LandingPageTrackerProps {
  pageId: string
}

export default function LandingPageTracker({ pageId }: LandingPageTrackerProps) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current || !pageId) return
    tracked.current = true

    // Set attribution cookie (creates session if none exists)
    setLandingPageAttribution(pageId)

    // Read session from cookie (consistent with what setLandingPageAttribution stored)
    const attr = getLandingPageAttribution()
    const sessionId = attr?.sessionId || ''
    const deviceType = getDeviceType()
    const referrer = document.referrer || ''
    const params = new URLSearchParams(window.location.search)

    // Persistent visitor ID (same across page_view and button_click)
    const visitorId = getOrCreateVisitorId()

    // Fire page_view event
    fetch('/api/analytics/landing-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageId,
        eventType: 'page_view',
        visitorId,
        sessionId,
        referrer,
        utmSource: params.get('utm_source'),
        utmMedium: params.get('utm_medium'),
        utmCampaign: params.get('utm_campaign'),
        utmContent: params.get('utm_content'),
        utmTerm: params.get('utm_term'),
        deviceType,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {})

    // Listen for button clicks from iframe (design block postMessage)
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === '__lpButtonClick') {
        fetch('/api/analytics/landing-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageId,
            eventType: 'button_click',
            visitorId,
            sessionId,
            deviceType,
            userAgent: navigator.userAgent,
            referrer,
            buttonText: e.data.text || '',
            buttonUrl: e.data.url || '',
          }),
        }).catch(() => {})
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [pageId])

  return null
}
