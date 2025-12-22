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

export default {
  Card: CardSkeleton,
  Table: TableSkeleton,
  List: ListSkeleton,
  ProjectCard: ProjectCardSkeleton,
  Task: TaskSkeleton,
  Form: FormSkeleton,
}

