'use client'

import { useState } from 'react'
import { Shield, Plus } from 'lucide-react'
import { useGetIdentity } from '@refinedev/core'
import RequestPermissionDialog from './RequestPermissionDialog'
import MyPermissionRequests from './MyPermissionRequests'
import { UserRole } from '../utils/roles'

const PermissionRequestsSection = () => {
  const { data: user } = useGetIdentity()
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Only show for developers
  if (user?.role !== UserRole.DEVELOPER) {
    return null
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            Task Assignment Permissions
          </h2>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
            Request temporary permission to assign tasks to other developers
          </p>
        </div>
        <button
          onClick={() => setShowRequestDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Request Permission
        </button>
      </div>

      <MyPermissionRequests
        refreshTrigger={refreshTrigger}
      />

      <RequestPermissionDialog
        show={showRequestDialog}
        setShow={setShowRequestDialog}
        onSuccess={() => {
          setRefreshTrigger((prev) => prev + 1)
        }}
      />
    </div>
  )
}

export default PermissionRequestsSection

