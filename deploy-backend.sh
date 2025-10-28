#!/bin/bash
# Deploy Backend to Railway
# This script helps deploy the backend to Railway

echo "🚀 Deploying Backend to Railway..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from project root"
  exit 1
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "⚠️  Warning: You have uncommitted changes"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Build backend
echo "📦 Building backend..."
npm run build:server

if [ $? -ne 0 ]; then
  echo "❌ Backend build failed!"
  exit 1
fi

echo "✅ Backend built successfully!"

# Push to git (Railway auto-deploys)
echo "🔄 Pushing to git..."
git add .
git commit -m "Deploy backend to Railway" || echo "No changes to commit"
git push origin main

if [ $? -eq 0 ]; then
  echo "✅ Pushed to git! Railway will auto-deploy."
  echo "📊 Check Railway dashboard for deployment logs."
else
  echo "❌ Git push failed!"
  exit 1
fi

