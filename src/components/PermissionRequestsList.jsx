'use client'

import { useState, useEffect } from 'react'
import { Clock, FolderOpen, User, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import { useGetIdentity } from '@refinedev/core'
import toast from 'react-hot-toast'

import { getApiUrl } from '../constants'

const PermissionRequestsList = ({ refreshTrigger, onReview }) => {
  const API_URL = getApiUrl()
  const { data: currentUser } = useGetIdentity()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [showReviewDialog, setShowReviewDialog] = useState(null)

  const fetchRequests = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setIsLoading(false)
        return
      }

      const response = await fetch(`${API_URL}/permission-requests`, {
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

  const handleReview = async (requestId, status) => {
    setReviewingId(requestId)
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        toast.error('Authentication required')
        return
      }

      const response = await fetch(`${API_URL}/permission-requests/${requestId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          reviewNotes: reviewNotes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to review request')
      }

      toast.success(`Request ${status.toLowerCase()} successfully`)
      setShowReviewDialog(null)
      setReviewNotes('')
      fetchRequests()
      if (onReview) onReview()
    } catch (error) {
      toast.error(error.message || 'Failed to review request')
    } finally {
      setReviewingId(null)
    }
  }

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
          <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-green-700 dark:text-yellow-400 rounded flex items-center gap-1">
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
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No permission requests</p>
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
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 opacity-75'
              : request.status === 'REJECTED'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 opacity-75'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {request.requestedBy?.name || 'Unknown User'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {request.requestedBy?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 mb-2">
                <FolderOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Project: <strong>{request.projectId?.name || 'Unknown'}</strong>
                </span>
              </div>

              <div className="flex items-center space-x-3 mb-2">
                <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Duration: <strong>{request.requestedDurationDays} days</strong>
                </span>
              </div>

              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm text-gray-600 dark:text-gray-400">
                <strong>Reason:</strong> {request.reason}
              </div>

              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Requested: {formatDate(request.createdAt)}
              </div>

              {request.reviewedAt && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Reviewed by: {request.reviewedBy?.name || 'Unknown'} on{' '}
                  {formatDate(request.reviewedAt)}
                  {request.reviewNotes && (
                    <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                      <strong>Notes:</strong> {request.reviewNotes}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="ml-4 flex flex-col items-end gap-2">
              {getStatusBadge(request.status)}
              {request.status === 'PENDING' && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setShowReviewDialog(request.id || request._id)}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Review
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Review Dialog */}
      {showReviewDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Review Permission Request
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Review Notes (Optional)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add any notes about your decision..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowReviewDialog(null)
                      setReviewNotes('')
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReview(showReviewDialog, 'REJECTED')}
                    disabled={reviewingId === showReviewDialog}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {reviewingId === showReviewDialog ? 'Rejecting...' : 'Reject'}
                  </button>
                  <button
                    onClick={() => handleReview(showReviewDialog, 'APPROVED')}
                    disabled={reviewingId === showReviewDialog}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                  >
                    {reviewingId === showReviewDialog ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PermissionRequestsList

