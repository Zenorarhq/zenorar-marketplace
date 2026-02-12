'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Icon from '@/components/ui/Icon'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export default function ProtectedRoute({
  children,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        setShowContent(true)
      } else {
        // Store the intended destination for redirect after login
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname
          sessionStorage.setItem('redirectAfterLogin', currentPath)
        }
        router.push(redirectTo)
      }
    }
  }, [isAuthenticated, isLoading, router, redirectTo])

  // Show loading state while checking authentication
  if (isLoading || (!isAuthenticated && !showContent)) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <Icon name="loading" size={48} className="text-primary animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Only render children when authenticated
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
