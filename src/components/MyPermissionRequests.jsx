'use client'

import { useState, useEffect } from 'react'
import { Clock, FolderOpen, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

import { getApiUrl } from '../constants'

const MyPermissionRequests = ({ refreshTrigger }) => {
  const API_URL = getApiUrl()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchRequests = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setIsLoading(false)
        return
      }

      const response = await fetch(`${API_URL}/permission-requests/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch requests')
      }

      const data = await response.json()
      setRequests(data.data || [])
    } catch (error) {
      console.error('Error fetching requests:', error)
      toast.error('Failed to load permission requests')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [refreshTrigger])

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
      case 'APPROVED':
        return (
          <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        )
      case 'REJECTED':
        return (
          <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        )
      default:
        return null
    }
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

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-zinc-400">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No permission requests yet</p>
        <p className="text-sm mt-2">Submit a request to get temporary task assignment permission</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div
          key={request.id || request._id}
          className={`p-4 rounded-lg border ${
            request.status === 'APPROVED'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : request.status === 'REJECTED'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <FolderOpen className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {request.projectId?.name || 'Unknown Project'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400">
                    Requested: {formatDate(request.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 mb-2">
                <Clock className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                <span className="text-sm text-gray-700 dark:text-zinc-300">
                  Duration: <strong>{request.requestedDurationDays} days</strong>
                </span>
              </div>

              <div className="mt-2 p-2 bg-gray-50 dark:bg-zinc-800/50 rounded text-sm text-gray-600 dark:text-zinc-400">
                <strong>Reason:</strong> {request.reason}
              </div>

              {request.reviewedAt && (
                <div className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
                  Reviewed by: {request.reviewedBy?.name || 'Unknown'} on{' '}
                  {formatDate(request.reviewedAt)}
                  {request.reviewNotes && (
                    <div className="mt-1 p-2 bg-gray-100 dark:bg-zinc-800 rounded">
                      <strong>Notes:</strong> {request.reviewNotes}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="ml-4">{getStatusBadge(request.status)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default MyPermissionRequests

