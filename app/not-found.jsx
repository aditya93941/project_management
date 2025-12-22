'use client'

// Mark not-found page as dynamic
export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { PageSkeleton } from '../src/components/LoadingSkeleton'

function NotFoundContent() {
  const pathname = usePathname()
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Page not found: {pathname || 'Unknown'}
      </p>
      <a
        href="/"
        className="px-4 py-2 rounded bg-gradient-to-br from-red-500 to-red-600 text-white hover:opacity-90 transition"
      >
        Go to Dashboard
      </a>
    </div>
  )
}

export default function NotFound() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NotFoundContent />
    </Suspense>
  )
}

