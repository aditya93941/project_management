'use client'

// Force dynamic rendering - this page uses React Query hooks that require QueryClientProvider
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useGetIdentity, useList, useIsAuthenticated } from '@refinedev/core'
import { CheckCircle, Clock, AlertCircle, Save, Send, X, ChevronDown, ChevronUp, Search, Copy, Zap, Calendar, Edit, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { UserRole } from '../utils/roles'
import Link from 'next/link'
import { logger } from '../utils/logger'
import { getApiUrl } from '../constants'
import { PageSkeleton } from '../components/LoadingSkeleton'

const EODReports = () => {
  const API_URL = getApiUrl()
  const { data: user } = useGetIdentity()
  const { data: authenticated, isLoading: authLoading } = useIsAuthenticated()
  
  const [todayEOD, setTodayEOD] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accessibleTasks, setAccessibleTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [taskSearchQuery, setTaskSearchQuery] = useState({ completed: '', inProgress: '', blockers: '', plan: '' })
  const [showTaskSelector, setShowTaskSelector] = useState({ completed: false, inProgress: false, blockers: false, plan: false })
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduledTime, setScheduledTime] = useState('')
  const [scheduledTimeOnly, setScheduledTimeOnly] = useState('') // For time picker (HH:MM format)
  const [timeUntilEndOfDay, setTimeUntilEndOfDay] = useState(null)
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }
  
  // Get current time in HH:MM format
  const getCurrentTime = () => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }
  
  // Get default notification alert time (6:30 PM, or current time if after 6:30 PM)
  // Also handles edge cases: already scheduled reports, already submitted reports
  const getDefaultNotificationTime = () => {
    // If already scheduled, use that time (if it's in the future)
    if (todayEOD?.scheduledSubmitAt) {
      const scheduled = new Date(todayEOD.scheduledSubmitAt)
      const now = new Date()
      // Only use scheduled time if it's in the future
      if (scheduled > now) {
        const hours = String(scheduled.getHours()).padStart(2, '0')
        const minutes = String(scheduled.getMinutes()).padStart(2, '0')
        return `${hours}:${minutes}`
      }
    }
    
    // If already submitted and not editable, shouldn't reach here, but fallback
    // Note: isSubmitted and isEditable are defined later, so we check todayEOD directly
    if (todayEOD?.status === 'SUBMITTED' && todayEOD?.editable === false) {
      return getCurrentTime()
    }
    
    const currentTime = getCurrentTime()
    const defaultTime = '18:30'
    // If current time is after 6:30 PM, use current time; otherwise use 6:30 PM
    return currentTime > defaultTime ? currentTime : defaultTime
  }
  
  // Get end of day time (11:59 PM)
  const getEndOfDayTime = () => {
    return '23:59'
  }
  const [showSubmitDropdown, setShowSubmitDropdown] = useState(false)
  
  // Auto-save state
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [autoSaveTimeout, setAutoSaveTimeout] = useState(null)
  
  // Form data with task selection
  const [formData, setFormData] = useState({
    completedTasks: [], // Array of { taskId, status: 'COMPLETED' }
    inProgressTasks: [], // Array of { taskId, status: 'IN_PROGRESS', progress: 0-100 }
    blockedTasks: [], // Array of task IDs that are blocked
    blockersText: '',
    planForTomorrow: '', // Can be text or task IDs (comma-separated)
    planForTomorrowTasks: [], // Array of task IDs for planned tasks
    notes: '',
  })
  const [tasksWithStatusChanges, setTasksWithStatusChanges] = useState({ completed: [], inProgress: [] })
  
  // Toggle between text and task selection for "Plan for Tomorrow"
  const [planMode, setPlanMode] = useState('text') // 'text' or 'tasks'

  // Check if user is developer
  const isDeveloper = user?.role === UserRole.DEVELOPER
  const currentUserId = user?._id || user?.id

  // Check token
  const [hasToken, setHasToken] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token')
      setHasToken(!!token && token.trim() !== '')
    }
  }, [authenticated])

  const shouldFetch = hasToken && !authLoading

  // Fetch accessible tasks (ONLY tasks assigned to user - not all project tasks)
  useEffect(() => {
    if (!isDeveloper || !currentUserId || !shouldFetch) {
      return
    }

    const fetchAccessibleTasks = async () => {
      setLoadingTasks(true)
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          setLoadingTasks(false)
          return
        }

        // ONLY fetch tasks assigned to the current user
        // This prevents showing other users' tasks in the EOD form
        const assignedResponse = await fetch(`${API_URL}/tasks?assigneeId=${currentUserId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (assignedResponse.ok) {
          const assignedData = await assignedResponse.json()
          const assignedTasks = assignedData.data || []
          
          // Only use tasks assigned to the user
          setAccessibleTasks(assignedTasks)
        }
      } catch (error) {
        logger.error('Error fetching accessible tasks:', error)
      } finally {
        setLoadingTasks(false)
      }
    }

    fetchAccessibleTasks()
  }, [isDeveloper, currentUserId, shouldFetch])

  // Fetch today's EOD report
  useEffect(() => {
    if (!user) return
    if (!isDeveloper) {
      setIsLoading(false)
      return
    }

    const fetchTodayEOD = async () => {
      setIsLoading(true) // Show loading immediately
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          setIsLoading(false)
          return
        }

        const response = await fetch(`${API_URL}/eod-reports/my/today`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          
          // POPULATE TASKS IMMEDIATELY - Don't wait for anything else!
          if (data.tasksWithStatusChanges) {
            setTasksWithStatusChanges(data.tasksWithStatusChanges)
            
            // Immediately populate form with tasks (like refresh button does)
            const autoCompleted = (data.tasksWithStatusChanges.completed || []).map(t => ({
              taskId: t._id || t.id
            }))
            const autoInProgress = (data.tasksWithStatusChanges.inProgress || []).map(t => ({
              taskId: t._id || t.id,
              progress: 0,
            }))
            
            // Update form data immediately - this is what makes refresh button fast!
            // Always add done/completed tasks automatically, even if form has existing data
            setFormData(prev => {
              // Merge to avoid duplicates - prioritize auto-fetched tasks
              const allCompletedIds = new Set([...autoCompleted.map(t => t.taskId), ...prev.completedTasks.map(t => t.taskId)])
              const allInProgressIds = new Set([...autoInProgress.map(t => t.taskId), ...prev.inProgressTasks.map(t => t.taskId)])
              
              return {
                ...prev,
                // Always include all completed tasks (done tasks should be auto-added)
                completedTasks: Array.from(allCompletedIds).map(taskId => {
                  const existing = prev.completedTasks.find(t => t.taskId === taskId)
                  return existing || { taskId }
                }),
                inProgressTasks: Array.from(allInProgressIds).map(taskId => {
                  const existing = prev.inProgressTasks.find(t => t.taskId === taskId)
                  return existing || { taskId, progress: 0 }
                }),
              }
            })
            
            logger.log('[EODReports] Tasks populated IMMEDIATELY:', {
              completed: autoCompleted.length,
              inProgress: autoInProgress.length
            })
          }
          
          // Always process the data, even if no report exists
          if (data) {
            setTodayEOD(data)
            setTimeUntilEndOfDay(data.timeUntilEndOfDay)
            
            // Start countdown timer if report is editable and submitted
            if (data.editable && data.status === 'SUBMITTED' && data.timeUntilEndOfDay) {
              const interval = setInterval(() => {
                const now = new Date()
                const endOfDay = new Date(now)
                endOfDay.setHours(23, 59, 59, 999)
                const remaining = endOfDay.getTime() - now.getTime()
                
                if (remaining > 0) {
                  const hours = Math.floor(remaining / (1000 * 60 * 60))
                  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
                  setTimeUntilEndOfDay({ hours, minutes, totalMs: remaining })
                } else {
                  setTimeUntilEndOfDay(null)
                  clearInterval(interval)
                }
              }, 60000) // Update every minute
              
              return () => clearInterval(interval)
            }
            
            // Helper function to check if a task is assigned to current user
            const isTaskAssignedToUser = (task) => {
              if (!task) return false
              const taskAssigneeId = task.assigneeId || task.assignee?._id || task.assignee?.id
              if (!taskAssigneeId) return true // If no assignee, allow it (might be unassigned)
              return String(taskAssigneeId) === String(currentUserId)
            }

            // Get saved tasks from existing report - filter by assignee
            const savedCompleted = data.tasks 
              ? data.tasks
                  .filter(t => {
                    if (t.status !== 'COMPLETED') return false
                    // Check if task is assigned to user
                    const task = typeof t.taskId === 'object' ? t.taskId : null
                    return isTaskAssignedToUser(task)
                  })
                  .map(t => ({ 
                    taskId: typeof t.taskId === 'object' ? t.taskId._id : t.taskId 
                  }))
              : []
            
            const savedInProgress = data.tasks
              ? data.tasks
                  .filter(t => {
                    if (t.status !== 'IN_PROGRESS') return false
                    // Check if task is assigned to user
                    const task = typeof t.taskId === 'object' ? t.taskId : null
                    return isTaskAssignedToUser(task)
                  })
                  .map(t => ({
                    taskId: typeof t.taskId === 'object' ? t.taskId._id : t.taskId,
                    progress: t.progress || 0,
                  }))
              : []

            // Get new tasks from status changes today - filter by assignee
            const newCompleted = (data.tasksWithStatusChanges?.completed || [])
              .filter(t => isTaskAssignedToUser(t))
              .map(t => ({
                taskId: t._id || t.id
              }))
            const newInProgress = (data.tasksWithStatusChanges?.inProgress || [])
              .filter(t => isTaskAssignedToUser(t))
              .map(t => ({
                taskId: t._id || t.id,
                progress: 0,
              }))

            // Additional validation: Filter out tasks that are not in accessibleTasks
            // This ensures we only keep tasks that are actually assigned to the user
            const accessibleTaskIds = new Set(accessibleTasks.map(t => String(t.id || t._id)))
            
            // Filter saved and new tasks to only include accessible ones
            const filteredSavedCompleted = savedCompleted.filter(t => accessibleTaskIds.has(String(t.taskId)))
            const filteredSavedInProgress = savedInProgress.filter(t => accessibleTaskIds.has(String(t.taskId)))
            const filteredNewCompleted = newCompleted.filter(t => accessibleTaskIds.has(String(t.taskId)))
            const filteredNewInProgress = newInProgress.filter(t => accessibleTaskIds.has(String(t.taskId)))
            
            // Merge saved tasks with new status changes (avoid duplicates)
            // Always include all completed/done tasks - prioritize auto-fetched ones
            const allCompletedIds = new Set([...filteredNewCompleted.map(t => t.taskId), ...filteredSavedCompleted.map(t => t.taskId)])
            const allInProgressIds = new Set([...filteredNewInProgress.map(t => t.taskId), ...filteredSavedInProgress.map(t => t.taskId)])
            
            const mergedCompleted = Array.from(allCompletedIds).map(taskId => {
              // Prefer saved task (has progress info), otherwise use new
              const saved = filteredSavedCompleted.find(t => t.taskId === taskId)
              return saved || { taskId }
            })
            
            // Ensure all done/completed tasks from status changes are included
            if (filteredNewCompleted.length > 0) {
              logger.log('[EODReports] Auto-adding completed tasks:', filteredNewCompleted.length)
            }
            
            const mergedInProgress = Array.from(allInProgressIds).map(taskId => {
              // Prefer saved task (has progress info), otherwise use new
              const saved = filteredSavedInProgress.find(t => t.taskId === taskId)
              return saved || { taskId, progress: 0 }
            })

            // Parse planForTomorrow - could be text or task IDs
            const planText = data.planForTomorrow || ''
            const planTasks = []
            
            // Get blocked tasks - filter to only include accessible ones (using same accessibleTaskIds)
            const blockedTaskIds = (data.blockedTasks || [])
              .map(t => typeof t === 'object' ? (t._id || t.id) : t)
              .filter(taskId => accessibleTaskIds.has(String(taskId)))
            
            setFormData({
              completedTasks: mergedCompleted,
              inProgressTasks: mergedInProgress,
              blockedTasks: blockedTaskIds,
              blockersText: data.blockersText || '',
              planForTomorrow: planText,
              planForTomorrowTasks: planTasks,
              notes: data.notes || '',
            })
            
            // Detect if planForTomorrow contains task IDs or is text
            if (planText && planText.match(/^[a-f0-9-]+(,[a-f0-9-]+)*$/i)) {
              setPlanMode('tasks')
              setFormData(prev => ({
                ...prev,
                planForTomorrowTasks: planText.split(',').filter(Boolean),
              }))
            } else {
              setPlanMode('text')
            }
            
            logger.log('[EODReports] Form populated:', {
              savedCompleted: savedCompleted.length,
              savedInProgress: savedInProgress.length,
              newCompleted: newCompleted.length,
              newInProgress: newInProgress.length,
              mergedCompleted: mergedCompleted.length,
              mergedInProgress: mergedInProgress.length,
              statusChanges: data.tasksWithStatusChanges
            })
          } else {
            // No existing report - auto-populate from status changes immediately
            // Helper function to check if a task is assigned to current user
            const isTaskAssignedToUser = (task) => {
              if (!task) return false
              const taskAssigneeId = task.assigneeId || task.assignee?._id || task.assignee?.id
              if (!taskAssigneeId) return true // If no assignee, allow it (might be unassigned)
              return String(taskAssigneeId) === String(currentUserId)
            }
            
            const autoCompleted = (data.tasksWithStatusChanges?.completed || [])
              .filter(t => isTaskAssignedToUser(t))
              .map(t => ({
                taskId: t._id || t.id
              }))
            const autoInProgress = (data.tasksWithStatusChanges?.inProgress || [])
              .filter(t => isTaskAssignedToUser(t))
              .map(t => ({
                taskId: t._id || t.id,
                progress: 0,
              }))
            
            // Populate form immediately
            setFormData(prev => ({
              ...prev,
              completedTasks: autoCompleted,
              inProgressTasks: autoInProgress,
              blockedTasks: prev.blockedTasks || [],
              blockersText: prev.blockersText || '',
              planForTomorrow: prev.planForTomorrow || '',
              planForTomorrowTasks: prev.planForTomorrowTasks || [],
              notes: prev.notes || '',
            }))
            setPlanMode('text')
            
            logger.log('[EODReports] Auto-populated new report immediately:', {
              completed: autoCompleted.length,
              inProgress: autoInProgress.length,
              tasksWithStatusChanges: data.tasksWithStatusChanges
            })
          }
          
          // Also auto-populate if tasksWithStatusChanges exists but no report data
          if (!data._id && data.tasksWithStatusChanges) {
            const autoCompleted = (data.tasksWithStatusChanges.completed || []).map(t => ({
              taskId: t._id || t.id
            }))
            const autoInProgress = (data.tasksWithStatusChanges.inProgress || []).map(t => ({
              taskId: t._id || t.id,
              progress: 0,
            }))
            
            setFormData(prev => ({
              ...prev,
              completedTasks: autoCompleted.length > 0 ? autoCompleted : prev.completedTasks,
              inProgressTasks: autoInProgress.length > 0 ? autoInProgress : prev.inProgressTasks,
            }))
          }
        } else if (response.status === 404) {
          // No report exists - try to get tasks with status changes
          const token = localStorage.getItem('auth_token')
          if (token) {
            try {
              const statusResponse = await fetch(`${API_URL}/eod-reports/my/today`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              if (statusResponse.ok) {
                const statusData = await statusResponse.json()
                if (statusData.tasksWithStatusChanges) {
                  const autoCompleted = (statusData.tasksWithStatusChanges.completed || []).map(t => ({
                    taskId: t._id || t.id
                  }))
                  const autoInProgress = (statusData.tasksWithStatusChanges.inProgress || []).map(t => ({
                    taskId: t._id || t.id,
                    progress: 0,
                  }))
                  
                  setFormData({
                    completedTasks: autoCompleted,
                    inProgressTasks: autoInProgress,
                    blockedTasks: [],
                    blockersText: '',
                    planForTomorrow: '',
                    planForTomorrowTasks: [],
                    notes: '',
                  })
                  setPlanMode('text')
                }
              }
            } catch (err) {
              logger.error('Error fetching status changes:', err)
            }
          }
          setTodayEOD(null)
        }
      } catch (error) {
        logger.error('Error fetching today EOD:', error)
        toast.error('Failed to load EOD report')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTodayEOD()
  }, [user, isDeveloper])

  // Cleanup: Remove tasks not assigned to current user after accessibleTasks are loaded
  useEffect(() => {
    if (!currentUserId || !accessibleTasks.length || !formData.completedTasks.length && !formData.inProgressTasks.length) {
      return
    }

    const accessibleTaskIds = new Set(accessibleTasks.map(t => String(t.id || t._id)))
    
    // Filter out tasks that are not in accessibleTasks
    const hasInvalidTasks = 
      formData.completedTasks.some(t => !accessibleTaskIds.has(String(t.taskId))) ||
      formData.inProgressTasks.some(t => !accessibleTaskIds.has(String(t.taskId))) ||
      formData.blockedTasks.some(t => !accessibleTaskIds.has(String(t)))

    if (hasInvalidTasks) {
      logger.log('[EODReports] Cleaning up tasks not assigned to user')
      setFormData(prev => ({
        ...prev,
        completedTasks: prev.completedTasks.filter(t => accessibleTaskIds.has(String(t.taskId))),
        inProgressTasks: prev.inProgressTasks.filter(t => accessibleTaskIds.has(String(t.taskId))),
        blockedTasks: prev.blockedTasks.filter(t => accessibleTaskIds.has(String(t))),
      }))
    }
  }, [accessibleTasks, currentUserId, formData.completedTasks.length, formData.inProgressTasks.length, formData.blockedTasks.length])

  // Refresh tasks when page becomes visible (user might have changed task statuses in another tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && isDeveloper) {
        // Refetch EOD data when tab becomes visible
        const fetchTodayEOD = async () => {
          try {
            const token = localStorage.getItem('auth_token')
            if (!token) return

            const response = await fetch(`${API_URL}/eod-reports/my/today`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })

            if (response.ok) {
              const data = await response.json()
              if (data?.tasksWithStatusChanges) {
                setTasksWithStatusChanges(data.tasksWithStatusChanges)
                
                // Update form with new status changes
                const newCompleted = (data.tasksWithStatusChanges.completed || []).map(t => ({
                  taskId: t._id || t.id
                }))
                const newInProgress = (data.tasksWithStatusChanges.inProgress || []).map(t => ({
                  taskId: t._id || t.id,
                  progress: 0,
                }))

                setFormData(prev => {
                  // Merge with existing, avoiding duplicates
                  const existingCompletedIds = new Set(prev.completedTasks.map(t => t.taskId))
                  const existingInProgressIds = new Set(prev.inProgressTasks.map(t => t.taskId))
                  
                  const mergedCompleted = [...prev.completedTasks]
                  newCompleted.forEach(t => {
                    if (!existingCompletedIds.has(t.taskId)) {
                      mergedCompleted.push(t)
                    }
                  })
                  
                  const mergedInProgress = [...prev.inProgressTasks]
                  newInProgress.forEach(t => {
                    if (!existingInProgressIds.has(t.taskId)) {
                      mergedInProgress.push(t)
                    }
                  })
                  
                  return {
                    ...prev,
                    completedTasks: mergedCompleted,
                    inProgressTasks: mergedInProgress,
                  }
                })
              }
            }
          } catch (error) {
            logger.error('Error refreshing EOD data:', error)
          }
        }
        
        fetchTodayEOD()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, isDeveloper])


  const handleTaskToggle = (taskId, category) => {
    logger.log('[EODReports] handleTaskToggle', { taskId, category, type: typeof taskId })
    if (!taskId) {
      console.error('[EODReports] Attempted to toggle task with invalid ID:', taskId)
      toast.error('Cannot select task with invalid ID')
      return
    }

    if (category === 'completed') {
      setFormData(prev => {
        const isSelected = prev.completedTasks.some(t => t.taskId === taskId)
        if (isSelected) {
          return {
            ...prev,
            completedTasks: prev.completedTasks.filter(t => t.taskId !== taskId),
          }
        } else {
          return {
            ...prev,
            completedTasks: [...prev.completedTasks, { taskId }],
          }
        }
      })
    } else if (category === 'inProgress') {
      setFormData(prev => {
        const isSelected = prev.inProgressTasks.some(t => t.taskId === taskId)
        if (isSelected) {
          return {
            ...prev,
            inProgressTasks: prev.inProgressTasks.filter(t => t.taskId !== taskId),
          }
        } else {
          return {
            ...prev,
            inProgressTasks: [...prev.inProgressTasks, { taskId, progress: 0 }],
          }
        }
      })
    }
  }

  // Helper to find task by ID from all sources
  const findTaskById = (taskId) => {
    // Check accessible tasks
    const accessibleTask = accessibleTasks.find(t => (t.id || t._id) === taskId)
    if (accessibleTask) return accessibleTask
    
    // Check tasks with status changes
    const statusChangeTask = [
      ...(tasksWithStatusChanges.completed || []),
      ...(tasksWithStatusChanges.inProgress || [])
    ].find(t => (t._id || t.id) === taskId)
    if (statusChangeTask) return statusChangeTask
    
    return null
  }

  // Get all available tasks (from accessibleTasks + tasksWithStatusChanges)
  const getAllAvailableTasks = () => {
    const allTasksMap = new Map()
    // Add accessible tasks
    accessibleTasks.forEach(task => {
      const taskId = task.id || task._id
      allTasksMap.set(taskId, task)
    })
    // Add tasks from status changes
    ;[...(tasksWithStatusChanges.completed || []), ...(tasksWithStatusChanges.inProgress || [])].forEach(task => {
      const taskId = task._id || task.id
      if (!allTasksMap.has(taskId)) {
        allTasksMap.set(taskId, task)
      }
    })
    return Array.from(allTasksMap.values())
  }

  // Filter tasks based on search query
  const getFilteredTasks = (tasks, category = 'completed') => {
    const query = taskSearchQuery[category]?.trim() || ''
    if (!query) return tasks
    const lowerQuery = query.toLowerCase()
    return tasks.filter(task => 
      task.title?.toLowerCase().includes(lowerQuery) ||
      task.type?.toLowerCase().includes(lowerQuery) ||
      task.priority?.toLowerCase().includes(lowerQuery) ||
      (task.projectId?.name || task.projectId)?.toLowerCase().includes(lowerQuery)
    )
  }

  // Handle progress change for in-progress tasks
  const handleProgressChange = (taskId, progress) => {
    setFormData(prev => ({
      ...prev,
      inProgressTasks: prev.inProgressTasks.map(t =>
        t.taskId === taskId ? { ...t, progress: parseInt(progress) || 0 } : t
      ),
    }))
  }

  // Handle blocker task toggle
  const handleBlockerTaskToggle = (taskId) => {
    setFormData(prev => {
      const isSelected = prev.blockedTasks.includes(taskId)
      if (isSelected) {
        return {
          ...prev,
          blockedTasks: prev.blockedTasks.filter(id => id !== taskId),
        }
      } else {
        return {
          ...prev,
          blockedTasks: [...prev.blockedTasks, taskId],
        }
      }
    })
  }

  // Handle plan task toggle
  const handlePlanTaskToggle = (taskId) => {
    setFormData(prev => {
      const isSelected = prev.planForTomorrowTasks.includes(taskId)
      if (isSelected) {
        return {
          ...prev,
          planForTomorrowTasks: prev.planForTomorrowTasks.filter(id => id !== taskId),
        }
      } else {
        return {
          ...prev,
          planForTomorrowTasks: [...prev.planForTomorrowTasks, taskId],
        }
      }
    })
  }

  // Copy from yesterday's EOD
  const handleCopyFromYesterday = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        toast.error('Authentication required')
        return
      }

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      const response = await fetch(`${API_URL}/eod-reports/my?startDate=${yesterdayStr}&endDate=${yesterdayStr}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const yesterdayReport = data.data?.[0]
        
        if (yesterdayReport && yesterdayReport.tasks) {
          const completed = yesterdayReport.tasks
            .filter(t => t.status === 'COMPLETED')
            .map(t => ({ taskId: typeof t.taskId === 'object' ? t.taskId._id : t.taskId }))
          
          const inProgress = yesterdayReport.tasks
            .filter(t => t.status === 'IN_PROGRESS')
            .map(t => ({
              taskId: typeof t.taskId === 'object' ? t.taskId._id : t.taskId,
              progress: t.progress || 0,
            }))

          setFormData(prev => ({
            ...prev,
            completedTasks: completed,
            inProgressTasks: inProgress,
            blockersText: yesterdayReport.blockersText || '',
            planForTomorrow: yesterdayReport.planForTomorrow || '',
            notes: yesterdayReport.notes || '',
          }))
          
          toast.success('Copied data from yesterday\'s report')
        } else {
          toast.error('No report found for yesterday')
        }
      } else {
        toast.error('Failed to fetch yesterday\'s report')
      }
    } catch (error) {
      console.error('Error copying from yesterday:', error)
      toast.error('Failed to copy from yesterday')
    }
  }

  // Close selectors when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.task-selector-container')) {
        setShowTaskSelector({ completed: false, inProgress: false, blockers: false, plan: false })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-save function (debounced)
  const autoSave = async () => {
    if (!isDeveloper || !hasToken) return
    
    // Check if report is editable
    const reportIsEditable = !todayEOD?.isFinal && (
      !todayEOD || 
      todayEOD.status === 'DRAFT' || 
      (todayEOD.status === 'SUBMITTED' && timeUntilEndOfDay && timeUntilEndOfDay.totalMs > 0)
    )
    
    // Don't auto-save if report is not editable
    if (todayEOD && !reportIsEditable) return

    setSaveStatus('saving')
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      // Format planForTomorrow
      const planForTomorrow = planMode === 'tasks' && formData.planForTomorrowTasks.length > 0
        ? formData.planForTomorrowTasks.join(',')
        : formData.planForTomorrow

      // Normalize taskIds
      const normalizeTaskId = (taskId) => {
        if (!taskId) return null
        if (typeof taskId === 'string') return taskId
        if (typeof taskId === 'object' && taskId !== null) {
          const id = taskId._id || taskId.id || taskId.taskId
          if (id) return String(id)
          if (taskId.taskId && (taskId.taskId._id || taskId.taskId.id)) {
            return String(taskId.taskId._id || taskId.taskId.id)
          }
          return String(taskId)
        }
        return String(taskId)
      }

      // Normalize task IDs for auto-save
      const normalizeTaskIdForSave = (taskId) => {
        if (!taskId) return null
        if (typeof taskId === 'string') return taskId.trim()
        if (typeof taskId === 'object' && taskId !== null) {
          const id = taskId._id || taskId.id || taskId.taskId
          if (id) return String(id).trim()
        }
        return String(taskId).trim()
      }

      const payload = {
        completedTasks: formData.completedTasks
          .map(t => {
            const taskId = normalizeTaskIdForSave(t.taskId)
            if (!taskId || taskId === 'undefined' || taskId === 'null') return null
            return { taskId, status: 'COMPLETED' }
          })
          .filter(Boolean),
        inProgressTasks: formData.inProgressTasks
          .map(t => {
            const taskId = normalizeTaskIdForSave(t.taskId)
            if (!taskId || taskId === 'undefined' || taskId === 'null') return null
            const progress = typeof t.progress === 'number' ? t.progress : parseInt(t.progress) || 0
            return {
              taskId,
              status: 'IN_PROGRESS',
              progress: Math.max(0, Math.min(100, progress)),
            }
          })
          .filter(Boolean),
        blockedTasks: (formData.blockedTasks || []).map(id => {
          const normalized = normalizeTaskIdForSave(id)
          return normalized && normalized !== 'undefined' && normalized !== 'null' ? normalized : null
        }).filter(Boolean),
        blockersText: formData.blockersText || '',
        planForTomorrow: planForTomorrow || '',
        notes: formData.notes || '',
      }

      const response = await fetch(`${API_URL}/eod-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        setTodayEOD(data)
        setSaveStatus('saved')
        setLastSavedAt(new Date())
        // Reset to idle after 2 seconds
        setTimeout(() => {
          setSaveStatus(prev => prev === 'saved' ? 'idle' : prev)
        }, 2000)
      } else {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch (error) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  // Auto-save effect with debouncing
  useEffect(() => {
    // Don't auto-save if:
    // - Not a developer
    // - No token
    // - Still loading
    if (!isDeveloper || !hasToken || isLoading) {
      return
    }

    // Check if report is editable
    const reportIsEditable = !todayEOD?.isFinal && (
      !todayEOD || 
      todayEOD.status === 'DRAFT' || 
      (todayEOD.status === 'SUBMITTED' && timeUntilEndOfDay && timeUntilEndOfDay.totalMs > 0)
    )
    
    if (todayEOD && !reportIsEditable) {
      return
    }

    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }

    // Don't auto-save on initial load (wait for formData to be populated)
    if (isLoading) return

    // Debounce auto-save by 1.5 seconds after user stops typing/selecting
    const timeout = setTimeout(() => {
      autoSave()
    }, 1500)

    setAutoSaveTimeout(timeout)

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [
    formData.completedTasks.length, 
    formData.inProgressTasks.length, 
    formData.blockedTasks.length, 
    formData.blockersText, 
    formData.planForTomorrow, 
    formData.planForTomorrowTasks.length, 
    formData.notes,
    isDeveloper,
    hasToken,
    isLoading,
    todayEOD?.status,
    todayEOD?.isFinal,
    timeUntilEndOfDay?.totalMs
  ])

  const handleSave = async () => {
    // ... handlesave logic ...
    if (!isDeveloper) {
      toast.error('Only developers can submit EOD reports')
      return
    }

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        toast.error('Authentication required')
        return
      }

      // Format planForTomorrow: if tasks selected, use comma-separated IDs, otherwise use text
      const planForTomorrow = planMode === 'tasks' && formData.planForTomorrowTasks.length > 0
        ? formData.planForTomorrowTasks.join(',')
        : formData.planForTomorrow

      // Normalize task IDs for save
      const normalizeTaskIdForSave = (taskId) => {
        if (!taskId) return null
        if (typeof taskId === 'string') return taskId.trim()
        if (typeof taskId === 'object' && taskId !== null) {
          const id = taskId._id || taskId.id || taskId.taskId
          if (id) return String(id).trim()
        }
        return String(taskId).trim()
      }

      const payload = {
        completedTasks: formData.completedTasks
          .map(t => {
            const taskId = normalizeTaskIdForSave(t.taskId)
            if (!taskId || taskId === 'undefined' || taskId === 'null') return null
            return { taskId, status: 'COMPLETED' }
          })
          .filter(Boolean),
        inProgressTasks: formData.inProgressTasks
          .map(t => {
            const taskId = normalizeTaskIdForSave(t.taskId)
            if (!taskId || taskId === 'undefined' || taskId === 'null') return null
            const progress = typeof t.progress === 'number' ? t.progress : parseInt(t.progress) || 0
            return {
              taskId,
              status: 'IN_PROGRESS',
              progress: Math.max(0, Math.min(100, progress)),
            }
          })
          .filter(Boolean),
        blockedTasks: (formData.blockedTasks || []).map(id => {
          const normalized = normalizeTaskIdForSave(id)
          return normalized && normalized !== 'undefined' && normalized !== 'null' ? normalized : null
        }).filter(Boolean),
        blockersText: formData.blockersText || '',
        planForTomorrow: planForTomorrow || '',
        notes: formData.notes || '',
      }
      
      console.log('[EODReports] handleSave payload:', payload)

      const response = await fetch(`${API_URL}/eod-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        setTodayEOD(data)
        toast.success('EOD report saved as draft')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save EOD report')
      }
    } catch (error) {
      toast.error('Failed to save EOD report')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (submitNow = true) => {
    console.log('[EODReports] handleSubmit called. FormData:', formData, 'submitNow:', submitNow)
    
    if (!isDeveloper) {
      toast.error('Only developers can submit EOD reports')
      return
    }

    // Validate that at least one task is selected
    if (formData.completedTasks.length === 0 && formData.inProgressTasks.length === 0) {
      toast.error('Please select at least one task (completed or in progress)')
      return
    }

    // Validate that in-progress tasks have progress
    const invalidProgress = formData.inProgressTasks.find(t => !t.progress && t.progress !== 0)
    if (invalidProgress) {
      toast.error('Please set progress percentage for all in-progress tasks')
      return
    }

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        toast.error('Authentication required')
        return
      }

      // If scheduling, get the scheduled time from modal
      let scheduledSubmitAt = null
      if (!submitNow) {
        if (!scheduledTime) {
          toast.error('Please select a scheduled time')
          setIsSubmitting(false)
          return
        }
        scheduledSubmitAt = new Date(scheduledTime).toISOString()
      }

      // First save as draft if not already saved (calls createOrUpdateEODReport)
      // Note: createOrUpdateEODReport validates payload, so we must ensure it's correct here too
      if (!todayEOD) {
        const planForTomorrow = planMode === 'tasks' && formData.planForTomorrowTasks.length > 0
          ? formData.planForTomorrowTasks.join(',')
          : formData.planForTomorrow

        const payload = {
          completedTasks: formData.completedTasks.map(t => ({ taskId: t.taskId, status: 'COMPLETED' })),
          inProgressTasks: formData.inProgressTasks.map(t => ({
            taskId: t.taskId,
            status: 'IN_PROGRESS',
            progress: t.progress || 0,
          })),
          blockersText: formData.blockersText,
          planForTomorrow: planForTomorrow,
          notes: formData.notes,
        }
        
        console.log('[EODReports] Auto-saving draft before submit. Payload:', payload)

        await fetch(`${API_URL}/eod-reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })
      }

      // Then submit - include task updates in case report already exists
      const planForTomorrow = planMode === 'tasks' && formData.planForTomorrowTasks.length > 0
        ? formData.planForTomorrowTasks.join(',')
        : formData.planForTomorrow

      // Ensure taskId is a string (handle both object and string formats)
      const normalizeTaskId = (taskId) => {
        if (!taskId) return null
        if (typeof taskId === 'string') return taskId
        if (typeof taskId === 'object' && taskId !== null) {
          const id = taskId._id || taskId.id || taskId.taskId
          if (id) return String(id)
          // Look for nested object
          if (taskId.taskId && (taskId.taskId._id || taskId.taskId.id)) {
             return String(taskId.taskId._id || taskId.taskId.id)
          }
          // Fallback
          return String(taskId)
        }
        return String(taskId)
      }

      // Process completed tasks - ensure taskId is a string
      const processedCompleted = formData.completedTasks
        .map(t => {
          let taskId = t.taskId
          // If taskId is an object, extract the ID
          if (typeof taskId === 'object' && taskId !== null) {
            taskId = taskId._id || taskId.id || taskId.taskId
          }
          // Ensure it's a string
          taskId = String(taskId).trim()
          
          // Validate taskId is not empty
          if (!taskId || taskId === 'undefined' || taskId === 'null') {
            console.warn('[EODReports] Invalid taskId in completed tasks:', t)
            return null
          }
          
          console.log('[EODReports] Processing completed task:', { original: t, normalizedTaskId: taskId })
          return { taskId, status: 'COMPLETED' }
        })
        .filter(Boolean)
      
      // Process in-progress tasks - ensure taskId is a string
      const processedInProgress = formData.inProgressTasks
        .map(t => {
          let taskId = t.taskId
          // If taskId is an object, extract the ID
          if (typeof taskId === 'object' && taskId !== null) {
            taskId = taskId._id || taskId.id || taskId.taskId
          }
          // Ensure it's a string
          taskId = String(taskId).trim()
          
          // Validate taskId is not empty
          if (!taskId || taskId === 'undefined' || taskId === 'null') {
            console.warn('[EODReports] Invalid taskId in in-progress tasks:', t)
            return null
          }
          
          // Validate progress is a number
          const progress = typeof t.progress === 'number' ? t.progress : parseInt(t.progress) || 0
          const validProgress = Math.max(0, Math.min(100, progress))
          
          console.log('[EODReports] Processing in-progress task:', { original: t, normalizedTaskId: taskId, progress: validProgress })
          return {
            taskId,
            status: 'IN_PROGRESS',
            progress: validProgress,
          }
        })
        .filter(Boolean)

      // Normalize blocked tasks as well
      const normalizedBlockedTasks = (formData.blockedTasks || [])
        .map(id => {
          if (!id) return null
          if (typeof id === 'string') return id.trim()
          if (typeof id === 'object' && id !== null) {
            const taskId = id._id || id.id || id.taskId
            return taskId ? String(taskId).trim() : null
          }
          return String(id).trim()
        })
        .filter(id => id && id !== 'undefined' && id !== 'null')

      const submitPayload = {
        completedTasks: processedCompleted.length > 0 ? processedCompleted : [],
        inProgressTasks: processedInProgress.length > 0 ? processedInProgress : [],
        blockedTasks: normalizedBlockedTasks,
        blockersText: (formData.blockersText || '').trim(),
        planForTomorrow: (planForTomorrow || '').trim(),
        notes: (formData.notes || '').trim(),
        submitNow: submitNow,
        scheduledSubmitAt: scheduledSubmitAt || undefined,
      }

      console.log('[EODReports] ===== SUBMITTING EOD REPORT =====')
      console.log('[EODReports] FormData state:', {
        completedTasks: formData.completedTasks,
        inProgressTasks: formData.inProgressTasks,
        completedCount: formData.completedTasks.length,
        inProgressCount: formData.inProgressTasks.length
      })
      console.log('[EODReports] Processed tasks:', {
        processedCompleted,
        processedInProgress,
        completedCount: processedCompleted.length,
        inProgressCount: processedInProgress.length
      })
      console.log('[EODReports] Final submit payload:', JSON.stringify(submitPayload, null, 2))

      const response = await fetch(`${API_URL}/eod-reports/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitPayload),
      })

      if (response.ok) {
        const data = await response.json()
        setTodayEOD(data)
        if (submitNow) {
          toast.success('EOD report submitted successfully!')
        } else {
          toast.success(`EOD report scheduled for ${new Date(scheduledTime).toLocaleString()}`)
          setShowScheduleModal(false)
          setScheduledTime('')
        }
      } else {
        let errorMessage = 'Failed to submit EOD report'
        try {
          const error = await response.json()
          errorMessage = error.message || errorMessage
          if (error.details) {
            console.error('[EODReports] Validation error details:', error.details)
            // Show more detailed error if available
            const detailMessages = error.details.map((d) => `${d.path?.join('.')}: ${d.message}`).join(', ')
            if (detailMessages) {
              errorMessage = `${errorMessage} (${detailMessages})`
            }
          }
        } catch (e) {
          console.error('[EODReports] Error parsing error response:', e)
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        console.error('[EODReports] Submit error:', {
          status: response.status,
          statusText: response.statusText,
          payload: submitPayload,
          errorMessage
        })
        toast.error(errorMessage)
      }
    } catch (error) {
      toast.error('Failed to submit EOD report')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while user data is being fetched
  if (!user) {
    return <PageSkeleton />
  }

  if (!isDeveloper) {
    return (
      <div className="p-6 text-center">
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Only developers can submit EOD reports
        </p>
      </div>
    )
  }

  // Don't block UI - show form immediately, tasks will populate as they arrive
  // Removed blocking isLoading check - form shows immediately

  const isSubmitted = todayEOD?.status === 'SUBMITTED'
  const isEditable = todayEOD?.editable !== false // Default to true if not specified
  const isFinal = todayEOD?.isFinal === true
  const hasScheduledSubmit = todayEOD?.scheduledSubmitAt && new Date(todayEOD.scheduledSubmitAt) > new Date()
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // Handler for opening schedule modal with validation
  const handleOpenScheduleModal = () => {
    // Check if report is final (cannot schedule)
    if (isFinal) {
      toast.error('Final reports cannot be scheduled')
      return
    }
    
    // Check if report is already submitted and not editable
    if (isSubmitted && !isEditable) {
      toast.error('This report is already submitted and cannot be scheduled')
      return
    }
    
    setShowScheduleModal(true)
    setShowSubmitDropdown(false)
    
    // Pre-populate scheduled time if already scheduled
    if (todayEOD?.scheduledSubmitAt) {
      const scheduled = new Date(todayEOD.scheduledSubmitAt)
      const now = new Date()
      // Only pre-populate if scheduled time is in the future
      if (scheduled > now) {
        const hours = String(scheduled.getHours()).padStart(2, '0')
        const minutes = String(scheduled.getMinutes()).padStart(2, '0')
        setScheduledTimeOnly(`${hours}:${minutes}`)
        // Also set the full scheduled time
        setScheduledTime(scheduled.toISOString())
      }
    }
  }

  // Get selected task IDs (excluding plan tasks, as they can overlap)
  const selectedTaskIds = new Set([
    ...formData.completedTasks.map(t => t.taskId),
    ...formData.inProgressTasks.map(t => t.taskId),
  ])

  // Filter tasks that aren't selected yet (for completed/in-progress)
  const availableTasks = getAllAvailableTasks().filter(task => {
    const taskId = task.id || task._id
    return !selectedTaskIds.has(taskId)
  })
  
  // Available tasks for "Plan for Tomorrow" (can include already selected tasks)
  const availablePlanTasks = getAllAvailableTasks()

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Show loading indicator only at top, don't block entire form */}
      {isLoading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-2">
          <div className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-blue-700 dark:text-blue-300">Loading report data...</p>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">End of Day Report</h1>
          <p className="text-gray-600 dark:text-gray-400">{today}</p>
        </div>
        <div className="flex gap-2">
          {isEditable && (
            <button
              onClick={async () => {
                try {
                  const token = localStorage.getItem('auth_token')
                  if (!token) return

                  const response = await fetch(`${API_URL}/eod-reports/my/today`, {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  })

                  if (response.ok) {
                    const data = await response.json()
                    if (data?.tasksWithStatusChanges) {
                      setTasksWithStatusChanges(data.tasksWithStatusChanges)
                      
                      // Update form with new status changes
                      const newCompleted = (data.tasksWithStatusChanges.completed || []).map(t => ({
                        taskId: t._id || t.id
                      }))
                      const newInProgress = (data.tasksWithStatusChanges.inProgress || []).map(t => ({
                        taskId: t._id || t.id,
                        progress: 0,
                      }))

                      setFormData(prev => {
                        // Merge with existing, avoiding duplicates
                        const existingCompletedIds = new Set(prev.completedTasks.map(t => t.taskId))
                        const existingInProgressIds = new Set(prev.inProgressTasks.map(t => t.taskId))
                        
                        const mergedCompleted = [...prev.completedTasks]
                        newCompleted.forEach(t => {
                          if (!existingCompletedIds.has(t.taskId)) {
                            mergedCompleted.push(t)
                          }
                        })
                        
                        const mergedInProgress = [...prev.inProgressTasks]
                        newInProgress.forEach(t => {
                          if (!existingInProgressIds.has(t.taskId)) {
                            mergedInProgress.push(t)
                          }
                        })
                        
                        return {
                          ...prev,
                          completedTasks: mergedCompleted,
                          inProgressTasks: mergedInProgress,
                        }
                      })
                      
                      toast.success('Tasks refreshed!')
                    } else {
                      toast.info('No new tasks found')
                    }
                  }
                } catch (error) {
                  console.error('Error refreshing tasks:', error)
                  toast.error('Failed to refresh tasks')
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors text-sm"
              title="Refresh tasks from current status"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Tasks
            </button>
          )}
          {!isSubmitted && (
            <button
              onClick={handleCopyFromYesterday}
              className="flex items-center gap-2 px-4 py-2 rounded bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors text-sm"
              title="Copy tasks and notes from yesterday's report"
            >
              <Copy className="w-4 h-4" />
              Copy from Yesterday
            </button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {isSubmitted && (
        <div className={`border rounded-lg p-4 flex items-center justify-between ${
          isFinal 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
        }`}>
          <div className="flex items-center gap-3">
            {isFinal ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            )}
            <div>
              <p className={`font-medium ${
                isFinal 
                  ? 'text-green-900 dark:text-green-200'
                  : 'text-blue-900 dark:text-blue-200'
              }`}>
                {isFinal ? 'Report Final' : 'Report Submitted (Editable)'}
              </p>
              <p className={`text-sm ${
                isFinal 
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-blue-700 dark:text-blue-300'
              }`}>
                {todayEOD?.submittedAt ? `Submitted at ${new Date(todayEOD.submittedAt).toLocaleString()}` : 'N/A'}
                {!isFinal && timeUntilEndOfDay && (
                  <span className="ml-2">
                    • Editable for {timeUntilEndOfDay.hours}h {timeUntilEndOfDay.minutes}m
                  </span>
                )}
              </p>
            </div>
          </div>
          {hasScheduledSubmit && (
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <Calendar className="w-4 h-4 inline mr-1" />
              Scheduled: {new Date(todayEOD.scheduledSubmitAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
        <div className="space-y-6">
          {/* Completed Tasks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <CheckCircle className="w-4 h-4 inline mr-2 text-green-500" />
              Completed Today <span className="text-red-500">*</span>
            </label>
            
            {/* Selected completed tasks */}
            {formData.completedTasks.length > 0 && (
              <div className="mb-3 space-y-2">
                {formData.completedTasks.map((item, idx) => {
                  const task = findTaskById(item.taskId)
                  if (!task) return null
                  // Filter: Only show tasks assigned to current user
                  const taskAssigneeId = task.assigneeId || task.assignee?._id || task.assignee?.id
                  if (taskAssigneeId && String(taskAssigneeId) !== String(currentUserId)) {
                    return null
                  }
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                      <div className="flex-1">
                        <Link 
                          href={`/tasks?taskId=${item.taskId}`}
                          className="text-sm font-medium text-green-900 dark:text-green-200 hover:underline"
                        >
                          {task.title}
                        </Link>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          {task.type} • {task.priority} • {(task.projectId?.name || task.projectId) || 'No Project'}
                        </p>
                      </div>
                      {isEditable && (
                        <button
                          onClick={() => handleTaskToggle(item.taskId, 'completed')}
                          className="p-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Auto-populated from task status changes - can add manually if needed */}
            {formData.completedTasks.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No completed tasks found. Tasks marked as DONE today will appear here automatically.
              </p>
            )}
            {isEditable && (
              <button
                type="button"
                onClick={() => setShowTaskSelector(prev => ({ ...prev, completed: !prev.completed }))}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                + Add task manually
              </button>
            )}
            {isEditable && showTaskSelector.completed && (
              <div className="border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 p-3 max-h-64 overflow-y-auto shadow-lg task-selector-container">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={taskSearchQuery.completed}
                    onChange={(e) => setTaskSearchQuery(prev => ({ ...prev, completed: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm"
                    autoFocus
                  />
                </div>
                {getFilteredTasks(getAllAvailableTasks().filter(t => {
                  const taskId = t.id || t._id
                  return !formData.completedTasks.some(ct => ct.taskId === taskId)
                }), 'completed').length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    {taskSearchQuery.completed ? 'No tasks found' : 'No available tasks'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {getFilteredTasks(getAllAvailableTasks().filter(t => {
                      const taskId = t.id || t._id
                      return !formData.completedTasks.some(ct => ct.taskId === taskId)
                    }), 'completed').map((task) => {
                      const taskId = task.id || task._id
                      return (
                        <button
                          key={taskId}
                          type="button"
                          onClick={() => {
                            handleTaskToggle(taskId, 'completed')
                            setShowTaskSelector(prev => ({ ...prev, completed: false }))
                            setTaskSearchQuery(prev => ({ ...prev, completed: '' }))
                          }}
                          className="w-full text-left p-3 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {task.type} • {task.priority} • {(task.projectId?.name || task.projectId) || 'No Project'}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* In Progress Tasks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Clock className="w-4 h-4 inline mr-2 text-blue-500" />
              In Progress
            </label>
            
            {/* Selected in-progress tasks */}
            {formData.inProgressTasks.length > 0 && (
              <div className="mb-3 space-y-3">
                {formData.inProgressTasks.map((item, idx) => {
                  const task = findTaskById( item.taskId)
                  if (!task) return null
                  // Filter: Only show tasks assigned to current user
                  const taskAssigneeId = task.assigneeId || task.assignee?._id || task.assignee?.id
                  if (taskAssigneeId && String(taskAssigneeId) !== String(currentUserId)) {
                    return null
                  }
                  return (
                    <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <Link 
                            href={`/tasks?taskId=${item.taskId}`}
                            className="text-sm font-medium text-blue-900 dark:text-blue-200 hover:underline"
                          >
                            {task.title}
                          </Link>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            {task.type} • {task.priority} • {(task.projectId?.name || task.projectId) || 'No Project'}
                          </p>
                        </div>
                        {isEditable && (
                          <button
                            onClick={() => handleTaskToggle(item.taskId, 'inProgress')}
                            className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {isEditable && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <label className="text-xs text-gray-600 dark:text-gray-400 min-w-[60px]">Progress:</label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={item.progress || 0}
                              onChange={(e) => handleProgressChange(item.taskId, e.target.value)}
                              className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.progress || 0}
                              onChange={(e) => handleProgressChange(item.taskId, e.target.value)}
                              className="w-16 px-2 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                            />
                            <span className="text-xs text-gray-600 dark:text-gray-400">%</span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${item.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Auto-populated from task status changes - can add manually if needed */}
            {formData.inProgressTasks.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No in-progress tasks found. Tasks marked as IN_PROGRESS today will appear here automatically.
              </p>
            )}
            {isEditable && (
              <button
                type="button"
                onClick={() => setShowTaskSelector(prev => ({ ...prev, inProgress: !prev.inProgress }))}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                + Add task manually
              </button>
            )}
            {isEditable && showTaskSelector.inProgress && (
              <div className="border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 p-3 max-h-64 overflow-y-auto shadow-lg task-selector-container">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={taskSearchQuery.inProgress}
                    onChange={(e) => setTaskSearchQuery(prev => ({ ...prev, inProgress: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm"
                    autoFocus
                  />
                </div>
                {getFilteredTasks(getAllAvailableTasks().filter(t => {
                  const taskId = t.id || t._id
                  return !formData.inProgressTasks.some(ip => ip.taskId === taskId)
                }), 'inProgress').length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    {taskSearchQuery.inProgress ? 'No tasks found' : 'No available tasks'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {getFilteredTasks(getAllAvailableTasks().filter(t => {
                      const taskId = t.id || t._id
                      return !formData.inProgressTasks.some(ip => ip.taskId === taskId)
                    }), 'inProgress').map((task) => {
                      const taskId = task.id || task._id
                      return (
                        <button
                          key={taskId}
                          type="button"
                          onClick={() => {
                            handleTaskToggle(taskId, 'inProgress')
                            setShowTaskSelector(prev => ({ ...prev, inProgress: false }))
                            setTaskSearchQuery(prev => ({ ...prev, inProgress: '' }))
                          }}
                          className="w-full text-left p-3 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {task.type} • {task.priority} • {task.projectId?.name || 'No Project'}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Blockers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <AlertCircle className="w-4 h-4 inline mr-2 text-red-500" />
              Blockers (Optional)
            </label>
            
            {/* Blocked Tasks List */}
            {formData.blockedTasks.length > 0 && (
              <div className="mb-3 space-y-2">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Blocked Tasks:</p>
                {formData.blockedTasks.map((taskId, idx) => {
                  const task = findTaskById( taskId)
                  if (!task) return null
                  // Filter: Only show tasks assigned to current user
                  const taskAssigneeId = task.assigneeId || task.assignee?._id || task.assignee?.id
                  if (taskAssigneeId && String(taskAssigneeId) !== String(currentUserId)) {
                    return null
                  }
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                      <div className="flex-1">
                        <Link 
                          href={`/tasks?taskId=${taskId}`}
                          className="text-sm font-medium text-red-900 dark:text-red-200 hover:underline"
                        >
                          {task.title}
                        </Link>
                        <p className="text-xs text-red-700 dark:text-red-300">
                          {task.type} • {task.priority} • {(task.projectId?.name || task.projectId) || 'No Project'}
                        </p>
                      </div>
                      {isEditable && (
                        <button
                          onClick={() => handleBlockerTaskToggle(taskId)}
                          className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            
            {/* Task Selector for Blockers */}
            {isEditable && (
              <div className="mb-3 space-y-2 task-selector-container">
                <button
                  type="button"
                  onClick={() => setShowTaskSelector(prev => ({ ...prev, blockers: !prev.blockers }))}
                  className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-left flex items-center justify-between"
                  disabled={loadingTasks}
                >
                  <span>{loadingTasks ? 'Loading tasks...' : 'Select blocked tasks...'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showTaskSelector.blockers ? 'rotate-180' : ''}`} />
                </button>
                
                {showTaskSelector.blockers && !loadingTasks && (
                  <div className="border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 p-3 max-h-64 overflow-y-auto shadow-lg">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Search tasks..."
                        value={taskSearchQuery.blockers || ''}
                        onChange={(e) => setTaskSearchQuery(prev => ({ ...prev, blockers: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm"
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                    {getFilteredTasks(getAllAvailableTasks().filter(t => {
                      const taskId = t.id || t._id
                      // Exclude tasks that are already in blockedTasks
                      if (formData.blockedTasks.includes(taskId)) return false
                      // Exclude completed tasks (DONE status) - completed tasks shouldn't be blockers
                      if (t.status === 'DONE') return false
                      return true
                    }), 'blockers').length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        {taskSearchQuery.blockers ? 'No tasks found' : 'No available tasks'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {getFilteredTasks(getAllAvailableTasks().filter(t => {
                          const taskId = t.id || t._id
                          // Exclude tasks that are already in blockedTasks
                          if (formData.blockedTasks.includes(taskId)) return false
                          // Exclude completed tasks (DONE status) - completed tasks shouldn't be blockers
                          if (t.status === 'DONE') return false
                          return true
                        }), 'blockers').map((task) => {
                          const taskId = task.id || task._id
                          return (
                            <button
                              key={taskId}
                              type="button"
                              onClick={() => {
                                handleBlockerTaskToggle(taskId)
                                setShowTaskSelector(prev => ({ ...prev, blockers: false }))
                                setTaskSearchQuery(prev => ({ ...prev, blockers: '' }))
                              }}
                              className="w-full text-left p-3 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                            >
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {task.type} • {task.priority} • {(task.projectId?.name || task.projectId) || 'No Project'}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Blockers Text Field */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Additional Notes:
              </label>
              <textarea
                value={formData.blockersText}
                onChange={(e) => setFormData({ ...formData, blockersText: e.target.value })}
                disabled={!isEditable}
                rows={3}
                maxLength={500}
                className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white disabled:opacity-50"
                placeholder="Describe blockers or issues..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.blockersText.length}/500 characters
              </p>
            </div>
          </div>

          {/* Plan for Tomorrow */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Plan for Tomorrow (Optional)
              </label>
              {isEditable && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPlanMode('text')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      planMode === 'text'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600'
                    }`}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanMode('tasks')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      planMode === 'tasks'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-600'
                    }`}
                  >
                    Select Tasks
                  </button>
                </div>
              )}
            </div>
            
            {planMode === 'text' ? (
              <>
                <textarea
                  value={formData.planForTomorrow}
                  onChange={(e) => setFormData({ ...formData, planForTomorrow: e.target.value })}
                  disabled={!isEditable}
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white disabled:opacity-50"
                  placeholder="What do you plan to work on tomorrow?"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formData.planForTomorrow.length}/500 characters
                </p>
              </>
            ) : (
              <div>
                {/* Selected planned tasks */}
                {formData.planForTomorrowTasks.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {formData.planForTomorrowTasks.map((taskId, idx) => {
                      const task = findTaskById( taskId)
                      if (!task) return null
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                          <div className="flex-1">
                            <Link 
                              href={`/tasks?taskId=${taskId}`}
                              className="text-sm font-medium text-blue-900 dark:text-blue-200 hover:underline"
                            >
                              {task.title}
                            </Link>
                            <p className="text-xs text-blue-700 dark:text-blue-300">{task.type} • {task.priority}</p>
                          </div>
                          {isEditable && (
                            <button
                              onClick={() => handlePlanTaskToggle(taskId)}
                              className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Task selector - Improved UI */}
                {isEditable && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowTaskSelector(prev => ({ ...prev, plan: !prev.plan }))}
                      className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-left flex items-center justify-between"
                      disabled={loadingTasks}
                    >
                      <span>{loadingTasks ? 'Loading tasks...' : 'Select tasks for tomorrow...'}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showTaskSelector.plan ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showTaskSelector.plan && !loadingTasks && (
                      <div className="border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 p-3 max-h-64 overflow-y-auto shadow-lg">
                        {/* Search */}
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                          <input
                            type="text"
                            placeholder="Search tasks..."
                            value={taskSearchQuery.plan}
                            onChange={(e) => setTaskSearchQuery(prev => ({ ...prev, plan: e.target.value }))}
                            className="w-full pl-10 pr-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                        
                        {/* Task list */}
                        {getFilteredTasks(availablePlanTasks.filter(task => !formData.planForTomorrowTasks.includes(task.id || task._id)), 'plan').length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                            {taskSearchQuery.plan ? 'No tasks found' : 'No available tasks'}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {getFilteredTasks(availablePlanTasks.filter(task => !formData.planForTomorrowTasks.includes(task.id || task._id)), 'plan').map((task) => {
                              const taskId = task.id || task._id
                              return (
                                <button
                                  key={taskId}
                                  type="button"
                                  onClick={() => {
                                    handlePlanTaskToggle(taskId)
                                    setShowTaskSelector(prev => ({ ...prev, plan: false }))
                                    setTaskSearchQuery(prev => ({ ...prev, plan: '' }))
                                  }}
                                  className="w-full text-left p-3 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                                >
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {task.type} • {task.priority} • {task.projectId?.name || 'No Project'}
                                  </p>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={!isEditable}
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white disabled:opacity-50"
              placeholder="Add any additional notes or comments..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.notes.length}/1000 characters
            </p>
          </div>

          {/* Actions */}
          {isEditable && (
            <div className="flex flex-col gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              {/* Auto-save status indicator */}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  {saveStatus === 'saving' && (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <>
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>All changes saved</span>
                      {lastSavedAt && (
                        <span className="text-gray-400">
                          {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </>
                  )}
                  {saveStatus === 'error' && (
                    <>
                      <AlertCircle className="w-3 h-3 text-red-500" />
                      <span>Save failed. Please try again.</span>
                    </>
                  )}
                  {saveStatus === 'idle' && todayEOD && (
                    <>
                      <CheckCircle className="w-3 h-3 text-gray-400" />
                      <span>All changes saved</span>
                    </>
                  )}
                </div>
              </div>

              {/* Validation message */}
              {(formData.completedTasks.length === 0 && formData.inProgressTasks.length === 0) && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
                  <p className="text-sm text-amber-900 dark:text-amber-200">
                    ⚠️ Please select at least one task (completed or in progress) to submit your report.
                  </p>
                </div>
              )}
              
              {/* Unified Submit Button with Dropdown */}
              <div className="relative">
                <div className="flex gap-2 relative">
                  <button
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting || (formData.completedTasks.length === 0 && formData.inProgressTasks.length === 0)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm text-sm"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                  <button
                    onClick={() => setShowSubmitDropdown(!showSubmitDropdown)}
                    disabled={isSubmitting || (formData.completedTasks.length === 0 && formData.inProgressTasks.length === 0)}
                    className="px-3 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-l border-blue-500"
                    aria-label="More options"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSubmitDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Dropdown menu - positioned relative to button container */}
                  {showSubmitDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowSubmitDropdown(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 z-30">
                        {/* Only show schedule button if report is editable and not final */}
                        {isEditable && !isFinal && (
                          <button
                            onClick={handleOpenScheduleModal}
                            disabled={isSubmitting}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {todayEOD?.scheduledSubmitAt ? 'Reschedule Submit' : 'Schedule Submit'}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {todayEOD?.scheduledSubmitAt 
                                  ? `Currently: ${new Date(todayEOD.scheduledSubmitAt).toLocaleTimeString()}`
                                  : 'Submit at a specific time'}
                              </div>
                            </div>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 Your work is automatically saved. Reports remain editable until end of day.
              </p>
            </div>
          )}
          
          {/* Schedule Submit Modal */}
          {showScheduleModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Schedule Submission</h3>
                <div className="space-y-4">
                  {/* Date (fixed to today) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={getTodayDate()}
                      disabled
                      className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Date is fixed to today
                    </p>
                  </div>
                  
                  {/* Time (selectable) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Submission Time
                    </label>
                    <input
                      type="time"
                      value={scheduledTimeOnly || getDefaultNotificationTime()}
                      onChange={(e) => {
                        const selectedTime = e.target.value
                        const currentTime = getCurrentTime()
                        const endTime = getEndOfDayTime()
                        
                        // Validate time is between current time and 11:59 PM
                        if (selectedTime >= currentTime && selectedTime <= endTime) {
                          setScheduledTimeOnly(selectedTime)
                        } else if (selectedTime < currentTime) {
                          toast.error(`Time must be after ${currentTime}`)
                          setScheduledTimeOnly('')
                        } else {
                          toast.error('Time must be before 11:59 PM')
                          setScheduledTimeOnly('')
                        }
                      }}
                      min={getCurrentTime()}
                      max={getEndOfDayTime()}
                      className="w-full px-4 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Must be between {getCurrentTime()} and 23:59 today
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowScheduleModal(false)
                        setScheduledTime('')
                        setScheduledTimeOnly('')
                      }}
                      className="flex-1 px-4 py-2 rounded bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!scheduledTimeOnly) {
                          toast.error('Please select a time')
                          return
                        }
                        
                        // Combine today's date with selected time
                        const [hours, minutes] = scheduledTimeOnly.split(':')
                        const scheduledDateTime = new Date()
                        scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
                        
                        // Validate the time
                        const now = new Date()
                        const endOfDay = new Date()
                        endOfDay.setHours(23, 59, 59, 999)
                        
                        if (scheduledDateTime <= now) {
                          toast.error('Time must be in the future')
                          return
                        }
                        
                        if (scheduledDateTime > endOfDay) {
                          toast.error('Time must be before 11:59 PM')
                          return
                        }
                        
                        // Set the full datetime for submission (ISO format)
                        setScheduledTime(scheduledDateTime.toISOString())
                        handleSubmit(false)
                      }}
                      disabled={!scheduledTimeOnly || isSubmitting}
                      className="flex-1 px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? 'Scheduling...' : 'Schedule'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EODReports
