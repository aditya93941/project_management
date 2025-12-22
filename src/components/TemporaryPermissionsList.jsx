'use client'

import { useState, useEffect } from 'react'
import { Clock, User, FolderOpen, X, Calendar, AlertCircle } from 'lucide-react'
import { useList, useGetIdentity } from '@refinedev/core'
import toast from 'react-hot-toast'

import { getApiUrl } from '../constants'

const TemporaryPermissionsList = ({ refreshTrigger }) => {
  const API_URL = getApiUrl()
  const { data: currentUser } = useGetIdentity()
  const [permissions, setPermissions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [revokingId, setRevokingId] = useState(null)

  const fetchPermissions = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setIsLoading(false)
        return
      }

      const response = await fetch(`${API_URL}/temporary-permissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch permissions')
      }

      const data = await response.json()
      setPermissions(data.data || [])
    } catch (error) {
      console.error('Error fetching permissions:', error)
      toast.error('Failed to load permissions')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPermissions()
  }, [refreshTrigger])

  const handleRevoke = async (permissionId) => {
    if (!confirm('Are you sure you want to revoke this permission?')) {
      return
    }

    setRevokingId(permissionId)
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        toast.error('Authentication required')
        return
      }

      const response = await fetch(`${API_URL}/temporary-permissions/${permissionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to revoke permission')
      }

      toast.success('Permission revoked successfully')
      fetchPermissions()
    } catch (error) {
      toast.error(error.message || 'Failed to revoke permission')
    } finally {
      setRevokingId(null)
    }
  }

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) <= new Date()
  }

  const isExpiringSoon = (expiresAt) => {
    const daysUntilExpiry = Math.ceil(
      (new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24)
    )
    return daysUntilExpiry <= 3 && daysUntilExpiry > 0
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (permissions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No temporary permissions granted yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {permissions.map((permission) => {
        const expired = !permission.isActive || isExpired(permission.expiresAt)
        const expiringSoon = !expired && isExpiringSoon(permission.expiresAt)

        return (
          <div
            key={permission.id || permission._id}
            className={`p-4 rounded-lg border ${
              expired
                ? 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 opacity-60'
                : expiringSoon
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {permission.userId?.name || 'Unknown User'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {permission.userId?.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 mb-2">
                  <FolderOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Project: <strong>{permission.projectId?.name || 'Unknown'}</strong>
                  </span>
                </div>

                <div className="flex items-center space-x-3 mb-2">
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Expires: <strong>{formatDate(permission.expiresAt)}</strong>
                  </span>
                  {expired && (
                    <span className="ml-2 px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                      Expired
                    </span>
                  )}
                  {expiringSoon && !expired && (
                    <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                      Expiring Soon
                    </span>
                  )}
                </div>

                {permission.reason && (
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm text-gray-600 dark:text-gray-400">
                    <strong>Reason:</strong> {permission.reason}
                  </div>
                )}

                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Granted by: {permission.grantedBy?.name || 'Unknown'} on{' '}
                  {formatDate(permission.createdAt)}
                </div>
              </div>

              {!expired && (
                <button
                  onClick={() => handleRevoke(permission.id || permission._id)}
                  disabled={revokingId === (permission.id || permission._id)}
                  className="ml-4 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  title="Revoke permission"
                >
                  {revokingId === (permission.id || permission._id) ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                  ) : (
                    <X className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TemporaryPermissionsList

