'use client'

import { useGetIdentity } from '@refinedev/core'
import { hasRole, hasMinimumRole, hasAnyRole, UserRole } from '../utils/roles'

interface RoleGuardProps {
  children: React.ReactNode
  requiredRole?: UserRole
  minimumRole?: UserRole
  allowedRoles?: UserRole[]
  fallback?: React.ReactNode
}

/**
 * RoleGuard component - Conditionally renders children based on user role
 * 
 * Usage:
 * <RoleGuard requiredRole={UserRole.MANAGER}>
 *   <AdminPanel />
 * </RoleGuard>
 * 
 * <RoleGuard minimumRole={UserRole.TEAM_LEAD}>
 *   <TeamManagement />
 * </RoleGuard>
 * 
 * <RoleGuard allowedRoles={[UserRole.MANAGER, UserRole.GROUP_HEAD]}>
 *   <AdminFeatures />
 * </RoleGuard>
 */
const RoleGuard = ({ 
  children, 
  requiredRole, 
  minimumRole, 
  allowedRoles,
  fallback = null 
}: RoleGuardProps) => {
  const { data: user } = useGetIdentity()
  const userRole = user?.role

  let hasAccess = false

  if (requiredRole) {
    hasAccess = hasRole(userRole, requiredRole)
  } else if (minimumRole) {
    hasAccess = hasMinimumRole(userRole, minimumRole)
  } else if (allowedRoles && allowedRoles.length > 0) {
    hasAccess = hasAnyRole(userRole, ...allowedRoles)
  } else {
    // If no role check specified, allow access
    hasAccess = true
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

export default RoleGuard

