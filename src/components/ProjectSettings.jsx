'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, X, Trash2, UserPlus, Users, UserMinus } from 'lucide-react'
import { useUpdate, useInvalidate, useDelete, useGetIdentity } from '@refinedev/core'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import DeleteConfirmationDialog from './DeleteConfirmationDialog'
import AddProjectMembersDialog from './AddProjectMembersDialog'
import UserAvatar from './UserAvatar'
import { hasMinimumRole, UserRole } from '../utils/roles'
import { getApiUrl } from '../constants'

const ProjectSettings = ({ project }) => {
    const router = useRouter()
    const { data: user } = useGetIdentity()
    const { mutate: updateProject } = useUpdate()
    const { mutate: deleteProject } = useDelete()
    const invalidateResult = useInvalidate()
    // useInvalidate might return an object with invalidate method, or the function directly
    const invalidate = invalidateResult?.invalidate || invalidateResult
    
    // Permission checks
    const canDeleteProject = hasMinimumRole(user?.role, UserRole.GROUP_HEAD)
    const canAddMembers = hasMinimumRole(user?.role, UserRole.TEAM_LEAD)
    
    // Dialog states
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showAddMembersDialog, setShowAddMembersDialog] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [removingMemberId, setRemovingMemberId] = useState(null)
    const [memberToRemove, setMemberToRemove] = useState(null)
    // Initialize form data from project prop
    const getInitialFormData = (proj) => ({
        name: proj?.name || '',
        description: proj?.description || '',
        status: proj?.status || 'ACTIVE',
        priority: proj?.priority || 'MEDIUM',
        start_date: proj?.start_date ? new Date(proj.start_date).toISOString().split('T')[0] : '',
        end_date: proj?.end_date ? new Date(proj.end_date).toISOString().split('T')[0] : '',
        // Progress is auto-calculated from tasks, removed from form
    })

    const [formData, setFormData] = useState(() => getInitialFormData(project))

    // Update form data when project prop changes
    useEffect(() => {
        if (project) {
            setFormData(getInitialFormData(project))
        }
    }, [project?.id, project?.name, project?.description, project?.status, project?.priority, project?.start_date, project?.end_date])

    const [isSaving, setIsSaving] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!project?.id && !project?._id) {
            toast.error('Project ID is missing')
            return
        }

        const projectId = project.id || project._id
        
        // Prepare update data - only include fields that have changed
        const updateData = {
            name: formData.name,
            description: formData.description || undefined,
            status: formData.status,
            priority: formData.priority,
            // Progress is auto-calculated from tasks, so we don't include it here
        }

        // Add dates if provided
        if (formData.start_date) {
            updateData.start_date = new Date(formData.start_date)
        }
        if (formData.end_date) {
            updateData.end_date = new Date(formData.end_date)
        }

        // Remove undefined fields
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key]
            }
        })

        setIsSaving(true)
        toast.loading('Saving settings...')

        updateProject(
            {
                resource: 'projects',
                id: projectId,
                values: updateData,
            },
            {
                onSuccess: (data) => {
                    toast.dismissAll()
                    toast.success('Project settings updated successfully')
                    
                    // Invalidate project data to refresh
                    try {
                        if (invalidate && typeof invalidate === 'function') {
                            invalidate({ resource: 'projects', id: projectId }).catch(err => {
                                console.error('Error invalidating project cache:', err)
                            })
                        }
                    } catch (error) {
                        console.error('Error invalidating cache:', error)
                    }
                    setIsSaving(false)
                },
                onError: (error) => {
                    toast.dismissAll()
                    const errorMessage = error?.message || error?.response?.data?.message || 'Failed to update project settings'
                    toast.error(errorMessage)
                    console.error('Update project error:', error)
                    setIsSaving(false)
                },
            }
        )
    }

    const handleDeleteProject = () => {
        if (!project?.id && !project?._id) {
            toast.error('Project ID is missing')
            return
        }

        const projectId = project.id || project._id
        setIsDeleting(true)
        toast.loading('Deleting project...')

        deleteProject(
            {
                resource: 'projects',
                id: projectId,
            },
            {
                onSuccess: () => {
                    toast.dismissAll()
                    toast.success('Project deleted successfully')
                    
                    // Invalidate projects list
                    try {
                        if (invalidate && typeof invalidate === 'function') {
                            invalidate({ resource: 'projects' }).catch(err => {
                                console.error('Error invalidating projects cache:', err)
                            })
                        }
                    } catch (error) {
                        console.error('Error invalidating cache:', error)
                    }
                    
                    setIsDeleting(false)
                    setShowDeleteDialog(false)
                    
                    // Redirect to projects page
                    router.push('/projects')
                },
                onError: (error) => {
                    toast.dismissAll()
                    const errorMessage = error?.message || error?.response?.data?.message || 'Failed to delete project'
                    toast.error(errorMessage)
                    console.error('Delete project error:', error)
                    setIsDeleting(false)
                },
            }
        )
    }

    const handleRemoveMemberClick = (memberUserId, memberName) => {
        setMemberToRemove({ userId: memberUserId, name: memberName })
    }

    const handleRemoveMemberConfirm = async () => {
        if (!memberToRemove || !project?.id && !project?._id) {
            toast.error('Project ID or member ID is missing')
            setMemberToRemove(null)
            return
        }

        const projectId = project.id || project._id
        const memberUserId = memberToRemove.userId
        setRemovingMemberId(memberUserId)
        setMemberToRemove(null)
        toast.loading('Removing member...')

        try {
            const API_URL = getApiUrl()
            const token = localStorage.getItem('auth_token')

            const response = await fetch(`${API_URL}/projects/${projectId}/members/${memberUserId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Failed to remove member')
            }

            toast.dismissAll()
            toast.success('Member removed successfully')

            // Invalidate project data to refresh
            try {
                if (invalidate && typeof invalidate === 'function') {
                    await invalidate({ resource: 'projects', id: projectId })
                }
            } catch (error) {
                console.error('Error invalidating cache:', error)
            }
        } catch (error) {
            toast.dismissAll()
            toast.error(error.message || 'Failed to remove member')
            console.error('Remove member error:', error)
        } finally {
            setRemovingMemberId(null)
        }
    }

    const handleMembersAdded = () => {
        // Refresh project data after members are added
        const projectId = project?.id || project?._id
        if (projectId && invalidate && typeof invalidate === 'function') {
            invalidate({ resource: 'projects', id: projectId }).catch(err => {
                console.error('Error invalidating project cache:', err)
            })
        }
    }

    // Get members list - handle both populated and unpopulated formats
    const members = project?.members || []
    
    // Role labels for display
    const roleLabels = {
        'MANAGER': 'Manager',
        'GROUP_HEAD': 'Group Head',
        'TEAM_LEAD': 'Team Lead',
        'DEVELOPER': 'Developer'
    }
    
    // Helper to get user info from member object (handles different data structures)
    const getMemberUser = (member) => {
        if (member.userId) {
            // If userId is populated (object with name, email, etc.)
            if (typeof member.userId === 'object') {
                return member.userId
            }
            // If userId is just an ID string, we need to fetch it
            // But for now, we'll just return null and show the ID
            return null
        }
        // Fallback: member might be the user object directly
        return member
    }
    

    return (
        <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
                <Settings className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-200">Project Settings</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-4">
                    {/* Project Name */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Project Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-sm"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-sm h-24"
                            rows={4}
                        />
                    </div>

                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Status
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-sm"
                            >
                                <option value="PLANNING">Planning</option>
                                <option value="ACTIVE">Active</option>
                                <option value="ON_HOLD">On Hold</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Priority
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-sm"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                min={formData.start_date}
                                className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-sm"
                            />
                        </div>
                    </div>

                    {/* Progress slider removed - progress is auto-calculated from tasks */}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => setFormData(getInitialFormData(project))}
                        className="flex items-center gap-2 px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-sm"
                    >
                        <X className="w-4 h-4" />
                        Reset
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white dark:text-zinc-200 text-sm hover:opacity-90 transition"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>

            {/* Add Members Section */}
            {canAddMembers && (
                <div className="mt-8 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-200">Project Members</h3>
                            {members.length > 0 && (
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                    ({members.length} {members.length === 1 ? 'member' : 'members'})
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowAddMembersDialog(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white dark:text-zinc-200 text-sm hover:opacity-90 transition"
                        >
                            <UserPlus className="w-4 h-4" />
                            Add Members
                        </button>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                        Manage project members and their access to project tasks.
                    </p>

                    {/* Members List */}
                    {members.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">No members added yet. Click "Add Members" to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {members.map((member) => {
                                const memberUser = getMemberUser(member)
                                const userId = memberUser?._id || memberUser?.id || member.userId?._id || member.userId?.id || member.userId
                                const userName = memberUser?.name || 'Unknown User'
                                const userEmail = memberUser?.email || 'No email'
                                const userRole = memberUser?.role || 'DEVELOPER'
                                const userImage = memberUser?.image

                                return (
                                    <div
                                        key={member._id || member.id || userId}
                                        className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {/* Avatar */}
                                            <UserAvatar user={memberUser} className="w-10 h-10" />
                                            
                                            {/* User Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-zinc-900 dark:text-zinc-200 truncate">
                                                    {userName}
                                                </div>
                                                <div className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                                                    {userEmail} • {roleLabels[userRole] || userRole}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Remove Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMemberClick(userId, userName)}
                                            disabled={removingMemberId === userId}
                                            className="ml-3 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Remove member"
                                        >
                                            <UserMinus className="w-4 h-4" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Delete Project Section */}
            {canDeleteProject && (
                <div className="mt-8 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-red-900 dark:text-red-200 mb-1">Danger Zone</h3>
                            <p className="text-sm text-red-700 dark:text-red-400">
                                Once you delete a project, there is no going back. This will permanently delete the project and all associated tasks.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowDeleteDialog(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700 transition"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Project
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmationDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDeleteProject}
                title="Delete Project"
                message={`Are you sure you want to delete "${project?.name}"? This action cannot be undone. All tasks and data associated with this project will be permanently deleted.`}
                confirmText="Delete Project"
                cancelText="Cancel"
                isLoading={isDeleting}
            />

            {/* Remove Member Confirmation Dialog */}
            <DeleteConfirmationDialog
                isOpen={!!memberToRemove}
                onClose={() => setMemberToRemove(null)}
                onConfirm={handleRemoveMemberConfirm}
                title="Remove Team Member"
                message={`Are you sure you want to remove "${memberToRemove?.name}" from this project? They will lose access to all project tasks.`}
                confirmText="Remove Member"
                cancelText="Cancel"
                isLoading={!!removingMemberId}
            />

            {/* Add Members Dialog */}
            <AddProjectMembersDialog
                isOpen={showAddMembersDialog}
                onClose={() => setShowAddMembersDialog(false)}
                projectId={project?.id || project?._id}
                existingMembers={project?.members || []}
                onMembersAdded={handleMembersAdded}
            />
        </div>
    )
}

export default ProjectSettings

