'use client'

import { format } from "date-fns";
import toast from "react-hot-toast";
import { useState, useMemo, useEffect, useRef } from "react";
import { useUpdate, useDelete, useInvalidate } from '@refinedev/core';
import Link from "next/link";
import { Bug, CalendarIcon, GitCommit, MessageSquare, Square, Trash, XIcon, Zap } from "lucide-react";
import UserAvatar from "./UserAvatar";

const typeIcons = {
    BUG: { icon: Bug, color: "text-red-600 dark:text-red-400" },
    FEATURE: { icon: Zap, color: "text-blue-600 dark:text-blue-400" },
    TASK: { icon: Square, color: "text-green-600 dark:text-green-400" },
    IMPROVEMENT: { icon: GitCommit, color: "text-purple-600 dark:text-purple-400" },
    OTHER: { icon: MessageSquare, color: "text-amber-600 dark:text-amber-400" },
};

const priorityTexts = {
    LOW: { background: "bg-red-100 dark:bg-red-950", prioritycolor: "text-red-600 dark:text-red-400" },
    MEDIUM: { background: "bg-blue-100 dark:bg-blue-950", prioritycolor: "text-blue-600 dark:text-blue-400" },
    HIGH: { background: "bg-emerald-100 dark:bg-emerald-950", prioritycolor: "text-emerald-600 dark:text-emerald-400" },
};

const ProjectTasks = ({ tasks, projectId, onTaskAdded, onTaskStatusChanged }) => {
    const { mutate: updateTask } = useUpdate();
    const { mutate: deleteTask } = useDelete();
    const invalidateResult = useInvalidate();
    // useInvalidate might return an object with invalidate method, or the function directly
    const invalidate = invalidateResult?.invalidate || invalidateResult;
    const [selectedTasks, setSelectedTasks] = useState([]);
    
    // Optimistic state for tasks - sync with props but allow local updates
    const [optimisticTasks, setOptimisticTasks] = useState(tasks);
    
    // Track optimistic task additions (tasks added before server confirms)
    const optimisticAdditionsRef = useRef(new Set());
    
    // Track previous tasks length to detect new tasks
    const prevTasksLengthRef = useRef(tasks.length);
    const prevTasksIdsRef = useRef(new Set(tasks.map(t => String(t.id || t._id))));
    
    // Track pending optimistic updates to prevent reverting
    const [pendingUpdates, setPendingUpdates] = useState(new Map());
    const pendingUpdatesRef = useRef(new Map());
    const isUpdatingRef = useRef(false);
    
    // Keep ref in sync with state
    useEffect(() => {
        pendingUpdatesRef.current = pendingUpdates;
    }, [pendingUpdates]);
    
    // Set up global function to add tasks optimistically (called from parent)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.__addTaskOptimistically = (newTask) => {
                console.log('[ProjectTasks] Adding task optimistically:', newTask);
                const taskId = String(newTask.id || newTask._id || `temp-${Date.now()}`);
                
                // Mark as optimistic addition
                optimisticAdditionsRef.current.add(taskId);
                
                // Normalize task data (ensure id and _id are set)
                const normalizedTask = {
                    ...newTask,
                    id: newTask.id || newTask._id || taskId,
                    _id: newTask._id || newTask.id || taskId,
                };
                
                // Add task immediately to optimistic state
                setOptimisticTasks(prev => {
                    // Check if task already exists
                    const exists = prev.some(t => {
                        const existingId = String(t.id || t._id);
                        return existingId === taskId;
                    });
                    if (exists) {
                        console.log('[ProjectTasks] Task already exists, skipping');
                        return prev;
                    }
                    
                    console.log('[ProjectTasks] Adding new task to optimistic state');
                    // Add new task at the beginning of the list
                    return [normalizedTask, ...prev];
                });
            };
        }
        return () => {
            if (typeof window !== 'undefined') {
                delete window.__addTaskOptimistically;
            }
        };
    }, []);
    
    // Sync optimisticTasks with tasks prop when it changes (but preserve pending updates)
    useEffect(() => {
        // Skip sync if we're currently updating (prevents race conditions)
        if (isUpdatingRef.current) {
            return;
        }
        
        const currentPending = pendingUpdatesRef.current;
        
        // Detect new tasks by comparing task IDs
        const currentTaskIds = new Set(optimisticTasks.map(t => String(t.id || t._id)));
        const newTaskIds = new Set(tasks.map(t => String(t.id || t._id)));
        
        // Check if there are new tasks (tasks in newTaskIds that aren't in currentTaskIds)
        const newTaskIdsArray = Array.from(newTaskIds);
        const hasNewTasks = tasks.length > optimisticTasks.length || 
                           newTaskIdsArray.some(id => !currentTaskIds.has(id));
        
        // Also check if length changed significantly (more than just status updates)
        const lengthChanged = tasks.length !== prevTasksLengthRef.current;
        const idsChanged = newTaskIdsArray.some(id => !prevTasksIdsRef.current.has(id));
        
        console.log('[ProjectTasks] Syncing tasks:', {
            tasksLength: tasks.length,
            optimisticLength: optimisticTasks.length,
            prevLength: prevTasksLengthRef.current,
            hasNewTasks,
            lengthChanged,
            idsChanged,
            pendingUpdatesSize: currentPending.size,
            newTaskIds: newTaskIdsArray,
            currentTaskIds: Array.from(currentTaskIds),
        });
        
        // Update refs
        prevTasksLengthRef.current = tasks.length;
        prevTasksIdsRef.current = newTaskIds;
        
        // If there are new tasks OR significant changes, always sync completely
        if (hasNewTasks || (lengthChanged && idsChanged)) {
            console.log('[ProjectTasks] New tasks detected, syncing completely');
            // Clear optimistic additions that are now confirmed by server
            const confirmedTaskIds = new Set(tasks.map(t => String(t.id || t._id)));
            optimisticAdditionsRef.current.forEach(id => {
                if (confirmedTaskIds.has(id)) {
                    optimisticAdditionsRef.current.delete(id);
                }
            });
            setPendingUpdates(new Map());
            setOptimisticTasks(tasks);
            return;
        }
        
        // Only sync if there are no pending updates for any task
        if (currentPending.size === 0 && optimisticAdditionsRef.current.size === 0) {
            console.log('[ProjectTasks] No pending updates or optimistic additions, syncing with server data');
            setOptimisticTasks(tasks);
        } else {
            // Merge server updates with optimistic state, ALWAYS preserving pending update values
            console.log('[ProjectTasks] Merging with pending updates');
            setOptimisticTasks(prevOptimistic => {
                const merged = tasks.map(serverTask => {
                    const taskId = String(serverTask.id || serverTask._id);
                    // If this task has a pending update, ALWAYS use the pending status
                    if (currentPending.has(taskId)) {
                        const pendingUpdate = currentPending.get(taskId);
                        // Apply the pending update status to the server task
                        return { ...serverTask, status: pendingUpdate.status };
                    }
                    return serverTask;
                });
                
                // Also include any optimistic tasks that might not be in server response yet
                const serverIds = new Set(merged.map(t => String(t.id || t._id)));
                const additionalOptimistic = prevOptimistic.filter(t => {
                    const taskId = String(t.id || t._id);
                    // Include if:
                    // 1. Not in server response AND has pending update, OR
                    // 2. Is an optimistic addition (recently added)
                    const isOptimisticAddition = optimisticAdditionsRef.current.has(taskId);
                    const hasPendingUpdate = currentPending.has(taskId);
                    return !serverIds.has(taskId) && (hasPendingUpdate || isOptimisticAddition);
                });
                
                return [...merged, ...additionalOptimistic];
            });
        }
    }, [tasks]); // Only depend on tasks array

    const [filters, setFilters] = useState({
        status: "",
        type: "",
        priority: "",
        assignee: "",
    });

    const assigneeList = useMemo(
        () => Array.from(new Set(optimisticTasks.map((t) => (t.assignee || t.assigneeId)?.name).filter(Boolean))),
        [optimisticTasks]
    );

    const filteredTasks = useMemo(() => {
        return optimisticTasks.filter((task) => {
            const { status, type, priority, assignee } = filters;
            return (
                (!status || task.status === status) &&
                (!type || task.type === type) &&
                (!priority || task.priority === priority) &&
                (!assignee || (task.assignee || task.assigneeId)?.name === assignee)
            );
        });
    }, [filters, optimisticTasks]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = async (taskId, newStatus) => {
        // Normalize task ID - handle both id and _id formats
        const normalizedTaskId = String(taskId);
        
        // Find the current task to get the old status for rollback
        const currentTask = optimisticTasks.find(t => {
            const taskIdValue = t.id || t._id;
            return String(taskIdValue) === normalizedTaskId;
        });
        const oldStatus = currentTask?.status;
        
        if (!currentTask) {
            console.error('Task not found for ID:', taskId, 'Available tasks:', optimisticTasks.map(t => ({ id: t.id, _id: t._id })));
            toast.error('Task not found');
            return;
        }

        // Mark this task as having a pending update
        isUpdatingRef.current = true;
        setPendingUpdates(prev => {
            const newMap = new Map(prev);
            newMap.set(normalizedTaskId, { status: newStatus, oldStatus });
            return newMap;
        });

        // Optimistic update - update UI immediately
        setOptimisticTasks(prevTasks => 
            prevTasks.map(task => {
                const taskIdValue = task.id || task._id;
                return String(taskIdValue) === normalizedTaskId
                    ? { ...task, status: newStatus }
                    : task;
            })
        );
        
        // Notify parent component about status change (for stats update)
        if (onTaskStatusChanged && typeof onTaskStatusChanged === 'function') {
            console.log('[ProjectTasks] Notifying parent of status change:', normalizedTaskId, newStatus);
            onTaskStatusChanged(normalizedTaskId, newStatus);
        }
        
        // Allow sync after a brief moment
        setTimeout(() => {
            isUpdatingRef.current = false;
        }, 100);

        try {
            // Use RefineJS update mutation
            updateTask(
                {
                    resource: 'tasks',
                    id: taskId,
                    values: { status: newStatus },
                },
                {
                    onSuccess: () => {
                        toast.success("Task status updated successfully");
                        
                        // Invalidate project data to refresh tasks in background
                        try {
                            if (invalidate && typeof invalidate === 'function') {
                                if (projectId) {
                                    const invalidateProject = invalidate({ resource: 'projects', id: projectId });
                                    if (invalidateProject && typeof invalidateProject.catch === 'function') {
                                        invalidateProject.catch(err => {
                                            console.error('Error invalidating project cache:', err);
                                        });
                                    }
                                }
                                const invalidateTasks = invalidate({ resource: 'tasks' });
                                if (invalidateTasks && typeof invalidateTasks.catch === 'function') {
                                    invalidateTasks.catch(err => {
                                        console.error('Error invalidating tasks cache:', err);
                                    });
                                }
                            }
                        } catch (error) {
                            console.error('Error invalidating cache:', error);
                        }
                        
                        // Remove from pending updates after server data has been fetched
                        // Wait longer to ensure the invalidated query has completed
                        setTimeout(() => {
                            setPendingUpdates(prev => {
                                const newMap = new Map(prev);
                                newMap.delete(normalizedTaskId);
                                return newMap;
                            });
                        }, 1500); // Longer delay to ensure server data has fully synced after invalidation
                    },
                    onError: (error) => {
                        // Rollback optimistic update on error
                        setOptimisticTasks(prevTasks => 
                            prevTasks.map(task => {
                                const taskIdValue = task.id || task._id;
                                return String(taskIdValue) === normalizedTaskId
                                    ? { ...task, status: oldStatus }
                                    : task;
                            })
                        );
                        // Remove from pending updates
                        setPendingUpdates(prev => {
                            const newMap = new Map(prev);
                            newMap.delete(normalizedTaskId);
                            return newMap;
                        });
                        toast.error(error?.message || 'Failed to update task status');
                    },
                }
            );
        } catch (error) {
            // Rollback optimistic update on error
            setOptimisticTasks(prevTasks => 
                prevTasks.map(task => {
                    const taskIdValue = task.id || task._id;
                    return String(taskIdValue) === normalizedTaskId
                        ? { ...task, status: oldStatus }
                        : task;
                })
            );
            // Remove from pending updates
            setPendingUpdates(prev => {
                const newMap = new Map(prev);
                newMap.delete(normalizedTaskId);
                return newMap;
            });
            toast.error(error?.message || 'Failed to update task status');
        }
    };

    const handleDelete = async () => {
        try {
            const confirm = window.confirm("Are you sure you want to delete the selected tasks?");
            if (!confirm) return;

            // Store tasks for rollback
            const tasksToDelete = selectedTasks.map(id => 
                optimisticTasks.find(t => t.id === id || t._id === id)
            ).filter(Boolean);

            // Optimistic update - remove tasks immediately
            setIsOptimisticUpdate(true);
            setOptimisticTasks(prevTasks => 
                prevTasks.filter(task => !selectedTasks.includes(task.id) && !selectedTasks.includes(task._id))
            );
            
            // Clear selection immediately
            const deletedTaskIds = [...selectedTasks];
            setSelectedTasks([]);

            // Delete tasks sequentially
            const deletePromises = deletedTaskIds.map((taskId) =>
                new Promise((resolve, reject) => {
                    deleteTask(
                        {
                            resource: 'tasks',
                            id: taskId,
                        },
                        {
                            onSuccess: () => resolve(),
                            onError: (error) => reject(error),
                        }
                    );
                })
            );

            try {
                await Promise.all(deletePromises);
                toast.success("Tasks deleted successfully");
                setIsOptimisticUpdate(false); // Allow prop sync
                
                // Invalidate project data to refresh tasks in background
                try {
                    if (invalidate && typeof invalidate === 'function') {
                        if (projectId) {
                            const invalidateProject = invalidate({ resource: 'projects', id: projectId });
                            if (invalidateProject && typeof invalidateProject.catch === 'function') {
                                invalidateProject.catch(err => {
                                    console.error('Error invalidating project cache:', err);
                                });
                            }
                        }
                        const invalidateTasks = invalidate({ resource: 'tasks' });
                        if (invalidateTasks && typeof invalidateTasks.catch === 'function') {
                            invalidateTasks.catch(err => {
                                console.error('Error invalidating tasks cache:', err);
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error invalidating cache:', error);
                }
            } catch (error) {
                // Rollback optimistic update on error
                setOptimisticTasks(prevTasks => [...prevTasks, ...tasksToDelete]);
                setSelectedTasks(deletedTaskIds);
                setIsOptimisticUpdate(false);
                toast.error(error?.message || 'Failed to delete tasks');
            }
        } catch (error) {
            setIsOptimisticUpdate(false);
            toast.error(error?.message || 'Failed to delete tasks');
        }
    };

    return (
        <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4">
                {["status", "type", "priority", "assignee"].map((name) => {
                    const options = {
                        status: [
                            { label: "All Statuses", value: "" },
                            { label: "To Do", value: "TODO" },
                            { label: "In Progress", value: "IN_PROGRESS" },
                            { label: "Done", value: "DONE" },
                        ],
                        type: [
                            { label: "All Types", value: "" },
                            { label: "Task", value: "TASK" },
                            { label: "Bug", value: "BUG" },
                            { label: "Feature", value: "FEATURE" },
                            { label: "Improvement", value: "IMPROVEMENT" },
                            { label: "Other", value: "OTHER" },
                        ],
                        priority: [
                            { label: "All Priorities", value: "" },
                            { label: "Low", value: "LOW" },
                            { label: "Medium", value: "MEDIUM" },
                            { label: "High", value: "HIGH" },
                        ],
                        assignee: [
                            { label: "All Assignees", value: "" },
                            ...assigneeList.map((n) => ({ label: n, value: n })),
                        ],
                    };
                    return (
                        <select key={name} name={name} onChange={handleFilterChange} className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 outline-none px-3 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200" >
                            {options[name].map((opt, idx) => (
                                <option key={idx} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    );
                })}

                {/* Reset filters */}
                {(filters.status || filters.type || filters.priority || filters.assignee) && (
                    <button type="button" onClick={() => setFilters({ status: "", type: "", priority: "", assignee: "" })} className="px-3 py-1 flex items-center gap-2 rounded bg-gradient-to-br from-purple-400 to-purple-500 text-zinc-100 dark:text-zinc-200 text-sm transition-colors" >
                        <XIcon className="size-3" /> Reset
                    </button>
                )}

                {selectedTasks.length > 0 && (
                    <button type="button" onClick={handleDelete} className="px-3 py-1 flex items-center gap-2 rounded bg-gradient-to-br from-indigo-400 to-indigo-500 text-zinc-100 dark:text-zinc-200 text-sm transition-colors" >
                        <Trash className="size-3" /> Delete
                    </button>
                )}
            </div>

            {/* Tasks Table */}
            <div className="overflow-auto rounded-lg lg:border border-zinc-300 dark:border-zinc-800">
                <div className="w-full">
                    {/* Desktop/Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="min-w-full text-sm text-left not-dark:bg-white text-zinc-900 dark:text-zinc-300">
                            <thead className="text-xs uppercase dark:bg-zinc-800/70 text-zinc-500 dark:text-zinc-400 ">
                                <tr>
                                    <th className="pl-2 pr-1">
                                        <input onChange={() => selectedTasks.length > 1 ? setSelectedTasks([]) : setSelectedTasks(optimisticTasks.map((t) => t.id || t._id))} checked={selectedTasks.length === optimisticTasks.length && optimisticTasks.length > 0} type="checkbox" className="size-3 accent-zinc-600 dark:accent-zinc-500" />
                                    </th>
                                    <th className="px-4 pl-0 py-3">Title</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Priority</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Assignee</th>
                                    <th className="px-4 py-3">Due Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.length > 0 ? (
                                    filteredTasks.map((task) => {
                                        const { icon: Icon, color } = typeIcons[task.type] || {};
                                        const { background, prioritycolor } = priorityTexts[task.priority] || {};

                                        return (
                                            <tr key={task.id} className=" border-t border-zinc-300 dark:border-zinc-800 group hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer" >
                                                <td onClick={e => e.stopPropagation()} className="pl-2 pr-1">
                                                    <input 
                                                        type="checkbox" 
                                                        className="size-3 accent-zinc-600 dark:accent-zinc-500" 
                                                        onChange={() => {
                                                            const taskId = task.id || task._id;
                                                            selectedTasks.includes(taskId) 
                                                                ? setSelectedTasks(selectedTasks.filter((i) => i !== taskId)) 
                                                                : setSelectedTasks((prev) => [...prev, taskId]);
                                                        }} 
                                                        checked={selectedTasks.includes(task.id || task._id)} 
                                                    />
                                                </td>
                                                <td className="px-4 pl-0 py-2">
                                                    <Link href={`/tasks?projectId=${task.projectId}&taskId=${task.id || task._id}`} className="block">
                                                        {task.title}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        {Icon && <Icon className={`size-4 ${color}`} />}
                                                        <span className={`uppercase text-xs ${color}`}>{task.type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className={`text-xs px-2 py-1 rounded ${background} ${prioritycolor}`}>
                                                        {task.priority}
                                                    </span>
                                                </td>
                                                <td onClick={e => e.stopPropagation()} className="px-4 py-2">
                                                    <select 
                                                        key={`status-${task.id || task._id}-${task.status}`}
                                                        name="status" 
                                                        onChange={(e) => {
                                                            e.preventDefault();
                                                            handleStatusChange(task.id || task._id, e.target.value);
                                                        }} 
                                                        value={task.status || 'TODO'} 
                                                        className="group-hover:ring ring-zinc-100 outline-none px-2 pr-4 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200 cursor-pointer" 
                                                    >
                                                        <option value="TODO">To Do</option>
                                                        <option value="IN_PROGRESS">In Progress</option>
                                                        <option value="DONE">Done</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <UserAvatar user={task.assignee || task.assigneeId} className="size-5" />
                                                        {(task.assignee || task.assigneeId)?.name || "-"}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                                                        <CalendarIcon className="size-4" />
                                                        {format(new Date(task.due_date), "dd MMMM")}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center text-zinc-500 dark:text-zinc-400 py-6">
                                            No tasks found for the selected filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile/Card View */}
                    <div className="lg:hidden flex flex-col gap-4">
                        {filteredTasks.length > 0 ? (
                            filteredTasks.map((task) => {
                                const { icon: Icon, color } = typeIcons[task.type] || {};
                                const { background, prioritycolor } = priorityTexts[task.priority] || {};

                                return (
                                    <div key={task.id || task._id} className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg p-4 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-zinc-900 dark:text-zinc-200 text-sm font-semibold">{task.title}</h3>
                                            <input 
                                                type="checkbox" 
                                                className="size-4 accent-zinc-600 dark:accent-zinc-500" 
                                                onChange={() => {
                                                    const taskId = task.id || task._id;
                                                    selectedTasks.includes(taskId) 
                                                        ? setSelectedTasks(selectedTasks.filter((i) => i !== taskId)) 
                                                        : setSelectedTasks((prev) => [...prev, taskId]);
                                                }} 
                                                checked={selectedTasks.includes(task.id || task._id)} 
                                            />
                                        </div>

                                        <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                            {Icon && <Icon className={`size-4 ${color}`} />}
                                            <span className={`${color} uppercase`}>{task.type}</span>
                                        </div>

                                        <div>
                                            <span className={`text-xs px-2 py-1 rounded ${background} ${prioritycolor}`}>
                                                {task.priority}
                                            </span>
                                        </div>

                                        <div>
                                            <label className="text-zinc-600 dark:text-zinc-400 text-xs">Status</label>
                                            <select 
                                                key={`status-mobile-${task.id || task._id}-${task.status}`}
                                                name="status" 
                                                onChange={(e) => {
                                                    e.preventDefault();
                                                    handleStatusChange(task.id || task._id, e.target.value);
                                                }} 
                                                value={task.status || 'TODO'} 
                                                className="w-full mt-1 bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-300 dark:ring-zinc-700 outline-none px-2 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200" 
                                            >
                                                <option value="TODO">To Do</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="DONE">Done</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                            <UserAvatar user={task.assignee || task.assigneeId} className="size-5" />
                                            {(task.assignee || task.assigneeId)?.name || "-"}
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                            <CalendarIcon className="size-4" />
                                            {format(new Date(task.due_date), "dd MMMM")}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">
                                No tasks found for the selected filters.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectTasks;
