# 🧪 Testing Checklist

Complete testing guide before and after deployment.

---

## 📋 **Pre-Deployment Testing**

### 1. Environment Variables

- [ ] Root `.env` file exists with all required variables
- [ ] `client/.env` file exists with Supabase credentials
- [ ] `client/.env.production` exists with Railway backend URL
- [ ] All Supabase credentials are correct (URL, keys)
- [ ] DATABASE_URL is correct and accessible

**Test Command:**
```bash
npm run db:test
```

Expected output:
```
✅ DATABASE_URL: Set
✅ SUPABASE_URL: Set
✅ SUPABASE_ANON_KEY: Set
✅ Database connection test completed successfully!
```

---

### 2. Backend Build

- [ ] Backend builds without errors
- [ ] `dist/index.js` file is created
- [ ] Build output size is reasonable (~100-200KB)

**Test Command:**
```bash
npm run build:server
```

Expected output:
```
dist\index.js  134.0kb
Done in XXXms
```

---

### 3. Frontend Build

- [ ] Frontend builds without errors
- [ ] `client/dist/index.html` exists
- [ ] `client/dist/assets/` contains JS and CSS files
- [ ] No missing environment variable errors

**Test Command:**
```bash
cd client
npm run build
```

Expected output:
```
✓ 2333 modules transformed.
dist/index.html                              0.64 kB
dist/assets/...
✓ built in XXs
```

---

### 4. Backend Local Testing

- [ ] Backend starts without errors
- [ ] Server listens on port 5000
- [ ] Database connection successful
- [ ] API endpoints respond

**Test Commands:**
```bash
# Terminal 1: Start backend
npm run dev:server

# Terminal 2: Test endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/api/facilities
```

Expected backend output:
```
🚀 Server running on http://localhost:5000
```

---

### 5. Frontend Local Testing

- [ ] Frontend starts without errors
- [ ] Dev server runs on port 5173
- [ ] Pages load correctly
- [ ] No console errors

**Test Command:**
```bash
npm run dev:client
```

Then open http://localhost:5173 and check:
- [ ] Landing page loads
- [ ] Login page accessible
- [ ] No console errors (F12 → Console)

---

### 6. Full Stack Local Testing

- [ ] Backend and frontend run simultaneously
- [ ] Frontend can call backend APIs
- [ ] Authentication works (login/logout)
- [ ] Booking features work
- [ ] Admin features work (if admin)

**Test Command:**
```bash
npm run dev
```

Test these features:
- [ ] User login with Supabase credentials
- [ ] View facilities/computer stations
- [ ] Create a booking
- [ ] View bookings dashboard
- [ ] Admin panel (if admin user)

---

## 🚀 **Post-Deployment Testing (Railway Backend)**

### 1. Railway Deployment Status

- [ ] Railway build completed successfully
- [ ] Railway deployment status is "Active"
- [ ] No error logs in Railway dashboard
- [ ] Server started successfully

**Check in Railway Dashboard:**
1. Go to Deployments → Latest
2. Check status is green
3. View logs for `🚀 Server running`

---

### 2. Backend Health Check

- [ ] Backend URL is accessible
- [ ] Health endpoint responds
- [ ] No SSL/certificate errors

**Test Commands:**
```bash
curl https://your-railway-app.railway.app/api/health
curl https://your-railway-app.railway.app/api/facilities
```

Expected response:
```json
{"status": "ok"}
```

---

### 3. Database Connection (Production)

- [ ] Backend can connect to Supabase
- [ ] API routes return data
- [ ] No connection timeout errors

**Test Commands:**
```bash
curl https://your-railway-app.railway.app/api/auth/sync
curl https://your-railway-app.railway.app/api/facilities
```

---

### 4. CORS Configuration

- [ ] Frontend can call backend APIs
- [ ] No CORS errors in browser console
- [ ] Credentials are sent correctly

**Manual Test:**
1. Open frontend (Firebase) in browser
2. Open DevTools (F12) → Network tab
3. Try logging in
4. Check API calls to Railway backend
5. Verify no CORS errors

---

## 🔥 **Post-Deployment Testing (Firebase Frontend)**

### 1. Firebase Deployment Status

- [ ] Firebase deploy completed successfully
- [ ] Hosting URL is live
- [ ] Files uploaded correctly

**Test Command:**
```bash
firebase hosting:channel:list
```

---

### 2. Frontend Loading

- [ ] Frontend URL loads (https://orbit-lms.web.app)
- [ ] No 404 errors
- [ ] Assets load correctly (CSS, JS)
- [ ] No blank page

**Manual Test:**
1. Open https://orbit-lms.web.app
2. Check page loads completely
3. Check Network tab (F12) for failed requests

---

### 3. API Integration

- [ ] Frontend can reach Railway backend
- [ ] API rewrites work correctly
- [ ] `/api/*` routes proxy to Railway
- [ ] Authentication token is sent

**Manual Test:**
1. Open DevTools → Network tab
2. Try logging in
3. Check API calls go to Railway backend
4. Verify Authorization header is present

---

### 4. End-to-End Features

- [ ] User can log in
- [ ] User can view facilities
- [ ] User can create bookings
- [ ] User can view their bookings
- [ ] Admin can access admin panel
- [ ] Notifications work

---

## 🗄️ **Database Testing**

### 1. Supabase Connection

- [ ] Backend connects to Supabase successfully
- [ ] Row-level security policies work
- [ ] API can read from tables
- [ ] API can write to tables

**Test Script:**
```bash
npm run db:test
```

---

### 2. Data Integrity

- [ ] Existing data is intact
- [ ] New data can be created
- [ ] Updates work correctly
- [ ] Deletions work correctly

**SQL Test (in Supabase SQL Editor):**
```sql
-- Check table counts
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'facilities', COUNT(*) FROM facilities
UNION ALL
SELECT 'facility_bookings', COUNT(*) FROM facility_bookings;
```

---

## 🔍 **Error Checking**

### Backend Errors (Railway Logs)

Common errors to check for:
- [ ] No "Connection refused" errors
- [ ] No "ECONNREFUSED" errors
- [ ] No "Unauthorized" database errors
- [ ] No missing environment variable errors

**Check in Railway:**
1. Dashboard → Deployments → View Logs
2. Look for red error messages
3. Check for stack traces

---

### Frontend Errors (Browser Console)

Common errors to check for:
- [ ] No CORS errors
- [ ] No "Failed to fetch" errors
- [ ] No "401 Unauthorized" errors
- [ ] No missing Supabase credentials errors

**Check in Browser:**
1. F12 → Console
2. Look for red error messages
3. Check Network tab for failed requests

---

## 🛠️ **Common Issues & Quick Fixes**

### Issue: Backend won't start on Railway

**Check:**
- [ ] Railway environment variables are set
- [ ] `PORT` is NOT manually set
- [ ] `NODE_ENV=production` is set
- [ ] Build command ran successfully

**Fix:**
```bash
# Rebuild backend
npm run build:server
git add .
git commit -m "Fix backend build"
git push
```

---

### Issue: Frontend shows blank page

**Check:**
- [ ] `client/dist/index.html` exists
- [ ] Firebase deployed the correct files
- [ ] Browser console for errors

**Fix:**
```bash
# Rebuild and redeploy
cd client
npm run build
cd ..
firebase deploy --only hosting
```

---

### Issue: CORS errors

**Check:**
- [ ] `server/index.ts` CORS origin matches Firebase URL
- [ ] `firebase.json` rewrites are correct
- [ ] Backend URL in frontend matches Railway URL

**Fix:**
Update `server/index.ts`:
```typescript
const corsOptions = {
  origin: "https://orbit-lms.web.app", // exact Firebase URL
  credentials: true,
};
```

---

### Issue: Database connection failed

**Check:**
- [ ] DATABASE_URL is correct in Railway
- [ ] Supabase project is active
- [ ] SSL is configured: `ssl: { rejectUnauthorized: false }`

**Fix:**
```bash
# Test connection locally first
npm run db:test
```

---

### Issue: API 404 errors

**Check:**
- [ ] `firebase.json` has correct Railway URL
- [ ] Railway backend is running
- [ ] API routes exist in `server/routes.ts`

**Fix:**
Update `firebase.json`:
```json
{
  "rewrites": [
    {
      "source": "/api/**",
      "destination": "https://your-actual-railway-url.railway.app/api/**"
    }
  ]
}
```

---

## ✅ **Final Deployment Checklist**

Before declaring deployment complete:

### Backend (Railway)
- [ ] ✅ Build successful
- [ ] ✅ Deployment active
- [ ] ✅ Server logs show "🚀 Server running"
- [ ] ✅ Health check passes
- [ ] ✅ Database connected
- [ ] ✅ API endpoints respond correctly

### Frontend (Firebase)
- [ ] ✅ Build successful
- [ ] ✅ Deploy complete
- [ ] ✅ Website loads at Firebase URL
- [ ] ✅ No console errors
- [ ] ✅ API calls reach Railway
- [ ] ✅ Authentication works

### Database (Supabase)
- [ ] ✅ Connection test passes
- [ ] ✅ Tables exist and have data
- [ ] ✅ API can read/write data
- [ ] ✅ Row-level security working

### Integration
- [ ] ✅ Full login flow works
- [ ] ✅ Booking creation works
- [ ] ✅ Admin panel accessible
- [ ] ✅ Notifications work
- [ ] ✅ No critical errors in logs

---

## 🎉 **Deployment Success!**

If all checkboxes are ✅, your deployment is complete!

**Live URLs:**
- Frontend: https://orbit-lms.web.app
- Backend: https://your-railway-app.railway.app
- Database: Supabase dashboard

**Monitoring:**
- Railway: Dashboard → Metrics
- Firebase: Firebase Console → Analytics
- Supabase: Dashboard → Database

---

**Last Updated**: October 28, 2025

