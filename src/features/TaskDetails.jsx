'use client'

// Force dynamic rendering - this page uses React Query hooks that require QueryClientProvider
export const dynamic = 'force-dynamic'

import { format } from "date-fns";
import toast from "react-hot-toast";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, MessageCircle, PenIcon, ChevronLeft, Pencil, Trash2, X, Check, FileStackIcon } from "lucide-react";
import { useShow, useGetIdentity, useIsAuthenticated, useList, useCreate, useUpdate, useDelete } from '@refinedev/core'
import { assets } from '../assets/assets'
import UserAvatar from "../components/UserAvatar";
import EditTaskDialog from "../components/EditTaskDialog";
import DeleteConfirmationDialog from "../components/DeleteConfirmationDialog";
import { hasMinimumRole, UserRole } from '../utils/roles'
import { TaskDetailsSkeleton } from '../components/LoadingSkeleton'

const TaskDetails = ({ projectId: propProjectId, taskId: propTaskId }) => {
    const searchParams = useSearchParams();
    const projectId = propProjectId || searchParams?.get("projectId");
    const taskId = propTaskId || searchParams?.get("taskId");
    const { data: user } = useGetIdentity()
    const { data: authenticated, isLoading: authLoading } = useIsAuthenticated()
    const router = useRouter();

    // Check token synchronously on initial render
    const [hasToken, setHasToken] = useState(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token')
            return !!token && token.trim() !== ''
        }
        return false
    })

    const [showEditTask, setShowEditTask] = useState(false);

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
    const shouldFetch = !!taskId

    const showResult = useShow({
        resource: 'tasks',
        id: taskId,
        queryOptions: {
            enabled: shouldFetch,
            retry: 1,
            retryOnMount: hasToken,
        },
    })

    // useShow returns data in queryResult property
    const { queryResult, refetch } = showResult || {}

    // Extract data and states from queryResult
    const taskData = queryResult?.data
    const isLoading = queryResult?.isLoading
    const isFetching = queryResult?.isFetching
    const isError = queryResult?.isError
    const error = queryResult?.error

    // Restore missing variable
    const isQueryLoading = isLoading === true || isFetching === true

    // Refetch when token becomes available
    useEffect(() => {
        if (hasToken && shouldFetch && refetch && !taskData) {
            refetch()
        }
    }, [hasToken, shouldFetch, refetch, taskData])

    // Extract task from queryResult data
    // taskData from queryResult is already the normalized data object
    const task = taskData?.data || taskData
    const project = task?.project

    // Data hooks
    const { data: commentsData, isLoading: isCommentsLoading, refetch: refetchComments } = useList({
        resource: 'comments',
        pagination: {
            pageSize: 100, // Max items per page
        },
        filters: [
            {
                field: 'taskId',
                operator: 'eq',
                value: taskId,
            },
        ],
        queryOptions: {
            enabled: !!taskId,
            refetchInterval: 5000, // Poll every 5 seconds for new messages
        },
        sorters: [
            {
                field: 'createdAt',
                order: 'asc', // Oldest first for chat flow
            },
        ],
    });

    const { mutate: createComment, isLoading: isSubmitting } = useCreate({
        resource: 'comments',
        successNotification: (data, values, resource) => {
            return {
                message: 'Comment added',
                type: 'success',
            };
        },
    });

    const { mutate: deleteComment } = useDelete();
    const { mutate: updateComment } = useUpdate();

    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editContent, setEditContent] = useState("");

    const handleEditClick = (comment) => {
        setEditingCommentId(comment.id || comment._id);
        setEditContent(comment.content);
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditContent("");
    };

    const handleSaveEdit = (commentId) => {
        if (!editContent.trim()) return;

        updateComment({
            resource: 'comments',
            id: commentId,
            values: { content: editContent },
        }, {
            onSuccess: () => {
                toast.success("Comment updated");
                setEditingCommentId(null);
                // Refetch comments to get updated data
                if (refetchComments) {
                    refetchComments();
                }
            },
            onError: (err) => {
                toast.error("Failed to update comment");
            }
        });
    };

    const handleDeleteClick = (commentId) => {
        setCommentToDelete(commentId);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!commentToDelete) return;
        
        deleteComment({
            resource: 'comments',
            id: commentToDelete,
        }, {
            onSuccess: () => {
                toast.success("Comment deleted");
                // Refetch comments to get updated data
                if (refetchComments) {
                    refetchComments();
                }
                setDeleteDialogOpen(false);
                setCommentToDelete(null);
            },
            onError: () => {
                toast.error("Failed to delete comment");
                setDeleteDialogOpen(false);
                setCommentToDelete(null);
            },
        });
    };

    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setCommentToDelete(null);
    };

    const comments = commentsData?.data || [];
    const [newComment, setNewComment] = useState("");
    const commentsEndRef = useRef(null);
    const commentsContainerRef = useRef(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState(null);

    // Auto-scroll to bottom when comments load or change
    useEffect(() => {
        if (comments.length > 0) {
            // Small delay to ensure DOM is updated
            setTimeout(() => {
                if (commentsEndRef.current) {
                    commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
                } else if (commentsContainerRef.current) {
                    commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
                }
            }, 100);
        }
    }, [comments.length, commentsData]);

    // Scroll to bottom on initial load when comments are fetched
    useEffect(() => {
        if (!isCommentsLoading && comments.length > 0) {
            setTimeout(() => {
                if (commentsEndRef.current) {
                    commentsEndRef.current.scrollIntoView({ behavior: 'auto' });
                } else if (commentsContainerRef.current) {
                    commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
                }
            }, 200);
        }
    }, [isCommentsLoading]);

    // Scroll to bottom when new comment is added
    const scrollToBottom = () => {
        setTimeout(() => {
            if (commentsEndRef.current) {
                commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
            } else if (commentsContainerRef.current) {
                commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
            }
        }, 200);
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        createComment(
            {
                resource: 'comments',
                values: {
                    content: newComment,
                    taskId: taskId,
                    userId: user?.id,
                },
            },
            {
                onSuccess: () => {
                    setNewComment("");
                    // Scroll to bottom after comment is added
                    scrollToBottom();
                },
                onError: (error) => {
                    toast.error(error?.message || "Failed to add comment");
                }
            }
        );
    };

// Show loading state
if (isQueryLoading || (!shouldFetch && !isError && !task)) {
    return <TaskDetailsSkeleton />
}

// Show error state
if (isError) {
    return (
        <div className="px-4 py-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <FileStackIcon className="w-10 h-10 text-red-400 dark:text-red-500" />
            </div>
            <p className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Error loading task</p>
            <p className="text-sm text-red-500 dark:text-red-400 mb-4">{error?.message || 'Failed to load task. Please try again.'}</p>
            {taskId && (
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">Task ID: {taskId}</p>
            )}
            <button onClick={() => router.push('/tasks')} className="px-4 py-2 rounded bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors">
                Back to Tasks
            </button>
        </div>
    );
}

// Show not found only if query completed and no task data
if (!task && shouldFetch && !isQueryLoading) {
    return (
        <div className="px-4 py-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                <FileStackIcon className="w-10 h-10 text-gray-400 dark:text-zinc-500" />
            </div>
            <p className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Task not found</p>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">The task you're looking for doesn't exist or you don't have access to it.</p>
            {taskId && (
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">Task ID: {taskId}</p>
            )}
            <button onClick={() => router.push('/tasks')} className="px-4 py-2 rounded bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors">
                Back to Tasks
            </button>
        </div>
    );
}

return (
    <div className="flex flex-col-reverse lg:flex-row gap-6 sm:p-4 text-gray-900 dark:text-zinc-100 max-w-6xl mx-auto relative pt-12 lg:pt-4">
        {/* Back Button for All Views */}
        <button
            onClick={() => router.back()}
            className="absolute top-2 left-4 lg:static lg:mb-4 lg:hidden flex items-center gap-1 text-sm text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
            <ChevronLeft className="size-4" /> Back
        </button>
        {/* Left: Comments / Chatbox */}
        <div className="w-full lg:w-2/3">
            <div className="flex items-center gap-2 mb-4 lg:hidden">
                <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <ChevronLeft className="size-4" /> Back
                </button>
            </div>

            <div className="p-3 sm:p-5 rounded-md border border-gray-300 dark:border-zinc-800 flex flex-col lg:h-[80vh]">
                <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
                    <MessageCircle className="size-4 sm:size-5" /> Task Discussion ({comments.length})
                </h2>

                <div ref={commentsContainerRef} className="flex-1 md:overflow-y-scroll no-scrollbar overflow-x-hidden">
                    {comments.length > 0 ? (
                        <div className="flex flex-col gap-2 mb-6 pr-1 sm:pr-2">
                            {comments.map((comment) => {
                                const isOwner = (comment.userId?.id || comment.userId?._id) === (user?.id || user?._id);
                                const commentId = comment.id || comment._id;
                                const isEditing = editingCommentId === commentId;
                                return (
                                    <div key={commentId} className={`flex gap-2 w-full sm:max-w-[85%] md:max-w-[75%] min-w-0 ${isOwner ? "ml-auto flex-row-reverse" : "mr-auto"} group`}>
                                        {!isOwner && (
                                            <div className="flex-shrink-0">
                                                <UserAvatar user={comment.userId} className="size-7" />
                                            </div>
                                        )}

                                        <div className={`relative rounded-2xl px-3 py-2 min-w-0 w-full sm:w-auto flex-1 ${isOwner ? "bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 rounded-br-sm" : "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-bl-sm"}`}>
                                            {/* Show name only for other users' messages */}
                                            {!isOwner && (
                                                <div className="mb-1">
                                                    <span className="font-medium text-xs text-gray-600 dark:text-zinc-400 break-words">{comment.userId?.name || 'Unknown User'}</span>
                                                </div>
                                            )}
                                            
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <textarea
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-600 rounded-md p-2 text-sm text-gray-900 dark:text-zinc-200 resize-none focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-zinc-500"
                                                        rows={3}
                                                        autoFocus
                                                    />
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="px-3 py-1.5 text-xs rounded hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-700 dark:text-zinc-300 transition-colors flex items-center gap-1"
                                                        >
                                                            <X className="size-3.5" /> Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleSaveEdit(commentId)}
                                                            className="px-3 py-1.5 text-xs rounded bg-gray-700 dark:bg-zinc-600 hover:bg-gray-800 dark:hover:bg-zinc-500 text-white transition-colors flex items-center gap-1"
                                                        >
                                                            <Check className="size-3.5" /> Save
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className={`text-sm sm:text-base leading-relaxed text-gray-900 dark:text-zinc-100 break-words whitespace-pre-wrap overflow-wrap-anywhere word-break-break-word`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{comment.content}</p>
                                            )}

                                            {/* Time, Edited tag, and Edit/Delete Icons - All aligned to right for owner */}
                                            <div className={`flex items-center gap-1.5 mt-1 ${isOwner ? "justify-end" : "justify-start"}`}>
                                                {isOwner && !isEditing && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <button
                                                            onClick={() => handleEditClick(comment)}
                                                            className="p-0.5 rounded hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
                                                            title="Edit comment"
                                                        >
                                                            <Pencil className="size-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(commentId)}
                                                            className="p-0.5 rounded hover:bg-red-200 dark:hover:bg-red-900/40 text-gray-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                            title="Delete comment"
                                                        >
                                                            <Trash2 className="size-3" />
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-[10px] text-gray-500 dark:text-zinc-400`}>
                                                        {format(new Date(comment.createdAt), "HH:mm")}
                                                    </span>
                                                    {comment.edited && (
                                                        <span className={`text-[10px] italic text-gray-500 dark:text-zinc-400`}>
                                                            (edited)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Scroll target for auto-scroll */}
                            <div ref={commentsEndRef} />
                        </div>
                    ) : (
                        <p className="text-gray-600 dark:text-zinc-500 mb-4 text-sm">No comments yet. Be the first!</p>
                    )}
                </div>

                {/* Add Comment */}
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-md p-2 text-sm text-gray-900 dark:text-zinc-200 resize-none focus:outline-none focus:ring-1 focus:ring-blue-600"
                        rows={3}
                    />
                    <button onClick={handleAddComment} className="bg-gradient-to-l from-blue-500 to-blue-600 transition-colors text-white text-sm px-5 py-2 rounded " >
                        Post
                    </button>
                </div>
            </div>
        </div>

        {/* Right: Task + Project Info */}
        <div className="w-full lg:w-1/2 flex flex-col gap-6">
            {/* Task Info */}
            <div className="p-5 rounded-md bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 ">
                <div className="mb-3">
                    <div className="flex justify-between items-start">
                        <h1 className="text-lg font-medium text-gray-900 dark:text-zinc-100">{task.title}</h1>
                        {(user?.id === task.createdById || 
                          user?.id === (task.assigneeId?._id || task.assigneeId?.id || task.assigneeId) ||
                          hasMinimumRole(user?.role, UserRole.GROUP_HEAD)) && (
                            <button
                                onClick={() => setShowEditTask(true)}
                                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-blue-600 transition-colors"
                            >
                                <PenIcon className="size-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-300 text-xs">
                            {task.status}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-300 text-xs">
                            {task.type}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-green-200 dark:bg-emerald-900 text-green-900 dark:text-emerald-300 text-xs">
                            {task.priority}
                        </span>
                    </div>
                </div>

                {task.description && (
                    <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed mb-4">{task.description}</p>
                )}

                <hr className="border-zinc-200 dark:border-zinc-700 my-3" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-zinc-300">
                    <div className="flex items-center gap-2">
                        <UserAvatar user={task.assignee || task.assigneeId} className="size-5" />
                        {(task.assignee || task.assigneeId)?.name || "Unassigned"}
                    </div>
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="size-4 text-gray-500 dark:text-zinc-500" />
                        Due : {format(new Date(task.due_date), "dd MMM yyyy")}
                    </div>
                </div>
            </div>

            {showEditTask && (
                <EditTaskDialog
                    showEditTask={showEditTask}
                    setShowEditTask={setShowEditTask}
                    task={task}
                    projectId={project?._id || project?.id}
                />
            )}

            {/* Project Info */}
            {project && (
                <div className="p-4 rounded-md bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-gray-300 dark:border-zinc-800 ">
                    <p className="text-xl font-medium mb-4">Project Details</p>
                    <h2 className="text-gray-900 dark:text-zinc-100 flex items-center gap-2"> <PenIcon className="size-4" /> {project.name}</h2>
                    <p className="text-xs mt-3">Project Start Date: {format(new Date(project.start_date), "dd MMM yyyy")}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-zinc-400 mt-3">
                        <span>Status: {project.status}</span>
                        <span>Priority: {project.priority}</span>
                        <span>Progress: {project.progress}%</span>
                    </div>
                </div>
            )}
        </div>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
            isOpen={deleteDialogOpen}
            onClose={handleCancelDelete}
            onConfirm={handleConfirmDelete}
            title="Delete Comment"
            message="Are you sure you want to delete this comment? This action cannot be undone."
        />
    </div>
);
};

export default TaskDetails;

