'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface AdminRouteProps {
  children: React.ReactNode
  requiredPermission?: string
  requiredPermissions?: string[]
  requireAll?: boolean
}

/**
 * AdminRoute - Protects routes with permission checks
 *
 * @param requiredPermission - Single permission required (e.g., 'view_products')
 * @param requiredPermissions - Multiple permissions (checks based on requireAll)
 * @param requireAll - If true, user must have ALL permissions. If false, user needs ANY permission
 *
 * @example
 * // Require single permission
 * <AdminRoute requiredPermission="view_products">
 *   <ProductsPage />
 * </AdminRoute>
 *
 * @example
 * // Require any of multiple permissions
 * <AdminRoute requiredPermissions={['view_products', 'edit_products']}>
 *   <ProductsPage />
 * </AdminRoute>
 *
 * @example
 * // Require all permissions
 * <AdminRoute requiredPermissions={['view_products', 'edit_products']} requireAll>
 *   <ProductsPage />
 * </AdminRoute>
 */
export default function AdminRoute({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
}: AdminRouteProps) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, isStaff, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth()

  useEffect(() => {
    if (isLoading) return

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
      router.push('/admin/login?redirect=' + encodeURIComponent(window.location.pathname))
      return
    }

    // Not staff - redirect to homepage with error
    if (!isStaff) {
      router.push('/?error=unauthorized')
      return
    }

    // Check single permission
    if (requiredPermission && !hasPermission(requiredPermission)) {
      router.push('/admin?error=forbidden')
      return
    }

    // Check multiple permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAccess = requireAll
        ? hasAllPermissions(...requiredPermissions)
        : hasAnyPermission(...requiredPermissions)

      if (!hasAccess) {
        router.push('/admin?error=forbidden')
        return
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    isStaff,
    requiredPermission,
    requiredPermissions,
    requireAll,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    router,
  ])

  // Show loading state
  if (isLoading || !isAuthenticated || !isStaff) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    )
  }

  // Check permissions before rendering
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return null
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(...requiredPermissions)
      : hasAnyPermission(...requiredPermissions)

    if (!hasAccess) {
      return null
    }
  }

  return <>{children}</>
}
