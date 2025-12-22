import { DataProvider } from '@refinedev/core'
import { logger } from '../utils/logger'

export const dataProvider = (apiUrl: string): DataProvider => {
  // Sanitize API URL - remove spaces, trailing slashes
  const cleanApiUrl = apiUrl.trim().replace(/\s+/g, '').replace(/\/+$/, '')
  
  // Helper function to get auth token
  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    
    return headers
  }

  // Helper function to check if user is authenticated
  const isAuthenticated = (): boolean => {
    if (typeof window === 'undefined') return false
    const token = localStorage.getItem('auth_token')
    return !!token
  }

  // Helper function to handle API errors
  const handleError = async (response: Response) => {
    if (!response.ok) {
      if (response.status === 401) {
        // Only clear token if it's from auth endpoint
        // For data endpoints, let authProvider.handleError handle it
        const url = response.url || ''
        if (url.includes('/auth/')) {
          // This is an auth endpoint 401 - clear token
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_user')
          }
        }
        // Don't clear token for data endpoint 401s - might be permission issue
        const error: any = new Error('Unauthorized - Please login again')
        error.status = 401
        throw error
      }
      
      let errorMessage = 'Failed to fetch data'
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorMessage
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage
      }
      
      const error: any = new Error(errorMessage)
      error.status = response.status
      error.url = response.url
      throw error
    }
  }

  // Helper function to normalize MongoDB data (_id -> id)
  // Using a Set to track visited objects to prevent infinite loops
  const normalizeRecord = (record: any, visited = new WeakSet()): any => {
    if (!record || typeof record !== 'object') return record
    
    // Prevent infinite loops with circular references
    if (visited.has(record)) {
      return record
    }
    visited.add(record)
    
    // Handle Date objects
    if (record instanceof Date) {
      return record
    }
    
    // Handle arrays
    if (Array.isArray(record)) {
      return record.map((item: any) => normalizeRecord(item, visited))
    }
    
    // Create a new object with id instead of _id
    const normalized: any = {}
    
    // Convert _id to id if _id exists
    if (record._id !== undefined) {
      normalized.id = record._id
      // Keep _id for backward compatibility but prefer id
      normalized._id = record._id
    }
    
    // Copy other properties and normalize nested objects
    for (const key in record) {
      if (key === '_id') continue // Already handled above
      
      const value = record[key]
      if (Array.isArray(value)) {
        normalized[key] = value.map((item: any) => normalizeRecord(item, visited))
      } else if (value && typeof value === 'object' && !(value instanceof Date)) {
        normalized[key] = normalizeRecord(value, visited)
      } else {
        normalized[key] = value
      }
    }
    
    // Special handling for tasks: rename assigneeId to assignee when it's a populated object
    if (normalized.assigneeId && typeof normalized.assigneeId === 'object' && normalized.assigneeId.name) {
      normalized.assignee = normalized.assigneeId
      // Keep assigneeId for backward compatibility
    }
    
    return normalized
  }

  return {
    getList: async ({ resource, pagination, filters, sorters, meta }) => {
      // Check token - if missing and not auth endpoint, return empty result
      // The query's enabled option should prevent this from being called,
      // but handle gracefully if it is called during initialization
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token && resource !== 'auth') {
        // Return empty result instead of throwing error
        // This allows React Query to handle disabled queries gracefully
        return {
          data: [],
          total: 0,
        }
      }

      const url = new URL(`${cleanApiUrl}/${resource}`)

      // Pagination - Backend expects 'page' and 'limit'
      if (pagination) {
        if (pagination.mode === 'off') {
          // When pagination is off, request a very high limit to get all records
          url.searchParams.set('page', '1')
          url.searchParams.set('limit', '10000')
        } else {
          // Normal pagination
        url.searchParams.set('page', String(pagination.current || 1))
        url.searchParams.set('limit', String(pagination.pageSize || 10))
        }
      } else {
        // Default pagination if not specified
        url.searchParams.set('page', '1')
        url.searchParams.set('limit', '10')
      }

      // Filters - Backend expects query params for filtering
      if (filters) {
        filters.forEach((filter) => {
          if (filter.operator === 'eq' && filter.value) {
            // Map RefineJS field names to backend query param names
            const fieldMap: Record<string, string> = {
              // Projects
              status: 'status',
              priority: 'priority',
              // Tasks
              projectId: 'projectId',
              assigneeId: 'assigneeId',
              type: 'type',
              // Comments
              taskId: 'taskId',
              userId: 'userId',
            }
            
            const queryParam = fieldMap[filter.field] || filter.field
            url.searchParams.set(queryParam, String(filter.value))
          }
        })
      }

      // Special handling for projects - always include members for accurate member counts
      if (resource === 'projects') {
        url.searchParams.set('includeMembers', 'true')
      }

      // Handle meta parameters (for includeMembers, includeTasks, etc.)
      if (meta) {
        if (meta.includeMembers) {
          url.searchParams.set('includeMembers', 'true')
        }
        if (meta.includeTasks) {
          url.searchParams.set('includeTasks', 'true')
        }
      }

      const authHeaders = getAuthHeaders()
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      try {
      const response = await fetch(url.toString(), {
          headers: getAuthHeaders(),
          signal: controller.signal,
      })

        clearTimeout(timeoutId)
        
        // Log response for debugging
        if (!response.ok) {
          const errorText = await response.clone().text().catch(() => 'Unable to read error response')
          logger.error(`[DataProvider] Error response for ${resource}:`, {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          })
        }

        await handleError(response)

        const data = await response.json()

        // Backend returns: { data: [...], total, page, limit }
        const records = data.data || data
        const normalizedRecords = Array.isArray(records) 
          ? records.map((r: any) => normalizeRecord(r))
          : normalizeRecord(records)
        
        return {
          data: normalizedRecords,
          total: data.total || (Array.isArray(normalizedRecords) ? normalizedRecords.length : 0),
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          const error: any = new Error('Request timeout - please try again')
          error.status = 408
          throw error
        }
        throw fetchError
      }
    },

    getOne: async ({ resource, id, meta }) => {
      // Check token - return null if missing (query should be disabled)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        return { data: null }
      }

      const url = `${cleanApiUrl}/${resource}/${id}`

      try {
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        })

        await handleError(response)

        const data = await response.json()

        // Backend returns the object directly for getOne
        // Special handling for projects (includes members and tasks)
        // Special handling for tasks (includes comments)
        // Normalize _id to id
        const normalized = normalizeRecord(data)
        
        return { data: normalized }
      } catch (error: any) {
        logger.error('[DataProvider] getOne: Error:', error)
        throw error
      }
    },

    create: async ({ resource, variables, meta }) => {
      // Check token - throw error only if actually trying to create (not auth)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token && resource !== 'auth') {
        const error: any = new Error('Authentication required')
        error.status = 401
        throw error
      }

      const response = await fetch(`${cleanApiUrl}/${resource}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(variables),
      })

      await handleError(response)

      const data = await response.json()

      // Backend returns the created object directly
      // Normalize _id to id
      return { data: normalizeRecord(data) }
    },

    update: async ({ resource, id, variables, meta }) => {
      // Check token - throw error if missing (mutation should be disabled)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        const error: any = new Error('Authentication required')
        error.status = 401
        throw error
      }

      const response = await fetch(`${cleanApiUrl}/${resource}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(variables),
      })

      await handleError(response)

      const data = await response.json()

      // Backend returns the updated object directly
      // Normalize _id to id
      return { data: normalizeRecord(data) }
    },

    deleteOne: async ({ resource, id, meta }) => {
      // Check token - throw error if missing (mutation should be disabled)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        const error: any = new Error('Authentication required')
        error.status = 401
        throw error
      }

      const response = await fetch(`${cleanApiUrl}/${resource}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      await handleError(response)

      // Backend returns { message: '...' } for delete operations
      // RefineJS expects { data: TData } where TData extends BaseRecord
      // We return the id as the data since backend doesn't return the deleted object
      const data = await response.json().catch(() => ({}))
      return { data: { id, ...data } as any }
    },

    getApiUrl: () => cleanApiUrl,

    // Custom methods for project member management
    custom: async ({ url, method = 'GET', payload, headers, meta }) => {
      const requestHeaders = {
        ...getAuthHeaders(),
        ...headers,
      }

      const config: RequestInit = {
        method,
        headers: requestHeaders,
      }

      if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.body = JSON.stringify(payload)
      }

      const response = await fetch(url, config)
      await handleError(response)

      const data = await response.json()
      return { data }
    },
  }
}
