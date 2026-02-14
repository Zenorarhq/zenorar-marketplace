import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook for permission checking
 * Re-exports permission methods from AuthContext for convenience
 */
export function usePermissions() {
  const { isStaff, permissions, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth()

  return {
    isStaff,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }
}
