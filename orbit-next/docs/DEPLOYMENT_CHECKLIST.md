# ORBIT Vercel Deployment Checklist

Use this checklist to ensure a smooth deployment to Vercel.

## Pre-Deployment Checklist

### Code Preparation
- [ ] All changes committed to Git
- [ ] Code pushed to GitHub repository
- [ ] All API routes have `export const dynamic = "force-dynamic"`
- [ ] Environment variables documented
- [ ] No sensitive data in code (API keys, passwords, etc.)

### Environment Configuration
- [ ] `.env.local` configured for local development
- [ ] `.env.production` configured for production values
- [ ] Database URL is accessible from Vercel
- [ ] Supabase project is configured and accessible

### Database
- [ ] Database migrations applied
- [ ] Database schema up to date
- [ ] Test data added (if needed)
- [ ] Supabase Row Level Security (RLS) configured
- [ ] Database connection pooling configured

## Vercel Setup Checklist

### Account & Project Setup
- [ ] Vercel account created/logged in
- [ ] GitHub repository connected to Vercel
- [ ] Project imported to Vercel
- [ ] Root directory set to `orbit-next`

### Build Configuration
- [ ] Framework preset: Next.js (auto-detected)
- [ ] Build command: `npm run build`
- [ ] Output directory: `.next`
- [ ] Install command: `npm install`
- [ ] Node.js version: 20.x or higher

### Environment Variables (All Environments)
Copy all variables from `.env.local` to Vercel:

#### Database & Authentication
- [ ] `DATABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

#### Email & SMTP
- [ ] `ALLOWED_EMAIL_DOMAINS`
- [ ] `SMTP_HOST`
- [ ] `SMTP_PORT`
- [ ] `SMTP_USER`
- [ ] `SMTP_PASS`
- [ ] `SMTP_FROM`

#### External APIs
- [ ] `UIC_API_CLIENT_ID`
- [ ] `UIC_API_CLIENT_SECRET`

#### Optional
- [ ] `NEXT_PUBLIC_API_BASE_URL` (set after first deploy or leave empty)

## Deployment Checklist

### Initial Deployment
- [ ] Click "Deploy" in Vercel
- [ ] Monitor build logs for errors
- [ ] Wait for deployment to complete
- [ ] Note the deployment URL

### Post-Deployment Testing
- [ ] Visit deployment URL
- [ ] Test homepage loads
- [ ] Test user authentication/login
- [ ] Test facility browsing
- [ ] Create a test booking
- [ ] Verify email notifications work
- [ ] Test admin dashboard (as admin user)
- [ ] Test booking approval flow
- [ ] Check console for errors
- [ ] Test on mobile devices

### Admin Functions
- [ ] Admin can view all bookings
- [ ] Admin can approve/deny bookings
- [ ] Admin can manage users
- [ ] Admin can view activity logs
- [ ] Admin notifications working

### Performance Check
- [ ] Page load times acceptable
- [ ] API response times good
- [ ] Images loading properly
- [ ] No console errors
- [ ] Database queries optimized

## Post-Deployment Tasks

### Configuration Updates
- [ ] Update `NEXT_PUBLIC_API_BASE_URL` with Vercel URL (if needed)
- [ ] Redeploy after environment variable changes
- [ ] Configure custom domain (optional)
- [ ] Set up DNS records (if using custom domain)

### Monitoring Setup
- [ ] Enable Vercel Analytics
- [ ] Set up error tracking
- [ ] Configure deployment notifications
- [ ] Set up uptime monitoring

### Documentation
- [ ] Document deployment URL
- [ ] Share admin credentials securely
- [ ] Update project documentation
- [ ] Create user guide (if needed)

### Security
- [ ] Review Vercel security settings
- [ ] Verify environment variables are secure
- [ ] Check Supabase security rules
- [ ] Review CORS settings
- [ ] Verify rate limiting configured

## Rollback Plan

In case of issues:
- [ ] Previous deployment URL saved
- [ ] Know how to roll back in Vercel dashboard
- [ ] Database backup available
- [ ] Rollback procedure documented

## Ongoing Maintenance

### Regular Tasks
- [ ] Monitor deployment logs weekly
- [ ] Review analytics monthly
- [ ] Update dependencies quarterly
- [ ] Test all features after updates
- [ ] Backup database regularly

### Updates
- [ ] Test updates in preview deployments
- [ ] Use PR/branch deployments for testing
- [ ] Monitor after production deployments
- [ ] Document any configuration changes

---

## Quick Reference

**Vercel Dashboard:** https://vercel.com/dashboard
**Supabase Dashboard:** https://supabase.com/dashboard
**GitHub Repository:** [Your Repo URL]

**Key Commands:**
```bash
# Local development
npm run dev

# Test build locally (may have JSONB parsing issue)
npm run build

# Deploy via Git
git push origin main  # Triggers automatic deployment
```

## Troubleshooting

### Build Fails
1. Check Vercel build logs
2. Verify all environment variables set
3. Ensure root directory is `orbit-next`
4. Check for TypeScript errors
5. Verify dependencies install correctly

### Runtime Errors
1. Check Vercel function logs
2. Verify DATABASE_URL connection
3. Check Supabase logs
4. Review API route responses
5. Check browser console errors

### Database Issues
1. Verify connection string format
2. Check Supabase project status
3. Review connection pooling
4. Check for migration issues
5. Verify RLS policies

---

**Last Updated:** [Add date when deploying]
**Deployed By:** [Your name]
**Deployment URL:** [Add after first deploy]
