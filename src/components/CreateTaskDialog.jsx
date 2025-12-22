'use client'

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { XIcon, Search, ChevronDown } from "lucide-react";
import { useIsAuthenticated, useCreate, useInvalidate, useShow } from '@refinedev/core';
import toast from "react-hot-toast";

const CreateTaskDialog = ({ showCreateTask, setShowCreateTask, projectId, onTaskCreated }) => {
    const { data: authenticated, isLoading: authLoading } = useIsAuthenticated()
    const { mutate: createTask } = useCreate()
    const invalidateResult = useInvalidate()
    // useInvalidate might return an object with invalidate method, or the function directly
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
    const shouldFetch = hasToken && authLoading === false
    
    // Fetch project to get members - only when dialog is open
    // useShow returns data in queryResult property (same as ProjectDetails)
    const showResult = useShow({
        resource: 'projects',
        id: projectId,
        queryOptions: {
            enabled: shouldFetch && showCreateTask && !!projectId,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            staleTime: 60000, // Cache for 1 minute
        },
    })
    
    // Extract data the same way as ProjectDetails does
    const { queryResult } = showResult || {}
    const projectData = queryResult?.data
    // projectData from queryResult is already the normalized data object
    // It should have a 'data' property containing the actual project
    const project = projectData?.data || projectData
    
    // Extract project members - same logic as ProjectSettings
    const projectMembers = useMemo(() => {
        if (!project?.members) return []
        
        // Handle both populated and unpopulated member formats (same as ProjectSettings)
        return project.members.map(member => {
            // Helper to get user info from member object (handles different data structures)
            // Same logic as ProjectSettings.getMemberUser
            let memberUser = null
            if (member.userId) {
                // If userId is populated (object with name, email, etc.)
                if (typeof member.userId === 'object') {
                    memberUser = member.userId
                }
                // If userId is just an ID string, we can't use it without fetching
            } else {
                // Fallback: member might be the user object directly
                memberUser = member
            }
            
            if (!memberUser) return null
            
            // Extract user data (same as ProjectSettings)
            return {
                id: memberUser._id || memberUser.id,
                _id: memberUser._id || memberUser.id,
                name: memberUser.name || 'Unknown User',
                email: memberUser.email || 'No email',
                image: memberUser.image,
            }
        }).filter(Boolean) // Remove nulls
    }, [project?.members])
    
    // Search state for assignee dropdown
    const [assigneeSearchTerm, setAssigneeSearchTerm] = useState('')
    const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
    
    // Filter members based on search
    const filteredMembers = useMemo(() => {
        if (!assigneeSearchTerm.trim()) return projectMembers
        
        const searchLower = assigneeSearchTerm.toLowerCase()
        return projectMembers.filter(member => 
            member.name?.toLowerCase().includes(searchLower) ||
            member.email?.toLowerCase().includes(searchLower)
        )
    }, [projectMembers, assigneeSearchTerm])

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        status: "TODO",
        type: "TASK",
        priority: "MEDIUM",
        assigneeId: "",
        due_date: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (showCreateTask && mounted) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'unset';
            };
        }
    }, [showCreateTask, mounted]);
    
    // Close assignee dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showAssigneeDropdown && !event.target.closest('.assignee-dropdown-container')) {
                setShowAssigneeDropdown(false)
            }
        }
        
        if (showAssigneeDropdown) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showAssigneeDropdown])

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title.trim()) {
            toast.error('Task title is required');
            return;
        }
        
        // Assignee is optional - allow unassigned tasks
        // if (!formData.assigneeId) {
        //     toast.error('Please assign the task to a user');
        //     return;
        // }
        
        if (!formData.due_date) {
            toast.error('Due date is required');
            return;
        }
        
        if (!projectId) {
            toast.error('Project ID is missing');
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            // Prepare task data
            const taskData = {
                title: formData.title.trim(),
                description: formData.description.trim() || undefined,
                status: formData.status,
                type: formData.type,
                priority: formData.priority,
                projectId: projectId,
                due_date: formData.due_date,
            };
            
            // Only include assigneeId if provided (allow unassigned tasks)
            if (formData.assigneeId) {
                taskData.assigneeId = formData.assigneeId;
            }
            
            // Remove undefined fields
            Object.keys(taskData).forEach(key => {
                if (taskData[key] === undefined) {
                    delete taskData[key];
                }
            });
            
            createTask({
                resource: 'tasks',
                values: taskData,
            }, {
                onSuccess: async (data) => {
                    toast.success("Task created successfully");
                    
                    // Normalize task data to ensure it has id/_id
                    const taskData = data?.data || data;
                    const normalizedTask = {
                        ...taskData,
                        id: taskData?.id || taskData?._id,
                        _id: taskData?._id || taskData?.id,
                        projectId: taskData?.projectId || projectId,
                    };
                    
                    // OPTIMISTIC UI: Pass the new task data to parent immediately
                    if (onTaskCreated && typeof onTaskCreated === 'function') {
                        onTaskCreated(normalizedTask);
                    }
                    
                    // Invalidate caches in background (non-blocking)
                    // Note: Cache invalidation is optional - optimistic UI handles immediate updates
                    try {
                        if (invalidateResult && invalidateResult.invalidate && typeof invalidateResult.invalidate === 'function') {
                            invalidateResult.invalidate({ resource: 'tasks' }).catch(() => {});
                            if (projectId) {
                                invalidateResult.invalidate({ resource: 'projects', id: projectId }).catch(() => {});
                            }
                            invalidateResult.invalidate({ resource: 'projects' }).catch(() => {});
                        } else if (invalidate && typeof invalidate === 'function') {
                            invalidate({ resource: 'tasks' }).catch(() => {});
                            if (projectId) {
                                invalidate({ resource: 'projects', id: projectId }).catch(() => {});
                            }
                            invalidate({ resource: 'projects' }).catch(() => {});
                        }
                    } catch (error) {
                        // Silently fail - optimistic UI already handled the update
                        // Error is non-critical, no need to log
                    }
                    
                    setShowCreateTask(false);
                    setFormData({
                        title: "",
                        description: "",
                        status: "TODO",
                        type: "TASK",
                        priority: "MEDIUM",
                        assigneeId: "",
                        due_date: "",
                    });
                    setAssigneeSearchTerm('')
                    setShowAssigneeDropdown(false)
                },
                onError: (error) => {
                    const errorMessage = error?.message || error?.response?.data?.message || 'Failed to create task';
                    toast.error(errorMessage);
                },
            });
        } catch (error) {
            toast.error(error?.message || 'Failed to create task');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get selected member name for display
    const selectedMember = projectMembers.find(m => (m.id || m._id) === formData.assigneeId)

    if (!showCreateTask || !mounted) return null;

    const modalContent = (
        <div 
            className="fixed inset-0 z-[9999] bg-black/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ margin: 0, padding: 0 }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    setShowCreateTask(false);
                }
            }}
        >
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-lg text-zinc-900 dark:text-zinc-200 relative max-h-[90vh] overflow-y-auto">
                <button 
                    className="absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" 
                    onClick={() => setShowCreateTask(false)}
                    aria-label="Close dialog"
                >
                    <XIcon className="size-5" />
                </button>

                <h2 className="text-xl font-medium mb-1">Create New Task</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Task Title */}
                    <div>
                        <label className="block text-sm mb-1">Task Title</label>
                        <input 
                            type="text" 
                            value={formData.title} 
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                            placeholder="Enter task title" 
                            className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" 
                            required 
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm mb-1">Description</label>
                        <textarea 
                            value={formData.description} 
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                            placeholder="Describe the task" 
                            className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm h-20" 
                        />
                    </div>

                    {/* Type & Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1">Type</label>
                            <select 
                                value={formData.type} 
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })} 
                                className="w-full px-3 py-2 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm"
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
                                className="w-full px-3 py-2 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm"
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
                                className="w-full px-3 py-2 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>

                        <div className="assignee-dropdown-container relative">
                            <label className="block text-sm mb-1">Assignee (Optional)</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                                    className="w-full px-3 py-2 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm flex items-center justify-between"
                                >
                                    <span className="truncate">
                                        {selectedMember ? `${selectedMember.name} (${selectedMember.email})` : 'Unassigned'}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showAssigneeDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {showAssigneeDropdown && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg">
                                        {/* Search Input */}
                                        <div className="p-2 border-b border-zinc-200 dark:border-zinc-700">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search members..."
                                                    value={assigneeSearchTerm}
                                                    onChange={(e) => setAssigneeSearchTerm(e.target.value)}
                                                    className="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* Options List - Fixed height with scroll */}
                                        <div className="max-h-48 overflow-y-auto">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, assigneeId: '' })
                                                    setShowAssigneeDropdown(false)
                                                    setAssigneeSearchTerm('')
                                                }}
                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                                                    !formData.assigneeId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                                }`}
                                            >
                                                Unassigned
                                            </button>
                                            
                                            {filteredMembers.length === 0 ? (
                                                <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                                                    {assigneeSearchTerm ? 'No members found' : 'No members in project'}
                                                </div>
                                            ) : (
                                                filteredMembers.map((member) => (
                                                    <button
                                                        key={member.id || member._id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, assigneeId: member.id || member._id })
                                                            setShowAssigneeDropdown(false)
                                                            setAssigneeSearchTerm('')
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                                                            formData.assigneeId === (member.id || member._id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                                        }`}
                                                    >
                                                        <div className="font-medium">{member.name}</div>
                                                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{member.email}</div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Due Date */}
                    <div>
                        <label className="block text-sm mb-1">Due Date</label>
                        <input 
                            type="date" 
                            value={formData.due_date} 
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} 
                            className="w-full px-3 py-2 rounded dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" 
                            required
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2 text-sm">
                        <button 
                            type="button" 
                            onClick={() => setShowCreateTask(false)} 
                            className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </button>
                        <button 
                            disabled={isSubmitting} 
                            className="px-4 py-2 rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white dark:text-zinc-200"
                        >
                            {isSubmitting ? "Creating..." : "Create Task"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default CreateTaskDialog;

