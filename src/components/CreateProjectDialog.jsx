'use client'

import { useState, useEffect } from "react";
import { XIcon } from "lucide-react";
import { useList, useCreate, useIsAuthenticated, useInvalidate } from '@refinedev/core';
import toast from "react-hot-toast";

const CreateProjectDialog = ({ isDialogOpen, setIsDialogOpen }) => {
    const { data: authenticated, isLoading: authLoading } = useIsAuthenticated()
    const { mutate: createProject } = useCreate()
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
            enabled: shouldFetch && isDialogOpen,
        },
    });

    const users = usersData?.data || [];

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "PLANNING",
        priority: "MEDIUM",
        start_date: "",
        end_date: "",
        team_members: [],
        team_lead: "",
        progress: 0,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Project name is required');
            return;
        }

        if (!formData.team_lead) {
            toast.error('Project lead is required');
            return;
        }

        setIsSubmitting(true);

        try {
            // Prepare project data for API (matching backend schema)
            const projectData = {
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                status: formData.status,
                priority: formData.priority,
                start_date: formData.start_date || new Date().toISOString().split('T')[0],
                end_date: formData.end_date || undefined,
                team_lead: formData.team_lead,
                progress: formData.progress || 0,
            };

            // Remove undefined and empty string fields
            Object.keys(projectData).forEach(key => {
                if (projectData[key] === undefined || projectData[key] === '') {
                    delete projectData[key];
                }
            });

            createProject({
                resource: 'projects',
                values: projectData,
            }, {
                onSuccess: async (data) => {
                    const projectId = data?.data?._id || data?.data?.id || data?._id;

                    if (!projectId) {
                        toast.error('Project created but ID not found');
                        return;
                    }

                    // Add team members if any (exclude team_lead as they're already assigned)
                    const membersToAdd = formData.team_members.filter(memberId => memberId !== formData.team_lead);

                    if (membersToAdd.length > 0) {
                        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
                        const token = localStorage.getItem('auth_token');

                        // Add each member one by one to handle errors better
                        const memberResults = []
                        let successCount = 0;
                        let failureCount = 0;

                        for (const memberId of membersToAdd) {
                            try {
                                const response = await fetch(`${API_URL}/projects/${projectId}/members`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ userId: memberId }),
                                });

                                if (!response.ok) {
                                    const errorData = await response.json().catch(() => ({}));
                                    console.error(`Failed to add member ${memberId}:`, errorData);
                                    memberResults.push({ memberId, success: false, error: errorData.message || 'Failed to add member' });
                                    failureCount++;
                                } else {
                                    memberResults.push({ memberId, success: true });
                                    successCount++;
                                }
                            } catch (error) {
                                console.error(`Error adding member ${memberId}:`, error);
                                memberResults.push({ memberId, success: false, error: error.message });
                                failureCount++;
                            }
                        }

                        // Show appropriate message based on results
                        if (failureCount > 0 && successCount > 0) {
                            toast.error(`Project created. ${successCount} member(s) added, but ${failureCount} member(s) failed.`);
                        } else if (failureCount > 0) {
                            toast.error(`Project created but ${failureCount} member(s) couldn't be added. You can add them manually later.`);
                        } else if (successCount > 0) {
                            toast.success(`Project created with ${successCount} team member(s)!`);
                        } else {
                            toast.success('Project created successfully!');
                        }
                    } else {
                        toast.success('Project created successfully!');
                    }

                    // Invalidate projects list to refresh data
                    // Invalidate projects list to refresh data
                    try {
                        if (invalidate && typeof invalidate === 'function') {
                            const res = invalidate({ resource: 'projects' })
                            if (res && typeof res.catch === 'function') {
                                res.catch(console.error)
                            }
                        }
                    } catch (err) {
                        console.error('Invalidation error:', err)
                    }

                    setIsDialogOpen(false);
                    // Reset form
                    setFormData({
                        name: "",
                        description: "",
                        status: "PLANNING",
                        priority: "MEDIUM",
                        start_date: "",
                        end_date: "",
                        team_members: [],
                        team_lead: "",
                        progress: 0,
                    });
                },
                onError: (error) => {
                    console.error('Create project error:', error);
                    const errorMessage = error?.message || error?.response?.data?.message || 'Failed to create project';
                    toast.error(errorMessage);
                },
            });
        } catch (error) {
            console.error('Create project error:', error);
            toast.error(error?.message || 'Failed to create project');
        } finally {
            setIsSubmitting(false);
        }
    };

    const removeTeamMember = (userId) => {
        setFormData((prev) => ({ ...prev, team_members: prev.team_members.filter(m => m !== userId) }));
    };

    if (!isDialogOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center text-left z-50">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-lg text-zinc-900 dark:text-zinc-200 relative">
                <button className="absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => setIsDialogOpen(false)} >
                    <XIcon className="size-5" />
                </button>

                <h2 className="text-xl font-medium mb-1">Create New Project</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Project Name */}
                    <div>
                        <label className="block text-sm mb-1">Project Name</label>
                        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter project name" className="w-full px-3 py-2 rounded dark:bg-black border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" required />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm mb-1">Description</label>
                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe your project" className="w-full px-3 py-2 rounded dark:bg-black border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm h-20" />
                    </div>

                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1">Status</label>
                            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 rounded dark:bg-black border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" >
                                <option value="PLANNING">Planning</option>
                                <option value="ACTIVE">Active</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="ON_HOLD">On Hold</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm mb-1">Priority</label>
                            <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-3 py-2 rounded dark:bg-black border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm mb-1">Start Date</label>
                            <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-3 py-2 rounded dark:bg-black border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">End Date</label>
                            <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} min={formData.start_date && new Date(formData.start_date).toISOString().split('T')[0]} className="w-full px-3 py-2 rounded dark:bg-black border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" />
                        </div>
                    </div>

                    {/* Lead */}
                    <div>
                        <label className="block text-sm mb-1">Project Lead</label>
                        <select value={formData.team_lead} onChange={(e) => setFormData({ ...formData, team_lead: e.target.value, team_members: e.target.value ? [...new Set([...formData.team_members, e.target.value])] : formData.team_members, })} className="w-full px-3 py-2 rounded dark:bg-black border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm" >
                            <option value="">No lead</option>
                            {users
                                .filter((user) => user.role === 'TEAM_LEAD' || user.role === 'GROUP_HEAD' || user.role === 'MANAGER')
                                .map((user) => (
                                    <option key={user._id || user.id} value={user._id || user.id}>
                                        {user.name} ({user.email}) - {user.role === 'MANAGER' ? 'Manager' : user.role === 'GROUP_HEAD' ? 'Group Head' : 'Team Lead'}
                                    </option>
                                ))}
                        </select>
                    </div>

                    {/* Team Members */}
                    <div>
                        <label className="block text-sm mb-1">Team Members</label>
                        <select className="w-full px-3 py-2 rounded bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 mt-1 text-zinc-900 dark:text-zinc-200 text-sm"
                            onChange={(e) => {
                                if (e.target.value && !formData.team_members.includes(e.target.value)) {
                                    setFormData((prev) => ({ ...prev, team_members: [...prev.team_members, e.target.value] }));
                                }
                            }}
                        >
                            <option value="">Add team members</option>
                            {users
                                .filter((user) => !formData.team_members.includes(user._id || user.id))
                                .map((user) => (
                                    <option key={user._id || user.id} value={user._id || user.id}>
                                        {user.name} ({user.email})
                                    </option>
                                ))}
                        </select>

                        {formData.team_members.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.team_members.map((userId) => {
                                    const user = users.find(u => (u._id || u.id) === userId);
                                    return (
                                        <div key={userId} className="flex items-center gap-1 bg-blue-200/50 dark:bg-red-500/20 text-blue-700 dark:text-red-400 px-2 py-1 rounded-md text-sm" >
                                            {user?.name || user?.email || userId}
                                            <button type="button" onClick={() => removeTeamMember(userId)} className="ml-1 hover:bg-blue-300/30 dark:hover:bg-red-500/30 rounded" >
                                                <XIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2 text-sm">
                        <button type="button" onClick={() => setIsDialogOpen(false)} className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-900" >
                            Cancel
                        </button>
                        <button disabled={isSubmitting} className="px-4 py-2 rounded bg-gradient-to-br from-red-500 to-red-600 text-white dark:text-zinc-200" >
                            {isSubmitting ? "Creating..." : "Create Project"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProjectDialog;