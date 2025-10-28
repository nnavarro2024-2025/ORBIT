# Environment Variables Setup Guide

## 🔧 **Step 1: Create Backend .env file**

Create a file named `.env` in the **root directory** with the following content:

```env
# Backend Environment Variables (Local Development)
NODE_ENV=development
PORT=5000

# Supabase Configuration
DATABASE_URL=postgresql://your-username:your-password@your-host:5432/your-database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Email Service (if using nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-app-password
EMAIL_FROM=noreply@orbit-lms.com

# Frontend URL (for CORS - use localhost for dev)
FRONTEND_URL=http://localhost:5173
```

### Where to find your Supabase credentials:
1. Go to your Supabase project dashboard
2. Click on "Settings" → "Database"
3. Find "Connection string" (URI format) - this is your `DATABASE_URL`
4. Click on "Settings" → "API"
5. Copy "Project URL" → this is your `SUPABASE_URL`
6. Copy "anon public" key → this is your `SUPABASE_ANON_KEY`
7. Copy "service_role" key → this is your `SUPABASE_SERVICE_ROLE_KEY`

---

## 🔧 **Step 2: Create Frontend .env file**

Create a file named `.env` in the **client/** directory with the following content:

```env
# Frontend Environment Variables (Local Development)

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Backend API URL (leave empty for local development - uses Vite proxy)
VITE_API_BASE_URL=
```

---

## 🚀 **Step 3: Railway Environment Variables**

When deploying to Railway, add these environment variables in the Railway dashboard:

**DO NOT set PORT manually** - Railway sets this automatically!

```
NODE_ENV=production
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
EMAIL_FROM=noreply@orbit-lms.com
FRONTEND_URL=https://orbit-lms.web.app
```

---

## 🔥 **Step 4: Firebase Environment Variables**

Firebase Hosting doesn't use .env files. Instead, set environment variables during build:

Option 1: Use GitHub Actions or CI/CD to set environment variables before `npm run build`

Option 2: Create a `.env.production` file in `client/` directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
VITE_API_BASE_URL=https://orbit-production-113f.up.railway.app
```

---

## ✅ **Verification Checklist**

- [ ] Root `.env` file created with Supabase credentials
- [ ] `client/.env` file created with Supabase credentials
- [ ] Railway environment variables configured (except PORT)
- [ ] `client/.env.production` file created with Railway backend URL

