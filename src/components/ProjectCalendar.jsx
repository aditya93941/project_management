'use client'

import { useMemo, useState } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, startOfWeek, endOfWeek, addDays, subDays } from 'date-fns'

const ProjectCalendar = ({ tasks = [] }) => {
    const today = new Date()
    const [currentMonth, setCurrentMonth] = useState(today)

    // Get the calendar view: start from the first day of the week that contains the month start
    // and end at the last day of the week that contains the month end
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    
    // Get the calendar grid: start from Sunday of the week containing month start
    // and end at Saturday of the week containing month end
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // 0 = Sunday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 }) // 0 = Sunday
    
    // Generate all days in the calendar view (including padding days from prev/next month)
    const daysInMonth = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    const tasksByDate = useMemo(() => {
        const grouped = {}
        tasks.forEach(task => {
            if (task.due_date) {
                const dateKey = format(parseISO(task.due_date), 'yyyy-MM-dd')
                if (!grouped[dateKey]) {
                    grouped[dateKey] = []
                }
                grouped[dateKey].push(task)
            }
        })
        return grouped
    }, [tasks])

    const getTasksForDate = (date) => {
        const dateKey = format(date, 'yyyy-MM-dd')
        return tasksByDate[dateKey] || []
    }

    const navigateMonth = (direction) => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev)
            newDate.setMonth(prev.getMonth() + direction)
            return newDate
        })
    }

    return (
        <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
                <Calendar className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-200">Project Calendar</h2>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => navigateMonth(-1)}
                        className="px-3 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm"
                    >
                        ← Previous
                    </button>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-200">
                        {format(currentMonth, 'MMMM yyyy')}
                    </h3>
                    <button
                        onClick={() => navigateMonth(1)}
                        className="px-3 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm"
                    >
                        Next →
                    </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-sm font-medium text-zinc-600 dark:text-zinc-400 py-2">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {daysInMonth.map((day, idx) => {
                        const dayTasks = getTasksForDate(day)
                        const isToday = isSameDay(day, today)
                        const isCurrentMonth = isSameMonth(day, currentMonth)
                        
                        return (
                            <div
                                key={idx}
                                className={`min-h-[80px] p-2 border rounded-lg ${
                                    isToday 
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' 
                                        : 'border-zinc-200 dark:border-zinc-700'
                                } ${
                                    !isCurrentMonth 
                                        ? 'opacity-40' 
                                        : ''
                                }`}
                            >
                                <div className={`text-sm font-medium mb-1 ${
                                    isToday 
                                        ? 'text-blue-600 dark:text-blue-400' 
                                        : 'text-zinc-900 dark:text-zinc-200'
                                }`}>
                                    {format(day, 'd')}
                                </div>
                                <div className="space-y-1">
                                    {dayTasks.slice(0, 2).map(task => {
                                        const statusColor = {
                                            TODO: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300',
                                            IN_PROGRESS: 'bg-amber-200 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
                                            DONE: 'bg-emerald-200 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                        }[task.status] || 'bg-zinc-200 dark:bg-zinc-700'
                                        
                                        return (
                                            <div
                                                key={task.id}
                                                className={`text-xs px-1.5 py-0.5 rounded truncate ${statusColor}`}
                                                title={task.title}
                                            >
                                                {task.title}
                                            </div>
                                        )
                                    })}
                                    {dayTasks.length > 2 && (
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                            +{dayTasks.length - 2} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Task Summary */}
            <div className="mt-6 bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
                <h3 className="text-md font-semibold text-zinc-900 dark:text-zinc-200 mb-4">Upcoming Tasks</h3>
                <div className="space-y-2">
                    {tasks
                        .filter(task => task.due_date && parseISO(task.due_date) >= today)
                        .sort((a, b) => parseISO(a.due_date) - parseISO(b.due_date))
                        .slice(0, 5)
                        .map(task => (
                            <div
                                key={task.id}
                                className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
                            >
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                                        {task.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                        <Clock className="w-3 h-3" />
                                        {format(parseISO(task.due_date), 'MMM d, yyyy')}
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${
                                    task.status === 'DONE' 
                                        ? 'bg-emerald-200 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                        : task.status === 'IN_PROGRESS'
                                        ? 'bg-amber-200 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                                }`}>
                                    {task.status.replace('_', ' ')}
                                </span>
                            </div>
                        ))}
                    {tasks.filter(task => task.due_date && parseISO(task.due_date) >= today).length === 0 && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                            No upcoming tasks
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ProjectCalendar

