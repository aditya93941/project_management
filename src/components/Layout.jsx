'use client'

import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useIsAuthenticated } from '@refinedev/core'
import { loadTheme } from '../features/themeSlice'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import LoginForm from './LoginForm'
import { PageSkeleton } from './LoadingSkeleton'

const Layout = ({ children }) => {
    const { data: authenticated, isLoading: authLoading } = useIsAuthenticated()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [authChecked, setAuthChecked] = useState(false)
    const [hasToken, setHasToken] = useState(false)
    const dispatch = useDispatch()

    // Check token and update state
    const checkToken = () => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token')
            const tokenExists = !!token && token.trim() !== ''
            setHasToken(tokenExists)
            return tokenExists
        }
        return false
    }

    // Check token immediately on client side
    useEffect(() => {
        checkToken()
    }, [])

    // Re-check token when authenticated state changes
    useEffect(() => {
        if (authenticated !== undefined) {
            checkToken()
            setAuthChecked(true)
        }
    }, [authenticated])

    // Listen for storage changes and custom events (when token is set/removed)
    useEffect(() => {
        const handleTokenChange = () => {
            checkToken()
            // Force re-check authentication only on actual token changes
            // Don't reset authChecked immediately - let useIsAuthenticated handle it
            // This prevents unnecessary re-renders
        }

        window.addEventListener('storage', handleTokenChange)
        window.addEventListener('auth-token-changed', handleTokenChange)

        return () => {
            window.removeEventListener('storage', handleTokenChange)
            window.removeEventListener('auth-token-changed', handleTokenChange)
        }
    }, [])

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [dispatch])

    // Track when authentication check is complete
    useEffect(() => {
        if (authenticated !== undefined) {
            // Small delay to ensure state is properly set
            const timer = setTimeout(() => {
                setAuthChecked(true)
            }, 50)
            return () => clearTimeout(timer)
        }
    }, [authenticated])

    // Timeout fallback - if auth check takes too long, proceed anyway
    // Reduced to 2 seconds since we now have optimistic auth check
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!authChecked) {
                console.warn('[Layout] Auth check timeout - proceeding anyway')
                setAuthChecked(true)
            }
        }, 2000) // 2 second timeout (reduced from 5s due to optimistic check)

        return () => clearTimeout(timeout)
    }, [authChecked])

    // Show loading state while checking authentication (with timeout protection)
    // Only show loading if we have a token (user might be authenticated)
    // If no token, we can proceed to login immediately
    if (hasToken && (!authChecked || authenticated === undefined || authLoading)) {
        return <PageSkeleton />
    }

    // If no token, show login immediately (don't wait for auth check)
    if (!hasToken) {
        return <LoginForm />
    }

    // Show login form ONLY if explicitly not authenticated
    // Don't show login if authenticated is undefined (still checking) or true
    // This prevents the login flash on page reload
    if (authenticated === false && authChecked) {
        return <LoginForm />
    }

    // If we have a token but auth check is still pending, show loading
    // This handles the edge case where token exists but check hasn't completed
    if (hasToken && !authChecked && authenticated === undefined) {
        return <PageSkeleton />
    }

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default Layout

