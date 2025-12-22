'use client'

import { useEffect } from 'react'
import { useIsAuthenticated } from '@refinedev/core'
import { useRouter } from 'next/navigation'
import LoginForm from './LoginForm'
import { PageSkeleton } from './LoadingSkeleton'

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
        return <PageSkeleton />
    }

    // Show login if not authenticated
    if (authenticated === false || !hasToken) {
        return <LoginForm />
    }

    // User is authenticated, render children
    return <>{children}</>
}

export default AuthGuard

