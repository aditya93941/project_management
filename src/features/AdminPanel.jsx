'use client'

// Force dynamic rendering - this page uses React Query hooks that require QueryClientProvider
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useList, useGetIdentity, useIsAuthenticated, useUpdate, useDelete } from '@refinedev/core'
import { UserPlus, Eye, EyeOff, Edit2, Save, X, Clock, Shield, FileText, Trash2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import GrantTemporaryPermissionDialog from '../components/GrantTemporaryPermissionDialog'
import TemporaryPermissionsList from '../components/TemporaryPermissionsList'
import PermissionRequestsList from '../components/PermissionRequestsList'
import UserAvatar from '../components/UserAvatar'
import { logger } from '../utils/logger'
import { getApiUrl } from '../constants'
import { TableSkeleton } from '../components/LoadingSkeleton'

const AdminPanel = () => {
  const API_URL = getApiUrl()
  const { data: user } = useGetIdentity()
  const { data: authenticated, isLoading: authLoading } = useIsAuthenticated()
  const { mutate: updateUser } = useUpdate()
  const { mutate: deleteUser } = useDelete()

  // Check token directly for faster loading (same pattern as Team panel)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token')
      setHasToken(!!token && token.trim() !== '')
    }
  }, [authenticated])

  // Use shouldFetch pattern for immediate loading (like Team panel)
  // Enable fetch if we have token - backend will handle authorization
  const shouldFetch = hasToken && !authLoading

  // Define isSuperAdmin before it's used in useEffect
  const isSuperAdmin = user?.role === 'MANAGER'

  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 50 // Reasonable page size for fast loading

  const { data: usersData, refetch: refetchUsers, isLoading: isLoadingUsers, isError: isUsersError, error: usersError } = useList({
    resource: 'users',
    pagination: {
      current: currentPage,
      pageSize: pageSize,
    },
    queryOptions: {
      enabled: shouldFetch, // Fetch if we have token - backend will check permissions
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000, // Cache for 30 seconds
      onError: (error) => {
        logger.error('[AdminPanel] Error fetching users:', error)
        logger.error('[AdminPanel] Error details:', {
          message: error?.message,
          status: error?.status,
          url: error?.url || 'unknown',
        })
        // Only show toast if it's not a 403 (permission denied - expected for non-managers)
        if (error?.status !== 403) {
          toast.error(`Failed to load users: ${error?.message || 'Unknown error'}`)
        }
      },
    },
  })

  // Debug logging removed - use logger in development if needed

  const users = usersData?.data || []
  const totalUsers = usersData?.total || 0
  const totalPages = Math.ceil(totalUsers / pageSize)


  const [showManualCreateForm, setShowManualCreateForm] = useState(false)
  const [manualCreateForm, setManualCreateForm] = useState({
    email: '',
    password: '',
    name: '',
    role: 'DEVELOPER',
  })
  const [showManualPassword, setShowManualPassword] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [editingRole, setEditingRole] = useState('')
  const [showGrantPermissionDialog, setShowGrantPermissionDialog] = useState(false)
  const [permissionsRefreshTrigger, setPermissionsRefreshTrigger] = useState(0)
  const [requestsRefreshTrigger, setRequestsRefreshTrigger] = useState(0)
  const [userToDelete, setUserToDelete] = useState(null)

  // Check if user can manage temporary permissions (MANAGER or GROUP_HEAD)
  const canManagePermissions = user?.role === 'MANAGER' || user?.role === 'GROUP_HEAD'

  // Debug: Log user role and fetch state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      logger.log('[AdminPanel] User state:', {
        user: user ? { id: user.id || user._id, name: user.name, role: user.role } : null,
        isSuperAdmin,
        hasToken,
        authLoading,
        shouldFetch,
        enabled: shouldFetch && user?.role === 'MANAGER',
      })
    }
  }, [user, isSuperAdmin, hasToken, authLoading, shouldFetch])

  const handleManualCreateUser = async () => {
    if (!manualCreateForm.name.trim() || !manualCreateForm.email.trim() || !manualCreateForm.password) {
      toast.error('Please fill in all required fields')
      return
    }

    if (manualCreateForm.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: manualCreateForm.name.trim(),
          email: manualCreateForm.email.trim().toLowerCase(),
          password: manualCreateForm.password,
          role: manualCreateForm.role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user')
      }

      toast.success('User created successfully!')
      setShowManualCreateForm(false)
      setManualCreateForm({ email: '', password: '', name: '', role: 'DEVELOPER' })
      refetchUsers()
    } catch (error) {
      toast.error(error.message || 'Failed to create user')
    }
  }

  const handleEditRole = (userId, currentRole) => {
    setEditingUserId(userId)
    setEditingRole(currentRole)
  }

  const handleSaveRole = async (userId) => {
    if (!editingRole) {
      toast.error('Please select a role')
      return
    }

    try {
      updateUser({
        resource: 'users',
        id: userId,
        values: { role: editingRole },
      }, {
        onSuccess: () => {
          toast.success('User role updated successfully!')
          setEditingUserId(null)
          setEditingRole('')
          refetchUsers()
        },
        onError: (error) => {
          toast.error(error?.message || 'Failed to update user role')
        },
      })
    } catch (error) {
      toast.error('Failed to update user role')
    }
  }

  const handleDeleteUser = () => {
    if (!userToDelete) return

    deleteUser({
      resource: 'users',
      id: userToDelete._id || userToDelete.id,
    }, {
      onSuccess: () => {
        toast.success('User deleted successfully')
        setUserToDelete(null)
        refetchUsers()
      },
      onError: (error) => {
        toast.error(error?.message || 'Failed to delete user')
      }
    })
  }

  const handleCancelEdit = () => {
    setEditingUserId(null)
    setEditingRole('')
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'MANAGER':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'GROUP_HEAD':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'TEAM_LEAD':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-yellow-300'
      case 'DEVELOPER':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case 'MANAGER':
        return 'Manager (Super Admin)'
      case 'GROUP_HEAD':
        return 'Group Head'
      case 'TEAM_LEAD':
        return 'Team Lead'
      case 'DEVELOPER':
        return 'Developer'
      default:
        return role
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            Access denied. Only super admin can access this page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Admin Panel</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage users and their roles</p>
        </div>
        <button
          onClick={() => {
            setManualCreateForm({ email: '', password: '', name: '', role: 'DEVELOPER' })
            setShowManualCreateForm(true)
          }}
          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-500 transition-colors flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* Users List */}
      <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          All Users {totalUsers > 0 && `(${users.length} of ${totalUsers})`}
        </h2>

        {isLoadingUsers ? (
          <div className="py-8">
            <TableSkeleton rows={5} columns={4} />
          </div>
        ) : isUsersError ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-2">Error loading users</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{usersError?.message || 'Unknown error'}</p>
            <button
              onClick={() => refetchUsers()}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-2">No users found</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {usersData?.total ? `Total in database: ${usersData.total}` : 'Check console for details'}
            </p>
            <button
              onClick={() => refetchUsers()}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Role</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userItem) => (
                  <tr key={userItem._id || userItem.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={userItem} className="w-8 h-8" />
                        <span className="font-medium text-gray-900 dark:text-white">{userItem.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{userItem.email}</td>
                    <td className="py-3 px-4">
                      {editingUserId === (userItem._id || userItem.id) ? (
                        <select
                          value={editingRole}
                          onChange={(e) => setEditingRole(e.target.value)}
                          className="px-2 py-1 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-black text-gray-900 dark:text-white text-sm"
                        >
                          <option value="DEVELOPER">Developer</option>
                          <option value="TEAM_LEAD">Team Lead</option>
                          <option value="GROUP_HEAD">Group Head</option>
                          <option value="MANAGER">Manager (Super Admin)</option>
                        </select>
                      ) : (
                        <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${getRoleBadgeColor(userItem.role)}`}>
                          {getRoleLabel(userItem.role)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {editingUserId === (userItem._id || userItem.id) ? (
                          <>
                            <button
                              onClick={() => handleSaveRole(userItem._id || userItem.id)}
                              className="p-1.5 text-yellow-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                              title="Save"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleEditRole(userItem._id || userItem.id, userItem.role)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title="Edit Role"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {isSuperAdmin && (userItem._id !== user.id && userItem.id !== user.id) && (
                          <button
                            onClick={() => setUserToDelete(userItem)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Temporary Permissions Section */}
      {canManagePermissions && (
        <div className="mt-6 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Temporary Task Assignment Permissions
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Grant developers temporary permission to assign tasks within specific projects
              </p>
            </div>
            <button
              onClick={() => setShowGrantPermissionDialog(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Grant Permission
            </button>
          </div>

          <TemporaryPermissionsList refreshTrigger={permissionsRefreshTrigger} />
        </div>
      )}

      {/* Permission Requests Section */}
      {canManagePermissions && (
        <div className="mt-6 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Permission Requests
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Review and approve/reject developer requests for temporary task assignment permissions
            </p>
          </div>

          <PermissionRequestsList
            refreshTrigger={requestsRefreshTrigger}
            onReview={() => {
              setRequestsRefreshTrigger((prev) => prev + 1)
              setPermissionsRefreshTrigger((prev) => prev + 1)
            }}
          />
        </div>
      )}

      {/* Manual Create User Form Modal */}
      {showManualCreateForm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create User Account
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualCreateForm.name}
                  onChange={(e) => setManualCreateForm({ ...manualCreateForm, name: e.target.value })}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={manualCreateForm.email}
                  onChange={(e) => setManualCreateForm({ ...manualCreateForm, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showManualPassword ? 'text' : 'password'}
                    value={manualCreateForm.password}
                    onChange={(e) => setManualCreateForm({ ...manualCreateForm, password: e.target.value })}
                    placeholder="Enter password (min 6 characters)"
                    className="w-full px-3 py-2 pr-10 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowManualPassword(!showManualPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showManualPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={manualCreateForm.role}
                  onChange={(e) => setManualCreateForm({ ...manualCreateForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white"
                >
                  <option value="DEVELOPER">Developer</option>
                  <option value="TEAM_LEAD">Team Lead</option>
                  <option value="GROUP_HEAD">Group Head</option>
                  <option value="MANAGER">Manager (Super Admin)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowManualCreateForm(false)
                    setManualCreateForm({ email: '', password: '', name: '', role: 'DEVELOPER' })
                  }}
                  className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualCreateUser}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-500 transition-colors"
                >
                  Create User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grant Temporary Permission Dialog */}
      <GrantTemporaryPermissionDialog
        show={showGrantPermissionDialog}
        setShow={setShowGrantPermissionDialog}
        onSuccess={() => {
          setPermissionsRefreshTrigger((prev) => prev + 1)
        }}
      />
      {/* Delete Confirmation Dialog */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-500 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete User?</h3>
            </div>

            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete <strong>{userToDelete.name}</strong>? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel
