import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '@/components/Providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'

const DEFAULTS = {
  siteName: 'Zenorar Marketplace',
  title: 'Tech Marketplace | Premium Digital Assets',
  description: 'Access premium scripts, instant connectivity, and essential tools for the modern digital life.',
}

async function getSiteSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings/public`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const settings = data.data || data
    // Handle both flat and wrapped formats
    const getValue = (key: string) => {
      const val = settings[key]
      return typeof val === 'object' && val !== null ? val.value : val
    }
    return {
      siteName: getValue('siteName') || DEFAULTS.siteName,
      siteDescription: getValue('siteDescription') || DEFAULTS.description,
      faviconUrl: getValue('faviconUrl') || null,
    }
  } catch {
    return null
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const siteName = settings?.siteName || DEFAULTS.siteName
  const description = settings?.siteDescription || DEFAULTS.description

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: DEFAULTS.title,
      template: `%s | ${siteName}`,
    },
    description,
    openGraph: {
      type: 'website',
      siteName,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
    },
    ...(settings?.faviconUrl ? {
      icons: {
        icon: settings.faviconUrl,
      },
    } : {}),
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-25..0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} bg-background-dark text-slate-100 transition-colors duration-200`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
