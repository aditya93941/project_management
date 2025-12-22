'use client'

import { useState, useEffect } from 'react'
import { useList, useGetIdentity, useIsAuthenticated } from '@refinedev/core'
import { CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { TasksSummarySkeleton } from './LoadingSkeleton'

const TasksSummary = () => {
    const { data: user } = useGetIdentity()
    const { data: authenticated, isLoading: authLoading } = useIsAuthenticated()
    
    // Get current user ID
    const currentUserId = user?._id || user?.id
    
    // Check token directly as fallback
    const [hasToken, setHasToken] = useState(false)
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token')
            setHasToken(!!token && token.trim() !== '')
        }
    }, [authenticated])
    
    // Enable query if we have a token and user ID
    const shouldFetch = hasToken && !authLoading && !!currentUserId
    
    // Fetch tasks assigned to current user
    const { data: tasksData, isLoading: isLoadingTasks } = useList({
        resource: 'tasks',
        filters: currentUserId ? [
            {
                field: 'assigneeId',
                operator: 'eq',
                value: currentUserId,
            },
        ] : [],
        queryOptions: {
            enabled: shouldFetch,
        },
    })
    
    const allTasks = tasksData?.data || []
    
    // Group tasks by status
    const tasksByStatus = {
        TODO: allTasks.filter(t => t.status === 'TODO'),
        IN_PROGRESS: allTasks.filter(t => t.status === 'IN_PROGRESS'),
        DONE: allTasks.filter(t => t.status === 'DONE')
    }
    
    const statusConfig = {
        TODO: {
            label: 'To Do',
            icon: Circle,
            color: 'text-zinc-500 dark:text-zinc-400',
            bgColor: 'bg-zinc-100 dark:bg-zinc-800',
            borderColor: 'border-zinc-200 dark:border-zinc-700'
        },
        IN_PROGRESS: {
            label: 'In Progress',
            icon: Clock,
            color: 'text-amber-500 dark:text-amber-400',
            bgColor: 'bg-amber-100 dark:bg-amber-500/10',
            borderColor: 'border-amber-200 dark:border-amber-700'
        },
        DONE: {
            label: 'Completed',
            icon: CheckCircle,
            color: 'text-emerald-500 dark:text-emerald-400',
            bgColor: 'bg-emerald-100 dark:bg-emerald-500/10',
            borderColor: 'border-emerald-200 dark:border-emerald-700'
        }
    }

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 rounded-lg overflow-hidden">
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-4">
                <h2 className="text-md text-zinc-800 dark:text-zinc-300">My Tasks</h2>
            </div>

            <div className="p-4 space-y-4">
                {isLoadingTasks ? (
                    <TasksSummarySkeleton />
                ) : (
                    <>
                        {Object.entries(statusConfig).map(([status, config]) => {
                    const tasks = tasksByStatus[status] || []
                    const Icon = config.icon
                    
                    return (
                        <Link
                            key={status}
                            href={`/projects?status=${status}`}
                            className={`block p-4 border rounded-lg ${config.borderColor} hover:shadow-md transition-all ${config.bgColor}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Icon className={`w-5 h-5 ${config.color}`} />
                                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-300">
                                        {config.label}
                                    </span>
                                </div>
                                <span className={`text-lg font-bold ${config.color}`}>
                                    {tasks.length}
                                </span>
                            </div>
                            
                            {tasks.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {tasks.slice(0, 3).map((task) => (
                                        <div
                                            key={task.id || task._id}
                                            className="text-xs text-zinc-600 dark:text-zinc-400 truncate"
                                            title={task.title}
                                        >
                                            • {task.title}
                                        </div>
                                    ))}
                                    {tasks.length > 3 && (
                                        <div className="text-xs text-zinc-500 dark:text-zinc-500">
                                            +{tasks.length - 3} more
                                        </div>
                                    )}
                                </div>
                            )}
                        </Link>
                    )
                })}
                
                {allTasks.length === 0 && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500 rounded-full flex items-center justify-center">
                            <AlertCircle size={32} />
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">No tasks yet</p>
                    </div>
                )}
                    </>
                )}
            </div>
        </div>
    )
}

export default TasksSummary

