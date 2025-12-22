# Clear Next.js cache and build artifacts
Write-Host "Clearing Next.js cache..." -ForegroundColor Yellow

# Remove .next folder
if (Test-Path .next) {
    Write-Host "Removing .next folder..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force .next
    Write-Host "✓ .next folder removed" -ForegroundColor Green
} else {
    Write-Host "✓ .next folder not found (already clean)" -ForegroundColor Green
}

# Remove node_modules/.cache if exists
if (Test-Path node_modules\.cache) {
    Write-Host "Removing node_modules cache..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force node_modules\.cache
    Write-Host "✓ node_modules cache removed" -ForegroundColor Green
}

Write-Host "`nCache cleared successfully! You can now restart the dev server." -ForegroundColor Green
Write-Host "Run: npm run dev" -ForegroundColor Cyan

