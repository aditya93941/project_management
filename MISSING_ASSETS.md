# Missing Assets

## Issue
The app is looking for image files that don't exist:
- `workspace_img_default.png`
- `profile_img_a.svg`
- `profile_img_o.svg`
- `profile_img_j.svg`

## Solution

### Option 1: Add Your Own Images
Place these files in `apps/web/public/`:
- `workspace_img_default.png` - Default workspace image
- `profile_img_a.svg` - Profile avatar A
- `profile_img_o.svg` - Profile avatar O  
- `profile_img_j.svg` - Profile avatar J

### Option 2: Use Placeholder Images
You can use placeholder services temporarily:
- https://via.placeholder.com/150 (for PNG)
- Or create simple SVG placeholders

### Option 3: Update Code to Handle Missing Images
Update components to show fallback images when assets are missing.

## Current Fix
I've updated `src/assets/assets.js` to use Next.js public path format (`/filename.ext`).
The app will work once you add the image files to `public/` directory.

