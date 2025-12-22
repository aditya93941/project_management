'use client'

/**
 * Example component showing how to use role-based access control
 * 
 * This is just an example - you can use RoleGuard or the utility functions
 * in your actual components
 */

import { useGetIdentity } from '@refinedev/core'
import RoleGuard from './RoleGuard'
import { hasMinimumRole, hasRole, UserRole, roleLabels } from '../utils/roles'

const RoleBasedExample = () => {
  const { data: user } = useGetIdentity()
  const userRole = user?.role

  return (
    <div className="space-y-4">
      {/* Example 1: Using RoleGuard component */}
      <RoleGuard requiredRole={UserRole.MANAGER}>
        <div className="p-4 bg-red-100 dark:bg-red-500/10 rounded-lg">
          <p>Only MANAGER (Superadmin) can see this</p>
        </div>
      </RoleGuard>

      {/* Example 2: Using RoleGuard with minimum role */}
      <RoleGuard minimumRole={UserRole.GROUP_HEAD}>
        <div className="p-4 bg-red-100 dark:bg-red-500/10 rounded-lg">
          <p>GROUP_HEAD and MANAGER can see this</p>
        </div>
      </RoleGuard>

      {/* Example 3: Using RoleGuard with multiple allowed roles */}
      <RoleGuard allowedRoles={[UserRole.MANAGER, UserRole.GROUP_HEAD, UserRole.TEAM_LEAD]}>
        <div className="p-4 bg-green-100 dark:bg-yellow-500/10 rounded-lg">
          <p>MANAGER, GROUP_HEAD, or TEAM_LEAD can see this</p>
        </div>
      </RoleGuard>

      {/* Example 4: Using utility functions directly */}
      {hasMinimumRole(userRole, UserRole.TEAM_LEAD) && (
        <div className="p-4 bg-yellow-100 dark:bg-yellow-500/10 rounded-lg">
          <p>TEAM_LEAD and above can see this (using utility function)</p>
        </div>
      )}

      {/* Example 5: Conditional rendering based on role */}
      {hasRole(userRole, UserRole.DEVELOPER) && (
        <div className="p-4 bg-purple-100 dark:bg-purple-500/10 rounded-lg">
          <p>Only DEVELOPER can see this</p>
        </div>
      )}

      {/* Current user info */}
      <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <p className="font-semibold">Current User:</p>
        <p>Name: {user?.name || 'N/A'}</p>
        <p>Email: {user?.email || 'N/A'}</p>
        <p>Role: {userRole ? roleLabels[userRole as UserRole] || userRole : 'N/A'}</p>
      </div>
    </div>
  )
}

export default RoleBasedExample

