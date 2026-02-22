'use client'

import { ReactNode, useState } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CartProvider } from '@/lib/cart-context'
import { AuthProvider } from '@/contexts/AuthContext'
import { PreferencesProvider } from '@/contexts/PreferencesContext'
import { WishlistProvider } from '@/hooks/use-wishlist'
import { NotificationsProvider } from '@/hooks/use-notifications'
import { SiteSettingsProvider } from '@/contexts/SiteSettingsContext'
import LiveChat from '@/components/LiveChat'
import EmailPromptWrapper from '@/components/auth/EmailPromptWrapper'
import TrackingScripts from '@/components/tracking/TrackingScripts'

interface ProvidersProps {
  children: ReactNode
}

// Get Google Client ID from environment variable
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

export default function Providers({ children }: ProvidersProps) {
  // Create query client with default options for better performance
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <SiteSettingsProvider>
        <GoogleOAuthProvider clientId={googleClientId}>
          <AuthProvider>
            <PreferencesProvider>
              <CartProvider>
                <WishlistProvider>
                  <NotificationsProvider>
                    {children}
                    <TrackingScripts />
                    <LiveChat />
                    <EmailPromptWrapper />
                  </NotificationsProvider>
                </WishlistProvider>
              </CartProvider>
            </PreferencesProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </SiteSettingsProvider>
    </QueryClientProvider>
  )
}
