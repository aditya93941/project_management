/**
 * Application Constants
 * Centralized constants to avoid hardcoded values throughout the codebase
 */

/**
 * Get API URL from environment variables
 * Safe for SSR - only reads from env variable directly
 */
export const getApiUrl = (): string => {
  // Read directly from environment variable - no complex logic
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  
  // Trim whitespace (handles any spaces) and remove trailing slashes
  const cleanUrl = apiUrl.trim().replace(/\s+/g, '').replace(/\/+$/, '')
  
  // Ensure /api is added
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`
}

// API Configuration
export const API_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
  TIMEOUT: 30000, // 30 seconds
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const

// Cache Durations (in milliseconds)
export const CACHE_DURATION = {
  AUTH: 5 * 60 * 1000, // 5 minutes
  DATA: 5 * 60 * 1000, // 5 minutes
  SHORT: 1 * 60 * 1000, // 1 minute
  LONG: 30 * 60 * 1000, // 30 minutes
} as const

// Token Configuration
export const TOKEN_CONFIG = {
  EXPIRY_DAYS: 7,
  REFRESH_THRESHOLD: 24 * 60 * 60 * 1000, // 24 hours before expiry
} as const

// Validation Limits
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 128,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 255,
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 5000,
} as const

// Task Status
export const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const

// Project Status
export const PROJECT_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ON_HOLD: 'ON_HOLD',
  CANCELLED: 'CANCELLED',
} as const

// Priority Levels
export const PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const

// User Roles
export const USER_ROLES = {
  MANAGER: 'MANAGER',
  GROUP_HEAD: 'GROUP_HEAD',
  TEAM_LEAD: 'TEAM_LEAD',
  DEVELOPER: 'DEVELOPER',
} as const

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  AUTH_USER: 'auth_user',
  AUTH_CACHE: 'auth_cache',
  THEME: 'theme',
} as const

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation error',
  NETWORK_ERROR: 'Network error. Please check your connection',
  SERVER_ERROR: 'Server error. Please try again later',
  LOGIN_FAILED: 'Login failed. Please check your credentials',
  TOKEN_EXPIRED: 'Your session has expired. Please login again',
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  LOGOUT_SUCCESS: 'Logged out successfully',
  SAVE_SUCCESS: 'Saved successfully',
  DELETE_SUCCESS: 'Deleted successfully',
  UPDATE_SUCCESS: 'Updated successfully',
  CREATE_SUCCESS: 'Created successfully',
} as const

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  FULL: 'MMMM dd, yyyy',
  TIME: 'hh:mm a',
  DATETIME: 'MMM dd, yyyy hh:mm a',
  ISO: 'yyyy-MM-dd',
} as const

// Debounce Delays (in milliseconds)
export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  AUTO_SAVE: 1000,
  INPUT: 500,
} as const

// Progress Calculation
export const PROGRESS = {
  IN_PROGRESS_WEIGHT: 0.5, // In-progress tasks count as 50% complete
  MIN: 0,
  MAX: 100,
} as const

