'use client'

// Force dynamic rendering - this page uses React Query hooks that require QueryClientProvider
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useGetIdentity } from '@refinedev/core'
import { TrendingUp, CheckCircle, Clock, AlertCircle, BarChart3 } from 'lucide-react'
import { UserRole, hasMinimumRole } from '../utils/roles'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const EODSummaries = () => {
  const { data: user } = useGetIdentity()
  const [activeTab, setActiveTab] = useState('weekly')
  const [weeklySummaries, setWeeklySummaries] = useState([])
  const [monthlySummaries, setMonthlySummaries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState(null)

  const canViewSummaries = hasMinimumRole(user?.role, UserRole.GROUP_HEAD)

  useEffect(() => {
    if (!canViewSummaries) {
      setIsLoading(false)
      return
    }

    const fetchSummaries = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        if (activeTab === 'weekly') {
          const response = await fetch(
            `${API_URL}/weekly-summaries${selectedUserId ? `?userId=${selectedUserId}` : ''}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
          if (response.ok) {
            const data = await response.json()
            setWeeklySummaries(data.data || [])
          }
        } else {
          const response = await fetch(
            `${API_URL}/monthly-summaries${selectedUserId ? `?userId=${selectedUserId}` : ''}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
          if (response.ok) {
            const data = await response.json()
            setMonthlySummaries(data.data || [])
          }
        }
      } catch (error) {
        console.error('Error fetching summaries:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSummaries()
  }, [activeTab, selectedUserId, canViewSummaries, user])

  if (!user) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!canViewSummaries) {
    return (
      <div className="p-6 text-center">
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Only Group Heads and Managers can view summaries
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Performance Summaries
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View weekly and monthly performance summaries
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'weekly'
              ? 'border-b-2 border-blue-600 text-red-600 dark:text-red-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Weekly Summaries
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'monthly'
              ? 'border-b-2 border-blue-600 text-red-600 dark:text-red-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Monthly Summaries
        </button>
      </div>

      {/* Content */}
      {activeTab === 'weekly' ? (
        <div className="space-y-4">
          {weeklySummaries.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No weekly summaries available yet</p>
            </div>
          ) : (
            weeklySummaries.map((summary) => (
              <div
                key={summary._id}
                className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {summary.userId?.name || 'Unknown User'} - Week {summary.weekNumber}, {summary.year}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(summary.weekStartDate).toLocaleDateString()} -{' '}
                      {new Date(summary.weekEndDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {summary.tasksCompleted}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Tasks Completed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {summary.tasksInProgress}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {summary.blockers}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Blockers</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {monthlySummaries.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No monthly summaries available yet</p>
            </div>
          ) : (
            monthlySummaries.map((summary) => (
              <div
                key={summary._id}
                className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {summary.userId?.name || 'Unknown User'} -{' '}
                      {new Date(summary.year, summary.month - 1).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </h3>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {summary.totalTasksCompleted}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks Completed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {summary.averageDailyProgress.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Avg Daily Progress</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {summary.totalBlockers}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Blockers</p>
                  </div>
                </div>
                {summary.blockerTrends && summary.blockerTrends.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Blocker Trends
                    </h4>
                    <div className="flex gap-2">
                      {summary.blockerTrends.map((trend, idx) => (
                        <div
                          key={idx}
                          className="flex-1 bg-red-50 dark:bg-red-900/20 rounded p-2 text-center"
                        >
                          <p className="text-xs text-gray-600 dark:text-gray-400">Week {trend.week}</p>
                          <p className="text-lg font-bold text-red-600 dark:text-red-400">
                            {trend.blockers}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default EODSummaries

