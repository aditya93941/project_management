'use client'

import { useState, useEffect } from 'react'
import { useList, useGetIdentity, useIsAuthenticated } from '@refinedev/core'
import { FolderOpen, CheckSquare, Users, TrendingUp } from 'lucide-react'
import { StatsGridSkeleton } from './LoadingSkeleton'

const StatsGrid = () => {
    const { data: authenticated, isLoading: authLoading } = useIsAuthenticated()
    const { data: user } = useGetIdentity()
    const currentUserId = user?._id || user?.id
    
    // Check token directly as fallback
    const [hasToken, setHasToken] = useState(false)
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token')
            setHasToken(!!token && token.trim() !== '')
        }
    }, [authenticated])
    
    // Enable queries if we have a token (don't wait for auth check to complete)
    const shouldFetch = hasToken && !authLoading
    
    // Fetch projects
    const { data: projectsData, isLoading: isLoadingProjects } = useList({
        resource: 'projects',
        queryOptions: {
            enabled: shouldFetch,
        },
    })
    
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
            enabled: shouldFetch && !!currentUserId,
        },
    })
    
    // Fetch all users for team members count
    const { data: usersData, isLoading: isLoadingUsers } = useList({
        resource: 'users',
        pagination: {
            current: 1,
            pageSize: 10000, // Get all users for accurate count
        },
        queryOptions: {
            enabled: shouldFetch,
        },
    })
    
    const projects = projectsData?.data || []
    const tasks = tasksData?.data || []
    const users = usersData?.data || []
    
    const isLoading = isLoadingProjects || isLoadingTasks || isLoadingUsers
    
    // Calculate stats
    const totalProjects = projects.length
    const activeProjects = projects.filter(p => p.status === 'ACTIVE').length
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'DONE').length
    const totalMembers = users.length

    const stats = [
        {
            label: 'Total Projects',
            value: totalProjects,
            icon: FolderOpen,
            color: 'bg-blue-100 dark:bg-blue-500/10 text-blue-500 dark:text-blue-200'
        },
        {
            label: 'Active Projects',
            value: activeProjects,
            icon: TrendingUp,
            color: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-200'
        },
        {
            label: 'My Tasks',
            value: totalTasks,
            icon: CheckSquare,
            color: 'bg-amber-100 dark:bg-amber-500/10 text-amber-500 dark:text-amber-200'
        },
        {
            label: 'Team Members',
            value: totalMembers,
            icon: Users,
            color: 'bg-purple-100 dark:bg-purple-500/10 text-purple-500 dark:text-purple-200'
        }
    ]

    if (isLoading) {
        return <StatsGridSkeleton />
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
            {stats.map((stat, idx) => {
                const Icon = stat.icon
                return (
                    <div
                        key={idx}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                                    {stat.label}
                                </p>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                                    {stat.value}
                                </p>
                            </div>
                            <div className={`p-3 rounded-xl ${stat.color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default StatsGrid

