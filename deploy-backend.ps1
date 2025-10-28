# PowerShell script to deploy Backend to Railway
# This script helps deploy the backend to Railway

Write-Host "🚀 Deploying Backend to Railway..." -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Must run from project root" -ForegroundColor Red
    exit 1
}

# Check if there are uncommitted changes
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  Warning: You have uncommitted changes" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Build backend
Write-Host "📦 Building backend..." -ForegroundColor Yellow
npm run build:server

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Backend built successfully!" -ForegroundColor Green

# Push to git (Railway auto-deploys)
Write-Host "🔄 Pushing to git..." -ForegroundColor Yellow
git add .
git commit -m "Deploy backend to Railway"
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Pushed to git! Railway will auto-deploy." -ForegroundColor Green
    Write-Host "📊 Check Railway dashboard for deployment logs." -ForegroundColor Cyan
} else {
    Write-Host "❌ Git push failed!" -ForegroundColor Red
    exit 1
}

