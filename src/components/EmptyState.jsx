'use client'

import { Inbox, FileText, Search, FolderOpen, Users, Calendar } from 'lucide-react'

/**
 * Empty State Components
 * Provides helpful empty states for different scenarios
 */

const EmptyState = ({ 
  icon: Icon = Inbox, 
  title, 
  description, 
  action, 
  className = '' 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export const EmptyProjects = ({ onCreateProject }) => {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No projects yet"
      description="Get started by creating your first project. Projects help you organize tasks and track progress."
      action={
        onCreateProject && (
          <button
            onClick={onCreateProject}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            aria-label="Create new project"
          >
            Create Project
          </button>
        )
      }
    />
  )
}

export const EmptyTasks = ({ onCreateTask, projectName }) => {
  return (
    <EmptyState
      icon={FileText}
      title={projectName ? `No tasks in ${projectName}` : "No tasks yet"}
      description="Create tasks to track work, assign team members, and monitor progress."
      action={
        onCreateTask && (
          <button
            onClick={onCreateTask}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            aria-label="Create new task"
          >
            Create Task
          </button>
        )
      }
    />
  )
}

export const EmptySearch = ({ searchTerm }) => {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`We couldn't find anything matching "${searchTerm}". Try adjusting your search terms.`}
    />
  )
}

export const EmptyTeam = ({ onInviteMember }) => {
  return (
    <EmptyState
      icon={Users}
      title="No team members"
      description="Invite team members to collaborate on projects and assign tasks."
      action={
        onInviteMember && (
          <button
            onClick={onInviteMember}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            aria-label="Invite team member"
          >
            Invite Member
          </button>
        )
      }
    />
  )
}

export const EmptyReports = ({ onCreateReport }) => {
  return (
    <EmptyState
      icon={Calendar}
      title="No reports yet"
      description="Start tracking your daily work by creating an EOD (End of Day) report."
      action={
        onCreateReport && (
          <button
            onClick={onCreateReport}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            aria-label="Create EOD report"
          >
            Create Report
          </button>
        )
      }
    />
  )
}

export const EmptyNotifications = () => {
  return (
    <EmptyState
      icon={Inbox}
      title="No notifications"
      description="You're all caught up! New notifications will appear here."
    />
  )
}

export default EmptyState

