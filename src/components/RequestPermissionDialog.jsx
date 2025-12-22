'use client'

import { useState, useEffect } from 'react'
import { X, Clock, FolderOpen, FileText, AlertCircle } from 'lucide-react'
import { useList, useGetIdentity } from '@refinedev/core'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const RequestPermissionDialog = ({ show, setShow, onSuccess }) => {
  const { data: currentUser } = useGetIdentity()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    projectId: '',
    requestedDurationDays: 7,
    reason: '',
  })

  // Fetch projects
  const { data: projectsData } = useList({
    resource: 'projects',
    queryOptions: {
      enabled: show,
    },
  })

  const projects = projectsData?.data || []

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.projectId) {
      toast.error('Please select a project')
      return
    }

    if (!formData.reason.trim() || formData.reason.trim().length < 10) {
      toast.error('Please provide a reason (at least 10 characters)')
      return
    }

    setIsSubmitting(true)

    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        toast.error('Authentication required')
        return
      }

      const response = await fetch(`${API_URL}/permission-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: formData.projectId,
          requestedDurationDays: formData.requestedDurationDays,
          reason: formData.reason.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit request')
      }

      toast.success('Permission request submitted successfully! An Admin will review your request.')
      setFormData({
        projectId: '',
        requestedDurationDays: 7,
        reason: '',
      })
      if (onSuccess) onSuccess()
      setShow(false)
    } catch (error) {
      toast.error(error.message || 'Failed to submit request')
      console.error('Request permission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Request Temporary Task Assignment Permission
          </h2>
          <button
            onClick={() => setShow(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Info Alert */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">What is this?</p>
                <p>
                  Request temporary permission to assign tasks to other developers within a specific project. 
                  This is useful for sprint ownership handovers or temporary coverage. An Admin or Group Lead will review your request.
                </p>
              </div>
            </div>
          </div>

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
              <FolderOpen className="w-4 h-4 inline mr-2" />
              Project
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id || project._id} value={project.id || project._id}>
                  {project.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
              Permission will be restricted to this project only
            </p>
          </div>

          {/* Duration Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              Requested Duration
            </label>
            <select
              value={formData.requestedDurationDays}
              onChange={(e) =>
                setFormData({ ...formData, requestedDurationDays: parseInt(e.target.value) })
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={3}>3 days</option>
              <option value={7}>7 days (1 week)</option>
              <option value={14}>14 days (2 weeks)</option>
              <option value={30}>30 days (1 month)</option>
              <option value={60}>60 days (2 months)</option>
              <option value={90}>90 days (3 months)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
              How long do you need this permission?
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Explain why you need this permission (e.g., sprint ownership handover, temporary coverage during team member absence, etc.)"
              rows={4}
              minLength={10}
              maxLength={1000}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
              {formData.reason.length}/1000 characters (minimum 10 characters)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setShow(false)}
              className="px-4 py-2 text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RequestPermissionDialog

