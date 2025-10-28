# PowerShell script to deploy Frontend to Firebase Hosting
# This script helps deploy the frontend to Firebase

Write-Host "🔥 Deploying Frontend to Firebase..." -ForegroundColor Cyan

# Check if Firebase CLI is installed
$firebaseCmd = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $firebaseCmd) {
    Write-Host "❌ Firebase CLI not found!" -ForegroundColor Red
    Write-Host "Install it with: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Check if .env.production exists
if (-not (Test-Path "client\.env.production")) {
    Write-Host "⚠️  Warning: client\.env.production not found" -ForegroundColor Yellow
    Write-Host "Creating template..." -ForegroundColor Yellow
    
    $envTemplate = @"
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=https://your-railway-backend.railway.app
"@
    
    Set-Content -Path "client\.env.production" -Value $envTemplate
    Write-Host "❌ Please edit client\.env.production with your actual values" -ForegroundColor Red
    exit 1
}

# Build frontend
Write-Host "📦 Building frontend..." -ForegroundColor Yellow
Set-Location client
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..
Write-Host "✅ Frontend built successfully!" -ForegroundColor Green

# Verify build output
if (-not (Test-Path "client\dist\index.html")) {
    Write-Host "❌ Build output not found at client\dist\index.html" -ForegroundColor Red
    exit 1
}

# Deploy to Firebase
Write-Host "🚀 Deploying to Firebase Hosting..." -ForegroundColor Yellow
firebase deploy --only hosting

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployed to Firebase successfully!" -ForegroundColor Green
    Write-Host "🌐 Your app should be live at: https://orbit-lms.web.app" -ForegroundColor Cyan
} else {
    Write-Host "❌ Firebase deployment failed!" -ForegroundColor Red
    exit 1
}

