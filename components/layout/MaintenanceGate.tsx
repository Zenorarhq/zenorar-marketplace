'use client'

import { ReactNode } from 'react'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const { maintenanceMode, siteName, logoUrl, isLoaded } = useSiteSettings()

  if (!isLoaded) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!maintenanceMode) return <>{children}</>

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white px-6">
      {logoUrl ? (
        <img src={logoUrl} alt={siteName} className="h-16 w-auto object-contain mb-8" />
      ) : siteName ? (
        <h1 className="text-3xl font-bold text-primary mb-8">{siteName}</h1>
      ) : null}

      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🔧</div>
        <h2 className="text-2xl font-semibold mb-3">We&apos;ll Be Back Soon</h2>
        <p className="text-gray-400 text-lg">
          We&apos;re performing scheduled maintenance. Please check back shortly.
        </p>
      </div>
    </div>
  )
}
