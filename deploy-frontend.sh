#!/bin/bash
# Deploy Frontend to Firebase Hosting
# This script helps deploy the frontend to Firebase

echo "🔥 Deploying Frontend to Firebase..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
  echo "❌ Firebase CLI not found!"
  echo "Install it with: npm install -g firebase-tools"
  exit 1
fi

# Check if .env.production exists
if [ ! -f "client/.env.production" ]; then
  echo "⚠️  Warning: client/.env.production not found"
  echo "Creating template..."
  cat > client/.env.production << 'EOF'
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=https://your-railway-backend.railway.app
EOF
  echo "❌ Please edit client/.env.production with your actual values"
  exit 1
fi

# Build frontend
echo "📦 Building frontend..."
cd client
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed!"
  exit 1
fi

cd ..
echo "✅ Frontend built successfully!"

# Verify build output
if [ ! -f "client/dist/index.html" ]; then
  echo "❌ Build output not found at client/dist/index.html"
  exit 1
fi

# Deploy to Firebase
echo "🚀 Deploying to Firebase Hosting..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
  echo "✅ Deployed to Firebase successfully!"
  echo "🌐 Your app should be live at: https://orbit-lms.web.app"
else
  echo "❌ Firebase deployment failed!"
  exit 1
fi

