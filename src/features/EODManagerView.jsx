'use client'

// Force dynamic rendering - this page uses React Query hooks that require QueryClientProvider
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useGetIdentity, useIsAuthenticated } from '@refinedev/core'
import { CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, Calendar, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { UserRole, hasMinimumRole } from '../utils/roles'
import Link from 'next/link'
import { format } from 'date-fns'

import { getApiUrl } from '../constants'

const EODManagerView = () => {
  const API_URL = getApiUrl()
  const { data: user } = useGetIdentity()
  const { data: authenticated, isLoading: authLoading } = useIsAuthenticated()
  
  const [summaryData, setSummaryData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedReports, setExpandedReports] = useState(new Set())
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  // Check token
  const [hasToken, setHasToken] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token')
      setHasToken(!!token && token.trim() !== '')
    }
  }, [authenticated])

  const canView = hasMinimumRole(user?.role, UserRole.GROUP_HEAD)

  // Fetch EOD summary
  const fetchSummary = async () => {
    if (!canView || !hasToken) return

    setIsLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setIsLoading(false)
        return
      }

      const params = new URLSearchParams()
      if (dateFilter.startDate) params.append('startDate', dateFilter.startDate)
      if (dateFilter.endDate) params.append('endDate', dateFilter.endDate)
      // Add cache busting to ensure fresh data
      params.append('_t', Date.now().toString())

      const response = await fetch(`${API_URL}/eod-reports/summary?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('[EODManagerView] Summary data received:', data)
        setSummaryData(data.data || [])
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to fetch EOD summaries')
      }
    } catch (error) {
      console.error('Error fetching EOD summary:', error)
      toast.error('Failed to fetch EOD summaries')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (canView && hasToken && !authLoading) {
      fetchSummary()
    }
  }, [canView, hasToken, authLoading, dateFilter])

  const toggleExpand = (reportId) => {
    setExpandedReports(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reportId)) {
        newSet.delete(reportId)
      } else {
        newSet.add(reportId)
      }
      return newSet
    })
  }

  if (!user) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!canView) {
    return (
      <div className="p-6 text-center">
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Only Group Heads and Managers can view EOD summaries
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading EOD summaries...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">EOD Reports Summary</h1>
          <p className="text-gray-600 dark:text-gray-400">View team EOD reports with task details</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date:</label>
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
              className="px-3 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date:</label>
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
              className="px-3 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <button
            onClick={fetchSummary}
            className="px-4 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
          >
            Apply Filter
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryData.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No EOD reports found for the selected date range</p>
        </div>
      ) : (
        <div className="space-y-4">
          {summaryData.map((report, idx) => {
            const isExpanded = expandedReports.has(report.reportId)
            const reportDate = new Date(report.reportDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })

            return (
              <div
                key={report.reportId || idx}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden"
              >
                {/* Summary Row */}
                <div className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 dark:text-white">{report.userName}</p>
                              {report.isScheduled && (
                                <span className="px-2 py-0.5 text-xs rounded bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700">
                                  Scheduled
                                </span>
                              )}
                              {report.status === 'SUBMITTED' && !report.isScheduled && (
                                <span className="px-2 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700">
                                  Submitted
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{reportDate}</p>
                            {report.scheduledSubmitAt && (
                              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                Scheduled for: {new Date(report.scheduledSubmitAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      
                      <div className="flex items-center gap-6">
                        {/* Completed */}
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Completed: <span className="text-green-600 dark:text-green-400">{report.completed}</span>
                          </span>
                        </div>

                        {/* In Progress */}
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            In Progress: <span className="text-blue-600 dark:text-blue-400">{report.inProgress}</span>
                          </span>
                        </div>

                        {/* Blockers */}
                        {report.hasBlockers && (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              Blockers: <span className="text-red-600 dark:text-red-400">{report.blockers}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleExpand(report.reportId)}
                      className="p-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Drill-Down View */}
                {isExpanded && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50 dark:bg-zinc-950">
                    {/* Debug Info */}
                    {console.log('[EODManagerView] Expanded report:', {
                      reportId: report.reportId,
                      tasks: report.tasks,
                      blockersText: report.blockersText,
                      planForTomorrow: report.planForTomorrow,
                      notes: report.notes,
                      fullReport: report
                    })}
                    
                    {/* Completed Tasks */}
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Completed Tasks
                      </h3>
                      {report.tasks?.completed && report.tasks.completed.length > 0 ? (
                        <div className="space-y-2">
                          {report.tasks.completed.map((task, taskIdx) => (
                            <Link
                              key={taskIdx}
                              href={`/tasks?taskId=${task.taskId}`}
                              className="block p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                            >
                              <p className="text-sm font-medium text-green-900 dark:text-green-200">
                                {task.title}
                              </p>
                              <p className="text-xs text-green-700 dark:text-green-300">
                                {task.type} • {task.priority} • {task.projectName || 'No Project'}
                              </p>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No completed tasks</p>
                      )}
                    </div>

                    {/* In Progress Tasks */}
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        In Progress Tasks
                      </h3>
                      {report.tasks?.inProgress && report.tasks.inProgress.length > 0 ? (
                        <div className="space-y-2">
                          {report.tasks.inProgress.map((task, taskIdx) => (
                            <Link
                              key={taskIdx}
                              href={`/tasks?taskId=${task.taskId}`}
                              className="block p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                                    {task.title}
                                  </p>
                                  <p className="text-xs text-blue-700 dark:text-blue-300">
                                    {task.type} • {task.priority} • {task.projectName || 'No Project'}
                                  </p>
                                </div>
                                <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                  {task.progress}%
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No in-progress tasks</p>
                      )}
                    </div>

                    {/* Blockers */}
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        Blockers
                      </h3>
                      
                      {/* Blocked Tasks List */}
                      {report.tasks?.blocked && report.tasks.blocked.length > 0 ? (
                          <div className="mb-3 space-y-2">
                            {report.tasks.blocked.map((task, taskIdx) => (
                              <Link
                                key={taskIdx}
                                href={`/tasks?taskId=${task.taskId}`}
                                className="block p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              >
                                <p className="text-sm font-medium text-red-900 dark:text-red-200">
                                  {task.title}
                                </p>
                                <p className="text-xs text-red-700 dark:text-red-300">
                                  {task.type} • {task.priority}
                                  {task.projectName && ` • ${task.projectName}`}
                                </p>
                              </Link>
                            ))}
                          </div>
                      ) : null}
                      
                      {/* Blockers Text */}
                      {report.blockersText ? (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                          <p className="text-sm text-red-900 dark:text-red-200">{report.blockersText}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No blockers reported</p>
                      )}
                    </div>

                    {/* Plan for Tomorrow */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Plan for Tomorrow
                      </h3>
                      {report.planForTomorrow ? (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                          {/* Check if planForTomorrow contains task IDs (comma-separated UUIDs) */}
                          {report.planForTomorrow.match(/^[a-f0-9-]+(,[a-f0-9-]+)*$/i) ? (
                            <div className="space-y-2">
                              <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">Planned Tasks:</p>
                              {report.planForTomorrow.split(',').map((taskId, idx) => {
                                // Try to find task in completed or inProgress tasks
                                const task = [...(report.tasks?.completed || []), ...(report.tasks?.inProgress || [])]
                                  .find(t => t.taskId === taskId.trim())
                                
                                if (task) {
                                  return (
                                    <Link
                                      key={idx}
                                      href={`/tasks?taskId=${taskId.trim()}`}
                                      className="block p-2 bg-blue-100 dark:bg-blue-900/30 rounded border border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
                                    >
                                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                                        {task.title}
                                      </p>
                                      <p className="text-xs text-blue-700 dark:text-blue-300">
                                        {task.type} • {task.priority} • {task.projectName || 'No Project'}
                                      </p>
                                    </Link>
                                  )
                                } else {
                                  // Task ID not found in current tasks, show as ID
                                  return (
                                    <div key={idx} className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded border border-blue-300 dark:border-blue-700">
                                      <p className="text-sm text-blue-900 dark:text-blue-200">
                                        Task ID: {taskId.trim()}
                                      </p>
                                    </div>
                                  )
                                }
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-blue-900 dark:text-blue-200">{report.planForTomorrow}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No plan for tomorrow</p>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Notes</h3>
                      {report.notes ? (
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded border border-gray-200 dark:border-gray-800">
                          <p className="text-sm text-gray-900 dark:text-gray-200">{report.notes}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No notes</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default EODManagerView

