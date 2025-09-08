# Deployment Preparation Script
# Run this script to prepare for Vercel deployment

Write-Host "🚀 Preparing TaskMasterPro for Vercel Deployment..." -ForegroundColor Green

# Check if all required files exist
$requiredFiles = @(
    "vercel.json",
    "vite.config.vercel.ts", 
    ".env.production.example",
    "api/index.ts",
    "api/facilities.ts",
    "api/computer-stations.ts",
    "api/auth/user.ts"
)

foreach ($file in $requiredFiles) {
    if (!(Test-Path $file)) {
        Write-Host "❌ Missing required file: $file" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ All required files present" -ForegroundColor Green

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install
Set-Location client
npm install
Set-Location ..

# Type check
Write-Host "🔍 Running type check..." -ForegroundColor Blue
npm run check

# Test build locally
Write-Host "🏗️  Testing build..." -ForegroundColor Blue
npm run build:vercel

Write-Host "✅ Build successful!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Cyan
Write-Host "1. Set up environment variables in Vercel dashboard" -ForegroundColor White
Write-Host "2. Deploy to Vercel (vercel --prod)" -ForegroundColor White
Write-Host "3. Run database migrations after deployment" -ForegroundColor White
Write-Host ""
Write-Host "📖 See VERCEL_DEPLOYMENT.md for detailed instructions" -ForegroundColor Yellow
