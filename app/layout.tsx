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
      defaultOgImage: getValue('defaultOgImage') || null,
      metaTitleTemplate: getValue('globalMetaTitleTemplate') || null,
      globalMetaDescription: getValue('globalMetaDescription') || null,
      googleVerificationId: getValue('googleSiteVerification') || null,
      defaultOgTitle: getValue('defaultOgTitle') || null,
      defaultOgDescription: getValue('defaultOgDescription') || null,
      defaultOgType: getValue('defaultOgType') || null,
      twitterCardType: getValue('twitterCardType') || null,
      structuredDataOrgName: getValue('structuredDataOrgName') || null,
      structuredDataOrgUrl: getValue('structuredDataOrgUrl') || null,
      structuredDataOrgLogo: getValue('structuredDataOrgLogo') || null,
      structuredDataSocialProfiles: getValue('structuredDataSocialProfiles') || null,
      customHeadCode: getValue('customHeadCode') || null,
      customBodyCode: getValue('customBodyCode') || null,
    }
  } catch {
    return null
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const siteName = settings?.siteName || DEFAULTS.siteName
  const description = settings?.globalMetaDescription || settings?.siteDescription || DEFAULTS.description
  const titleTemplate = settings?.metaTitleTemplate || `%s | ${siteName}`

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: DEFAULTS.title,
      template: titleTemplate,
    },
    description,
    openGraph: {
      type: (settings?.defaultOgType as any) || 'website',
      siteName,
      locale: 'en_US',
      ...(settings?.defaultOgTitle ? { title: settings.defaultOgTitle } : {}),
      ...(settings?.defaultOgDescription ? { description: settings.defaultOgDescription } : {}),
      ...(settings?.defaultOgImage ? { images: [{ url: settings.defaultOgImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: (settings?.twitterCardType as any) || 'summary_large_image',
    },
    ...(settings?.googleVerificationId ? {
      verification: { google: settings.googleVerificationId },
    } : {}),
    ...(settings?.faviconUrl ? {
      icons: {
        icon: settings.faviconUrl,
      },
    } : {}),
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await getSiteSettings()

  // Build JSON-LD structured data if org info is configured
  const jsonLd = settings?.structuredDataOrgName ? {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.structuredDataOrgName,
    ...(settings.structuredDataOrgUrl ? { url: settings.structuredDataOrgUrl } : {}),
    ...(settings.structuredDataOrgLogo ? { logo: settings.structuredDataOrgLogo } : {}),
    ...(settings.structuredDataSocialProfiles ? {
      sameAs: settings.structuredDataSocialProfiles.split('\n').map((s: string) => s.trim()).filter(Boolean),
    } : {}),
  } : null

  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-25..0&display=swap"
          as="style"
        />
        <script dangerouslySetInnerHTML={{ __html: `
          var l = document.createElement('link');
          l.rel = 'stylesheet';
          l.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-25..0&display=swap';
          document.head.appendChild(l);
        `}} />
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}
        {settings?.customHeadCode && (
          <script dangerouslySetInnerHTML={{ __html: settings.customHeadCode }} />
        )}
      </head>
      <body className={`${inter.className} bg-background-dark text-slate-100 transition-colors duration-200`}>
        <Providers>{children}</Providers>
        {settings?.customBodyCode && (
          <script dangerouslySetInnerHTML={{ __html: settings.customBodyCode }} />
        )}
      </body>
    </html>
  )
}
