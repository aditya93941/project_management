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
import Layout from '../src/components/Layout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export function Providers({ children }) {
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
        <Layout>{children}</Layout>
        <RefineKbar />
      </Refine>
      </Provider>
    </RefineKbarProvider>
    </QueryClientProvider>
  )
}

