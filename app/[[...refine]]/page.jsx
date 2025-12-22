'use client'

// Note: Route segment config exports (dynamic, revalidate, etc.) are only valid in Server Components
// Since this is a Client Component, it will be dynamically rendered by default
// The app/layout.jsx already has the correct configuration for the root route

import { Suspense } from 'react'
import dynamicImport from 'next/dynamic'
import { useResource, useNavigation, useIsAuthenticated, useGetIdentity } from '@refinedev/core'
import { usePathname, useSearchParams } from 'next/navigation'
import { PageSkeleton } from '../../src/components/LoadingSkeleton'

// CRITICAL: Dynamically import all pages with ssr: false AND loading: undefined
// This prevents Next.js from analyzing them during build time
// Using a function that returns the import ensures true lazy loading
const createLazyComponent = (importFn) => {
  return dynamicImport(importFn, { 
    ssr: false,
    loading: () => null, // No loading state during build
  })
}

const Dashboard = createLazyComponent(() => import('../../src/features/Dashboard.jsx'))
const Projects = createLazyComponent(() => import('../../src/features/Projects'))
const ProjectDetails = createLazyComponent(() => import('../../src/features/ProjectDetails'))
const Team = createLazyComponent(() => import('../../src/features/Team'))
const TaskDetails = createLazyComponent(() => import('../../src/features/TaskDetails'))
const AdminPanel = createLazyComponent(() => import('../../src/features/AdminPanel'))
const EODReports = createLazyComponent(() => import('../../src/features/EODReports'))
const EODManagerView = createLazyComponent(() => import('../../src/features/EODManagerView'))
const LoginForm = createLazyComponent(() => import('../../src/components/LoginForm'))

// Separate component that uses useSearchParams to fix Suspense requirement
function RefinePageContent() {
  const { resource, action, id } = useResource()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Authentication is handled by Layout component
  // No need to duplicate auth checks here

  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('[RefinePage] Route info:', { pathname, resource: resource?.name, action, id })
  }

  // Handle dashboard route
  if (pathname === '/' || resource?.name === 'dashboard' || !pathname) {
    return <Dashboard />
  }

  // Handle projects resource
  if (resource?.name === 'projects') {
    if (action === 'list' || pathname === '/projects') {
      return <Projects />
    }
    if (action === 'show' && id) {
      const tab = searchParams?.get('tab') || 'tasks'
      return <ProjectDetails id={id} tab={tab} />
    }
    if (action === 'create') {
      // You can create a CreateProject page or redirect
      return <Projects />
    }
    if (action === 'edit' && id) {
      // You can create an EditProject page or use ProjectDetails
      return <ProjectDetails id={id} tab="settings" />
    }
  }

  // Handle team resource
  if (resource?.name === 'team' || pathname === '/team') {
    return <Team />
  }

  // Handle admin panel
  if (pathname === '/admin') {
    return <AdminPanel />
  }

  // Handle EOD reports
  if (resource?.name === 'eod-reports' || pathname === '/eod-reports') {
    // Check if user is manager/group head - show manager view
    const { data: user } = useGetIdentity()
    const isManager = user?.role === 'MANAGER' || user?.role === 'GROUP_HEAD'
    
    if (isManager && (pathname === '/eod-reports' || pathname === '/eod-reports/manager')) {
      return <EODManagerView />
    }
    
    return <EODReports />
  }

  // Handle tasks resource
  if (resource?.name === 'tasks') {
    if (action === 'list' || pathname === '/tasks') {
      return <TaskDetails projectId={searchParams?.get('projectId')} taskId={searchParams?.get('taskId')} />
    }
    if (action === 'show' && id) {
      return <TaskDetails projectId={searchParams?.get('projectId')} taskId={id} />
    }
  }

  // Fallback to dashboard
  return <Dashboard />
}

// Main component wrapped in Suspense for useSearchParams
export default function RefinePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RefinePageContent />
    </Suspense>
  )
}

