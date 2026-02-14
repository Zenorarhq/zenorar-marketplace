'use client'

import { usePermissions } from '@/hooks/use-permissions'

interface PermissionGateProps {
  children: React.ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  fallback?: React.ReactNode
}

/**
 * PermissionGate - Conditionally render children based on permissions
 *
 * @param permission - Single permission required
 * @param permissions - Multiple permissions (checks based on requireAll)
 * @param requireAll - If true, user must have ALL permissions. If false, user needs ANY permission
 * @param fallback - Optional fallback content to render if permission check fails
 *
 * @example
 * // Show button only if user has edit_products permission
 * <PermissionGate permission="edit_products">
 *   <button>Edit Product</button>
 * </PermissionGate>
 *
 * @example
 * // Show content if user has any of the permissions
 * <PermissionGate permissions={['view_products', 'edit_products']}>
 *   <ProductList />
 * </PermissionGate>
 *
 * @example
 * // Show content if user has all permissions, with fallback
 * <PermissionGate
 *   permissions={['view_products', 'edit_products']}
 *   requireAll
 *   fallback={<p>You don't have permission</p>}
 * >
 *   <ProductEditor />
 * </PermissionGate>
 */
export default function PermissionGate({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions()

  // Check single permission
  if (permission) {
    return hasPermission(permission) ? <>{children}</> : <>{fallback}</>
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(...permissions)
      : hasAnyPermission(...permissions)

    return hasAccess ? <>{children}</> : <>{fallback}</>
  }

  // No permissions specified - render children
  return <>{children}</>
}
