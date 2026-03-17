// Landing page attribution cookie utility
// Links a landing page visit to downstream events (signup, purchase, etc.)
// Cookie persists for 30 days to match Facebook attribution window

const LP_REF_KEY = 'lp_ref'
const LP_SESSION_KEY = 'lp_session'
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

function setCookie(name: string, value: string, maxAge?: number) {
  if (typeof document === 'undefined') return
  const parts = [`${name}=${encodeURIComponent(value)}`, 'path=/', 'SameSite=Lax']
  if (maxAge) parts.push(`max-age=${maxAge}`)
  document.cookie = parts.join('; ')
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function generateSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function generateVisitorId(ip: string, userAgent: string): string {
  // Simple hash for anonymous visitor fingerprint
  const str = `${ip}:${userAgent}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit int
  }
  return `v-${Math.abs(hash).toString(36)}`
}

export function setLandingPageAttribution(pageId: string) {
  setCookie(LP_REF_KEY, pageId, COOKIE_MAX_AGE)
  // Only set session if not already in one
  if (!getCookie(LP_SESSION_KEY)) {
    setCookie(LP_SESSION_KEY, generateSessionId())
  }
}

export function getLandingPageAttribution(): { pageId: string; sessionId: string } | null {
  const pageId = getCookie(LP_REF_KEY)
  const sessionId = getCookie(LP_SESSION_KEY)
  if (!pageId) return null
  return { pageId, sessionId: sessionId || generateSessionId() }
}

export function clearLandingPageAttribution() {
  setCookie(LP_REF_KEY, '', 0)
  setCookie(LP_SESSION_KEY, '', 0)
}

export function getOrCreateVisitorId(): string {
  const key = 'lp_vid'
  const existing = getCookie(key)
  if (existing) return existing
  const vid = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  setCookie(key, vid, COOKIE_MAX_AGE)
  return vid
}

export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return 'mobile'
  return 'desktop'
}