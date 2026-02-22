'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { settingsApi } from '@/lib/api/settings'

interface SiteSettings {
  siteName: string
  siteDescription: string
  supportEmail: string
  logoUrl: string
  faviconUrl: string
  maintenanceMode: boolean
  timezone: string
  promoBannerCode: string
  facebookPixelId: string
  ga4MeasurementId: string
  defaultOgImage: string
}

const CACHE_KEY = 'site_settings'
const RAW_CACHE_KEY = 'site_raw_settings'

function loadRawCached(): Record<string, any> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(RAW_CACHE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

function saveRawCache(raw: Record<string, any>) {
  try {
    localStorage.setItem(RAW_CACHE_KEY, JSON.stringify({ site_footer: raw.site_footer, home_page_layout: raw.home_page_layout, home_hero_slides: raw.home_hero_slides }))
  } catch {}
}

const DEFAULTS: SiteSettings = {
  siteName: '',
  siteDescription: '',
  supportEmail: '',
  logoUrl: '',
  faviconUrl: '',
  maintenanceMode: false,
  timezone: 'auto',
  promoBannerCode: '',
  facebookPixelId: '',
  ga4MeasurementId: '',
  defaultOgImage: '',
}

function loadCached(): SiteSettings {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULTS
}

function saveCache(settings: SiteSettings) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(settings))
  } catch {}
}

// Extract a string value from API response data, handling both flat and wrapped formats
// e.g. { siteName: "Zenorar" } or { siteName: { value: "Zenorar" } }
function extractValue(data: Record<string, any>, key: string): string {
  const v = data[key]
  if (v === null || v === undefined) return ''
  if (typeof v === 'object' && 'value' in v) return String(v.value ?? '')
  return String(v)
}

const SiteSettingsContext = createContext<SiteSettings & { isLoaded: boolean; rawSettings: Record<string, any> }>({ ...DEFAULTS, isLoaded: false, rawSettings: {} })

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  // Always start with DEFAULTS to avoid hydration mismatch (server has no localStorage)
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS)
  const [rawSettings, setRawSettings] = useState<Record<string, any>>({})
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Load cached values first (client-only, after hydration)
    const cached = loadCached()
    const cachedRaw = loadRawCached()
    if (Object.keys(cachedRaw).length > 0) setRawSettings(cachedRaw)
    if (cached.siteName || cached.logoUrl || cached.faviconUrl || cached.maintenanceMode) {
      setSettings(cached)
      setIsLoaded(true)
    }

    // Then fetch fresh from API
    settingsApi.getPublicSettings().then((res) => {
      if (res.success && res.data) {
        const d = res.data
        setRawSettings(d)
        saveRawCache(d)
        // When API returns a key (even empty ""), use it directly — don't fall back to stale cache
        const fresh: SiteSettings = {
          siteName: ('siteName' in d ? extractValue(d, 'siteName') : cached.siteName) || DEFAULTS.siteName,
          siteDescription: ('siteDescription' in d ? extractValue(d, 'siteDescription') : cached.siteDescription) || DEFAULTS.siteDescription,
          supportEmail: ('supportEmail' in d ? extractValue(d, 'supportEmail') : cached.supportEmail) || DEFAULTS.supportEmail,
          logoUrl: 'logoUrl' in d ? extractValue(d, 'logoUrl') : (cached.logoUrl || ''),
          faviconUrl: 'faviconUrl' in d ? extractValue(d, 'faviconUrl') : (cached.faviconUrl || ''),
          maintenanceMode: 'maintenanceMode' in d ? Boolean(d.maintenanceMode) : false,
          timezone: 'timezone' in d ? extractValue(d, 'timezone') : (cached.timezone || 'auto'),
          promoBannerCode: 'promoBannerCode' in d ? extractValue(d, 'promoBannerCode') : (cached.promoBannerCode || ''),
          facebookPixelId: 'facebookPixelId' in d ? extractValue(d, 'facebookPixelId') : (cached.facebookPixelId || ''),
          ga4MeasurementId: 'ga4MeasurementId' in d ? extractValue(d, 'ga4MeasurementId') : (cached.ga4MeasurementId || ''),
          defaultOgImage: 'defaultOgImage' in d ? extractValue(d, 'defaultOgImage') : (cached.defaultOgImage || ''),
        }
        setSettings(fresh)
        saveCache(fresh)
      } else {
        console.warn('[SiteSettings] fetch failed:', res.error || 'no data')
      }
      setIsLoaded(true)
    }).catch((err) => {
      console.error('[SiteSettings] fetch error:', err)
      setIsLoaded(true)
    })
  }, [])

  // Dynamically apply theme CSS variables
  useEffect(() => {
    if (typeof document === 'undefined') return
    try {
      const raw = rawSettings.site_theme
      if (!raw) return
      const theme = typeof raw === 'string' ? JSON.parse(raw) : raw
      const data = theme?.value ? (typeof theme.value === 'string' ? JSON.parse(theme.value) : theme.value) : theme

      // Backward compat: old format had { primaryColor: "..." }
      if (data?.primaryColor && !data?.colors) {
        document.documentElement.style.setProperty('--theme-primary', data.primaryColor)
        return
      }

      // New format: { colors: { primary, secondary, ... }, typography: { ... } }
      if (data?.colors) {
        const colorMap: Record<string, string> = {
          primary: '--theme-primary',
          secondary: '--theme-secondary',
          background: '--theme-background',
          surface: '--theme-surface',
          surfaceLight: '--theme-surface-light',
          border: '--theme-border',
          textPrimary: '--theme-text-primary',
          textSecondary: '--theme-text-secondary',
        }
        for (const [key, varName] of Object.entries(colorMap)) {
          if (data.colors[key]) {
            document.documentElement.style.setProperty(varName, data.colors[key])
          }
        }
      }
      if (data?.typography?.headingFont) {
        document.documentElement.style.setProperty('--theme-font-heading', `'${data.typography.headingFont}', sans-serif`)
      }
      if (data?.typography?.bodyFont) {
        document.documentElement.style.setProperty('--theme-font-body', `'${data.typography.bodyFont}', sans-serif`)
      }
    } catch {}
  }, [rawSettings.site_theme])

  // Dynamically set favicon
  useEffect(() => {
    if (!settings.faviconUrl || typeof document === 'undefined') return
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = settings.faviconUrl
  }, [settings.faviconUrl])

  return (
    <SiteSettingsContext.Provider value={{ ...settings, isLoaded, rawSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext)
}
