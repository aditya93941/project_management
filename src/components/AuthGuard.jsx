'use client'

import { useEffect } from 'react'
import { useIsAuthenticated } from '@refinedev/core'
import { useRouter } from 'next/navigation'
import LoginForm from './LoginForm'
import { Loader2Icon } from 'lucide-react'

/**
 * AuthGuard component - Protects routes by checking authentication
 * Shows login form if not authenticated, otherwise renders children
 */
const AuthGuard = ({ children }) => {
    const { data: authenticated, isLoading } = useIsAuthenticated()
    const router = useRouter()

    // Check token immediately
    const hasToken = typeof window !== 'undefined' ? !!localStorage.getItem('auth_token') : false

    // Show loading while checking
    if (isLoading || authenticated === undefined) {
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-7 text-red-500 animate-spin" />
            </div>
        )
    }

    // Show login if not authenticated
    if (authenticated === false || !hasToken) {
        return <LoginForm />
    }

    // User is authenticated, render children
    return <>{children}</>
}

export default AuthGuard

