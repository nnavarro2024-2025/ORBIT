# Complete ORBIT Deployment Script
# Run this after Firebase project is created

Write-Host "🚀 ORBIT - Complete Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Must run from project root (C:\Users\Ken\Downloads\ORBIT)" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Pre-Deployment Checklist:" -ForegroundColor Yellow
Write-Host ""

# Check if Firebase CLI is available
Write-Host "Checking Firebase CLI..." -NoNewline
$firebaseCmd = Get-Command firebase -ErrorAction SilentlyContinue
if ($firebaseCmd) {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ❌" -ForegroundColor Red
    Write-Host "Firebase CLI not found. Install: npm install -g firebase-tools" -ForegroundColor Red
    exit 1
}

# Check if user is logged in
Write-Host "Checking Firebase auth..." -NoNewline
$loginResult = firebase login:list 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ❌" -ForegroundColor Red
    Write-Host "Not logged in. Run: firebase login" -ForegroundColor Red
    exit 1
}

# Check if frontend is built
Write-Host "Checking frontend build..." -NoNewline
if (Test-Path "client\dist\index.html") {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ⚠️  Building now..." -ForegroundColor Yellow
    Set-Location client
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Frontend build failed!" -ForegroundColor Red
        exit 1
    }
    Set-Location ..
    Write-Host " ✅ Built successfully" -ForegroundColor Green
}

# Check Railway backend
Write-Host "Checking Railway backend..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "https://orbit-production-113f.up.railway.app/api/facilities" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host " ✅" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host " ✅ (401 - auth required)" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  Backend might be down" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Prompt user about Firebase project
Write-Host "⚠️  IMPORTANT: Before proceeding, you must:" -ForegroundColor Yellow
Write-Host "   1. Create Firebase project at https://console.firebase.google.com" -ForegroundColor Yellow
Write-Host "   2. Enable Firebase Hosting" -ForegroundColor Yellow
Write-Host "   3. Update .firebaserc with your project ID" -ForegroundColor Yellow
Write-Host ""

$continue = Read-Host "Have you completed these steps? (y/n)"
if ($continue -ne "y") {
    Write-Host ""
    Write-Host "📖 Follow these steps:" -ForegroundColor Cyan
    Write-Host "   1. Open: https://console.firebase.google.com" -ForegroundColor White
    Write-Host "   2. Create project (name it whatever you want)" -ForegroundColor White
    Write-Host "   3. Enable Hosting in Build menu" -ForegroundColor White
    Write-Host "   4. Copy your Project ID" -ForegroundColor White
    Write-Host "   5. Edit .firebaserc and replace 'orbit-lms' with your Project ID" -ForegroundColor White
    Write-Host "   6. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "📄 See FIREBASE_SETUP_STEPS.md for detailed instructions" -ForegroundColor Cyan
    exit 0
}

Write-Host ""
Write-Host "🔥 Deploying to Firebase Hosting..." -ForegroundColor Cyan

# Deploy to Firebase
firebase deploy --only hosting

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "================================" -ForegroundColor Green
    Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""
    
    # Try to get the hosting URL from .firebaserc
    $firebaserc = Get-Content .firebaserc | ConvertFrom-Json
    $projectId = $firebaserc.projects.default
    
    Write-Host "🌐 Your app is now live at:" -ForegroundColor Cyan
    Write-Host "   https://$projectId.web.app" -ForegroundColor White
    Write-Host ""
    Write-Host "🔗 Backend API:" -ForegroundColor Cyan
    Write-Host "   https://orbit-production-113f.up.railway.app" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Open your app URL in a browser" -ForegroundColor White
    Write-Host "   2. Check browser console for errors (F12)" -ForegroundColor White
    Write-Host "   3. Test login with Supabase credentials" -ForegroundColor White
    Write-Host "   4. Verify all features work" -ForegroundColor White
    Write-Host ""
    Write-Host "📖 See DEPLOYMENT_STATUS.md for full status" -ForegroundColor Cyan
    
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "   - Firebase project doesn't exist → Create it first" -ForegroundColor White
    Write-Host "   - Wrong project ID in .firebaserc → Check Firebase Console" -ForegroundColor White
    Write-Host "   - No permission → Check you're logged in to correct account" -ForegroundColor White
    Write-Host ""
    Write-Host "📄 See FIREBASE_SETUP_STEPS.md for help" -ForegroundColor Cyan
    exit 1
}

