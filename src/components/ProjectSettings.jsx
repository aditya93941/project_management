'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, X, Trash2, UserPlus, Users } from 'lucide-react'
import { useUpdate, useInvalidate, useDelete, useGetIdentity } from '@refinedev/core'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import DeleteConfirmationDialog from './DeleteConfirmationDialog'
import AddProjectMembersDialog from './AddProjectMembersDialog'
import { hasMinimumRole, UserRole } from '../utils/roles'

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
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Manage project members and their access to project tasks.
                    </p>
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

            {/* Add Members Dialog */}
            <AddProjectMembersDialog
                isOpen={showAddMembersDialog}
                onClose={() => setShowAddMembersDialog(false)}
                projectId={project?.id || project?._id}
                existingMembers={project?.members || []}
            />
        </div>
    )
}

export default ProjectSettings

