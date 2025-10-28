# 📦 ORBIT Deployment Package

## 🎯 Quick Start

This deployment package contains everything you need to deploy ORBIT to production.

### 1️⃣ First Time Setup (5 minutes)

```bash
# 1. Create environment files (see ENV_SETUP_INSTRUCTIONS.md)
# Create .env in root directory
# Create client/.env
# Create client/.env.production

# 2. Test database connection
npm run db:test

# 3. Test locally
npm run dev
```

### 2️⃣ Deploy to Production (15 minutes)

```powershell
# PowerShell (Windows)
.\deploy-backend.ps1    # Deploy to Railway
.\deploy-frontend.ps1   # Deploy to Firebase
```

```bash
# Bash (Linux/Mac)
./deploy-backend.sh     # Deploy to Railway
./deploy-frontend.sh    # Deploy to Firebase
```

---

## 📚 **Documentation Files**

| File | Purpose | When to Use |
|------|---------|-------------|
| **DEPLOYMENT_SUMMARY.md** | 📖 Start here! Overview of everything | First time reading |
| **ENV_SETUP_INSTRUCTIONS.md** | 🔧 Environment variables setup | Before first deploy |
| **DEPLOYMENT_GUIDE.md** | 📘 Complete step-by-step guide | Full deployment walkthrough |
| **TESTING_CHECKLIST.md** | ✅ Testing procedures | Before & after deploy |
| **QUICK_REFERENCE.md** | ⚡ Fast command lookup | Daily reference |

---

## 🛠️ **Deployment Scripts**

### PowerShell (Windows)
- `deploy-backend.ps1` - Deploy backend to Railway
- `deploy-frontend.ps1` - Deploy frontend to Firebase

### Bash (Linux/Mac)
- `deploy-backend.sh` - Deploy backend to Railway
- `deploy-frontend.sh` - Deploy frontend to Firebase

### Testing
- `test-database.js` - Test Supabase connection

---

## 🎯 **Recommended Reading Order**

### For First-Time Deployment:
1. **DEPLOYMENT_SUMMARY.md** - Get the big picture (10 min read)
2. **ENV_SETUP_INSTRUCTIONS.md** - Set up environment variables (5 min)
3. Test locally: `npm run dev`
4. **DEPLOYMENT_GUIDE.md** - Follow step-by-step (30 min)
5. **TESTING_CHECKLIST.md** - Verify everything works (15 min)

### For Quick Reference:
- **QUICK_REFERENCE.md** - Fast command lookup

### For Troubleshooting:
- **TESTING_CHECKLIST.md** → "Common Issues & Quick Fixes"
- **DEPLOYMENT_GUIDE.md** → "Common Issues & Solutions"

---

## ⚡ **Super Quick Deploy** (Experienced Users)

```bash
# 1. Environment setup (one-time)
# Create .env, client/.env, client/.env.production with your credentials

# 2. Test locally
npm run db:test && npm run dev

# 3. Deploy backend
npm run build:server && git push origin main

# 4. Deploy frontend
cd client && npm run build && cd .. && firebase deploy --only hosting

# Done! ✅
```

---

## 🔍 **Troubleshooting Quick Links**

### Common Issues

**Backend won't start on Railway?**
→ See TESTING_CHECKLIST.md → "Issue: Backend won't start on Railway"

**Frontend shows blank page?**
→ See TESTING_CHECKLIST.md → "Issue: Frontend shows blank page"

**CORS errors?**
→ See TESTING_CHECKLIST.md → "Issue: CORS errors"

**Database connection failed?**
→ Run `npm run db:test` and see TESTING_CHECKLIST.md

**API 404 errors?**
→ See TESTING_CHECKLIST.md → "Issue: API 404 errors"

---

## ✅ **Pre-Deployment Checklist**

Quick check before deploying:

```bash
# ✅ Environment variables set?
ls .env client/.env client/.env.production

# ✅ Database connection works?
npm run db:test

# ✅ Backend builds?
npm run build:server

# ✅ Frontend builds?
cd client && npm run build && cd ..

# ✅ Local testing passes?
npm run dev

# All green? You're ready to deploy! 🚀
```

---

## 🗺️ **Deployment Architecture**

```
User Browser
    ↓
Firebase Hosting (orbit-lms.web.app)
    ↓ /api/** proxy
Railway Backend (Node.js + Express)
    ↓ PostgreSQL
Supabase Database
```

---

## 📊 **Service Configuration**

### Railway (Backend)
- **URL**: https://your-app.railway.app
- **Build**: `npm run build:server`
- **Start**: `npm run start`
- **Logs**: Railway Dashboard → Deployments → View Logs

### Firebase (Frontend)
- **URL**: https://orbit-lms.web.app
- **Build**: `cd client && npm run build`
- **Deploy**: `firebase deploy --only hosting`
- **Config**: `firebase.json`

### Supabase (Database)
- **URL**: https://your-project.supabase.co
- **Test**: `npm run db:test`
- **Dashboard**: Supabase Console

---

## 🎓 **Learning Path**

### Beginner (First Time Deploying)
1. Read **DEPLOYMENT_SUMMARY.md** (overview)
2. Follow **ENV_SETUP_INSTRUCTIONS.md** (environment setup)
3. Test with `npm run dev` (local testing)
4. Follow **DEPLOYMENT_GUIDE.md** (step-by-step deployment)
5. Use **TESTING_CHECKLIST.md** (verify deployment)

**Time Required**: ~2 hours

### Intermediate (Deployed Before)
1. Update environment files
2. Test locally: `npm run dev`
3. Use deployment scripts: `.\deploy-backend.ps1` and `.\deploy-frontend.ps1`
4. Check **QUICK_REFERENCE.md** as needed

**Time Required**: ~30 minutes

### Advanced (Daily Development)
- Use **QUICK_REFERENCE.md** for commands
- Deploy with one-liners: `git push` (backend), `firebase deploy` (frontend)
- Check logs when issues arise

**Time Required**: ~5 minutes per deploy

---

## 🛡️ **Safety & Best Practices**

### Before Deploying
- ✅ Always test locally first (`npm run dev`)
- ✅ Test database connection (`npm run db:test`)
- ✅ Build both backend and frontend locally
- ✅ Check for errors in terminal output

### After Deploying
- ✅ Check Railway logs for startup message
- ✅ Test backend health endpoint
- ✅ Open frontend in browser
- ✅ Check browser console for errors
- ✅ Test login and core features

### Emergency Rollback
- **Railway**: Dashboard → Deployments → Previous Version → Redeploy
- **Firebase**: Console → Hosting → Release History → Rollback

---

## 📞 **Support & Resources**

### Documentation
- Railway: https://docs.railway.app
- Firebase: https://firebase.google.com/docs/hosting
- Supabase: https://supabase.com/docs
- Vite: https://vitejs.dev

### Community
- Railway Discord: https://discord.gg/railway
- Firebase Community: https://firebase.google.com/community

### Debugging Tools
```bash
npm run db:test              # Test database
npm run build:server         # Test backend build
cd client && npm run build   # Test frontend build
npm run dev                  # Test locally
```

---

## 🎉 **Success Indicators**

Your deployment is successful when you see:

✅ **Railway Logs**:
```
🚀 Server running on http://localhost:5000
```

✅ **Firebase Deploy**:
```
✔  Deploy complete!
Hosting URL: https://orbit-lms.web.app
```

✅ **Database Test**:
```
✅ Database connection test completed successfully!
```

✅ **Browser**:
- Website loads
- No console errors
- Login works
- Features work

---

## 🚀 **You're Ready!**

Everything is configured and ready to deploy. Choose your path:

- **First Timer?** → Start with **DEPLOYMENT_SUMMARY.md**
- **Need Commands?** → Check **QUICK_REFERENCE.md**
- **Ready to Deploy?** → Run the deployment scripts
- **Having Issues?** → See **TESTING_CHECKLIST.md**

---

**Project**: ORBIT LMS
**Status**: ✅ Ready for Deployment
**Last Updated**: October 28, 2025

**Happy Deploying! 🚀**

