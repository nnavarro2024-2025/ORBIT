# ORBIT Vercel Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (sign up at https://vercel.com)
- Your code pushed to a GitHub repository

## Step 1: Prepare Your Repository

1. **Ensure your code is committed:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

## Step 2: Import Project to Vercel

1. Go to https://vercel.com/new
2. Click "Import Project"
3. Select your GitHub repository (you may need to grant Vercel access)
4. Vercel will auto-detect Next.js

## Step 3: Configure Build Settings

In the Vercel project settings:

- **Framework Preset:** Next.js (auto-detected)
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)
- **Root Directory:** `orbit-next`

## Step 4: Set Environment Variables

Add these environment variables in Vercel Dashboard (Settings → Environment Variables):

### Database & Supabase
```
DATABASE_URL=postgresql://postgres:jameslemuelA123A@db.jsieqpjrkxqnlpxxrnwt.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://jsieqpjrkxqnlpxxrnwt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWVxcGpya3hxbmxweHhybnd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MTA2ODgsImV4cCI6MjA3NTk4NjY4OH0.iiPsVBjdcMuDf2Hk-lD4JRunp2uyJ89Wi-UsnWzeagY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWVxcGpya3hxbmxweHhybnd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQxMDY4OCwiZXhwIjoyMDc1OTg2Njg4fQ.0_YoPIB_s1GPTd6eXzd3tW_M3WkF_GRoZNtGs9WiLCU
```

### Email Configuration
```
ALLOWED_EMAIL_DOMAINS=uic.edu.ph,uic.edu
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=jrabang_220000001540@uic.edu.ph
SMTP_PASS=lxpj gnup velj wmwc
SMTP_FROM="TaskMasterPro <jrabang_220000001540@uic.edu.ph>"
```

### External API
```
UIC_API_CLIENT_ID=1761122982-309436BC50E978C90CE34B2CF5BE9B80C6357D0AAB800568AD6DA992F836FF9C.api.uic.edu.ph
UIC_API_CLIENT_SECRET=9D823F09320B6BA44C170291A7A0EFD316B70CEBEE637355068CA7F726B02D68
```

### Optional (for production)
```
NEXT_PUBLIC_API_BASE_URL=  (leave empty or set to your Vercel domain once deployed)
```

**Important:** Set these for all environments (Production, Preview, Development)

## Step 5: Deploy

1. Click "Deploy"
2. Vercel will build and deploy your application
3. Monitor the build logs for any issues

## Step 6: Post-Deployment

Once deployed:

1. **Get your deployment URL:** `https://your-project.vercel.app`
2. **Update NEXT_PUBLIC_API_BASE_URL** (if needed):
   - Go to Settings → Environment Variables
   - Update or remove `NEXT_PUBLIC_API_BASE_URL`
   - Redeploy

3. **Test the deployment:**
   - Visit your Vercel URL
   - Test authentication
   - Test facility bookings
   - Check admin dashboard

## Automatic Deployments

Vercel will automatically deploy:
- **Production:** When you push to `main` branch
- **Preview:** When you create/update a pull request

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Ensure root directory is set to `orbit-next`

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check if Supabase allows connections from Vercel IPs
- Review Supabase connection pooling settings

### API Routes Not Working
- Ensure `export const dynamic = "force-dynamic"` is in all API routes
- Check Vercel function logs for errors

## Monitoring

- **Analytics:** Enable Vercel Analytics in project settings
- **Logs:** View real-time logs in Vercel Dashboard → Deployments → [Your Deployment] → Logs
- **Performance:** Monitor Core Web Vitals in Vercel Analytics

## Custom Domain (Optional)

1. Go to Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for DNS propagation (up to 48 hours)

## Rolling Back

If you need to roll back:
1. Go to Deployments
2. Find the previous working deployment
3. Click "..." → "Promote to Production"

---

## Quick Deploy Button

For future deployments from the same repository, you can use this button in your README:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_REPO_URL)

Replace `YOUR_REPO_URL` with your actual repository URL.
