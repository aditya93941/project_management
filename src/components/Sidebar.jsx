'use client'

import { useEffect, useRef } from 'react'
import { useNavigation, useResource, useGetIdentity } from '@refinedev/core'
import { usePathname, useRouter } from 'next/navigation'
import MyTasksSidebar from './MyTasksSidebar'
import ProjectSidebar from './ProjectsSidebar'
import { FolderOpenIcon, LayoutDashboardIcon, SettingsIcon, UsersIcon, Shield, FileText } from 'lucide-react'
import { UserRole, hasMinimumRole } from '../utils/roles'

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
    const { list } = useNavigation()
    const pathname = usePathname()
    const router = useRouter()
    const { data: user } = useGetIdentity()
    const isSuperAdmin = user?.role === 'MANAGER'

    const menuItems = [
        { name: 'Dashboard', resource: 'dashboard', icon: LayoutDashboardIcon },
        { name: 'Projects', resource: 'projects', icon: FolderOpenIcon },
        { name: 'Team', resource: 'team', icon: UsersIcon },
    ]

    // Add EOD Reports for developers and managers
    if (user?.role === UserRole.DEVELOPER || hasMinimumRole(user?.role, UserRole.GROUP_HEAD)) {
        menuItems.push({ name: 'EOD Reports', resource: 'eod-reports', icon: FileText })
    }

    const sidebarRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setIsSidebarOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setIsSidebarOpen]);

    return (
        <div ref={sidebarRef} className={`z-10 bg-white dark:bg-zinc-900 min-w-68 flex flex-col h-screen border-r border-gray-200 dark:border-zinc-800 max-sm:absolute transition-all ${isSidebarOpen ? 'left-0' : '-left-full'} `} >
            <div className='flex-1 overflow-y-scroll no-scrollbar flex flex-col'>
                <div>
                    {/* Logo */}
                    <div className='p-4 border-b border-gray-200 dark:border-zinc-800'>
                        <img 
                            src="/logo.svg" 
                            alt="P2 Internal Tool" 
                            className="h-10 w-auto"
                        />
                    </div>
                    <div className='p-4'>
                        {menuItems.map((item) => {
                            const isActive = pathname === '/' && item.resource === 'dashboard' 
                                ? true 
                                : item.resource !== 'dashboard' && pathname?.startsWith(`/${item.resource}`)
                            return (
                                <button
                                    onClick={() => {
                                        if (item.resource === 'dashboard') {
                                            router.push('/')
                                        } else if (item.resource === 'eod-reports') {
                                            router.push('/eod-reports')
                                        } else {
                                            list(item.resource)
                                        }
                                    }}
                                    key={item.name} 
                                    className={`flex items-center gap-3 py-2 px-4 text-gray-800 dark:text-zinc-100 cursor-pointer rounded transition-all w-full text-left hover:bg-gray-50 dark:hover:bg-zinc-800/60 ${isActive ? 'bg-gray-100 dark:bg-zinc-800' : ''}`} 
                                >
                                    <item.icon size={16} />
                                    <p className='text-sm truncate'>{item.name}</p>
                                </button>
                            )
                        })}
                        {isSuperAdmin && (
                            <button
                                onClick={() => router.push('/admin')}
                                className={`flex items-center gap-3 py-2 px-4 text-gray-800 dark:text-zinc-100 cursor-pointer rounded transition-all w-full text-left hover:bg-gray-50 dark:hover:bg-zinc-800/60 ${pathname === '/admin' ? 'bg-gray-100 dark:bg-zinc-800' : ''}`}
                            >
                                <Shield size={16} />
                                <p className='text-sm truncate'>Admin Panel</p>
                            </button>
                        )}
                        <button className='flex w-full items-center gap-3 py-2 px-4 text-gray-800 dark:text-zinc-100 cursor-pointer rounded hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-all'>
                            <SettingsIcon size={16} />
                            <p className='text-sm truncate'>Settings</p>
                        </button>
                    </div>
                    <MyTasksSidebar />
                    <ProjectSidebar />
                </div>
            </div>
        </div>
    )
}

export default Sidebar
