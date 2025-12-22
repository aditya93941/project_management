'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Refine } from '@refinedev/core'
import { RefineKbar, RefineKbarProvider } from '@refinedev/kbar'
import routerProvider from '@refinedev/nextjs-router'
import { Provider } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import { dataProvider } from '../src/providers/dataProvider'
import { authProvider } from '../src/providers/authProvider'
import { store } from '../src/store'
import dynamic from 'next/dynamic'
import ErrorBoundary from '../src/components/ErrorBoundary'
import { getApiUrl } from '../src/constants'

// Lazy load Layout for code splitting
const Layout = dynamic(() => import('../src/components/Layout'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

export function Providers({ children }) {
  // ✅ Get API URL inside component - safe for SSR (only runs on client)
  const API_URL = getApiUrl()
  
  // Create QueryClient instance - useState ensures it's only created once
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <RefineKbarProvider>
        <Provider store={store}>
          <Refine
        routerProvider={routerProvider}
        dataProvider={dataProvider(API_URL)}
        authProvider={authProvider(API_URL)}
        resources={[
          {
            name: 'dashboard',
            list: '/',
            meta: {
              label: 'Dashboard',
            },
          },
          {
            name: 'projects',
            list: '/projects',
            show: '/projects/:id',
            create: '/projects/create',
            edit: '/projects/:id/edit',
            meta: {
              label: 'Projects',
            },
          },
          {
            name: 'workspaces',
            list: '/workspaces',
            show: '/workspaces/:id',
            meta: {
              label: 'Workspaces',
            },
          },
          {
            name: 'team',
            list: '/team',
            meta: {
              label: 'Team',
            },
          },
          {
            name: 'tasks',
            list: '/tasks',
            show: '/tasks/:id',
            create: '/tasks/create',
            edit: '/tasks/:id/edit',
            meta: {
              label: 'Tasks',
            },
          },
          {
            name: 'eod-reports',
            list: '/eod-reports',
            meta: {
              label: 'EOD Reports',
            },
          },
        ]}
        options={{
          syncWithLocation: true,
          warnWhenUnsavedChanges: true,
        }}
      >
        <Toaster />
        <ErrorBoundary>
          <Layout>{children}</Layout>
        </ErrorBoundary>
        <RefineKbar />
      </Refine>
      </Provider>
    </RefineKbarProvider>
    </QueryClientProvider>
  )
}

