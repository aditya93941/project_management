import { AuthProvider } from '@refinedev/core'

// Cache for authentication state to avoid excessive API calls
// Try to restore from sessionStorage on initialization
const getCachedAuth = (): {
  authenticated: boolean | null
  timestamp: number
  token: string | null
} => {
  if (typeof window === 'undefined') {
    return { authenticated: null, timestamp: 0, token: null }
  }
  
  try {
    const cached = sessionStorage.getItem('auth_cache')
    if (cached) {
      const parsed = JSON.parse(cached)
      const now = Date.now()
      // Only use cache if it's less than 5 minutes old
      if (parsed.timestamp && (now - parsed.timestamp) < 5 * 60 * 1000) {
        return parsed
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  return { authenticated: null, timestamp: 0, token: null }
}

let authCache = getCachedAuth()

// Cache duration: 5 minutes (300000 ms)
const CACHE_DURATION = 5 * 60 * 1000

// Helper to save cache to sessionStorage
const saveCache = (cache: typeof authCache) => {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('auth_cache', JSON.stringify(cache))
    } catch (e) {
      // Ignore errors (e.g., if storage is full)
    }
  }
}

export const authProvider = (apiUrl: string): AuthProvider => {
  return {
    login: async ({ email, password }) => {
      try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Invalid email or password')
      }

      const data = await response.json()
        
        // Store token and user data
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      
      // Update cache
      authCache = {
        authenticated: true,
        timestamp: Date.now(),
        token: data.token,
      }
      saveCache(authCache)

      // Dispatch custom event to notify components of token change
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-token-changed'))
      }

      return {
        success: true,
        redirectTo: '/',
        }
      } catch (error: any) {
        throw new Error(error.message || 'Login failed. Please try again.')
      }
    },

    logout: async () => {
      // Clear cache
      authCache = { authenticated: false, timestamp: 0, token: null }
      saveCache(authCache)
      
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('auth_cache')
      }
      
      // Dispatch custom event to notify components of token change
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-token-changed'))
      }
      
      // Redirect to home, Layout will show login form
      return {
        success: true,
        redirectTo: '/',
      }
    },

    check: async () => {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        return {
          authenticated: false,
        }
      }

      const token = localStorage.getItem('auth_token')
      
      // No token = not authenticated
      if (!token || token.trim() === '') {
        // Clear cache
        authCache = { authenticated: false, timestamp: 0, token: null }
        saveCache(authCache)
        // Ensure localStorage is clean
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('auth_cache')
        }
        return {
          authenticated: false,
        }
      }

      const now = Date.now()
      
      // FAST PATH: Check token expiration locally first (synchronous, no API call)
      let tokenExpired = false
      let tokenValid = false
      try {
        const tokenParts = token.split('.')
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]))
          const exp = payload.exp * 1000 // Convert to milliseconds
          if (exp < now) {
            // Token is expired
            tokenExpired = true
          } else {
            // Token is not expired
            tokenValid = true
          }
        }
      } catch (e) {
        // If we can't decode token, we'll need to validate with API
        console.warn('Could not decode token for expiration check:', e)
      }

      // If token is expired, clear immediately
      if (tokenExpired) {
            authCache = { authenticated: false, timestamp: now, token: null }
        saveCache(authCache)
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_user')
            return {
              authenticated: false,
            }
          }

      // Check cache first - if token matches and cache is still valid, return cached result
      if (
        authCache.authenticated !== null &&
        authCache.token === token &&
        (now - authCache.timestamp) < CACHE_DURATION
      ) {
        console.log('[Auth Check] Using cached authentication result')
        return {
          authenticated: authCache.authenticated,
        }
      }

      // OPTIMISTIC RETURN: If token is valid (not expired) and we have user data, 
      // return authenticated immediately while validating in background
      if (tokenValid) {
        const userStr = localStorage.getItem('auth_user')
        if (userStr) {
          // Token is valid and we have user data - return authenticated immediately
          // This prevents the login flash on page reload
          const optimisticResult = {
            authenticated: true,
          }
          
          // Update cache optimistically
          authCache = {
            authenticated: true,
            timestamp: now,
            token: token,
          }
          saveCache(authCache)
          
          // Validate with backend in background (don't await)
          // This will update the cache if there's an issue
          fetch(`${apiUrl}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
            .then((response) => {
              if (response.ok) {
                return response.json()
              } else {
                // If validation fails, clear cache but don't force logout immediately
                // Let the next check handle it
                if (response.status === 401) {
                  console.warn('[Auth Check] Background validation failed with 401')
                  // Don't clear immediately - might be temporary server issue
                }
                return null
              }
            })
            .then((user) => {
              if (user) {
                localStorage.setItem('auth_user', JSON.stringify(user))
                authCache = {
                  authenticated: true,
                  timestamp: Date.now(),
                  token: token,
                }
                saveCache(authCache)
              }
            })
            .catch((error) => {
              // Network error - ignore, keep optimistic result
              console.warn('[Auth Check] Background validation error (ignored):', error)
            })
          
          return optimisticResult
        }
      }
      
      console.log('[Auth Check] Cache expired or token changed, validating with backend')

      // Validate token with backend (only if cache is expired or token changed)
      try {
        const response = await fetch(`${apiUrl}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          // Only clear token if it's a 401 (unauthorized) - but first check if token is actually expired
          if (response.status === 401) {
            // Get error message to understand why it failed
            let errorMessage = 'Unauthorized'
            try {
              const errorData = await response.json()
              errorMessage = errorData.message || errorMessage
            } catch {
              // Response might not be JSON
            }
            
            console.warn('[Auth Check] 401 from /auth/me:', errorMessage)
            
            // Double-check token expiration locally before clearing
            try {
              const tokenParts = token.split('.')
              if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]))
                const exp = payload.exp * 1000
                if (exp < now) {
                  // Token is actually expired, clear it
                  console.log('[Auth Check] Token is expired, clearing auth data')
                  authCache = { authenticated: false, timestamp: now, token: null }
                  saveCache(authCache)
                  localStorage.removeItem('auth_token')
                  localStorage.removeItem('auth_user')
                  return {
                    authenticated: false,
                  }
                } else {
                  // Token is not expired but backend returned 401 - might be server issue
                  // Don't clear token, use cache if available
                  console.warn('[Auth Check] Token not expired but got 401, might be server issue. Using cache if available.')
                  if (authCache.authenticated !== null && authCache.token === token) {
                    return {
                      authenticated: authCache.authenticated,
                    }
                  }
                  // If no cache, assume still authenticated (server issue, not auth issue)
                  return {
                    authenticated: true,
                  }
                }
              }
            } catch (e) {
              // Can't decode token, but got 401 - might be invalid token
              console.warn('[Auth Check] Cannot decode token and got 401, clearing auth data')
            authCache = { authenticated: false, timestamp: now, token: null }
              saveCache(authCache)
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_user')
            return {
              authenticated: false,
              }
            }
          }
          // For other errors (500, 503, etc.), don't clear token - might be server issue
          // Return cached auth state if available, otherwise assume authenticated
          console.warn(`[Auth Check] Non-401 error (${response.status}), using cache if available`)
          if (authCache.authenticated !== null) {
            return {
              authenticated: authCache.authenticated,
            }
          }
          // If no cache and non-401 error, assume still authenticated (server issue)
          return {
            authenticated: true,
          }
        }

        const user = await response.json()
        localStorage.setItem('auth_user', JSON.stringify(user))
        
        // Update cache
        authCache = {
          authenticated: true,
          timestamp: now,
          token: token,
        }
        saveCache(authCache)

        return {
          authenticated: true,
        }
      } catch (error) {
        // Network error - don't clear token, use cache if available
        console.warn('Network error during auth check:', error)
        
        if (authCache.authenticated !== null && authCache.token === token) {
          // Use cached result if available
          return {
            authenticated: authCache.authenticated,
          }
        }
        
        // If no cache, assume authenticated (network issue, not auth issue)
        // Don't clear token on network errors
        return {
          authenticated: true,
        }
      }
    },

    onError: async (error) => {
      // Only clear token on 401 from auth endpoints, not from data endpoints
      // Data endpoints might return 401 for other reasons
      if (error?.status === 401) {
        // Check if this is from an auth endpoint
        const errorMessage = error?.message || ''
        if (errorMessage.includes('auth') || errorMessage.includes('Unauthorized')) {
          // Clear cache
          authCache = { authenticated: false, timestamp: 0, token: null }
          saveCache(authCache)
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('auth_cache')
          }
          return {
            logout: true,
            error,
          }
        }
      }
      return { error }
    },

    getIdentity: async () => {
      const userStr = localStorage.getItem('auth_user')
      if (userStr) {
        return JSON.parse(userStr)
      }

      const token = localStorage.getItem('auth_token')
      if (!token) {
        return null
      }

      try {
        const response = await fetch(`${apiUrl}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          return null
        }

        const user = await response.json()
        localStorage.setItem('auth_user', JSON.stringify(user))
        
        // Don't dispatch auth-token-changed here - this is just fetching user data
        // Only dispatch on actual auth state changes (login/logout)
        
        return user
      } catch (error) {
        return null
      }
    },

    register: async ({ email, password, name, image }) => {
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name, image }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Registration failed')
      }

      const data = await response.json()
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      
      // Update cache
      authCache = {
        authenticated: true,
        timestamp: Date.now(),
        token: data.token,
      }
      saveCache(authCache)
      
      // Dispatch event for registration
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-token-changed'))
      }

      return {
        success: true,
        redirectTo: '/',
      }
    },
  }
}

