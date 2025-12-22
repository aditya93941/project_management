import { UserRole } from './roles'

/**
 * Check if user can create tasks based on role
 * Developers with temporary permissions can also create tasks
 */
export function canCreateTaskByRole(userRole: string | undefined): boolean {
  if (!userRole) return false

  // Team Leads, Group Heads, and Managers can always create tasks
  const rolesThatCanCreate = [UserRole.TEAM_LEAD, UserRole.GROUP_HEAD, UserRole.MANAGER]
  return rolesThatCanCreate.includes(userRole as UserRole)
}

/**
 * Check if user has temporary permission for a project
 * This will be checked via API call
 */
export async function hasTemporaryPermission(
  userId: string,
  projectId: string,
  apiUrl: string
): Promise<boolean> {
  try {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      console.log('[hasTemporaryPermission] No token found')
      return false
    }

    console.log('[hasTemporaryPermission] Checking permission for projectId:', projectId)

    const response = await fetch(
      `${apiUrl}/temporary-permissions/my`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      let errorData = null
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }
      console.error('[hasTemporaryPermission] API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        url: `${apiUrl}/temporary-permissions/my`
      })
      return false
    }

    const data = await response.json()
    const permissions = data.data || data || [] // Handle both { data: [...] } and [...] formats

    // Normalize target project ID
    const targetId = String(projectId).trim()

    // Check if there's an active permission for this project
    const now = new Date()

    // Debug log the permissions we found
    console.log('[hasTemporaryPermission] Found permissions:', permissions.map((p: any) => ({
      id: p._id || p.id,
      projectId: p.projectId,
      isActive: p.isActive,
      expiresAt: p.expiresAt
    })))

    const hasPermission = permissions.some((perm: any) => {
      // 1. Check if permission is active and not expired
      const isActive = perm.isActive !== false && perm.isActive !== undefined ? perm.isActive : true
      const expiresAt = perm.expiresAt ? new Date(perm.expiresAt) : null
      const notExpired = expiresAt ? expiresAt > now : true

      if (!isActive || !notExpired) {
        return false
      }

      // 2. Extract Project ID from permission
      let permProjectId: string | null = null

      if (perm.projectId) {
        if (typeof perm.projectId === 'object' && perm.projectId !== null) {
          // Populated object - prefer _id, then id
          // Avoid toString() on generic objects as it returns [object Object]
          permProjectId = perm.projectId._id || perm.projectId.id

          // Fallback: if it's a Mongoose ID object it might work, but for JSON it fails. 
          // Check if it's a string via constructor? No, just rely on _id/id.
          if (!permProjectId && typeof perm.projectId.toString === 'function' && perm.projectId.toString() !== '[object Object]') {
            permProjectId = perm.projectId.toString()
          }
        } else {
          // String
          permProjectId = String(perm.projectId)
        }
      }

      if (!permProjectId) {
        console.warn('[hasTemporaryPermission] Could not extract projectId from permission:', perm)
        return false
      }

      // 3. Compare IDs
      const normalizedPermId = String(permProjectId).trim()

      // Check for match (case-insensitive)
      const isMatch = normalizedPermId.toLowerCase() === targetId.toLowerCase()

      if (isMatch) {
        console.log('[hasTemporaryPermission] Match found!', {
          target: targetId,
          permissionProject: normalizedPermId,
          permissionId: perm._id || perm.id
        })
      }

      return isMatch
    })

    console.log('[hasTemporaryPermission] Final result:', {
      hasPermission,
      targetProjectId: targetId,
      permissionsChecked: permissions.length
    })
    return hasPermission
  } catch (error) {
    console.error('[hasTemporaryPermission] Error checking temporary permission:', error)
    return false
  }
}

