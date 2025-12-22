'use client'

import { useRouter } from 'next/navigation'
import { ShieldX, ArrowLeft } from 'lucide-react'

const AccessDenied = ({ message = 'You do not have access to this resource.' }) => {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <ShieldX className="size-16 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Access Denied
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="size-4 mr-2" />
          Go to Dashboard
        </button>
      </div>
    </div>
  )
}

export default AccessDenied

