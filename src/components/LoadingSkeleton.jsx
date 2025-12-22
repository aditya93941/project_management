'use client'

/**
 * Loading Skeleton Components
 * Provides consistent loading states across the application
 */

export const CardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 animate-pulse">
      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4 mb-4"></div>
      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-full mb-2"></div>
      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6"></div>
    </div>
  )
}

export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded flex-1"
            ></div>
          ))}
        </div>
      ))}
    </div>
  )
}

export const ListSkeleton = ({ items = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
        </div>
      ))}
    </div>
  )
}

export const ProjectCardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2"></div>
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16"></div>
      </div>
      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full mb-2"></div>
      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4 mb-4"></div>
      <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
    </div>
  )
}

export const TaskSkeleton = () => {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3"></div>
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16"></div>
      </div>
      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-full mb-2"></div>
      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6"></div>
    </div>
  )
}

export const FormSkeleton = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24 mb-2"></div>
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
        </div>
      ))}
    </div>
  )
}

// New skeleton components for specific use cases
export const StatsGridSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24 mb-3"></div>
              <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-16"></div>
            </div>
            <div className="h-12 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export const ProjectOverviewSkeleton = () => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden animate-pulse">
      <div className="border-b border-zinc-200 dark:border-zinc-800 p-4">
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-32"></div>
      </div>
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full mb-1"></div>
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
              </div>
              <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-20"></div>
            </div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32 mb-3"></div>
            <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const TasksSummarySkeleton = () => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden animate-pulse">
      <div className="border-b border-zinc-200 dark:border-zinc-800 p-4">
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-24"></div>
      </div>
      <div className="p-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
        ))}
      </div>
    </div>
  )
}

export const RecentActivitySkeleton = () => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden animate-pulse">
      <div className="border-b border-zinc-200 dark:border-zinc-800 p-4">
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-32"></div>
      </div>
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full mb-2"></div>
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-32"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const TeamTableSkeleton = () => {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-zinc-800 animate-pulse">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
        <thead className="bg-gray-50 dark:bg-black/50">
          <tr>
            <th className="px-6 py-2.5 text-left">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16"></div>
            </th>
            <th className="px-6 py-2.5 text-left">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20"></div>
            </th>
            <th className="px-6 py-2.5 text-left">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16"></div>
            </th>
            <th className="px-6 py-2.5 text-right">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20 ml-auto"></div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-900/50">
              <td className="px-6 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32"></div>
                </div>
              </td>
              <td className="px-6 py-2.5">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-40"></div>
              </td>
              <td className="px-6 py-2.5">
                <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-20"></div>
              </td>
              <td className="px-6 py-2.5 text-right">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-8 ml-auto"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const ProjectDetailsSkeleton = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 animate-pulse">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
        <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full mb-2"></div>
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6"></div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export const TaskDetailsSkeleton = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 animate-pulse">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
        <div className="h-7 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3 mb-4"></div>
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full mb-2"></div>
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
      </div>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const EODSummarySkeleton = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6"
        >
          <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export const EODManagerSkeleton = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 animate-pulse">
      <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-48 mb-2"></div>
      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-64"></div>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6"
          >
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full mb-2"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const PageSkeleton = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse"></div>
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-32 mx-auto"></div>
      </div>
    </div>
  )
}

export default {
  Card: CardSkeleton,
  Table: TableSkeleton,
  List: ListSkeleton,
  ProjectCard: ProjectCardSkeleton,
  Task: TaskSkeleton,
  Form: FormSkeleton,
  StatsGrid: StatsGridSkeleton,
  ProjectOverview: ProjectOverviewSkeleton,
  TasksSummary: TasksSummarySkeleton,
  RecentActivity: RecentActivitySkeleton,
  TeamTable: TeamTableSkeleton,
  ProjectDetails: ProjectDetailsSkeleton,
  TaskDetails: TaskDetailsSkeleton,
  EODSummary: EODSummarySkeleton,
  EODManager: EODManagerSkeleton,
  Page: PageSkeleton,
}

