# 🔥 Firebase Setup - Complete Guide

## Current Status
- ✅ Frontend is **built** and ready (`client/dist/`)
- ✅ Firebase CLI is **authenticated** (kusa_230000002006@uic.edu.ph)
- ⚠️ Firebase project needs to be created

## Steps to Complete Firebase Deployment

### Step 1: Create Firebase Project

1. **Go to Firebase Console**
   - Open: https://console.firebase.google.com
   - Click **"Add project"** or **"Create a project"**

2. **Configure Project**
   - **Project name**: Enter `orbit-lms` (or any name you prefer)
   - Click **Continue**
   
3. **Google Analytics** (Optional)
   - You can enable or disable Google Analytics
   - Click **Continue** → **Create project**
   - Wait for project creation (takes ~30 seconds)

4. **Enable Firebase Hosting**
   - In your new project dashboard, click **Build** → **Hosting**
   - Click **Get started**
   - Follow the quick setup (we'll override this with CLI)

### Step 2: Get Your Firebase Project ID

After creating the project, note the **Project ID** (shown in project settings).
It might be different from "orbit-lms" (Firebase adds random characters if the name is taken).

### Step 3: Update .firebaserc

Update the file `C:\Users\Ken\Downloads\ORBIT\.firebaserc` with your actual project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

### Step 4: Deploy to Firebase

Run these commands:

```powershell
cd C:\Users\Ken\Downloads\ORBIT
firebase deploy --only hosting
```

Expected output:
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project/overview
Hosting URL: https://your-project.web.app
```

### Step 5: Update Backend CORS (if project ID is different)

If your Firebase Hosting URL is different from `https://orbit-lms.web.app`:

1. Edit `server/index.ts` line 22:
   ```typescript
   origin: "https://your-actual-project.web.app",
   ```

2. Rebuild and redeploy backend:
   ```bash
   npm run build:server
   git add .
   git commit -m "Update CORS for Firebase"
   git push origin main
   ```

---

## Quick Deploy Command (After Firebase Project is Created)

```powershell
cd C:\Users\Ken\Downloads\ORBIT
firebase deploy --only hosting
```

---

## Alternative: Manual File Upload (If CLI fails)

1. Go to Firebase Console → Hosting
2. Click "Add release"
3. Upload the entire `client/dist` folder
4. Firebase will deploy automatically

---

## Verification Checklist

After deployment:
- [ ] Open your Firebase Hosting URL
- [ ] Check browser console (F12) for errors
- [ ] Try logging in with Supabase credentials
- [ ] Verify API calls reach Railway backend
- [ ] Test booking creation

---

## Troubleshooting

### Error: "Failed to get Firebase project"
→ Make sure project is created in Firebase Console
→ Update `.firebaserc` with correct project ID

### Error: "CORS policy error"
→ Update `server/index.ts` with correct Firebase URL
→ Redeploy backend to Railway

### Error: "API 404"
→ Check `firebase.json` has correct Railway URL in rewrites

---

**Your Firebase project details will be:**
- Console: https://console.firebase.google.com/project/[your-project-id]
- Hosting URL: https://[your-project-id].web.app

**Current Railway Backend:** https://orbit-production-113f.up.railway.app ✅

