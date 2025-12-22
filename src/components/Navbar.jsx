'use client'

import { SearchIcon, PanelLeft, User, Bell, LogOut } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import { useGetIdentity, useLogout, useList, useUpdate, useCustomMutation, useInvalidate } from '@refinedev/core'
import { toggleTheme } from '../features/themeSlice'
import { MoonIcon, SunIcon } from 'lucide-react'
import { assets } from '../assets/assets'
import { roleLabels } from '../utils/roles'
import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { useRouter } from "next/navigation"
import UserAvatar from './UserAvatar'
import { getApiUrl } from '../constants'
import ProfileSettingsDialog from './ProfileSettingsDialog'

const Navbar = ({ setIsSidebarOpen }) => {
    const { data: user } = useGetIdentity()
    const { mutate: logout } = useLogout()
    const dispatch = useDispatch();
    const { theme } = useSelector(state => state.theme);
    const router = useRouter();

    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showProfileSettings, setShowProfileSettings] = useState(false);
    const notificationsRef = useRef(null);
    const profileRef = useRef(null);

    // Browser notification permission and setup
    const [notificationPermission, setNotificationPermission] = useState('default');

    useEffect(() => {
        // Check if browser supports notifications
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
            
            // Request permission if not already granted/denied
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    setNotificationPermission(permission);
                });
            }
        }
    }, []);

    // Close notifications dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfileDropdown(false);
            }
        };

        if (showNotifications || showProfileDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showNotifications, showProfileDropdown]);

    const { data: notificationData, refetch } = useList({
        resource: 'notifications',
        pagination: { pageSize: 20 },
        sorters: [{ field: 'createdAt', order: 'desc' }],
        queryOptions: {
            refetchInterval: 4000, // Poll every 4 seconds for better realtime feel
            enabled: !!user,
            refetchOnWindowFocus: true
        },
    });

    const notifications = notificationData?.data || [];
    const unreadCount = notifications.filter(n => !n.isRead).length;

    const { mutate: updateNotification } = useUpdate();
    const { mutate: markAllReadMutate } = useCustomMutation();
    const invalidateResult = useInvalidate();
    const invalidate = invalidateResult?.invalidate || invalidateResult;

    // Mark all notifications as read when panel is opened
    const handleOpenNotifications = () => {
        const newShowState = !showNotifications;
        setShowNotifications(newShowState);

        // When opening the panel (not closing), mark all unread notifications as read
        if (newShowState && unreadCount > 0) {
            // Mark all as read immediately
            markAllReadMutate({
                url: `${getApiUrl()}/notifications/read-all`,
                method: 'put',
                values: {},
                onSuccess: () => {
                    // Invalidate and refetch to update the UI immediately
                    if (invalidate && typeof invalidate === 'function') {
                        invalidate({ resource: 'notifications' }).then(() => {
                            refetch();
                        }).catch(() => {
                            refetch();
                        });
                    } else {
                        refetch();
                    }
                },
                onError: (error) => {
                    console.error('Failed to mark all notifications as read:', error);
                }
            });
        }
    };

    // Play sound and show toast when new unread notifications arrive
    const [prevUnreadCount, setPrevUnreadCount] = useState(0);

    useEffect(() => {
        if (unreadCount > prevUnreadCount) {
            // New notification(s) arrived
            // Play sound
            const sound = new Audio('/sounds/notification-sound-effect-372475.mp3');
            sound.play().catch(e => console.error('Error playing notification sound:', e));

            // Show browser notification if permission is granted
            if ('Notification' in window && Notification.permission === 'granted') {
                const latestNotification = notifications[0];
                if (latestNotification && !latestNotification.isRead) {
                    const senderName = latestNotification.senderId?.name || 'System';
                    const message = latestNotification.message.replace(senderName, '').trim();
                    
                    new Notification('P2 Internal Tool', {
                        body: `${senderName}: ${message}`,
                        icon: '/icon.svg',
                        badge: '/icon.svg',
                        tag: `notification-${latestNotification.id || latestNotification._id}`, // Prevent duplicate notifications
                        requireInteraction: false,
                        silent: false,
                    });
                }
            }

            // Show toast for the latest notification
            const latestNotification = notifications[0];
            if (latestNotification && !latestNotification.isRead) {
                toast((t) => (
                    <div onClick={() => {
                        toast.dismiss(t.id);
                        handleNotificationClick(latestNotification);
                    }} className="cursor-pointer flex items-center gap-2">
                        <span className="font-medium text-sm">
                            {latestNotification.senderId?.name}:
                        </span>
                        <span className="text-sm">
                            {latestNotification.message.replace(latestNotification.senderId?.name, '')}
                        </span>
                    </div>
                ), {
                    duration: 4000,
                    position: 'top-right',
                    style: {
                        background: '#fff',
                        color: '#333',
                        border: '1px solid #E5E7EB',
                    },
                });
            }
        }
        setPrevUnreadCount(unreadCount);
    }, [unreadCount, notifications]);

    const handleNotificationClick = (notification) => {
        // Mark notification as read immediately
        if (!notification.isRead) {
            updateNotification({
                resource: 'notifications',
                id: notification.id || notification._id,
                values: { isRead: true },
            }, {
                onSuccess: () => {
                    // Invalidate and refetch to ensure UI is updated immediately
                    if (invalidate && typeof invalidate === 'function') {
                        invalidate({ resource: 'notifications' }).then(() => {
                            refetch();
                        }).catch(() => {
                            refetch();
                        });
                    } else {
                        refetch();
                    }
                }
            });
        }
        setShowNotifications(false);

        // Navigation Logic
        // Handle permission-related notifications - navigate to project
        const permissionTypes = ['PERMISSION_APPROVED', 'PERMISSION_REJECTED', 'PERMISSION_GRANTED', 'PERMISSION_REVOKED', 'PERMISSION_EXPIRING', 'PERMISSION_EXPIRED', 'PERMISSION_REQUESTED'];

        if (permissionTypes.includes(notification.type)) {
            // For permission notifications, extract projectId (could be object or string)
            let projectId = null;
            if (notification.projectId) {
                if (typeof notification.projectId === 'object') {
                    projectId = notification.projectId._id || notification.projectId.id;
                } else {
                    projectId = notification.projectId;
                }
            }

            if (projectId) {
                router.push(`/projects/${projectId}`);
                return;
            } else {
                // If no projectId, just go to projects list
                router.push('/projects');
                return;
            }
        }

        // Prioritize relatedId for other notifications
        const targetId = notification.relatedId || (typeof notification.taskId === 'object' ? notification.taskId._id : notification.taskId);

        if (targetId) {
            if (notification.type === 'PROJECT_ADD') {
                // Navigate to project details
                router.push(`/projects/${targetId}`);
            } else if (notification.type === 'TASK_ASSIGN') {
                // Navigate to task details
                router.push(`/tasks/${targetId}`);
            } else {
                // Default to task details
                router.push(`/tasks/${targetId}`);
            }
        } else {
            // If no target ID, navigate to appropriate list
            if (notification.type === 'PROJECT_ADD') {
                router.push('/projects');
            } else {
                router.push('/tasks');
            }
        }
    }


    return (
        <div className="w-full bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 xl:px-16 py-3 flex-shrink-0">
            <Toaster />
            <div className="flex items-center justify-between max-w-6xl mx-auto">
                {/* Left section */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Sidebar Trigger */}
                    <button onClick={() => setIsSidebarOpen((prev) => !prev)} className="sm:hidden p-2 rounded-lg transition-colors text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800" >
                        <PanelLeft size={20} />
                    </button>

                    {/* Search Input */}
                    <div className="relative flex-1 max-w-sm">
                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-3.5" />
                        <input
                            type="text"
                            placeholder="Search projects, tasks..."
                            className="pl-8 pr-4 py-2 w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>
                </div>

                {/* Right section */}
                <div className="flex items-center gap-3">

                    {/* Notifications */}
                    <div className="relative" ref={notificationsRef}>
                        <button
                            onClick={handleOpenNotifications}
                            className="p-2 rounded-lg transition-colors text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 relative"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full animate-pulse" />
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
                                <div className="p-3 border-b border-gray-200 dark:border-zinc-800">
                                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</h3>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.length > 0 ? (
                                        notifications.map((notification) => (
                                            <div
                                                key={notification.id || notification._id}
                                                onClick={() => handleNotificationClick(notification)}
                                                className={`p-3 border-b border-gray-100 dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                            >
                                                <div className="flex gap-3">
                                                    <UserAvatar user={notification.senderId} className="size-8" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-gray-900 dark:text-zinc-200 line-clamp-2">
                                                            <span className="font-medium">{notification.senderId?.name}</span> {notification.message.replace(notification.senderId?.name, '')}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                                                            {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                                                        </p>
                                                    </div>
                                                    {!notification.isRead && (
                                                        <div className="size-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-sm text-gray-500 dark:text-zinc-400">
                                            No notifications
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Theme Toggle */}
                    <button onClick={() => dispatch(toggleTheme())} className="size-8 flex items-center justify-center bg-white dark:bg-zinc-800 shadow rounded-lg transition hover:scale-105 active:scale-95">
                        {
                            theme === "light"
                                ? (<MoonIcon className="size-4 text-gray-800 dark:text-gray-200" />)
                                : (<SunIcon className="size-4 text-yellow-400" />)
                        }
                    </button>

                    {/* User Info & Profile */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                            className="flex items-center gap-2 p-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
                            title="Profile"
                        >
                            {user && (
                                <div className="hidden sm:flex flex-col items-end">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {user.name || user.email}
                                    </span>
                                    {user.role && (
                                        <span className="text-xs text-gray-500 dark:text-zinc-400">
                                            {roleLabels[user.role] || user.role}
                                        </span>
                                    )}
                                </div>
                            )}
                            <UserAvatar
                                user={user}
                                className="size-8 border-2 border-gray-200 dark:border-zinc-700 cursor-pointer"
                            />
                        </button>

                        {showProfileDropdown && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
                                <div className="p-2">
                                    <button
                                        onClick={() => {
                                            setShowProfileSettings(true);
                                            setShowProfileDropdown(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors rounded-lg"
                                    >
                                        <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">Profile Settings</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">Update your profile</div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowProfileDropdown(false);
                                            logout();
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-lg text-red-600 dark:text-red-400"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <div>
                                            <div className="text-sm font-medium">Logout</div>
                                            <div className="text-xs opacity-75">Sign out of your account</div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Profile Settings Dialog */}
            <ProfileSettingsDialog 
                isOpen={showProfileSettings} 
                onClose={() => setShowProfileSettings(false)} 
            />
        </div>
    )
}

export default Navbar
