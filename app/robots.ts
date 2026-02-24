import { MetadataRoute } from 'next'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

async function getRobotsContent(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/settings/robotsTxtContent`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const value = data.data?.value
    return typeof value === 'string' && value.trim() ? value.trim() : null
  } catch {
    return null
  }
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'
  const customContent = await getRobotsContent()

  // If custom content is set in admin settings, parse the disallow lines
  if (customContent) {
    const lines = customContent.split('\n')
    const disallow: string[] = []
    const allow: string[] = []
    let userAgent = '*'

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.toLowerCase().startsWith('user-agent:')) {
        userAgent = trimmed.split(':').slice(1).join(':').trim() || '*'
      } else if (trimmed.toLowerCase().startsWith('disallow:')) {
        const path = trimmed.split(':').slice(1).join(':').trim()
        if (path) disallow.push(path)
      } else if (trimmed.toLowerCase().startsWith('allow:')) {
        const path = trimmed.split(':').slice(1).join(':').trim()
        if (path) allow.push(path)
      }
    }

    return {
      rules: {
        userAgent,
        allow: allow.length > 0 ? allow : '/',
        disallow: disallow.length > 0 ? disallow : [],
      },
      sitemap: `${siteUrl}/sitemap.xml`,
    }
  }

  // Default robots rules
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/checkout/', '/profile/', '/notifications/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
