// User roles matching backend
export enum UserRole {
  MANAGER = 'MANAGER',           // Superadmin
  GROUP_HEAD = 'GROUP_HEAD',     // Admin
  TEAM_LEAD = 'TEAM_LEAD',       // Team Lead
  DEVELOPER = 'DEVELOPER',       // Developer
}

// Role hierarchy for permission checks
const roleHierarchy: Record<UserRole, number> = {
  [UserRole.MANAGER]: 4,
  [UserRole.GROUP_HEAD]: 3,
  [UserRole.TEAM_LEAD]: 2,
  [UserRole.DEVELOPER]: 1,
}

// Role labels for display
export const roleLabels: Record<UserRole, string> = {
  [UserRole.MANAGER]: 'Manager (Superadmin)',
  [UserRole.GROUP_HEAD]: 'Group Head (Admin)',
  [UserRole.TEAM_LEAD]: 'Team Lead',
  [UserRole.DEVELOPER]: 'Developer',
}

// Check if user has a specific role
export const hasRole = (userRole: string | undefined, requiredRole: UserRole): boolean => {
  if (!userRole) return false
  return userRole === requiredRole
}

// Check if user has minimum role level
export const hasMinimumRole = (userRole: string | undefined, minimumRole: UserRole): boolean => {
  if (!userRole) return false
  const userLevel = roleHierarchy[userRole as UserRole] || 0
  const requiredLevel = roleHierarchy[minimumRole] || 0
  return userLevel >= requiredLevel
}

// Check if user has any of the required roles
export const hasAnyRole = (userRole: string | undefined, ...requiredRoles: UserRole[]): boolean => {
  if (!userRole) return false
  return requiredRoles.some(role => userRole === role)
}

// Get role level for sorting/comparison
export const getRoleLevel = (role: string | undefined): number => {
  if (!role) return 0
  return roleHierarchy[role as UserRole] || 0
}

