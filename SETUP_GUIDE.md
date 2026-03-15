# 🚀 ORBIT System - Complete Setup & Booking Guide

> **Last Updated**: March 15, 2026  
> **Status**: Ready for Database Initialization & Seeding

---

## 📋 CHECKLIST - Setup Status

### ✅ **Completed Steps**
- [x] Node.js & npm installed (`node -v`, `npm -v`)
- [x] Repository cloned (`git clone ...`)
- [x] Dependencies installed (`npm install` in orbit-next)
- [x] Supabase project created (ORBIT project)
- [x] Google OAuth configured (Client ID & Secret)
- [x] Database tables created (via SQL migration in Supabase)
- [x] Session Pooler connection string configured
- [x] `.env.local` file created in `orbit-next/`
- [x] Facilities seed script created (`seed-facilities.ts`)

### ⏳ **Next Steps** (DO IN ORDER)
1. [ ] Verify environment variables (`npm run check-env`)
2. [ ] Seed facilities (`npx tsx scripts/seed-facilities.ts`)
3. [ ] Seed FAQs (`npx tsx scripts/seed-faqs.ts`)
4. [ ] Start dev server (`npm run dev`)
5. [ ] Test user signup via Google OAuth
6. [ ] Create a test booking
7. [ ] Approve booking as admin

---

## 🔧 **CRITICAL: Environment Variables**

Your `.env.local` file in `orbit-next/` **MUST** have these values:

```bash
# DATABASE (Supabase Session Pooler endpoint - NOT the direct connection!)
DATABASE_URL=postgresql://postgres.rqghtughqdxgnehdljyz:OrbitDB%2312311!!!@aws-1-ap-south-1.pooler.supabase.com:5432/postgres

# SUPABASE API KEYS
NEXT_PUBLIC_SUPABASE_URL=https://rqghtughqdxgnehdljyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxZ2h0dWdocWR4Z25laGRsanl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTY3OTIsImV4cCI6MjA4OTA5Mjc5Mn0.S1gPJdqEhLi5jJ4Qft3q1iSd0ni12-KvlSIoSmPhOxw
SUPABASE_SERVICE_ROLE_KEY=sb_secret_g4Cgae2Ik6RYAvqP4ORWaA_MOOBKXfp

# GOOGLE OAUTH
GOOGLE_CLIENT_ID=614911845763-onmbvt1kbtn6k2muc9475g1irb7l64va.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# EMAIL SERVICE (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@orbit.uic.edu.ph

# ALLOWED EMAIL DOMAINS
ALLOWED_EMAIL_DOMAINS=uic.edu.ph,gmail.com

# CRON SECURITY
CRON_SECRET=test-secret
```

⚠️ **IMPORTANT**: `.env.local` is in `.gitignore` - it will NOT be committed to Git. This is correct for security!

---

## 📊 **Database Tables Summary**

Your Supabase database now has these tables (10 total):

| Table | Purpose | Rows | Status |
|-------|---------|------|--------|
| `users` | User accounts & profiles | 0 (created via Supabase Auth) | ✅ Ready |
| `facilities` | Study rooms, labs, meeting rooms | 0 (will seed) | 🔄 Needs Seed |
| `facility_bookings` | User booking requests | 0 (created by users) | ✅ Ready |
| `booking_reminders` | Email reminder records | 0 (auto-created) | ✅ Ready |
| `faqs` | FAQs displayed in app | 0 (will seed) | 🔄 Needs Seed |
| `activity_logs` | Audit trail of actions | 0 (auto-created) | ✅ Ready |
| `system_alerts` | In-app notifications | 0 (auto-created) | ✅ Ready |
| `sessions` | Session storage | (auto-managed) | ✅ Ready |
| `computer_stations` | Computer lab tracking | 0 | ⚠️ Not Used (ORZ removed) |
| `report_schedules` | Scheduled reports | 0 | ✅ Ready |

**Key Point**: Facilities must be seeded BEFORE users can create bookings!

---

## 🎯 **Step-by-Step Setup (From Project Root)**

### Step 1: Navigate to orbit-next
```bash
cd orbit-next
```

### Step 2: Verify Environment Variables
```bash
npm run check-env
```

**Expected Output**: ✅ All required variables should show as set.

**If you see ❌ MISSING variables**, edit `.env.local` and add them.

### Step 3: Seed Initial Data

#### 3a. **Create Facilities** (CRITICAL - Must do first!)
```bash
npx tsx scripts/seed-facilities.ts
```

**Expected Output**:
```
✅ Loaded environment from .env.local
🏢 Facility seeding summary:
  ✅ Created: 7 new facilities
     - Study Room A
     - Study Room B
     - Study Room C
     - Board Room
     - Computer Lab
     - Lounge
     - Seminar Room
  🔄 Updated: 0 existing facilities
  ⏭️  Skipped: 0 unchanged facilities

📊 Total facilities in database: 7
✨ Facility seeding complete!
```

#### 3b. **Create FAQs**
```bash
npx tsx scripts/seed-faqs.ts
```

**Expected Output**:
```
✅ Loaded environment from .env.local
📚 FAQ seeding summary:
  ✅ Created: 10+ new FAQs
  📊 Total FAQs in database: 10+
✨ FAQ seeding complete!
```

### Step 4: Start Development Server
```bash
npm run dev
```

**Expected Output**:
```
▲ Next.js 15.1.0
- Local: http://localhost:3000
- Network: http://[YOUR_IP]:3000
✓ Ready in XXXms
```

### Step 5: Open in Browser
- Go to: **http://localhost:3000**
- You should see: Login page with "Sign in with Google" button

---

## 👤 **User & Booking Flow**

### User Sign Up Flow
1. Click "Sign in with Google"
2. Choose Google account (use your personal account for testing)
3. Supabase creates user record automatically
4. Redirected to dashboard (empty on first login)

### Creating Your First Booking

#### As a Student:
1. Go to **Booking Dashboard** → "Create New Booking"
2. Fill form:
   - **Facility**: Select "Study Room A"
   - **Date**: Pick a day (e.g., tomorrow)
   - **Start Time**: 10:00 AM
   - **End Time**: 11:30 AM
   - **Participants**: 2
   - **Purpose**: "Group study"
3. Click "Submit Booking"
4. Status should be: **"Pending"** (awaiting admin approval)

#### As an Admin:
1. Sign in as admin user (or set yourself as admin in Supabase)
2. Go to **Admin Dashboard** → "Pending Approvals"
3. Find your booking, click "Review"
4. Click "Approve" button
5. Your booking is now **"Scheduled"**

### Booking Status Meanings

| Status | Database | UI Display | Meaning |
|--------|----------|-----------|---------|
| `pending` | pending | Pending | Waiting for admin review |
| `approved` | approved | Scheduled/Active/Done | Admin approved (computed based on time) |
| `denied` | denied | Denied | Admin rejected |
| `cancelled` | cancelled | Cancelled | User or admin cancelled |

**Important**: "Scheduled", "Active", "Done" are NOT stored in DB - they're computed based on `startTime` vs `now()`.

---

## 🔑 **Key Functions That Need Database Setup**

### Functions in `src/server/core/storage.ts`

All these functions require the database tables to exist:

```typescript
// Users
getUser(id: string)                                    // ✅ Returns user by ID
getUserByEmail(email: string)                         // ✅ Returns user by email
upsertUser(user)                                      // ✅ Creates/updates user
getAllUsers()                                          // ✅ Lists all users
updateUserRole(userId, role)                          // ✅ Change user role
banUser(userId, reason, banEndDate)                   // ✅ Ban a user

// Facilities (MUST SEED FIRST!)
getAllFacilities()                                     // ✅ Get all facilities
getFacility(id)                                       // ✅ Get facility by ID
createFacility({ name, description, capacity })      // ✅ Add new facility

// Bookings (Requires users + facilities!)
createFacilityBooking(booking)                        // ✅ Create booking request
getFacilityBooking(id)                                // ✅ Get booking by ID
getFacilityBookingsByUser(userId)                     // ✅ Get user's bookings
updateFacilityBooking(id, updates)                    // ✅ Update booking
checkApprovedBookingConflicts(facilityId, start, end) // ✅ Check for conflicts

// FAQs (SHOULD SEED)
getFaqs()                                              // ✅ Get all FAQs
createFaq(input)                                       // ✅ Create FAQ
updateFaq(id, input)                                  // ✅ Update FAQ

// System Alerts
createSystemAlert(alert)                              // ✅ Create notification
getSystemAlerts()                                     // ✅ Get notifications
```

---

## 🚨 **Common Issues & Fixes**

### Issue 1: "Database connection error"
**Cause**: DATABASE_URL is missing/wrong in `.env.local`  
**Fix**:
```bash
# Check the value
echo $DATABASE_URL  # (or: echo %DATABASE_URL% on Windows)

# It should match the Session Pooler connection string from Supabase
# NOT the direct connection string!
```

### Issue 2: "relation \"users\" does not exist"
**Cause**: Database tables haven't been created yet  
**Fix**:
- You already manually ran the SQL in Supabase ✅
- This error should be gone now

### Issue 3: "No facilities available for booking"
**Cause**: You haven't run the facilities seed script yet  
**Fix**:
```bash
npx tsx scripts/seed-facilities.ts
```

### Issue 4: Google Sign In Not Working
**Cause**: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing  
**Fix**:
1. Check `.env.local` has both variables
2. Verify values match exactly what's in Google Cloud Console
3. Restart dev server: `npm run dev`

### Issue 5: Booking Creation Fails with "Invalid start time"
**Cause**: Booking time is outside library hours (7:30 AM - 7:00 PM)  
**Fix**: Pick a time during business hours

### Issue 6: Seed Script Fails with "MODULE_NOT_FOUND: zod"
**Cause**: Dependencies not installed in root directory  
**Fix**:
```bash
cd ..  # Go to project root
npm install zod drizzle-orm pg
cd orbit-next
npx tsx scripts/seed-facilities.ts
```

---

## ✅ **Testing Checklist**

Run through these tests to verify everything works:

- [ ] **Environment**: `npm run check-env` shows all ✅
- [ ] **Facilities Seeded**: `npx tsx scripts/seed-facilities.ts` creates 7 facilities
- [ ] **FAQs Seeded**: `npx tsx scripts/seed-faqs.ts` creates 10+ FAQs
- [ ] **Dev Server Starts**: `npm run dev` runs without errors
- [ ] **Login Works**: Can sign in with Google
- [ ] **Dashboard Loads**: After login, dashboard shows empty bookings
- [ ] **Facilities Visible**: Booking form shows all 7 facilities
- [ ] **Create Booking**: Can submit a booking request (becomes "Pending")
- [ ] **Admin Panel**: Can see "Pending Approvals"
- [ ] **Approve Booking**: Can approve pending booking and it becomes "Scheduled"

---

## 📱 **API Routes Ready to Use**

All these routes are now functional:

### Public Routes (No Auth Required)
- `GET /api/facilities` - List all facilities
- `GET /api/availability?facilityId=X&date=YYYY-MM-DD` - Check availability

### Protected Routes (Login Required)
- `GET /api/bookings` - Get user's bookings
- `POST /api/bookings` - Create new booking
- `PATCH /api/bookings/:id` - Update booking
- `GET /api/bookings/pending` - Get pending bookings (for admin)

### Admin Routes (Admin Role Required)
- `POST /api/admin/bookings/:id/approve` - Approve booking
- `POST /api/admin/bookings/:id/deny` - Deny booking
- `GET /api/admin/users` - List all users
- `POST /api/admin/users/:id/ban` - Ban user

---

## 📚 **Key Architecture Files You Modified**

1. **`.env.local`** (NEW - Created)
   - Contains all environment variables
   - Location: `orbit-next/.env.local`
   - Never commit this file!

2. **`scripts/seed-facilities.ts`** (NEW - Created)
   - Creates 7 sample facilities
   - Must run before creating bookings
   - Location: `orbit-next/scripts/seed-facilities.ts`

3. **Database Schema** (Already in Supabase)
   - 10 tables created from SQL migration
   - Includes all relationships (foreign keys)
   - Accessible via Supabase Studio

---

## 🎓 **Learning Path**

To understand the system:

1. **Read** → [ORBIT/.github/copilot-instructions.md](.github/copilot-instructions.md)
   - Architecture patterns
   - Core concepts

2. **Explore** → `src/server/core/storage.ts`
   - All database operations
   - How data flows

3. **Review** → `src/app/api/bookings/route.ts`
   - Booking creation flow
   - Validations applied

4. **Understand** → `src/server/bookings/helpers.ts`
   - Business logic
   - Validation rules

---

## ✨ **Next Steps After Setup**

1. **Test the booking workflow** end-to-end
2. **Try the admin dashboard** to approve/deny bookings
3. **Create multiple bookings** to test conflict detection
4. **Test email notifications** (currently no-op, ready for your email service)
5. **Explore the codebase** to understand how everything connects

---

## 📞 **Support & Debugging**

### Check Dev Server Logs
```bash
# Terminal where you ran "npm run dev"
# Look for any [ERROR] or [auth] messages
```

### View Database in Supabase Studio
```bash
# Go to: https://app.supabase.com
# Select your ORBIT project
# Click "SQL Editor" tab
# Run: SELECT * FROM facilities;
```

### Test API Endpoints Directly
```bash
# Get facilities (no auth needed)
curl http://localhost:3000/api/facilities

# Get your bookings (auth header required)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/bookings
```

---

## 🎯 **Success Indicators**

When everything is working correctly, you should see:

✅ Database tables created in Supabase  
✅ 7 facilities seeded successfully  
✅ 10+ FAQs seeded successfully  
✅ Dev server running on http://localhost:3000  
✅ Can login with Google OAuth  
✅ Can create a booking (shown as "Pending")  
✅ Can view booking in dashboard  
✅ Can approve booking as admin  
✅ Approved bookings show as "Scheduled"  

---

**You're all set! 🚀 Start with `npm run check-env` then proceed with seeding.**
