# ⚡ Quick Setup - Start Here!

## ✅ What I Just Did

I created the environment files for you:
- ✅ `.env` (backend configuration)
- ✅ `client/.env` (frontend configuration)

**Both files have placeholder values that you need to replace with your actual Supabase credentials.**

---

## 🚀 Two Ways to Complete Setup

### **Option 1: Automated Setup (Recommended)** ⭐

Run this script and it will guide you step-by-step:

```powershell
.\setup-credentials.ps1
```

This script will:
1. Ask you for your Supabase credentials
2. Update both `.env` files automatically
3. Test the database connection
4. Tell you if everything is working

---

### **Option 2: Manual Setup**

1. **Get Your Supabase Credentials**

   Go to: https://supabase.com/dashboard
   
   - Select your project (or create one)
   - Go to **Settings** → **API**
   - Copy:
     - Project URL
     - anon public key
     - service_role key
   - Go to **Settings** → **Database**
   - Copy: Connection string (URI format)

2. **Edit `.env` file**
   
   Open: `C:\Users\Ken\Downloads\ORBIT\.env`
   
   Replace these lines with your actual values:
   ```env
   DATABASE_URL=postgresql://postgres.xxxxxxxxxxxx:YOUR-PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR-KEY-HERE
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR-KEY-HERE
   ```

3. **Edit `client/.env` file**
   
   Open: `C:\Users\Ken\Downloads\ORBIT\client\.env`
   
   Replace these lines:
   ```env
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR-KEY-HERE
   ```

---

## 🧪 Test Your Setup

After entering your credentials:

```powershell
# Test database connection
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

## 🚀 Start Development

Once credentials are set and tested:

```powershell
npm run dev
```

You should see:
```
[AUTH] SUPABASE_URL=https://xxx.supabase.co ✅
[AUTH] SUPABASE_ANON_KEY set?=true ✅
🚀 Server running on http://localhost:5000
➜  Local: http://localhost:5173/
```

---

## 🆘 Don't Have a Supabase Project?

### Create One Now (Free, 2 minutes):

1. **Go to**: https://supabase.com/dashboard
2. **Click**: "New Project"
3. **Fill in**:
   - Name: `orbit-lms`
   - Database Password: (choose a strong password and **save it!**)
   - Region: Choose closest to you
4. **Wait**: ~2 minutes for project to be created
5. **Get credentials**: Settings → API

---

## 📋 What You Need

From Supabase Dashboard (Settings → API):
- ✅ Project URL (looks like: `https://abc123.supabase.co`)
- ✅ anon public key (starts with: `eyJhbGci...`)
- ✅ service_role key (starts with: `eyJhbGci...`)

From Supabase Dashboard (Settings → Database):
- ✅ Connection string (looks like: `postgresql://postgres.xxx:password@...`)

---

## ⚡ Quick Start Commands

```powershell
# Step 1: Setup credentials (easiest way)
.\setup-credentials.ps1

# Step 2: Test connection
npm run db:test

# Step 3: Start development
npm run dev

# Step 4: Open browser
# Go to: http://localhost:5173
```

---

## 🎯 Current Status

- ✅ Environment files created (`.env` and `client/.env`)
- ⏳ **YOU NEED TO**: Add your Supabase credentials
- ⏳ **THEN**: Test with `npm run db:test`
- ⏳ **FINALLY**: Run `npm run dev`

---

## 🔗 Quick Links

| What | Where |
|------|-------|
| **Supabase Dashboard** | https://supabase.com/dashboard |
| **Setup Script** | `.\setup-credentials.ps1` |
| **Backend .env** | `C:\Users\Ken\Downloads\ORBIT\.env` |
| **Frontend .env** | `C:\Users\Ken\Downloads\ORBIT\client\.env` |

---

## ✅ Next Steps

1. **Run**: `.\setup-credentials.ps1` ⭐ (Easiest!)
   
   OR manually edit `.env` and `client/.env` files

2. **Test**: `npm run db:test`

3. **Start**: `npm run dev`

4. **Open**: http://localhost:5173

---

**Estimated Time**: 5 minutes to get running! 🚀

