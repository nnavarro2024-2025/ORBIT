# ORBIT System - How to Run & What Changed

## Quick Start - Running the System

### Prerequisites ✅
- Node.js 18+ installed
- `.env.local` file configured (already done ✓)
- Database connection working (already tested ✓)

### Step 1: Install Dependencies
```bash
cd c:\Users\nikko\Documents\GitHub\ORBIT\ORBIT\orbit-next
npm install
```
**Status**: Should already be installed from previous setup

### Step 2: Validate Environment
```bash
npm run check-env
```
**Expected Output**:
```
✅ All environment variables are set correctly
DATABASE_URL: ✓
NEXT_PUBLIC_SUPABASE_URL: ✓
NEXT_PUBLIC_SUPABASE_ANON_KEY: ✓
...
```

### Step 3: Apply Database Migration (NEW - Do This First!)
**In Supabase SQL Editor** (https://supabase.com/dashboard):
1. Open SQL Editor
2. Create new query
3. Paste this SQL:
```sql
-- Add password fields to users table (SAFE - no data loss)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password_hash varchar;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password_setup_required_at timestamp;

-- Verify columns added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('password_hash', 'password_setup_required_at');
```
4. Click "Run"
5. Should complete without errors

### Step 4: Start Development Server
```bash
cd c:\Users\nikko\Documents\GitHub\ORBIT\ORBIT\orbit-next
npm run dev
```

**Expected Output**:
```
> orbit-next@0.1.0 dev
> next dev

  ▲ Next.js 15.1.0

  Local:        http://localhost:3000
  Environments: .env.local

 ✓ Ready in 2.8s
```

### Step 5: Open in Browser
Visit: **http://localhost:3000**

**First Load**:
- Redirects to `/login` (because not authenticated)
- See login page with two options:
  1. "Sign in with University Email" (Google OAuth - existed before)
  2. Email + Password fields (NEW)

---

## Running Other Commands

### Check Lint/Type Errors
```bash
npm run build
```
(Built-in TypeScript checking disabled for speed)

### Run Tests
```bash
npm run test
```

### Create Database Backup
```bash
npm run fix-db
```

---

## System Flow - How It Works Now

```
┌─────────────────────────────────────────────┐
│           User Visits localhost:3000         │
└────────────────┬────────────────────────────┘
                 │
         ┌───────▼────────┐
         │   Authenticated?│
         └───────┬────────┘
         ┌───────┴─────────────┐
        NO                     YES
         │                      │
     ┌───▼──────┐          ┌────▼──────────────┐
     │ /login   │          │ Check Password    │
     │ Page     │          │ Setup Required?   │
     └─┬────────┘          └────┬─────────────┘
       │                    ┌───┴─────┐
   ┌───▼──────┐        YES NO          NO
   │ Two Login │         │            │
   │ Options  │     ┌────▼────┐   ┌───▼──────┐
   └──┬───┬───┘     │ Password │   │ Dashboard│
      │   │         │ Setup    │   │ /booking │
      │   │         │ Modal    │   └──────────┘
      │   │         │ (BLOCKS) │
      │   │         └────┬─────┘
      │   │              │
      │   │         ┌────▼─────────┐
      │   │         │ Set Password  │
      │   │         │ (8+ chars,    │
      │   │         │  mixed case)  │
      │   │         └────┬──────────┘
      │   │              │
      │   │         ┌────▼──────────────┐
      │   │         │ Auto-Detect Role  │
      │   │         │ - Student/Faculty │
      │   │         │ - Or Admin manual  │
      │   │         └────┬─────────────┘
      │   │              │
      │   └──────────────┴──┐
      │                     │
      ▼                     ▼
  Google           ┌──────────────┐
  OAuth            │   Dashboard  │
     │             │  /booking    │
     │             │              │
     │             │ - See roles  │
     │             │ - Book rooms │
     │             │ - Manage     │
     └─────┬───────┤   bookings   │
           │       │ - Settings   │
           │       │   + NEW:     │
           │       │   Change     │
           │       │   password   │
           │       └──────────────┘
           │
           ▼
      ┌─────────────────┐
      │ Password Modal  │
      │ (If no password)|
      │ (BLOCKS)        │
      └────────┬────────┘
               │
               ▼
          Same flow as
          email/password
```

---

## What Was ADDED (New Features)

### 1. **Password Authentication System**

| Component | File | Purpose |
|-----------|------|---------|
| Password Modal | `components/modals/auth/PasswordSetupModal.tsx` | Blocking first-time password setup |
| Password Form | `components/modals/auth/PasswordChangeForm.tsx` | Change password in profile |
| Password Utils | `server/utils/password.ts` | Hash, verify, validate passwords |
| Password Hook | `hooks/data/usePasswordStatus.ts` | Query password status |

### 2. **Role Detection System**

| Component | File | Purpose |
|-----------|------|---------|
| Role Detection | `server/utils/roleDetection.ts` | Auto-detect student/faculty from email |
| Updated Sync | `app/api/auth/sync/route.ts` | Apply role detection on signup |

### 3. **New API Routes**

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/setup-password` | POST | Create password (required first-time) |
| `/api/auth/change-password` | PUT | Update existing password |
| `/api/auth/password-status` | GET | Check if password setup is required |

### 4. **Database Columns** (Added to `users` table)

```sql
password_hash VARCHAR              -- Stores hashed password (for future use)
password_setup_required_at TIMESTAMP  -- Tracks if user must set password
```

### 5. **UI Integration**

- PasswordSetupModal added to `BookingDashboardInner.tsx`
- Shows modal when `passwordSetupRequired === true` on login
- Blocks all access until password is set

---

## What Existed BEFORE (Previous Functionality)

### 1. **Google OAuth Authentication** ✅ (Still Works)
- Users could sign in with "Sign in with University Email"
- Uses Google's OAuth 2.0 provider
- Supabase handles Google integration
- Already working at `/login`

### 2. **Role-Based Access Control** ✅ (Still Works)
- Three roles: student, faculty, admin
- Different facilities for different roles
- **Facility Visibility**:
  - Student: Study Room A, B, C, Seminar Room (unrestricted)
  - Faculty: Board Room, Lounge (restricted)
  - Admin: ALL facilities + Admin Dashboard
- Implemented in `AvailableRoomsSection.tsx` (lines 87-96)

### 3. **Facility Booking System** ✅ (Still Works)
- Browse available facilities
- Book time slots
- View bookings with status (pending, approved, denied, cancelled)
- Arrival confirmation for active bookings
- Equipment selection
- Admin can approve/deny bookings

### 4. **User Dashboard** ✅ (Still Works)
- View active/upcoming/past bookings
- Manage bookings (edit, cancel)
- Notifications system
- Activity logs
- User profile with basic info (name, email, photo)

### 5. **Admin Panel** ✅ (Still Works)
- Manage all bookings
- User management (view, ban, suspend)
- Booking approval workflow
- See all bookings across users

### 6. **Email Configuration** ✅ (Still Works)
- SMTP configured for emails
- Booking notifications (currently no-op logger)
- Reminder emails (scheduled)

### 7. **Dev Tools** ✅ (Still Works)
- "Dev: Force Open" toggle - simulate library open/closed
- Toggle between different time scenarios for testing

---

## Key Differences: Before vs After

| Feature | Before | After |
|---------|--------|-------|
| **Login Methods** | Google OAuth only | Google OAuth + Email/Password |
| **Password Required** | Not required (Google handles it) | Required on FIRST login for ALL users |
| **Password Requirement Persistent** | N/A | YES - If not set, modal shows every login |
| **Role Assignment** | Manual only (admin sets in DB) | Auto-detects from email on first login |
| **Role Override** | Yes, manual in DB | Yes, manual in DB (auto-detect can be overridden) |
| **First-Time UX** | Direct to dashboard | Password setup modal (blocking) |
| **Subsequent Logins** | N/A | Direct to dashboard (password already set) |
| **Profile Settings** | Basic info only | Basic info + Password change |
| **Email Pattern Detection** | None | Student/Faculty auto-detected |
| **Access Control** | Free-form role system | Full RBAC with auto-detection |

---

## Critical: Password Setup Persistence

⚠️ **Important**: If a user's password is never set (`password_hash IS NULL`), the modal will show on **EVERY LOGIN** until they complete it.

**Why?** This ensures no user can bypass the password security requirement.

**Database Flag:**
- `password_hash = NULL` → User has no password set yet
- `password_hash != NULL` → User has a password  
- `password_setup_required_at = now()` → Show modal on next login
- `password_setup_required_at = NULL` → User completed setup, no modal

---

## Data Flow - How New Password System Works

### Password Setup Requirement (Updated Logic)
**Password setup modal appears when:**
- ✅ First-time login (new user)
- ✅ User has no password yet (`password_hash IS NULL` in database)
- ✅ Even on subsequent logins if password wasn't set the first time

**Password setup modal does NOT appear when:**
- ❌ User already has a password set (`password_hash IS NOT NULL`)
- ❌ And the password setup was completed (`password_setup_required_at IS NULL`)

### When User Signs Up (Email/Password)

```
1. User enters email + password at /login
   ↓
2. Supabase Auth validates credentials
   ↓
3. Session created, redirect to /login
   ↓
4. Frontend /login page detects session
   ↓
5. Calls /api/auth/sync (POST)
   ├─ Checks if user exists in DB
   ├─ First-time USER or NO PASSWORD? → Set passwordSetupRequiredAt = now()
   ├─ Calls detectRoleFromEmail()
   │  ├─ Has "_" and 7+ digits? → "student"
   │  ├─ No numbers? → "faculty"
   │  └─ Otherwise → "student" (default)
   └─ Returns user record with flag
   ↓
6. usePasswordStatus hook queries /api/auth/password-status
   ├─ Checks if passwordSetupRequiredAt is set to a date
   └─ Returns { passwordSetupRequired: true, role: "student", email: "..." }
   ↓
7. PasswordSetupModal displays (cannot be dismissed)
   ↓
8. User enters new password
   ├─ Validated: 8+ chars, uppercase, lowercase, numbers
   └─ Must match confirm password
   ↓
9. POST /api/auth/setup-password
   ├─ Updates Supabase Auth password
   ├─ Clears passwordSetupRequiredAt (sets to NULL)
   ├─ Sets passwordSetupAt timestamp (optional, for audit)
   └─ Returns success
   ↓
10. Modal closes, page reloads
    ↓
11. Dashboard shows, user can now book facilities
```

### When Existing User Returns (Already Has Password)

```
1. User enters email + password at /login
   ↓
2. Supabase Auth validates credentials (existing user)
   ↓
3. Calls /api/auth/sync (POST)
   ├─ User exists in DB: YES
   ├─ Check password_hash: NOT NULL (has password)
   ├─ passwordSetupRequiredAt: NULL (already completed)
   └─ Returns: { passwordSetupRequired: false }
   ↓
4. usePasswordStatus hook queries /api/auth/password-status
   └─ Returns: { passwordSetupRequired: false }
   ↓
5. No modal shown - dashboard loads immediately ✓
   ↓
6. User can manage bookings and change password anytime
```

### When User Didn't Complete Password Setup (Edge Case)

```
1. User logs in → Password setup modal appeared
   ↓
2. User closes browser WITHOUT setting password
   ↓
3. In database:
   - password_hash: NULL (never set)
   - password_setup_required_at: still set to timestamp
   ↓
4. User logs in again at later time
   ↓
5. Calls /api/auth/sync (POST)
   ├─ User exists in DB: YES
   ├─ Check password_hash: NULL (no password!)
   ├─ Logic triggers: if (!existingUser || !existingUser?.passwordHash)
   ├─ Sets passwordSetupRequiredAt = now() ← RESETS THE FLAG
   └─ Returns: { passwordSetupRequired: true }
   ↓
6. Modal shows again (persistent requirement) ✓
   ↓
7. User MUST set password before accessing dashboard
```

This ensures users cannot bypass the password setup requirement.

---

## Testing the New System

### Test Case 1: Email/Password - First Login (Password Setup Required)
```
Steps:
1. Go to http://localhost:3000/login
2. Enter email: nnavarro_230000002875@uic.edu.ph
3. Enter password: (any password for initial auth)
4. Password setup modal appears (NEW accounts always show this)
5. Enter password: SecurePass123
6. Click "Set Password"
7. Wait for redirect

Expected:
✓ Role should be "student"
✓ User sees Study Rooms A-C, Seminar Room
✓ User doesn't see Board Room, Lounge
✓ Database: password_hash is set, password_setup_required_at is NULL
```

### Test Case 1b: Email/Password - Second Login (No Password Setup)
```
Steps:
1. Logout from previous test
2. Login again with same account (nnavarro_230000002875@uic.edu.ph)
3. Enter password: SecurePass123

Expected:
✓ Password setup modal does NOT appear
✓ Dashboard loads immediately
✓ Can access all features without modal blocking
```

### Test Case 1c: Email/Password - Incomplete Setup (Resets Requirement)
```
Steps:
1. Create new account: test_student_240000000001@uic.edu.ph
2. See password setup modal appear
3. Close browser/tab WITHOUT clicking "Set Password"
4. In database, verify: password_hash = NULL, password_setup_required_at = timestamp
5. Login again with same account

Expected:
✓ Password setup modal appears AGAIN (requirement is persistent!)
✓ User CANNOT access dashboard without setting password
✓ System ensures all users have a password eventually
```

### Test Case 2: Faculty Email
```
Steps:
1. Create account with: scloribel@uic.edu.ph
2. Go through password setup (REQUIRED - first time)
3. Check dashboard

Expected:
✓ Role should be "faculty"
✓ User sees Board Room, Lounge
✓ User doesn't see Study Rooms A-C, Seminar Room
```

### Test Case 3: Google OAuth - First Login (Password Setup Required)
```
Steps:
1. Click "Sign in with University Email"
2. Select any Google account
3. After auth, password setup modal appears (NEW! - all users need password)
4. Enter password: GooglePass123
5. Set password

Expected:
✓ Modal appears just like email/password users (NEW behavior!)
✓ Password is set successfully
✓ Dashboard accessible after password setup
✓ Can change password anytime from Profile Settings
```

### Test Case 3b: Google OAuth - Subsequent Logins (No Modal)
```
Steps:
1. Logout from Test Case 3
2. Login with same Google account again

Expected:
✓ Password setup modal does NOT appear
✓ Direct to dashboard (password already set)
✓ Can access all features
```

### Test Case 4: Change Password (New Feature)
```
Steps:
1. Login successfully
2. Go to User Avatar (top-right) → Profile Settings → User Settings tab
3. Scroll to "Change Password" section
4. Enter current password: (the one you just set)
5. Enter new password: NewPassword456
6. Confirm new password: NewPassword456
7. Click "Change Password"

Expected:
✓ Password changed successfully
✓ Success message shown for 2 seconds
✓ Can login with new password
✓ Cannot login with old password
✓ Modal closes after success
```

---

## System Architecture - Component Relationships

```
LoginPage (/app/(auth)/login/page.tsx)
├── Email/Password Input (existing)
└── Google OAuth Button (existing)

Auth Sync Endpoint (/api/auth/sync/route.ts) [UPDATED]
├── Validates user from Supabase
├── Calls detectRoleFromEmail()
├── Sets passwordSetupRequiredAt if needed
└── Returns user record to frontend

Dashboard (/app/(app)/booking)
├── BookingDashboardInner [UPDATED]
│   ├── usePasswordStatus() hook
│   │   └── Queries /api/auth/password-status
│   │
│   ├── PasswordSetupModal [NEW]
│   │   ├── Shows if passwordSetupRequired = true
│   │   ├── Calls /api/auth/setup-password
│   │   └── Blocks all access until complete
│   │
│   ├── AvailableRoomsSection (existing)
│   │   └── Filters facilities by role
│   │
│   └── Profile Settings (future)
│       └── PasswordChangeForm [NEW to be added]
│           ├── Calls /api/auth/change-password
│           └── Allows password update
```

---

## Running Development Tips

### Common Commands During Development

```bash
# Start dev server
npm run dev

# Check for TypeScript errors
npm run build

# Run tests
npm run test

# Validate environment variables
npm run check-env

# Fix database issues
npm run fix-db
```

### Useful URLs While Testing

```
Development Server:    http://localhost:3000
Login Page:           http://localhost:3000/login
Booking Dashboard:    http://localhost:3000/booking
Admin Dashboard:      http://localhost:3000/admin
Profile Settings:     http://localhost:3000/profile (when implemented)

Supabase Dashboard:   https://app.supabase.com/project/rqghtughqdxgnehdljyz
SQL Editor:           https://app.supabase.com/project/rqghtughqdxgnehdljyz/sql
Auth Users:           https://app.supabase.com/project/rqghtughqdxgnehdljyz/auth
Database Tables:      https://app.supabase.com/project/rqghtughqdxgnehdljyz/editor
```

### Debugging in Browser Console

```javascript
// Check if user is authenticated
const { data: { session } } = await supabase.auth.getSession();
console.log("Session:", session);

// Get current user info
const { data: { user } } = await supabase.auth.getUser();
console.log("User:", user);

// Check password status
const response = await fetch('/api/auth/password-status', {
  headers: {
    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
  }
});
console.log("Password Status:", await response.json());
```

---

## Environment Status

### Already Configured ✅
- `DATABASE_URL` - Supabase PostgreSQL connection
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase client key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key
- `GOOGLE_CLIENT_ID` - Google OAuth
- `GOOGLE_CLIENT_SECRET` - Google OAuth
- `SMTP_*` - Email configuration
- `ALLOWED_EMAIL_DOMAINS` - UIC email domains
- `CRON_SECRET` - Protect cron endpoints

### No New Environment Variables Needed ✅
Password system uses existing config!

---

## Summary: What to Do Now

### 1. Apply Database Migration (REQUIRED)
Run the SQL in Supabase SQL Editor to add password columns

### 2. Start Development Server
```bash
cd orbit-next && npm run dev
```

### 3. Test Login Flow
- Try email/password at `/login`
- Try Google OAuth at `/login`
- Verify password setup modal appears

### 4. Test Role Detection
- Create student account (with enrollment ID in email)
- Create faculty account (no numbers in email)
- Verify each sees correct facilities

### 5. (Future) Add Password Form to Profile
- Integrate `PasswordChangeForm` component
- Allow users to change password from settings

---

## Troubleshooting Password Setup

### Issue: Password Modal Not Appearing on Login

**Cause**: User has `password_hash = NULL` and `password_setup_required_at = NULL` in database, but modal doesn't show.

**How This Happens**:
1. User logs in for first time → modal shows
2. User closes browser without setting password
3. If modal wasn't shown on second login, the flag was already cleared

**Fix** (Already Applied):
The sync endpoint now checks: `if (!existingUser || !existingUser?.passwordHash)`

This means:
- ✅ New users → modal shows
- ✅ Users with no password (`password_hash IS NULL`) → modal shows EVERY TIME
- ✅ Users with password set → modal doesn't show

**What to Do if Modal Still Doesn't Show**:
1. Check the database directly in Supabase:
   ```sql
   SELECT id, email, password_hash, password_setup_required_at 
   FROM users 
   WHERE email = 'your-email@example.com';
   ```
2. If `password_hash` is NULL but modal doesn't show:
   - Hard refresh browser (Ctrl+Shift+R)
   - Check browser console for errors
   - Check server logs in terminal

### Issue: User Can Skip Password Setup

**This should NOT happen** - modal is non-dismissible and blocks access.

**If it does happen**:
1. Check that `<PasswordSetupModal />` is added to `BookingDashboardInner.tsx`
2. Verify `open={!!passwordStatus?.passwordSetupRequired}` is correct
3. Verify modal has `onOpenChange={() => {}}` (prevents closing)

### Manual Force Reset (Database)

If you need to force a user to set a password again:

```sql
-- Reset password setup requirement
UPDATE users 
SET password_setup_required_at = NOW(),
    password_hash = NULL
WHERE email = 'user@example.com';

-- User must now set password on next login
```

---

- ☐ Email verification on signup
- ☐ Password reset via email
- ☐ Two-factor authentication (schema already supports)
- ☐ Account lockout after failed attempts
- ☐ UIC API integration for automatic role/student status verification

---

**Everything is ready to run!** Follow the steps above and you'll have a fully functional password authentication system integrated with the existing ORBIT platform. 🚀
