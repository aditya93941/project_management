'use client'

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { useGetIdentity, useCustomMutation } from '@refinedev/core'
import toast from 'react-hot-toast'
import { getApiUrl } from '../constants'

const ProfileSettingsDialog = ({ isOpen, onClose }) => {
    const { data: user, refetch } = useGetIdentity()
    const { mutate: updateProfile } = useCustomMutation()
    const API_URL = getApiUrl()

    const [formData, setFormData] = useState({
        name: user?.name || '',
        password: '',
        confirmPassword: '',
    })
    const [isSaving, setIsSaving] = useState(false)

    // Update form data when user changes or dialog opens
    useEffect(() => {
        if (user && isOpen) {
            setFormData({
                name: user.name || '',
                password: '',
                confirmPassword: '',
            })
        }
    }, [user, isOpen])

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validate password if provided
        if (formData.password) {
            if (formData.password.length < 6) {
                toast.error('Password must be at least 6 characters')
                return
            }
            if (formData.password !== formData.confirmPassword) {
                toast.error('Passwords do not match')
                return
            }
        }

        setIsSaving(true)
        toast.loading('Updating profile...')

        const token = localStorage.getItem('auth_token')
        if (!token) {
            toast.error('Authentication required')
            setIsSaving(false)
            return
        }

        try {
            const updatePayload = {
                name: formData.name,
            }

            // Only include password if provided
            if (formData.password) {
                updatePayload.password = formData.password
            }

            const response = await fetch(`${API_URL}/users/${user.id || user._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updatePayload),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update profile')
            }

            toast.dismissAll()
            toast.success('Profile updated successfully')
            
            // Refetch user data
            refetch()
            
            // Reset form
            setFormData({
                name: data.name || '',
                password: '',
                confirmPassword: '',
            })
            
            onClose()
        } catch (error) {
            toast.dismissAll()
            toast.error(error.message || 'Failed to update profile')
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={onClose}
            />
            
            {/* Dialog */}
            <div className="fixed inset-0 flex items-center justify-center z-50">
                <div 
                    className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-md mx-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Settings</h2>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                New Password (leave blank to keep current)
                            </label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm"
                                placeholder="Enter new password"
                            />
                        </div>

                        {/* Confirm Password */}
                        {formData.password && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm"
                                    placeholder="Confirm new password"
                                />
                            </div>
                        )}

                        {/* Email (read-only) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Email cannot be changed
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 rounded border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300 text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-1 px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white dark:text-zinc-200 text-sm hover:opacity-90 transition flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </>
    )
}

export default ProfileSettingsDialog

