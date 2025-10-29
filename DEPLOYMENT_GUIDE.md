# 🚀 ORBIT Deployment Guide

Complete guide for deploying ORBIT to Railway (Backend) + Firebase Hosting (Frontend) + Supabase (Database)

---

## 📋 **Prerequisites**

- [ ] Node.js 18+ installed
- [ ] Railway account (https://railway.app)
- [ ] Firebase account (https://firebase.google.com)
- [ ] Supabase account (https://supabase.com)
- [ ] Firebase CLI installed: `npm install -g firebase-tools`
- [ ] Git repository connected to Railway

---

## 🗄️ **Part 1: Database Setup (Supabase)**

### 1.1 Get Supabase Credentials

1. Log in to your Supabase dashboard
2. Navigate to your project (or create a new one)
3. Go to **Settings → Database**
   - Copy the "Connection string" (URI format) → `DATABASE_URL`
4. Go to **Settings → API**
   - Copy "Project URL" → `SUPABASE_URL`
   - Copy "anon public" key → `SUPABASE_ANON_KEY`
   - Copy "service_role" key → `SUPABASE_SERVICE_ROLE_KEY`

### 1.2 Run Database Migrations

```bash
# Set your DATABASE_URL in .env first
npm run db:push
```

---

## 🖥️ **Part 2: Backend Deployment (Railway)**

### 2.1 Configure Railway

1. Go to https://railway.app and create a new project
2. Connect your GitHub repository
3. Select the `main` branch

### 2.2 Set Environment Variables in Railway

Go to **Variables** tab and add:

```
NODE_ENV=production
DATABASE_URL=postgresql://your-supabase-connection-string
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-app-password
EMAIL_FROM=noreply@orbit-lms.com
FRONTEND_URL=https://orbit-lms.web.app
```

⚠️ **IMPORTANT: Do NOT set PORT variable** - Railway sets this automatically!

### 2.3 Configure Build Settings

Railway should automatically detect your `railway.json` file. Verify in Settings:

- **Build Command**: `npm install && npm run build:server`
- **Start Command**: `npm run start`
- **Root Directory**: `/`

### 2.4 Deploy Backend

```bash
# Push to main branch
git add .
git commit -m "Configure for Railway deployment"
git push origin main
```

Railway will automatically deploy. Check logs for:
```
🚀 Server running on http://localhost:5000
```

### 2.5 Get Railway Backend URL

1. Go to your Railway project dashboard
2. Click on **Settings** → **Domains**
3. Generate a domain (e.g., `orbit-production-113f.up.railway.app`)
4. Copy this URL - you'll need it for the frontend

### 2.6 Test Backend API

```bash
curl https://your-railway-url.railway.app/api/health
```

Expected response: `{"status": "ok"}` or similar

---

## 🔥 **Part 3: Frontend Deployment (Firebase)**

### 3.1 Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### 3.2 Initialize Firebase (if not already done)

```bash
firebase init hosting
```

Select:
- Use existing project: `orbit-lms`
- Public directory: `client/dist`
- Single-page app: **Yes**
- GitHub deploys: **No** (optional)

### 3.3 Create Production Environment File

Create `client/.env.production`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=https://your-railway-url.railway.app
```

### 3.4 Update firebase.json with Railway URL

Make sure `firebase.json` has your Railway backend URL:

```json
{
  "hosting": {
    "public": "client/dist",
    "rewrites": [
      {
        "source": "/api/**",
        "destination": "https://your-railway-url.railway.app/api/**"
      }
    ]
  }
}
```

### 3.5 Build Frontend

```bash
cd client
npm run build
```

Check for errors. The build output should be in `client/dist/`.

### 3.6 Deploy to Firebase

```bash
# From the root directory
firebase deploy --only hosting
```

You should see:
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/orbit-lms
Hosting URL: https://orbit-lms.web.app
```

### 3.7 Update Backend CORS

Update `server/index.ts` CORS origin to match your Firebase URL (if different):

```typescript
const corsOptions = {
  origin: "https://orbit-lms.web.app", // your Firebase URL
  credentials: true,
  // ...
};
```

Commit and push to trigger Railway redeploy.

---

## 🧪 **Part 4: Testing the Deployment**

### 4.1 Test Backend

```bash
# Health check
curl https://your-railway-url.railway.app/api/health

# Test Supabase connection
curl https://your-railway-url.railway.app/api/auth/sync
```

### 4.2 Test Frontend

1. Open https://orbit-lms.web.app in your browser
2. Check browser console for errors
3. Try logging in with Supabase credentials
4. Verify API calls are reaching Railway backend

### 4.3 Check Railway Logs

```bash
# In Railway dashboard, go to Deployments → Latest → View Logs
```

Look for:
- `🚀 Server running on http://localhost:5000`
- No database connection errors
- API requests being logged

### 4.4 Check Firebase Logs

```bash
firebase hosting:channel:list
```

---

## 🔍 **Part 5: Local Development Testing**

Before deploying, always test locally:

### 5.1 Setup Local Environment

```bash
# Create .env file in root (see ENV_SETUP_INSTRUCTIONS.md)
# Create client/.env file (see ENV_SETUP_INSTRUCTIONS.md)
```

### 5.2 Test Backend Locally

```bash
# Terminal 1: Start backend
npm run dev:server
```

Expected output:
```
🚀 Server running on http://localhost:5000
```

Test endpoints:
```bash
curl http://localhost:5000/api/health
```

### 5.3 Test Frontend Locally

```bash
# Terminal 2: Start frontend
npm run dev:client
```

Open http://localhost:5173 and test the app.

### 5.4 Test Frontend Build

```bash
cd client
npm run build
```

Should complete without errors and create `client/dist/` folder.

### 5.5 Test Backend Build

```bash
npm run build:server
```

Should create `dist/index.js` file.

---

## 🐛 **Common Issues & Solutions**

### Issue 1: Frontend can't reach backend

**Symptoms**: CORS errors, API 404 errors

**Solution**:
1. Verify `firebase.json` has correct Railway URL
2. Check `server/index.ts` CORS origin matches Firebase URL
3. Verify `client/.env.production` has `VITE_API_BASE_URL` set

### Issue 2: Railway build fails

**Symptoms**: "Module not found" errors

**Solution**:
```bash
# Make sure all dependencies are in package.json
npm install
# Commit package-lock.json
git add package-lock.json
git commit -m "Update dependencies"
git push
```

### Issue 3: Database connection failed

**Symptoms**: "Connection refused", "SSL error"

**Solution**:
1. Verify `DATABASE_URL` is correct in Railway variables
2. Check Supabase project is running
3. Verify SSL is enabled: `ssl: { rejectUnauthorized: false }`

### Issue 4: Firebase build fails

**Symptoms**: "VITE_SUPABASE_URL is not defined"

**Solution**:
1. Create `client/.env.production` with all VITE_ variables
2. Rebuild: `cd client && npm run build`

### Issue 5: Railway server crashes

**Symptoms**: "Cannot find module 'dist/index.js'"

**Solution**:
1. Verify `build:server` script runs successfully
2. Check Railway build command includes `npm run build:server`
3. Verify `dist/index.js` exists after build

---

## 📊 **Monitoring & Maintenance**

### Railway Monitoring

- Check logs: Railway Dashboard → Deployments → View Logs
- Monitor metrics: Railway Dashboard → Metrics
- Set up alerts: Railway Dashboard → Settings → Notifications

### Firebase Monitoring

```bash
firebase hosting:channel:list
```

### Database Monitoring

- Supabase Dashboard → Database → Query Performance
- Check connection count
- Monitor table sizes

---

## 🚀 **Quick Deploy Commands**

### Deploy Everything

```bash
# 1. Build and deploy backend (Railway auto-deploys on push)
git add .
git commit -m "Deploy backend"
git push origin main

# 2. Build and deploy frontend
cd client && npm run build && cd ..
firebase deploy --only hosting
```

### Deploy Backend Only

```bash
git push origin main
```

### Deploy Frontend Only

```bash
cd client && npm run build && cd ..
firebase deploy --only hosting
```

---

## ✅ **Deployment Checklist**

### Pre-Deployment
- [ ] All environment variables set in Railway
- [ ] `client/.env.production` created with Railway URL
- [ ] `firebase.json` updated with Railway URL
- [ ] `server/index.ts` CORS updated with Firebase URL
- [ ] Database migrations applied to Supabase
- [ ] Local testing completed successfully

### Backend Deployment
- [ ] Code pushed to GitHub main branch
- [ ] Railway build completed successfully
- [ ] Railway server running (check logs)
- [ ] Backend API health check passes
- [ ] Database connection successful

### Frontend Deployment
- [ ] Frontend builds without errors
- [ ] Firebase deploy completed
- [ ] Frontend loads at Firebase URL
- [ ] API calls reach Railway backend
- [ ] Login/authentication works
- [ ] No console errors

### Post-Deployment
- [ ] Test all major features
- [ ] Check Railway logs for errors
- [ ] Monitor Supabase connection count
- [ ] Verify CORS is working
- [ ] Test on multiple browsers/devices

---

## 🆘 **Getting Help**

If you encounter issues:

1. **Check logs first**:
   - Railway: Dashboard → Logs
   - Firebase: Browser console (F12)
   - Supabase: Dashboard → Database → Logs

2. **Verify environment variables**:
   - Railway: Dashboard → Variables
   - Frontend: `client/.env.production`

3. **Test locally first**:
   ```bash
   npm run dev
   ```

4. **Check build output**:
   ```bash
   npm run build:server
   cd client && npm run build
   ```

---

**Last Updated**: October 28, 2025
**Project**: ORBIT LMS
**Stack**: React + Node.js + Express + Supabase + Firebase + Railway

