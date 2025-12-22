'use client'

import { useState, useEffect } from 'react'
import { X, UserPlus, Users } from 'lucide-react'
import { useList, useCreate, useInvalidate } from '@refinedev/core'
import toast from 'react-hot-toast'

const AddProjectMembersDialog = ({ isOpen, onClose, projectId, existingMembers = [], onMembersAdded }) => {
    const [selectedUsers, setSelectedUsers] = useState([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const invalidateResult = useInvalidate()
    const invalidate = invalidateResult?.invalidate || invalidateResult

    // Get all users
    const { data: usersData } = useList({
        resource: 'users',
        queryOptions: {
            enabled: isOpen,
        },
    })

    const users = usersData?.data || []
    
    // Get existing member IDs (both _id and id formats)
    const existingMemberIds = existingMembers.map(m => 
        m.userId?._id || m.userId?.id || m.userId || m._id || m.id
    ).filter(Boolean)

    // Filter out users who are already members
    const availableUsers = users.filter(user => {
        const userId = user._id || user.id
        return !existingMemberIds.includes(userId)
    })

    const handleUserToggle = (userId) => {
        setSelectedUsers(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId)
            } else {
                return [...prev, userId]
            }
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (selectedUsers.length === 0) {
            toast.error('Please select at least one user to add')
            return
        }

        setIsSubmitting(true)
        toast.loading(`Adding ${selectedUsers.length} member(s)...`)

        const { getApiUrl } = await import('../constants')
        const API_URL = getApiUrl()
        const token = localStorage.getItem('auth_token')

        let successCount = 0
        let failureCount = 0
        const errors = []

        // Add each member one by one
        for (const userId of selectedUsers) {
            try {
                const response = await fetch(`${API_URL}/projects/${projectId}/members`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ userId }),
                })

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    errors.push(errorData.message || `Failed to add user ${userId}`)
                    failureCount++
                } else {
                    successCount++
                }
            } catch (error) {
                errors.push(error.message || `Error adding user ${userId}`)
                failureCount++
            }
        }

        toast.dismissAll()

        if (failureCount === 0) {
            toast.success(`Successfully added ${successCount} member(s)`)
        } else if (successCount > 0) {
            toast.error(`Added ${successCount} member(s), but ${failureCount} failed. ${errors[0]}`)
        } else {
            toast.error(`Failed to add members. ${errors[0] || 'Unknown error'}`)
        }

        // Invalidate project data to refresh
        try {
            if (invalidate && typeof invalidate === 'function') {
                await invalidate({ resource: 'projects', id: projectId })
            }
        } catch (error) {
            console.error('Error invalidating cache:', error)
        }

        setIsSubmitting(false)
        setSelectedUsers([])
        
        // Call the callback if provided
        if (onMembersAdded && typeof onMembersAdded === 'function') {
            onMembersAdded()
        }
        
        onClose()
    }

    const handleClose = () => {
        setSelectedUsers([])
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-2xl text-zinc-900 dark:text-zinc-200 relative max-h-[90vh] overflow-y-auto">
                <button
                    className="absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    onClick={handleClose}
                    disabled={isSubmitting}
                >
                    <X className="size-5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/10">
                        <UserPlus className="w-5 h-5 text-blue-500 dark:text-blue-200" />
                    </div>
                    <h2 className="text-xl font-medium">Add Project Members</h2>
                </div>

                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                    Select users to add as members of this project. They will be able to view and work on project tasks.
                </p>

                {availableUsers.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>All users are already members of this project.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="max-h-96 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                            <div className="space-y-2">
                                {availableUsers.map((user) => {
                                    const userId = user._id || user.id
                                    const isSelected = selectedUsers.includes(userId)
                                    
                                    return (
                                        <label
                                            key={userId}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                isSelected
                                                    ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-700'
                                                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleUserToggle(userId)}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium text-zinc-900 dark:text-zinc-200">
                                                    {user.name || 'Unnamed User'}
                                                </div>
                                                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                                    {user.email} • {user.role || 'DEVELOPER'}
                                                </div>
                                            </div>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>

                        {selectedUsers.length > 0 && (
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                {selectedUsers.length} user(s) selected
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-sm transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || selectedUsers.length === 0}
                                className="px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white dark:text-zinc-200 text-sm hover:opacity-90 transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Adding...' : `Add ${selectedUsers.length || ''} Member(s)`}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

export default AddProjectMembersDialog

