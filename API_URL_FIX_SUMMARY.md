# API URL Environment Variable Fix

## ✅ Issue Fixed

**Problem:** Backend URLs were hardcoded with fallback to `http://localhost:3001/api` throughout the codebase.

**Solution:** Created centralized `getApiUrl()` utility function that:
- Reads from `NEXT_PUBLIC_API_URL` environment variable
- Throws error in production if not set
- Warns in development but allows fallback
- Ensures consistent URL format

## 📝 Changes Made

### 1. Created `getApiUrl()` Utility
- **File:** `src/constants/index.ts`
- **Function:** `getApiUrl()`
- **Features:**
  - Validates environment variable exists
  - Throws error in production if missing
  - Warns in development with fallback
  - Handles URL formatting (adds `/api` if needed)

### 2. Updated All Files (16 files)

#### Features:
- ✅ `src/features/EODReports.jsx`
- ✅ `src/features/AdminPanel.jsx`
- ✅ `src/features/ProjectDetails.jsx`
- ✅ `src/features/EODSummaries.jsx`
- ✅ `src/features/EODManagerView.jsx`

#### Components:
- ✅ `src/components/CreateProjectDialog.jsx`
- ✅ `src/components/TemporaryPermissionsList.jsx`
- ✅ `src/components/MyPermissionRequests.jsx`
- ✅ `src/components/Navbar.jsx`
- ✅ `src/components/PermissionRequestsList.jsx`
- ✅ `src/components/AddProjectMembersDialog.jsx`
- ✅ `src/components/RequestPermissionDialog.jsx`
- ✅ `src/components/ContactAdminForm.jsx`
- ✅ `src/components/GrantTemporaryPermissionDialog.jsx`

#### App:
- ✅ `app/providers.jsx`

#### Config:
- ✅ `next.config.js` - Removed hardcoded fallback

## 🔧 Usage

### Before:
```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
```

### After:
```javascript
import { getApiUrl } from '../constants'

const API_URL = getApiUrl()
```

## ⚠️ Environment Variable Required

### Development
- Set `NEXT_PUBLIC_API_URL` in `.env.local`:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:3001
  ```
- If not set, will warn and use fallback

### Production
- **MUST** set `NEXT_PUBLIC_API_URL` environment variable
- Application will throw error if not set
- Example:
  ```
  NEXT_PUBLIC_API_URL=https://api.yourdomain.com
  ```

## 📋 Benefits

1. ✅ **No hardcoded URLs** - All URLs come from environment
2. ✅ **Production safety** - Fails fast if misconfigured
3. ✅ **Centralized** - Single source of truth
4. ✅ **Consistent** - Same URL format everywhere
5. ✅ **Maintainable** - Easy to update

## 🎯 Next Steps

1. **Create `.env.local`** (if not exists):
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

2. **Update production environment variables:**
   - Set `NEXT_PUBLIC_API_URL` to production API URL
   - Remove any hardcoded fallbacks

3. **Verify:**
   - Development: Check console for warnings
   - Production: Ensure env var is set

## ✅ Verification

- ✅ No hardcoded URLs found in codebase
- ✅ All files use `getApiUrl()` utility
- ✅ Build successful
- ✅ Production-ready error handling

