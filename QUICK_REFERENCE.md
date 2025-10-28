# ⚡ Quick Reference Guide

Fast access to common commands and configurations.

---

## 🚀 **Quick Deploy Commands**

### Deploy Backend (Railway)
```bash
# PowerShell
.\deploy-backend.ps1

# Bash/Linux/Mac
./deploy-backend.sh

# Manual
npm run build:server
git push origin main
```

### Deploy Frontend (Firebase)
```bash
# PowerShell
.\deploy-frontend.ps1

# Bash/Linux/Mac
./deploy-frontend.sh

# Manual
cd client && npm run build && cd ..
firebase deploy --only hosting
```

---

## 🧪 **Testing Commands**

```bash
# Test database connection
npm run db:test

# Build backend
npm run build:server

# Build frontend
cd client && npm run build

# Run backend locally
npm run dev:server

# Run frontend locally
npm run dev:client

# Run full stack
npm run dev
```

---

## 📦 **Build Output Locations**

| Component | Build Output | Command |
|-----------|-------------|---------|
| Backend | `dist/index.js` | `npm run build:server` |
| Frontend | `client/dist/` | `cd client && npm run build` |

---

## 🔧 **Environment Variables**

### Backend (.env in root)
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FRONTEND_URL=http://localhost:5173
```

### Frontend (client/.env)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_BASE_URL=
```

### Frontend Production (client/.env.production)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_BASE_URL=https://your-railway-app.railway.app
```

### Railway Environment Variables
```
NODE_ENV=production
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FRONTEND_URL=https://orbit-lms.web.app
```

⚠️ **Do NOT set PORT in Railway** - it's set automatically!

---

## 🌐 **URLs**

| Service | Local | Production |
|---------|-------|------------|
| Frontend | http://localhost:5173 | https://orbit-lms.web.app |
| Backend | http://localhost:5000 | https://your-railway-app.railway.app |
| Database | N/A | https://your-project.supabase.co |

---

## 📂 **Important Files**

### Configuration
- `package.json` - Backend dependencies & scripts
- `client/package.json` - Frontend dependencies & scripts
- `firebase.json` - Firebase Hosting configuration
- `railway.json` - Railway deployment configuration
- `client/vite.config.ts` - Vite build configuration
- `server/index.ts` - Backend entry point
- `drizzle.config.ts` - Database ORM configuration

### Environment
- `.env` - Backend local environment
- `client/.env` - Frontend local environment
- `client/.env.production` - Frontend production environment

### Deployment
- `deploy-backend.ps1` - PowerShell backend deploy script
- `deploy-frontend.ps1` - PowerShell frontend deploy script
- `deploy-backend.sh` - Bash backend deploy script
- `deploy-frontend.sh` - Bash frontend deploy script

### Testing
- `test-database.js` - Database connection test
- `TESTING_CHECKLIST.md` - Complete testing guide
- `DEPLOYMENT_GUIDE.md` - Complete deployment guide

---

## 🔍 **Troubleshooting Quick Checks**

### Backend won't start
```bash
# Check environment variables
npm run db:test

# Check build output
npm run build:server
ls dist/

# Check logs
# Railway: Dashboard → Logs
```

### Frontend won't load
```bash
# Check build output
cd client && npm run build
ls dist/

# Check Firebase deployment
firebase hosting:channel:list
```

### CORS errors
```javascript
// server/index.ts
const corsOptions = {
  origin: "https://orbit-lms.web.app", // Must match exactly
  credentials: true,
};
```

### Database connection errors
```bash
# Test connection
npm run db:test

# Check credentials
# .env: DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY
```

---

## 📊 **Railway Configuration**

### Build Settings
- **Build Command**: `npm install && npm run build:server`
- **Start Command**: `npm run start`
- **Root Directory**: `/`
- **Node Version**: 18+ (auto-detected)

### Deployment Trigger
- Push to `main` branch triggers auto-deploy
- Or use "Deploy" button in Railway dashboard

---

## 🔥 **Firebase Configuration**

### Hosting Configuration (firebase.json)
```json
{
  "hosting": {
    "public": "client/dist",
    "rewrites": [
      {
        "source": "/api/**",
        "destination": "https://your-railway-app.railway.app/api/**"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Deploy Command
```bash
firebase deploy --only hosting
```

---

## 🗄️ **Database Commands**

```bash
# Push schema changes
npm run db:push

# Test connection
npm run db:test

# Manual SQL (in Supabase dashboard)
# Settings → Database → SQL Editor
```

---

## 🆘 **Emergency Rollback**

### Railway Backend
```bash
# In Railway Dashboard:
# 1. Go to Deployments
# 2. Find previous working deployment
# 3. Click "Redeploy"
```

### Firebase Frontend
```bash
# List previous deployments
firebase hosting:channel:list

# Rollback to previous version
# In Firebase Console:
# Hosting → Release History → Rollback
```

---

## 📞 **Getting Help**

### Check Logs
```bash
# Railway: Dashboard → Deployments → View Logs
# Firebase: Browser Console (F12)
# Supabase: Dashboard → Logs
```

### Common Log Locations
- Backend errors: Railway dashboard logs
- Frontend errors: Browser console (F12)
- Database errors: Supabase dashboard logs
- Build errors: Terminal output

### Useful Commands
```bash
# Check all environment variables are set
npm run db:test

# Rebuild everything
npm run build:server
cd client && npm run build

# Test locally before deploying
npm run dev
```

---

## ✅ **Pre-Deployment Checklist**

Quick check before deploying:

```bash
# 1. Test database connection
npm run db:test

# 2. Build backend
npm run build:server

# 3. Build frontend  
cd client && npm run build && cd ..

# 4. Test locally
npm run dev

# 5. Deploy backend
git push origin main

# 6. Deploy frontend
firebase deploy --only hosting
```

---

## 🎯 **Success Indicators**

### Backend (Railway)
✅ Logs show: `🚀 Server running on http://localhost:5000`
✅ Health check: `curl https://your-app.railway.app/api/health`

### Frontend (Firebase)
✅ URL loads: https://orbit-lms.web.app
✅ No console errors (F12 → Console)

### Database (Supabase)
✅ Connection test passes: `npm run db:test`
✅ API returns data: `curl https://your-app.railway.app/api/facilities`

---

**Last Updated**: October 28, 2025
**Project**: ORBIT LMS
**Stack**: React + Vite + Node + Express + Supabase + Firebase + Railway

