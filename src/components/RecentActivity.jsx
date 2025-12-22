'use client'

import { useState, useEffect } from 'react'
import { useList, useIsAuthenticated } from '@refinedev/core'
import { format } from 'date-fns'
import { Clock, CheckCircle, UserPlus, MessageSquare } from 'lucide-react'
import Link from 'next/link'

const RecentActivity = () => {
    const { data: authenticated, isLoading: authLoading } = useIsAuthenticated()
    
    // Check token directly as fallback
    const [hasToken, setHasToken] = useState(false)
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token')
            setHasToken(!!token && token.trim() !== '')
        }
    }, [authenticated])
    
    // Enable query if we have a token
    const shouldFetch = hasToken && !authLoading
    
    // Fetch projects to get activity data
    const { data: projectsData } = useList({
        resource: 'projects',
        queryOptions: {
            enabled: shouldFetch,
        },
    })
    
    // Fetch tasks separately since projects list doesn't include them by default
    const { data: tasksData } = useList({
        resource: 'tasks',
        queryOptions: {
            enabled: shouldFetch,
        },
    })
    
    const projects = projectsData?.data || []
    const allTasks = tasksData?.data || []
    
    // Generate recent activity from projects and tasks
    const activities = []
    
    projects.forEach(project => {
        const projectId = project.id || project._id
        
        // Project creation
        if (project.createdAt) {
            activities.push({
                id: `project-${projectId}`,
                type: 'project',
                action: 'created',
                title: `Project "${project.name}" was created`,
                time: project.createdAt,
                icon: CheckCircle,
                color: 'text-blue-500',
                link: `/projects/${projectId}`
            })
        }
        
        // Project updates
        if (project.updatedAt && project.updatedAt !== project.createdAt) {
            activities.push({
                id: `project-update-${projectId}`,
                type: 'project',
                action: 'updated',
                title: `Project "${project.name}" was updated`,
                time: project.updatedAt,
                icon: CheckCircle,
                color: 'text-blue-500',
                link: `/projects/${projectId}`
            })
        }
    })
    
    // Process tasks separately
    allTasks.forEach(task => {
        const taskProjectId = task.projectId || task.project?.id || task.project?._id
        const project = projects.find(p => (p.id || p._id) === taskProjectId)
        const projectName = project?.name || 'Unknown Project'
        
        if (task.createdAt) {
            activities.push({
                id: `task-${task.id || task._id}`,
                type: 'task',
                action: 'created',
                title: `Task "${task.title}" was created in ${projectName}`,
                time: task.createdAt,
                icon: CheckCircle,
                color: 'text-emerald-500',
                link: taskProjectId ? `/projects/${taskProjectId}?tab=tasks` : '#'
            })
        }
        
        if (task.status === 'DONE' && task.updatedAt) {
            activities.push({
                id: `task-done-${task.id || task._id}`,
                type: 'task',
                action: 'completed',
                title: `Task "${task.title}" was completed`,
                time: task.updatedAt,
                icon: CheckCircle,
                color: 'text-emerald-500',
                link: taskProjectId ? `/projects/${taskProjectId}?tab=tasks` : '#'
            })
        }
    })
    
    // Sort by time (most recent first) and take top 5
    const recentActivities = activities
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 5)

    const getActivityIcon = (activity) => {
        switch (activity.type) {
            case 'project':
                return CheckCircle
            case 'task':
                return activity.action === 'completed' ? CheckCircle : Clock
            default:
                return Clock
        }
    }

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 rounded-lg overflow-hidden">
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-4">
                <h2 className="text-md text-zinc-800 dark:text-zinc-300">Recent Activity</h2>
            </div>

            <div className="p-0">
                {recentActivities.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500 rounded-full flex items-center justify-center">
                            <Clock size={32} />
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400">No recent activity</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {recentActivities.map((activity) => {
                            const Icon = getActivityIcon(activity)
                            return (
                                <Link
                                    key={activity.id}
                                    href={activity.link || '#'}
                                    className="block p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${activity.color} bg-opacity-10 dark:bg-opacity-20`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-zinc-800 dark:text-zinc-300">
                                                {activity.title}
                                            </p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                                {format(new Date(activity.time), "MMM d, yyyy 'at' h:mm a")}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default RecentActivity

