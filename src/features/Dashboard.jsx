'use client'

// Force dynamic rendering - this page uses React Query hooks that require QueryClientProvider
export const dynamic = 'force-dynamic'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import StatsGrid from '../components/StatsGrid'
import ProjectOverview from '../components/ProjectOverview'
import RecentActivity from '../components/RecentActivity'
import TasksSummary from '../components/TasksSummary'
import CreateProjectDialog from '../components/CreateProjectDialog'
import PermissionRequestsSection from '../components/PermissionRequestsSection'
import { useGetIdentity } from '@refinedev/core'
import { UserRole, hasMinimumRole } from '../utils/roles'

const Dashboard = () => {
    const { data: user } = useGetIdentity()
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    return (
        <div className='max-w-6xl mx-auto'>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 ">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1"> Welcome back, {user?.name || user?.fullName || 'User'} </h1>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm"> Here's what's happening with your projects today </p>
                </div>

                {/* Only show "New Project" button for Team Leads, Group Heads, and Managers */}
                {hasMinimumRole(user?.role, UserRole.TEAM_LEAD) && (
                    <>
                        <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 px-5 py-2 text-sm rounded bg-gradient-to-br from-red-500 to-red-600 text-white space-x-2 hover:opacity-90 transition" >
                            <Plus size={16} /> New Project
                        </button>
                        <CreateProjectDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
                    </>
                )}
            </div>

            <StatsGrid />

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <ProjectOverview />
                    <RecentActivity />
                </div>
                <div>
                    <TasksSummary />
                </div>
            </div>

            {/* Permission Requests Section (for Developers) */}
            <div className="mt-8">
                <PermissionRequestsSection />
            </div>
        </div>
    )
}

export default Dashboard

