import { useState, useEffect } from 'react'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { profileApi } from '@/lib/api/profile'

// Module-level cache to avoid duplicate API calls across components
let cachedUserTimezone: string | null = null
let cachedForUserId: string | null = null

/**
 * Returns the effective timezone for date formatting.
 * Priority: user profile timezone > admin site timezone > undefined (browser auto-detect).
 * Returns undefined when timezone is 'auto' so Intl.DateTimeFormat uses the browser default.
 */
export function useTimezone(): string | undefined {
  const { timezone: siteTimezone } = useSiteSettings()
  const { user } = useAuth()
  const [userTimezone, setUserTimezone] = useState<string | null>(cachedUserTimezone)

  useEffect(() => {
    if (!user) {
      cachedUserTimezone = null
      cachedForUserId = null
      setUserTimezone(null)
      return
    }

    // Use cached value if same user
    if (user.id === cachedForUserId && cachedUserTimezone !== null) {
      setUserTimezone(cachedUserTimezone)
      return
    }

    profileApi.getPreferences().then((res) => {
      if (res.success && res.data?.timezone) {
        cachedUserTimezone = res.data.timezone
        cachedForUserId = user.id
        setUserTimezone(res.data.timezone)
      }
    }).catch(() => {})
  }, [user])

  // Priority: user preference > site setting > auto (undefined)
  if (userTimezone && userTimezone !== 'auto') return userTimezone
  if (siteTimezone && siteTimezone !== 'auto') return siteTimezone
  return undefined
}
