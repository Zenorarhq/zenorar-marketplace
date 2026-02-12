'use client'

import { useState, useEffect } from 'react'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import Icon from '@/components/ui/Icon'

interface AnnouncementConfig {
  enabled: boolean
  text: string
  linkUrl?: string
  backgroundColor?: string
  textColor?: string
}

function parseConfig(raw: any): AnnouncementConfig | null {
  if (!raw) return null
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    const data = parsed?.value ? (typeof parsed.value === 'string' ? JSON.parse(parsed.value) : parsed.value) : parsed
    if (data && typeof data === 'object' && data.enabled && data.text) return data
    return null
  } catch { return null }
}

export default function AnnouncementBar() {
  const { rawSettings } = useSiteSettings()
  const [dismissed, setDismissed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
    if (sessionStorage.getItem('announcement_dismissed') === '1') {
      setDismissed(true)
    }
  }, [])

  const config = parseConfig(rawSettings?.site_announcement)

  if (!hydrated || !config || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('announcement_dismissed', '1')
  }

  return (
    <div
      className="relative text-center py-2 px-10 text-sm font-medium"
      style={{
        backgroundColor: config.backgroundColor || '#43D678',
        color: config.textColor || '#000000',
      }}
    >
      {config.linkUrl ? (
        <a href={config.linkUrl} className="hover:underline">
          {config.text}
        </a>
      ) : (
        <span>{config.text}</span>
      )}
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss announcement"
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}
