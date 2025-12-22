'use client'

// Force dynamic rendering - this page uses React Query hooks that require QueryClientProvider
export const dynamic = 'force-dynamic'

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, FolderOpen } from "lucide-react";
import ProjectCard from "../components/ProjectCard";
import CreateProjectDialog from "../components/CreateProjectDialog";
import { ProjectCardSkeleton } from "../components/LoadingSkeleton";
import { useList, useIsAuthenticated, useGetIdentity } from '@refinedev/core'
import { hasMinimumRole, UserRole } from '../utils/roles'

export default function Projects() {
    const { data: authenticated, isLoading: authLoading } = useIsAuthenticated()
    const { data: user } = useGetIdentity()

    const canCreateProject = hasMinimumRole(user?.role, UserRole.TEAM_LEAD)

    // Check token directly - more reliable than waiting for auth check
    const [hasToken, setHasToken] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token')
            const tokenExists = !!token && token.trim() !== ''
            setHasToken(tokenExists)
        }
    }, [])

    // Re-check token when authenticated state changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token')
            const tokenExists = !!token && token.trim() !== ''
            setHasToken(tokenExists)
        }
    }, [authenticated])

    // Enable query if we have a token (don't wait for auth check to complete)
    // This allows the request to be made immediately if token exists
    const shouldFetch = hasToken && !authLoading

    const { data: projectsData, isLoading, isError, error } = useList({
        resource: 'projects',
        pagination: {
            pageSize: 100, // Max items per page
        },
        queryOptions: {
            enabled: shouldFetch,
            retry: 1, // Only retry once
            refetchOnWindowFocus: false, // Don't refetch on window focus
        },
    })

    const projects = projectsData?.data || []

    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: "ALL",
        priority: "ALL",
    });

    const filteredProjects = useMemo(() => {
        let filtered = projects;

        if (searchTerm) {
            filtered = filtered.filter(
                (project) =>
                    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filters.status !== "ALL") {
            filtered = filtered.filter((project) => project.status === filters.status);
        }

        if (filters.priority !== "ALL") {
            filtered = filtered.filter(
                (project) => project.priority === filters.priority
            );
        }

        return filtered;
    }, [projects, searchTerm, filters]);

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1"> Projects </h1>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm"> Manage and track your projects </p>
                </div>
                {canCreateProject && (
                    <button
                        onClick={() => setIsDialogOpen(true)}
                        className="flex items-center px-5 py-2 text-sm rounded bg-gradient-to-br from-red-500 to-red-600 text-white hover:opacity-90 transition"
                        aria-label="Create new project"
                    >
                        <Plus className="size-4 mr-2" /> New Project
                    </button>
                )}
                <CreateProjectDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-400 w-4 h-4" />
                    <input
                        onChange={(e) => setSearchTerm(e.target.value)}
                        value={searchTerm}
                        className="w-full pl-10 text-sm pr-4 py-2 rounded-lg bg-white dark:bg-black border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 focus:border-red-500 outline-none"
                        placeholder="Search projects..."
                        aria-label="Search projects"
                    />
                </div>
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-3 py-2 rounded-lg bg-white dark:bg-black border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white text-sm" >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PLANNING">Planning</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
                <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="px-3 py-2 rounded-lg bg-white dark:bg-black border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white text-sm" >
                    <option value="ALL">All Priority</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                </select>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <ProjectCardSkeleton key={i} />
                        ))}
                    </>
                ) : isError ? (
                    <div className="col-span-full text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                            <FolderOpen className="w-12 h-12 text-red-400 dark:text-red-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            Error loading projects
                        </h3>
                        <p className="text-gray-500 dark:text-zinc-400 mb-6 text-sm">
                            {error?.message || 'Failed to load projects'}
                        </p>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <FolderOpen className="w-12 h-12 text-gray-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            No projects found
                        </h3>
                        <p className="text-gray-500 dark:text-zinc-400 mb-6 text-sm">
                            {projects.length === 0
                                ? 'Create your first project to get started'
                                : 'No projects match your filters'}
                        </p>
                        {canCreateProject && (
                            <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded mx-auto text-sm" >
                                <Plus className="size-4" />
                                Create Project
                            </button>
                        )}
                    </div>
                ) : (
                    filteredProjects.map((project) => (
                        <ProjectCard key={project.id || project._id} project={project} />
                    ))
                )}
            </div>
        </div>
    );
}

