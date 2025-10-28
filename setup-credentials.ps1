# ORBIT Credentials Setup Helper
# This script helps you fill in your Supabase credentials

Write-Host "🔧 ORBIT Credentials Setup" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 You need to get your Supabase credentials first:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open Supabase Dashboard:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Select your project (or create one if you don't have it)" -ForegroundColor White
Write-Host ""
Write-Host "3. Go to Settings → API and copy:" -ForegroundColor White
Write-Host "   - Project URL" -ForegroundColor Gray
Write-Host "   - anon public key" -ForegroundColor Gray
Write-Host "   - service_role key" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Go to Settings → Database and copy:" -ForegroundColor White
Write-Host "   - Connection string (URI format)" -ForegroundColor Gray
Write-Host ""
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

$continue = Read-Host "Have you copied all credentials? (y/n)"
if ($continue -ne "y") {
    Write-Host ""
    Write-Host "⚠️  Please get your credentials first, then run this script again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opening Supabase dashboard in browser..." -ForegroundColor Cyan
    Start-Process "https://supabase.com/dashboard"
    exit 0
}

Write-Host ""
Write-Host "📝 Enter your credentials:" -ForegroundColor Yellow
Write-Host ""

# Get Supabase URL
Write-Host "Supabase Project URL" -ForegroundColor Cyan
Write-Host "(Example: https://abcdefghijklmn.supabase.co)" -ForegroundColor Gray
$supabaseUrl = Read-Host "Enter URL"

# Get Anon Key
Write-Host ""
Write-Host "Supabase Anon Key" -ForegroundColor Cyan
Write-Host "(Starts with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)" -ForegroundColor Gray
$anonKey = Read-Host "Enter Anon Key"

# Get Service Role Key
Write-Host ""
Write-Host "Supabase Service Role Key" -ForegroundColor Cyan
Write-Host "(Starts with: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)" -ForegroundColor Gray
$serviceRoleKey = Read-Host "Enter Service Role Key"

# Get Database URL
Write-Host ""
Write-Host "Database Connection String" -ForegroundColor Cyan
Write-Host "(Example: postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres)" -ForegroundColor Gray
$databaseUrl = Read-Host "Enter Database URL"

Write-Host ""
Write-Host "🔄 Updating .env files..." -ForegroundColor Yellow

# Update backend .env
$backendEnv = @"
# Backend Environment Variables (Local Development)
NODE_ENV=development
PORT=5000

# Supabase Configuration
DATABASE_URL=$databaseUrl
SUPABASE_URL=$supabaseUrl
SUPABASE_ANON_KEY=$anonKey
SUPABASE_SERVICE_ROLE_KEY=$serviceRoleKey

# Email Service (Optional for now)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@orbit-lms.com

# CORS Configuration
FRONTEND_URL=http://localhost:5173
"@

$backendEnv | Out-File -FilePath ".env" -Encoding utf8 -NoNewline

# Update frontend .env
$frontendEnv = @"
# Frontend Environment Variables (Local Development)

# Supabase Configuration
VITE_SUPABASE_URL=$supabaseUrl
VITE_SUPABASE_ANON_KEY=$anonKey

# Backend API URL (leave empty for local development)
VITE_API_BASE_URL=
"@

$frontendEnv | Out-File -FilePath "client\.env" -Encoding utf8 -NoNewline

Write-Host ""
Write-Host "✅ Credentials saved!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Files updated:" -ForegroundColor Cyan
Write-Host "   - .env" -ForegroundColor White
Write-Host "   - client\.env" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Testing database connection..." -ForegroundColor Yellow

# Test database connection
npm run db:test

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Database connection successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 You can now start development:" -ForegroundColor Cyan
    Write-Host "   npm run dev" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "⚠️  Database connection failed. Please check your credentials." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "   - Wrong DATABASE_URL format" -ForegroundColor White
    Write-Host "   - Incorrect password in connection string" -ForegroundColor White
    Write-Host "   - Supabase project not active" -ForegroundColor White
    Write-Host ""
    Write-Host "You can run this script again to update credentials." -ForegroundColor Cyan
    Write-Host ""
}

