'use client'

// Force dynamic rendering - this page uses React Query hooks that require QueryClientProvider
export const dynamic = 'force-dynamic'

import { useState, useMemo, useEffect } from "react";
import { UsersIcon, Search, UserPlus, Shield, Activity } from "lucide-react";
import InviteMemberDialog from "../components/InviteMemberDialog";
import UserAvatar from "../components/UserAvatar";
import { useList, useIsAuthenticated, useGetIdentity } from '@refinedev/core';
import { hasMinimumRole, UserRole } from '../utils/roles';
import { TeamTableSkeleton, ListSkeleton } from '../components/LoadingSkeleton';

const Team = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 50; // Same as AdminPanel for consistency
    const { data: authenticated, isLoading: authLoading } = useIsAuthenticated();
    const { data: user } = useGetIdentity();
    
    // Check if user has permission to invite members (GROUP_HEAD or higher)
    const canInviteMembers = hasMinimumRole(user?.role, UserRole.GROUP_HEAD);
    
    // Check token directly as fallback
    const [hasToken, setHasToken] = useState(false)
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token')
            setHasToken(!!token && token.trim() !== '')
        }
    }, [authenticated])
    
    // Standardized enabled condition
    const shouldFetch = hasToken && !authLoading
    
    const { data: usersData, isLoading: isLoadingUsers } = useList({
        resource: 'users',
        pagination: {
            current: currentPage,
            pageSize: pageSize,
        },
        queryOptions: {
            enabled: shouldFetch,
        },
    })
    
    const { data: projectsData, isLoading: isLoadingProjects } = useList({
        resource: 'projects',
        queryOptions: {
            enabled: shouldFetch,
        },
    })
    
    const users = usersData?.data || []
    const totalUsers = usersData?.total || 0
    const totalPages = Math.ceil(totalUsers / pageSize)
    const projects = projectsData?.data || []
    const isLoading = isLoadingUsers || isLoadingProjects

    const filteredUsers = useMemo(() => {
        // If searching, filter the current page's users
        // Note: For better UX, you might want to implement server-side search
        if (!searchTerm.trim()) {
            return users;
        }
        return users.filter(
            (user) =>
                user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    // Reset to page 1 when search term changes
    useEffect(() => {
        if (searchTerm.trim()) {
            setCurrentPage(1);
        }
    }, [searchTerm]);

    const tasks = useMemo(() => {
        return projects.reduce((acc, project) => [...acc, ...(project.tasks || [])], []) || [];
    }, [projects]);

    const handleInviteClick = () => {
        setUserToEdit(null);
        setIsDialogOpen(true);
    };

    const handleEditClick = (user) => {
        setUserToEdit(user);
        setIsDialogOpen(true);
    };

    const roleLabels = {
        'MANAGER': 'Manager',
        'GROUP_HEAD': 'Group Head',
        'TEAM_LEAD': 'Team Lead',
        'DEVELOPER': 'Developer'
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1">Team</h1>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm">
                        Manage team members and their contributions
                    </p>
                </div>
                {canInviteMembers && (
                    <>
                        <button onClick={handleInviteClick} className="flex items-center px-5 py-2 rounded text-sm bg-gradient-to-br from-red-500 to-red-600 hover:opacity-90 text-white transition" >
                            <UserPlus className="w-4 h-4 mr-2" /> Add Team Member
                        </button>
                        <InviteMemberDialog 
                            isDialogOpen={isDialogOpen} 
                            setIsDialogOpen={setIsDialogOpen} 
                            userToEdit={userToEdit}
                        />
                    </>
                )}
            </div>

            {/* Stats Cards */}
            <div className="flex flex-wrap gap-4">
                {/* Total Members */}
                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Total Members</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{totalUsers}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-blue-100 dark:bg-red-500/10">
                            <UsersIcon className="size-4 text-red-500 dark:text-blue-200" />
                        </div>
                    </div>
                </div>

                {/* Active Projects */}
                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Active Projects</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {projects.filter((p) => p.status !== "CANCELLED" && p.status !== "COMPLETED").length}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-yellow-500/10">
                            <Activity className="size-4 text-yellow-500 dark:text-emerald-200" />
                        </div>
                    </div>
                </div>

                {/* Total Tasks */}
                <div className="max-sm:w-full dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-gray-300 dark:border-zinc-800 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-8 md:gap-22">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Total Tasks</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{tasks.length}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-500/10">
                            <Shield className="size-4 text-purple-500 dark:text-purple-200" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-3" />
                <input placeholder="Search team members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 w-full text-sm rounded-md bg-white dark:bg-black border border-gray-300 dark:border-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 py-2 focus:outline-none focus:border-red-500" />
            </div>

            {/* Team Members */}
            <div className="w-full">
                {isLoading ? (
                    <>
                        <div className="hidden sm:block">
                            <TeamTableSkeleton />
                        </div>
                        <div className="sm:hidden space-y-3">
                            <ListSkeleton items={5} />
                        </div>
                    </>
                ) : filteredUsers.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <UsersIcon className="w-12 h-12 text-gray-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {users.length === 0
                                ? "No team members yet"
                                : "No members match your search"}
                        </h3>
                        <p className="text-gray-500 dark:text-zinc-400 mb-6">
                            {users.length === 0
                                ? "Invite team members to start collaborating"
                                : "Try adjusting your search term"}
                        </p>
                    </div>
                ) : (
                    <div className="max-w-4xl w-full">
                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto rounded-md border border-gray-200 dark:border-zinc-800">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                <thead className="bg-gray-50 dark:bg-black/50">
                                    <tr>
                                        <th className="px-6 py-2.5 text-left font-medium text-sm">
                                            Name
                                        </th>
                                        <th className="px-6 py-2.5 text-left font-medium text-sm">
                                            Email
                                        </th>
                                        <th className="px-6 py-2.5 text-left font-medium text-sm">
                                            Role
                                        </th>
                                        {canInviteMembers && (
                                            <th className="px-6 py-2.5 text-right font-medium text-sm">
                                                Actions
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                                    {filteredUsers.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors"
                                        >
                                            <td className="px-6 py-2.5 whitespace-nowrap flex items-center gap-3">
                                                <UserAvatar user={user} className="size-7" />
                                                <span className="text-sm text-zinc-800 dark:text-white truncate">
                                                    {user?.name || "Unknown User"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-zinc-400">
                                                {user.email}
                                            </td>
                                            <td className="px-6 py-2.5 whitespace-nowrap">
                                                <span className="px-2 py-1 text-xs rounded-md bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300">
                                                    {roleLabels[user.role] || user.role}
                                                </span>
                                            </td>
                                            {canInviteMembers && (
                                                <td className="px-6 py-2.5 whitespace-nowrap text-right">
                                                    <button 
                                                        onClick={() => handleEditClick(user)}
                                                        className="p-1.5 text-gray-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors"
                                                        title="Edit Member"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="sm:hidden space-y-3">
                            {filteredUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className="p-4 border border-gray-200 dark:border-zinc-800 rounded-md bg-white dark:bg-black"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar user={user} className="size-9" />
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {user?.name || "Unknown User"}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-zinc-400">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                        {canInviteMembers && (
                                            <button 
                                                onClick={() => handleEditClick(user)}
                                                className="p-2 text-gray-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                            </button>
                                        )}
                                    </div>
                                    <div>
                                        <span className="px-2 py-1 text-xs rounded-md bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300">
                                            {roleLabels[user.role] || user.role}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pagination Controls */}
                {!isLoading && filteredUsers.length > 0 && totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-zinc-800">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} members
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Team;

