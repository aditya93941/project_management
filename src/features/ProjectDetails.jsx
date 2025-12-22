'use client'

// Force dynamic rendering - this page uses React Query hooks that require QueryClientProvider
export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from "react";
import { useNavigation, useResource } from "@refinedev/core";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, PlusIcon, SettingsIcon, BarChart3Icon, CalendarIcon, FileStackIcon, ZapIcon } from "lucide-react";
import ProjectAnalytics from "../components/ProjectAnalytics";
import ProjectSettings from "../components/ProjectSettings";
import CreateTaskDialog from "../components/CreateTaskDialog";
import ProjectCalendar from "../components/ProjectCalendar";
import ProjectTasks from "../components/ProjectTasks";
import { useShow, useIsAuthenticated, useGetIdentity, useInvalidate } from '@refinedev/core'
import { hasMinimumRole, UserRole } from '../utils/roles'
import { canCreateTaskByRole, hasTemporaryPermission } from '../utils/taskPermissions'
import AccessDenied from '../components/AccessDenied'
import { logger } from '../utils/logger'

export default function ProjectDetails({ id: propId, tab: propTab }) {
    const { list, show } = useNavigation();
    const { id: resourceId } = useResource();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const tab = propTab || 'tasks';

    // Get ID from prop, resource hook, or extract from pathname
    // Pathname format: /projects/:id or /projects/:id?tab=...
    let extractedId = null;
    if (pathname && pathname.startsWith('/projects/')) {
        const parts = pathname.split('/');
        if (parts.length >= 3) {
            extractedId = parts[2].split('?')[0]; // Remove query params if any
        }
    }
    const id = propId || resourceId || extractedId;
    const { data: authenticated, isLoading: authLoading } = useIsAuthenticated()
    const { data: user } = useGetIdentity()

    // Permission checks
    const canCreateTaskByRoleCheck = canCreateTaskByRole(user?.role)
    const canViewSettings = hasMinimumRole(user?.role, UserRole.TEAM_LEAD)

    // Check for temporary permission (for developers)
    // Developers with temporary permission can create and assign tasks
    const [hasTempPermission, setHasTempPermission] = useState(false)
    const [checkingPermission, setCheckingPermission] = useState(false)

    useEffect(() => {
        const checkPermission = async () => {
            // If user already has role-based permission, no need to check
            if (canCreateTaskByRoleCheck) {
                setHasTempPermission(false)
                return
            }

            const userId = user?.id || user?._id

            // Check for temporary permission for any user who doesn't have role-based permission
            if (id && userId) {
                logger.log('[ProjectDetails] Checking temporary permission:', {
                    userId: userId,
                    projectId: id,
                    role: user.role,
                    hasRolePermission: canCreateTaskByRoleCheck
                })
                setCheckingPermission(true)
                try {
                    const { getApiUrl } = await import('../constants')
                    const API_URL = getApiUrl()
                    const hasPermission = await hasTemporaryPermission(userId, id, API_URL)
                    logger.log('[ProjectDetails] Permission check result:', {
                        hasPermission,
                        userId: userId,
                        projectId: id
                    })
                    setHasTempPermission(hasPermission)
                } catch (error) {
                    logger.error('[ProjectDetails] Error checking temporary permission:', error)
                    setHasTempPermission(false)
                } finally {
                    setCheckingPermission(false)
                }
            } else {
                logger.log('[ProjectDetails] Missing required data for permission check:', {
                    hasId: !!id,
                    hasUserId: !!userId,
                    role: user?.role
                })
                setHasTempPermission(false)
            }
        }

        const userId = user?.id || user?._id

        // Run check if we have both id and user, or if user data changes
        if (id && userId) {
            checkPermission()
        } else if (!userId && id) {
            // User data is still loading, wait a bit and try again
            const timeout = setTimeout(() => {
                const currentUserId = user?.id || user?._id
                if (id && currentUserId) {
                    checkPermission()
                }
            }, 500)
            return () => clearTimeout(timeout)
        }
    }, [id, user?.id, user?._id, user?.role, canCreateTaskByRoleCheck])

    // Can create task if: has role permission OR has temporary permission
    const canCreateTask = canCreateTaskByRoleCheck || hasTempPermission

    // Debug logging for permission state
    useEffect(() => {
        const userId = user?.id || user?._id
        if (typeof window !== 'undefined' && id && userId) {
            logger.log('[ProjectDetails] Permission Debug:', {
                canCreateTaskByRoleCheck,
                hasTempPermission,
                canCreateTask,
                checkingPermission,
                projectId: id,
                projectIdType: typeof id,
                userId: userId,
                userRole: user?.role,
                willShowButton: canCreateTask || checkingPermission
            })

            // If no permission found and user is DEVELOPER, log a warning
            if (user?.role === UserRole.DEVELOPER && !canCreateTask && !checkingPermission) {
                logger.warn('[ProjectDetails] DEVELOPER user has no permission to create tasks. Check if temporary permission was granted.')
            }
        }
    }, [canCreateTaskByRoleCheck, hasTempPermission, canCreateTask, checkingPermission, id, user?.id, user?._id, user?.role])

    // Check token synchronously on initial render
    const [hasToken, setHasToken] = useState(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token')
            return !!token && token.trim() !== ''
        }
        return false
    })

    // Update token state when authenticated state changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token')
            const tokenExists = !!token && token.trim() !== ''
            setHasToken(tokenExists)
        }
    }, [authenticated])

    // Standardized enabled condition - always enable if we have an ID
    // The dataProvider will handle token checking
    const shouldFetch = !!id

    const showResult = useShow({
        resource: 'projects',
        id: id,
        queryOptions: {
            enabled: shouldFetch,
            retry: 1,
            // Don't retry if there's no token - dataProvider will return null
            retryOnMount: hasToken,
            // Force refetch on window focus to catch updates
            refetchOnWindowFocus: true,
            // Refetch on reconnect
            refetchOnReconnect: true,
        },
    })

    // useShow returns data in queryResult property
    const { queryResult, query, refetch } = showResult || {}
    const invalidateResult = useInvalidate()
    const invalidate = invalidateResult?.invalidate || invalidateResult

    // Extract data and states from queryResult
    const projectData = queryResult?.data
    const isLoading = queryResult?.isLoading
    const isFetching = queryResult?.isFetching
    const isError = queryResult?.isError
    const error = queryResult?.error

    // Check if error is 403 (Forbidden)
    const isAccessDenied = error?.status === 403 || (error?.message && error.message.includes('access'))

    // Check query status if available
    const queryStatus = query?.status || queryResult?.status

    // Use queryResult states
    const isQueryLoading = isLoading === true || isFetching === true
    const isQueryError = isError === true
    const queryErrorObj = error

    // Refetch when token becomes available
    useEffect(() => {
        if (hasToken && shouldFetch && refetch && !projectData) {
            logger.log('[ProjectDetails] Token available, refetching project')
            refetch()
        }
    }, [hasToken, shouldFetch, refetch, projectData])

    // projectData from queryResult is already the normalized data object
    // It should have a 'data' property containing the actual project
    const project = projectData?.data || projectData
    const serverTasks = project?.tasks || []

    // Optimistic tasks state - tracks tasks added optimistically before server confirms
    const [optimisticTasks, setOptimisticTasks] = useState([])

    // Track optimistic status updates (taskId -> new status)
    const [optimisticStatusUpdates, setOptimisticStatusUpdates] = useState(new Map())

    // Merge server tasks with optimistic tasks and apply status updates
    const tasks = useMemo(() => {
        // Start with server tasks
        let mergedTasks = [...serverTasks]

        // Apply optimistic status updates to server tasks
        if (optimisticStatusUpdates.size > 0) {
            mergedTasks = mergedTasks.map(task => {
                const taskId = String(task.id || task._id)
                if (optimisticStatusUpdates.has(taskId)) {
                    return { ...task, status: optimisticStatusUpdates.get(taskId) }
                }
                return task
            })
        }

        // Add optimistic tasks (newly created) that aren't in server yet
        if (optimisticTasks.length > 0) {
            const serverTaskIds = new Set(mergedTasks.map(t => String(t.id || t._id)))
            const optimisticOnly = optimisticTasks.filter(t => {
                const taskId = String(t.id || t._id)
                return !serverTaskIds.has(taskId)
            })
            mergedTasks = [...mergedTasks, ...optimisticOnly]
        }

        return mergedTasks
    }, [serverTasks, optimisticTasks, optimisticStatusUpdates])

    // Clear optimistic tasks and status updates when server tasks update (they're now confirmed)
    useEffect(() => {
        if (serverTasks.length > 0) {
            // Clear optimistic tasks that are now in server
            if (optimisticTasks.length > 0) {
                const serverTaskIds = new Set(serverTasks.map(t => String(t.id || t._id)));
                setOptimisticTasks(prev => {
                    const filtered = prev.filter(t => {
                        const taskId = String(t.id || t._id);
                        return !serverTaskIds.has(taskId);
                    });
                    if (filtered.length !== prev.length) {
                        logger.log('[ProjectDetails] Cleared confirmed optimistic tasks');
                    }
                    return filtered;
                });
            }

            // Clear optimistic status updates that match server status
            if (optimisticStatusUpdates.size > 0) {
                setOptimisticStatusUpdates(prev => {
                    const newMap = new Map(prev);
                    let cleared = false;
                    serverTasks.forEach(serverTask => {
                        const taskId = String(serverTask.id || serverTask._id);
                        if (newMap.has(taskId)) {
                            // Check if server status matches optimistic status
                            const optimisticStatus = newMap.get(taskId);
                            if (serverTask.status === optimisticStatus) {
                                newMap.delete(taskId);
                                cleared = true;
                            }
                        }
                    });
                    if (cleared) {
                        logger.log('[ProjectDetails] Cleared confirmed optimistic status updates');
                    }
                    return newMap;
                });
            }
        }
    }, [serverTasks]);

    // Debug: Log when tasks change
    useEffect(() => {
        if (!project) return;
        const membersCount = project?.members ? (Array.isArray(project.members) ? project.members.length : 0) : 0;
        logger.log('[ProjectDetails] Tasks updated:', {
            taskCount: tasks.length,
            serverTasks: serverTasks.length,
            optimisticTasks: optimisticTasks.length,
            completed: tasks.filter((t) => t.status === "DONE").length,
            inProgress: tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO").length,
            members: membersCount
        });
    }, [tasks.length, serverTasks.length, optimisticTasks.length, project]);

    const [showCreateTask, setShowCreateTask] = useState(false);
    // Get initial tab from prop, URL search params, or default to "tasks"
    const initialTab = tab || searchParams?.get('tab') || "tasks";
    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        // Update tab when prop or URL param changes
        const urlTab = searchParams?.get('tab');
        const newTab = tab || urlTab || "tasks";
        if (newTab !== activeTab) {
            setActiveTab(newTab);
        }
    }, [tab, searchParams, activeTab]);

    // Debug logging
    useEffect(() => {
        if (typeof window !== 'undefined') {
            logger.log('[ProjectDetails] Debug:', {
                id,
                hasToken,
                authLoading,
                shouldFetch,
                isLoading,
                isFetching,
                queryStatus,
                isQueryLoading,
                isError,
                isQueryError,
                error: error?.message,
                hasProjectData: !!projectData,
                hasProject: !!project,
                projectDataKeys: projectData ? Object.keys(projectData) : [],
                queryResultKeys: queryResult ? Object.keys(queryResult) : [],
                showResultKeys: showResult ? Object.keys(showResult) : [],
            })
        }
    }, [id, hasToken, authLoading, shouldFetch, isLoading, isFetching, queryStatus, isQueryLoading, isError, isQueryError, error, projectData, project, queryResult, showResult])

    const statusColors = {
        PLANNING: "bg-zinc-200 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-200",
        ACTIVE: "bg-emerald-200 text-emerald-900 dark:bg-emerald-500 dark:text-emerald-900",
        ON_HOLD: "bg-amber-200 text-amber-900 dark:bg-amber-500 dark:text-amber-900",
        COMPLETED: "bg-blue-200 text-blue-900 dark:bg-blue-500 dark:text-blue-900",
        CANCELLED: "bg-red-200 text-red-900 dark:bg-red-500 dark:text-red-900",
    };

    // Show loading state: when auth is loading, query is loading, or waiting for query to start
    const isWaitingForAuth = authLoading || (!hasToken && !isError)
    const isActuallyLoading = isQueryLoading === true || (shouldFetch && !project && !isError && !projectData)

    if (isWaitingForAuth || isActuallyLoading) {
        return (
            <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mt-40">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-lg text-gray-500 dark:text-zinc-400">Loading project...</p>
            </div>
        );
    }

    // Show access denied for 403 errors
    if (isAccessDenied) {
        return (
            <AccessDenied message={error?.message || 'You do not have access to this project. You must be a member to view it.'} />
        );
    }

    // Show error state for other errors
    if (isQueryError) {
        return (
            <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
                <div className="w-24 h-24 mx-auto mb-6 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mt-40">
                    <FileStackIcon className="w-12 h-12 text-red-400 dark:text-red-500" />
                </div>
                <p className="text-2xl md:text-3xl font-semibold mb-2">Error loading project</p>
                <p className="text-lg text-red-500 dark:text-red-400 mb-6">{queryErrorObj?.message || 'Failed to load project. Please try again.'}</p>
                {id && (
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">Project ID: {id}</p>
                )}
                <button onClick={() => router.push('/projects')} className="px-4 py-2 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600 transition-colors" >
                    Back to Projects
                </button>
            </div>
        );
    }

    // Show not found only if query completed (not loading, not error) and no project data
    // Check that query has actually completed (isQueryLoading is explicitly false, not undefined)
    if (!project && shouldFetch && isQueryLoading === false && !isQueryError) {
        return (
            <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mt-40">
                    <FileStackIcon className="w-12 h-12 text-gray-400 dark:text-zinc-500" />
                </div>
                <p className="text-2xl md:text-3xl font-semibold mb-2">Project not found</p>
                <p className="text-lg text-gray-500 dark:text-zinc-400 mb-6">The project you're looking for doesn't exist or you don't have access to it.</p>
                {id && (
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">Project ID: {id}</p>
                )}
                <button onClick={() => router.push('/projects')} className="px-4 py-2 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600 transition-colors" >
                    Back to Projects
                </button>
            </div>
        );
    }

    // Safety check: ensure project exists before rendering
    if (!project) {
        return (
            <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mt-40">
                    <FileStackIcon className="w-12 h-12 text-gray-400 dark:text-zinc-500" />
                </div>
                <p className="text-2xl md:text-3xl font-semibold mb-2">Project not found</p>
                <p className="text-lg text-gray-500 dark:text-zinc-400 mb-6">The project data is not available.</p>
                <button onClick={() => router.push('/projects')} className="px-4 py-2 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600 transition-colors" >
                    Back to Projects
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5 max-w-6xl mx-auto text-zinc-900 dark:text-white">
            {/* Header */}
            <div className="flex max-md:flex-col gap-4 flex-wrap items-start justify-between max-w-6xl">
                <div className="flex items-center gap-4">
                    <button className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400" onClick={() => list('projects')}>
                        <ArrowLeftIcon className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-medium">{project?.name || 'Loading...'}</h1>
                        {project?.status && (
                            <span className={`px-2 py-1 rounded text-xs capitalize ${statusColors[project?.status] || ''}`} >
                                {project?.status?.replace("_", " ") || project?.status}
                            </span>
                        )}
                    </div>
                </div>
                {/* Show button for: role-based permission OR temporary permission OR while checking */}
                {(canCreateTask || checkingPermission) && (
                    <button
                        onClick={() => setShowCreateTask(true)}
                        disabled={checkingPermission}
                        className="flex items-center gap-2 px-5 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        title={
                            checkingPermission
                                ? 'Checking permissions...'
                                : hasTempPermission
                                    ? 'You have temporary permission to create and assign tasks'
                                    : canCreateTaskByRoleCheck
                                        ? 'You have role-based permission to create tasks'
                                        : ''
                        }
                    >
                        <PlusIcon className="size-4" />
                        {checkingPermission ? 'Checking...' : 'New Task'}
                    </button>
                )}
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 sm:flex flex-wrap gap-6">
                {[
                    { label: "Total Tasks", value: tasks.length, color: "text-zinc-900 dark:text-white" },
                    { label: "Completed", value: tasks.filter((t) => t.status === "DONE").length, color: "text-emerald-700 dark:text-emerald-400" },
                    { label: "In Progress", value: tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO").length, color: "text-amber-700 dark:text-amber-400" },
                    {
                        label: "Team Members",
                        value: (() => {
                            const uniqueMembers = new Set(project?.members?.map(m => m.id || m._id) || []);
                            if (project?.owner) uniqueMembers.add(project.owner.id || project.owner._id);
                            return uniqueMembers.size;
                        })(),
                        color: "text-blue-700 dark:text-blue-400"
                    },
                ].map((card, idx) => (
                    <div key={idx} className=" dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex justify-between sm:min-w-60 p-4 py-2.5 rounded">
                        <div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">{card.label}</div>
                            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                        </div>
                        <ZapIcon className={`size-4 ${card.color}`} />
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div>
                <div className="inline-flex flex-wrap max-sm:grid grid-cols-3 gap-2 border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden">
                    {[
                        { key: "tasks", label: "Tasks", icon: FileStackIcon },
                        { key: "calendar", label: "Calendar", icon: CalendarIcon },
                        { key: "analytics", label: "Analytics", icon: BarChart3Icon },
                        ...(canViewSettings ? [{ key: "settings", label: "Settings", icon: SettingsIcon }] : []),
                    ].map((tabItem) => (
                        <button
                            key={tabItem.key}
                            onClick={() => {
                                setActiveTab(tabItem.key);
                                // Update URL with tab parameter without full page navigation
                                if (typeof window !== 'undefined' && pathname) {
                                    const params = new URLSearchParams(window.location.search);
                                    params.set('tab', tabItem.key);
                                    // Use replaceState to update URL without navigation
                                    window.history.replaceState({}, '', `${pathname}?${params.toString()}`);
                                }
                            }}
                            className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${activeTab === tabItem.key ? "bg-zinc-100 dark:bg-zinc-800/80" : "hover:bg-zinc-50 dark:hover:bg-zinc-700"}`}
                        >
                            <tabItem.icon className="size-3.5" />
                            {tabItem.label}
                        </button>
                    ))}
                </div>

                <div className="mt-6">
                    {activeTab === "tasks" && (
                        <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
                            <ProjectTasks
                                tasks={tasks}
                                projectId={id}
                                onTaskStatusChanged={(taskId, newStatus) => {
                                    // Update optimistic status for stats calculation
                                    logger.log('[ProjectDetails] Task status changed:', taskId, newStatus);
                                    setOptimisticStatusUpdates(prev => {
                                        const newMap = new Map(prev);
                                        newMap.set(String(taskId), newStatus);
                                        return newMap;
                                    });

                                    // Clear optimistic status update when server confirms (after refetch)
                                    if (refetch) {
                                        setTimeout(() => {
                                            refetch().then(() => {
                                                // Clear the optimistic status update after server confirms
                                                setOptimisticStatusUpdates(prev => {
                                                    const newMap = new Map(prev);
                                                    newMap.delete(String(taskId));
                                                    return newMap;
                                                });
                                            });
                                        }, 500);
                                    }
                                }}
                            />
                        </div>
                    )}
                    {activeTab === "analytics" && (
                        <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
                            <ProjectAnalytics tasks={tasks} project={project} />
                        </div>
                    )}
                    {activeTab === "calendar" && (
                        <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
                            <ProjectCalendar tasks={tasks} />
                        </div>
                    )}
                    {activeTab === "settings" && canViewSettings && (
                        <div className=" dark:bg-zinc-900/40 rounded max-w-6xl">
                            <ProjectSettings project={project} />
                        </div>
                    )}
                </div>
            </div>

            {/* Create Task Modal */}
            {showCreateTask && (
                <CreateTaskDialog
                    showCreateTask={showCreateTask}
                    setShowCreateTask={setShowCreateTask}
                    projectId={id}
                    onTaskCreated={(newTask) => {
                        // OPTIMISTIC UI: Add task immediately to local state for stats
                        logger.log('[ProjectDetails] Task created, adding optimistically:', newTask);

                        // Normalize task data
                        const normalizedTask = {
                            ...newTask,
                            id: newTask.id || newTask._id,
                            _id: newTask._id || newTask.id,
                            projectId: newTask.projectId || id,
                        };

                        // Add to optimistic tasks state (for stats calculation)
                        setOptimisticTasks(prev => {
                            const taskId = String(normalizedTask.id || normalizedTask._id);
                            const exists = prev.some(t => String(t.id || t._id) === taskId);
                            if (exists) {
                                logger.log('[ProjectDetails] Task already in optimistic state');
                                return prev;
                            }
                            logger.log('[ProjectDetails] Adding task to optimistic state');
                            return [normalizedTask, ...prev];
                        });

                        // Also call the optimistic add function for ProjectTasks component
                        if (typeof window !== 'undefined' && window.__addTaskOptimistically) {
                            logger.log('[ProjectDetails] Calling __addTaskOptimistically');
                            try {
                                window.__addTaskOptimistically(normalizedTask);
                                logger.log('[ProjectDetails] Optimistic add completed');
                            } catch (error) {
                                logger.error('[ProjectDetails] Error in optimistic add:', error);
                            }
                        } else {
                            logger.warn('[ProjectDetails] __addTaskOptimistically function not available');
                        }

                        // Refetch in background to confirm (non-blocking)
                        if (refetch) {
                            setTimeout(() => {
                                logger.log('[ProjectDetails] Background refetch after 500ms');
                                refetch();
                            }, 500);
                        }
                    }}
                />
            )}
        </div>
    );
}

