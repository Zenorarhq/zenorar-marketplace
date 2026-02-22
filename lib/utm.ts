// UTM parameter capture utility
// Captures UTM params from URL on first visit and stores in sessionStorage

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
const STORAGE_KEY = 'utm_params'

export function captureUtmParams() {
  if (typeof window === 'undefined') return

  const params = new URLSearchParams(window.location.search)
  const utm: Record<string, string> = {}

  UTM_KEYS.forEach(key => {
    const val = params.get(key)
    if (val) utm[key] = val
  })

  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm))
  }
}

export function getUtmParams(): Record<string, string> | null {
  if (typeof window === 'undefined') return null
  const stored = sessionStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : null
}
