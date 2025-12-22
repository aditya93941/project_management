'use client'

import { useMemo } from 'react'
import { BarChart3, TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react'

const ProjectAnalytics = ({ tasks = [], project }) => {
    const analytics = useMemo(() => {
        const total = tasks.length
        const completed = tasks.filter(t => t.status === 'DONE').length
        const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length
        const todo = tasks.filter(t => t.status === 'TODO').length
        
        const byType = {
            TASK: tasks.filter(t => t.type === 'TASK').length,
            BUG: tasks.filter(t => t.type === 'BUG').length,
            FEATURE: tasks.filter(t => t.type === 'FEATURE').length,
            IMPROVEMENT: tasks.filter(t => t.type === 'IMPROVEMENT').length,
            OTHER: tasks.filter(t => t.type === 'OTHER').length,
        }
        
        const byPriority = {
            LOW: tasks.filter(t => t.priority === 'LOW').length,
            MEDIUM: tasks.filter(t => t.priority === 'MEDIUM').length,
            HIGH: tasks.filter(t => t.priority === 'HIGH').length,
        }
        
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
        
        return {
            total,
            completed,
            inProgress,
            todo,
            byType,
            byPriority,
            completionRate
        }
    }, [tasks])

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-200">Project Analytics</h2>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Tasks</p>
                            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{analytics.total}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/10">
                            <BarChart3 className="w-5 h-5 text-blue-500 dark:text-blue-200" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">Completed</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{analytics.completed}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/10">
                            <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-200" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">In Progress</p>
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{analytics.inProgress}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-500/10">
                            <Clock className="w-5 h-5 text-amber-500 dark:text-amber-200" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">Completion Rate</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analytics.completionRate}%</p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/10">
                            <TrendingUp className="w-5 h-5 text-blue-500 dark:text-blue-200" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tasks by Type */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                    <h3 className="text-md font-semibold text-zinc-900 dark:text-zinc-200 mb-4">Tasks by Type</h3>
                    <div className="space-y-3">
                        {Object.entries(analytics.byType).map(([type, count]) => {
                            const percentage = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0
                            return (
                                <div key={type} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-600 dark:text-zinc-400">{type}</span>
                                        <span className="text-zinc-900 dark:text-zinc-200 font-medium">{count} ({percentage}%)</span>
                                    </div>
                                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded h-2">
                                        <div 
                                            className="bg-blue-500 h-2 rounded" 
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Tasks by Priority */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                    <h3 className="text-md font-semibold text-zinc-900 dark:text-zinc-200 mb-4">Tasks by Priority</h3>
                    <div className="space-y-3">
                        {Object.entries(analytics.byPriority).map(([priority, count]) => {
                            const percentage = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0
                            const colorClass = {
                                LOW: 'bg-red-500',
                                MEDIUM: 'bg-amber-500',
                                HIGH: 'bg-emerald-500'
                            }[priority] || 'bg-blue-500'
                            
                            return (
                                <div key={priority} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-600 dark:text-zinc-400">{priority}</span>
                                        <span className="text-zinc-900 dark:text-zinc-200 font-medium">{count} ({percentage}%)</span>
                                    </div>
                                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded h-2">
                                        <div 
                                            className={`${colorClass} h-2 rounded`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                <h3 className="text-md font-semibold text-zinc-900 dark:text-zinc-200 mb-4">Status Distribution</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                        <p className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">{analytics.todo}</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">To Do</p>
                    </div>
                    <div className="text-center p-4 bg-amber-100 dark:bg-amber-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{analytics.inProgress}</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">In Progress</p>
                    </div>
                    <div className="text-center p-4 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{analytics.completed}</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Completed</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProjectAnalytics

