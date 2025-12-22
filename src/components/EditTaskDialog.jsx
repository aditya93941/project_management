'use client'

import { useState, useEffect } from "react";
import { XIcon } from "lucide-react";
import { useList, useIsAuthenticated, useUpdate, useInvalidate, useGetIdentity } from '@refinedev/core';
import toast from "react-hot-toast";
import { hasMinimumRole, UserRole } from '../utils/roles'

const EditTaskDialog = ({ showEditTask, setShowEditTask, task, projectId }) => {
    const { data: authenticated, isLoading: authLoading } = useIsAuthenticated()
    const { mutate: updateTask } = useUpdate()
    const { data: user } = useGetIdentity()
    const invalidateResult = useInvalidate()
    const invalidate = invalidateResult?.invalidate || invalidateResult

    // Check token directly as fallback
    const [hasToken, setHasToken] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token')
            setHasToken(!!token && token.trim() !== '')
        }
    }, [authenticated])

    // Standardized enabled condition
    const shouldFetch = hasToken && !authLoading

    const { data: usersData } = useList({
        resource: 'users',
        queryOptions: {
            enabled: shouldFetch && showEditTask,
        },
    });

    const users = usersData?.data || [];

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        status: "TODO",
        type: "TASK",
        priority: "MEDIUM",
        assigneeId: "",
        due_date: "",
    });

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title,
                description: task.description || "",
                status: task.status,
                type: task.type,
                priority: task.priority,
                assigneeId: (task.assigneeId?.id || task.assigneeId) || "", // Handle populated or ID
                due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : "",
            });
        }
    }, [task]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Permission check
    const isCreator = user?.id === task?.createdById;
    const isAssignee = user?.id === (task?.assigneeId?._id || task?.assigneeId?.id || task?.assigneeId);
    const isSuperAdmin = hasMinimumRole(user?.role, UserRole.MANAGER);
    const isGroupAdmin = hasMinimumRole(user?.role, UserRole.GROUP_HEAD);

    // Super Admin and Group Admin can edit everything. Creator can edit everything. Assignee can ONLY edit status.
    const canEditDetails = isSuperAdmin || isGroupAdmin || isCreator;
    const canEditStatus = isSuperAdmin || isGroupAdmin || isCreator || isAssignee;

    // Debugging (Remove in production)
    // console.log({ isCreator, isAssignee, userId: user?.id, creatorId: task?.createdById, assigneeId: task?.assigneeId });

    const handleSubmit = async (e) => {
        e.preventDefault();

        setIsSubmitting(true);

        try {
            // Prepare update data
            const updateData = {};

            if (canEditDetails) {
                updateData.title = formData.title.trim();
                updateData.description = formData.description.trim() || undefined;
                updateData.type = formData.type;
                updateData.priority = formData.priority;
                updateData.due_date = formData.due_date;
                updateData.assigneeId = formData.assigneeId || null; // Allow unassigning
            }

            // Status is always editable by assignee and creator
            updateData.status = formData.status;

            // Remove undefined fields
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined) {
                    delete updateData[key];
                }
            });

            updateTask({
                resource: 'tasks',
                id: task.id || task._id,
                values: updateData,
            }, {
                onSuccess: (data) => {
                    toast.success("Task updated successfully");

                    try {
                        if (invalidate && typeof invalidate === 'function') {
                            const invalidateTasks = invalidate({ resource: 'tasks' })
                            if (invalidateTasks && typeof invalidateTasks.catch === 'function') {
                                invalidateTasks.catch(console.error)
                            }

                            if (projectId || task.projectId) {
                                const invalidateProject = invalidate({ resource: 'projects', id: projectId || task.projectId })
                                if (invalidateProject && typeof invalidateProject.catch === 'function') {
                                    invalidateProject.catch(console.error)
                                }
                            }

                            // Also invalidate show/detail view
                            const invalidateOne = invalidate({ resource: 'tasks', id: task.id || task._id })
                            if (invalidateOne && typeof invalidateOne.catch === 'function') {
                                invalidateOne.catch(console.error)
                            }
                        }
                    } catch (error) {
                        console.error('Error invalidating cache:', error)
                    }

                    setShowEditTask(false);
                },
                onError: (error) => {
                    console.error('Update task error:', error);
                    toast.error(error?.message || 'Failed to update task');
                },
            });
        } catch (error) {
            console.error('Update task error:', error);
            toast.error(error?.message || 'Failed to update task');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!showEditTask) return null;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center text-left z-50">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-lg text-zinc-900 dark:text-zinc-200 relative">
                <button className="absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => setShowEditTask(false)}>
                    <XIcon className="size-5" />
                </button>

                <h2 className="text-xl font-medium mb-1">Edit Task</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Task Title */}
                    <div>
                        <label className="block text-sm mb-1">Task Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Enter task title"
                            className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            required
                            disabled={!canEditDetails}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe the task"
                            className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm h-20 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!canEditDetails}
                        />
                    </div>

                    {/* Type & Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1">Type</label>
                            <select 
                                value={formData.type} 
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })} 
                                className="w-full px-3 py-2 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!canEditDetails}
                            >
                                <option value="TASK">Task</option>
                                <option value="BUG">Bug</option>
                                <option value="FEATURE">Feature</option>
                                <option value="IMPROVEMENT">Improvement</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!canEditStatus}
                            >
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="DONE">Done</option>
                            </select>
                        </div>
                    </div>

                    {/* Priority & Assignee */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-3 py-2 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!canEditDetails}
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Assignee (Optional)</label>
                            <select
                                value={formData.assigneeId}
                                onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                                className="w-full px-3 py-2 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!canEditDetails}
                            >
                                <option value="">Unassigned</option>
                                {users.map((user) => (
                                    <option key={user.id || user._id} value={user.id || user._id}>
                                        {user.name} ({user.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Due Date */}
                    <div>
                        <label className="block text-sm mb-1">Due Date</label>
                        <input
                            type="date"
                            value={formData.due_date}
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            required
                            disabled={!canEditDetails}
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2 text-sm">
                        <button
                            type="button"
                            onClick={() => setShowEditTask(false)}
                            className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white dark:text-zinc-200"
                        >
                            {isSubmitting ? "Updating..." : "Update Task"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTaskDialog;
