'use client'

import { useState, useEffect } from 'react'
import { X, Clock, User, FolderOpen, Calendar } from 'lucide-react'
import { useList, useGetIdentity } from '@refinedev/core'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const GrantTemporaryPermissionDialog = ({ show, setShow, onSuccess }) => {
  const { data: currentUser } = useGetIdentity()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    userId: '',
    projectId: '',
    durationDays: 7,
    useCustomDate: false,
    customExpiryDate: '',
    reason: '',
  })

  // Fetch developers only
  const { data: usersData } = useList({
    resource: 'users',
    queryOptions: {
      enabled: show,
    },
  })

  // Fetch projects
  const { data: projectsData } = useList({
    resource: 'projects',
    queryOptions: {
      enabled: show,
    },
  })

  const developers = (usersData?.data || []).filter(
    (user) => user.role === 'DEVELOPER'
  )
  const projects = projectsData?.data || []

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.userId) {
      toast.error('Please select a developer')
      return
    }

    if (!formData.projectId) {
      toast.error('Please select a project')
      return
    }

    if (formData.useCustomDate && !formData.customExpiryDate) {
      toast.error('Please select an expiry date')
      return
    }

    setIsSubmitting(true)

    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        toast.error('Authentication required')
        return
      }

      const payload = {
        userId: formData.userId,
        projectId: formData.projectId,
        reason: formData.reason || undefined,
      }

      if (formData.useCustomDate) {
        payload.customExpiryDate = formData.customExpiryDate
      } else {
        payload.durationDays = formData.durationDays
      }

      const response = await fetch(`${API_URL}/temporary-permissions/grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to grant permission')
      }

      toast.success('Temporary permission granted successfully!')
      setFormData({
        userId: '',
        projectId: '',
        durationDays: 7,
        useCustomDate: false,
        customExpiryDate: '',
        reason: '',
      })
      if (onSuccess) onSuccess()
      setShow(false)
    } catch (error) {
      toast.error(error.message || 'Failed to grant permission')
      console.error('Grant permission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!show) return null

  // Calculate expiry date preview
  const getExpiryPreview = () => {
    if (formData.useCustomDate && formData.customExpiryDate) {
      return new Date(formData.customExpiryDate).toLocaleDateString()
    }
    if (!formData.useCustomDate) {
      const expiry = new Date()
      expiry.setDate(expiry.getDate() + formData.durationDays)
      return expiry.toLocaleDateString()
    }
    return 'N/A'
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Grant Temporary Task Assignment Permission
          </h2>
          <button
            onClick={() => setShow(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Developer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Developer
            </label>
            <select
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a developer</option>
              {developers.map((dev) => (
                <option key={dev.id || dev._id} value={dev.id || dev._id}>
                  {dev.name} ({dev.email})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Only developers can receive temporary assignment permissions
            </p>
          </div>

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FolderOpen className="w-4 h-4 inline mr-2" />
              Project
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id || project._id} value={project.id || project._id}>
                  {project.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Permission is restricted to this project only
            </p>
          </div>

          {/* Duration Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              Duration
            </label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="duration-preset"
                  name="durationType"
                  checked={!formData.useCustomDate}
                  onChange={() => setFormData({ ...formData, useCustomDate: false })}
                  className="w-4 h-4 text-red-600"
                />
                <label htmlFor="duration-preset" className="text-sm text-gray-700 dark:text-gray-300">
                  Preset Duration
                </label>
              </div>

              {!formData.useCustomDate && (
                <div className="ml-6">
                  <select
                    value={formData.durationDays}
                    onChange={(e) =>
                      setFormData({ ...formData, durationDays: parseInt(e.target.value) })
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
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="duration-custom"
                  name="durationType"
                  checked={formData.useCustomDate}
                  onChange={() => setFormData({ ...formData, useCustomDate: true })}
                  className="w-4 h-4 text-red-600"
                />
                <label htmlFor="duration-custom" className="text-sm text-gray-700 dark:text-gray-300">
                  Custom Date
                </label>
              </div>

              {formData.useCustomDate && (
                <div className="ml-6">
                  <input
                    type="date"
                    value={formData.customExpiryDate}
                    onChange={(e) =>
                      setFormData({ ...formData, customExpiryDate: e.target.value })
                    }
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required={formData.useCustomDate}
                  />
                </div>
              )}
            </div>

            {/* Expiry Preview */}
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Expires on:</strong>{' '}
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {getExpiryPreview()}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Reason (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason (Optional)
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g., Sprint ownership handover, temporary coverage..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formData.reason.length}/500 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShow(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Granting...' : 'Grant Permission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GrantTemporaryPermissionDialog

