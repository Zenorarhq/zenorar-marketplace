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
  icon?: string
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
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const config = parseConfig(rawSettings?.site_announcement)

  if (!hydrated || !config) return null

  const content = (
    <>
      {config.icon && <Icon name={config.icon} size={16} className="mr-2 inline-block" />}
      {config.text}
    </>
  )

  return (
    <div
      className="text-center py-1.5 sm:py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium leading-snug"
      style={{
        backgroundColor: config.backgroundColor || '#43D678',
        color: config.textColor || '#000000',
      }}
    >
      {config.linkUrl ? (
        <a href={config.linkUrl} className="hover:underline">
          {content}
        </a>
      ) : (
        <span>{content}</span>
      )}
    </div>
  )
}
