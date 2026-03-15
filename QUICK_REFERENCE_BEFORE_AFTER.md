# ORBIT System - Before & After Comparison (Quick Reference)

## What Changed - Visual Summary

### Login Flow

#### BEFORE (Google OAuth Only)
```
User visits /login
    ↓
Click "Sign in with University Email"
    ↓
Select Google account
    ↓
Redirected to /booking dashboard
```

#### AFTER (Google OAuth + Email/Password)
```
User visits /login
    ├─ Option 1: Click "Sign in with University Email"
    │   ├─ Google OAuth
    │   └─ Redirects to /booking
    │
    └─ Option 2: Enter email + password (NEW)
        ├─ Validates with Supabase
        ├─ Password setup modal appears (NEW - BLOCKS)
        ├─ User sets password (8+ chars, mixed case, numbers)
        ├─ Role auto-detected (NEW)
        └─ Redirects to /booking
```

---

## What Was Added - Feature Matrix

### 1. Password Authentication

| Feature | How It Works | Files |
|---------|--------------|-------|
| **Password Hashing** | Bcrypt via Supabase | `server/utils/password.ts` |
| **Password Validation** | 8+ chars, uppercase, lowercase, numbers | `server/utils/password.ts` |
| **First-Time Setup** | Modal blocks access until set | `components/.../PasswordSetupModal.tsx` |
| **Change Password** | Profile settings form | `components/.../PasswordChangeForm.tsx` |
| **Password Status Check** | Query API to verify requirement | `hooks/data/usePasswordStatus.ts` |

### 2. Role Auto-Detection

| Feature | How It Works | Files |
|---------|--------------|-------|
| **Email Parsing** | Extract pattern from email | `server/utils/roleDetection.ts` |
| **Student Detection** | Has `_` + 7+ digits | `server/utils/roleDetection.ts` |
| **Faculty Detection** | No numbers, just names | `server/utils/roleDetection.ts` |
| **Auto-Assignment** | Applied on first login | `app/api/auth/sync/route.ts` |
| **Admin Override** | Manual only, never auto | `app/api/auth/sync/route.ts` |

### 3. New API Endpoints

| Endpoint | Method | Purpose | Status Code |
|----------|--------|---------|-------------|
| `/api/auth/setup-password` | POST | Create password (required first-time) | 200/400 |
| `/api/auth/change-password` | PUT | Update existing password | 200/401/400 |
| `/api/auth/password-status` | GET | Check if setup required | 200/404 |

### 4. Database Changes

| Column Added | Type | Purpose | Nullable |
|--------------|------|---------|----------|
| `password_hash` | varchar | Store hashed password | YES |
| `password_setup_required_at` | timestamp | Track setup requirement | YES |

### 5. Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| PasswordSetupModal | `components/modals/auth/PasswordSetupModal.tsx` | Blocking password setup |
| PasswordChangeForm | `components/modals/auth/PasswordChangeForm.tsx` | Profile password change |
| Auth Index | `components/modals/auth/index.ts` | Component exports |

### 6. React Hooks

| Hook | File | Returns |
|------|------|---------|
| `usePasswordStatus()` | `hooks/data/usePasswordStatus.ts` | `{ passwordSetupRequired, email, role }` |

---

## What Already Existed (and Still Works)

### Core Features - UNCHANGED ✅

| Feature | What It Does | Location |
|---------|--------------|----------|
| **Google OAuth** | Sign in with Google | `/login` page |
| **Role System** | Student/Faculty/Admin access control | `AvailableRoomsSection.tsx` |
| **Facility Booking** | Book study rooms | `/booking` dashboard |
| **Booking Management** | View/edit/cancel bookings | `/booking` dashboard |
| **Admin Panel** | Manage all bookings/users | `/admin` dashboard |
| **User Profile** | View/edit basic info | Profile page |
| **Email Notifications** | Booking confirmations/reminders | SMTP configured |
| **Dev Tools** | "Force Open" toggle for testing | `AvailableRoomsSection.tsx` |

---

## Running the System - Step by Step

### Step 1: Database (MUST DO FIRST)
```sql
-- Run in Supabase SQL Editor
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password_hash varchar;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password_setup_required_at timestamp;
```

### Step 2: Install (if not already done)
```bash
cd orbit-next
npm install
```

### Step 3: Verify Environment
```bash
npm run check-env
```
Expected: All variables ✓

### Step 4: Start Dev Server
```bash
npm run dev
```
Expected: `Ready in 2.8s` at http://localhost:3000

### Step 5: Test
- Go to `http://localhost:3000/login`
- Try email + password (NEW)
- Try Google OAuth (EXISTING)

---

## Facility Visibility - Still Works

### Student User
Sees (unrestricted):
- ✅ Study Room A
- ✅ Study Room B
- ✅ Study Room C
- ✅ Seminar Room

Does NOT see (restricted):
- ❌ Board Room
- ❌ Lounge

### Faculty User
Sees (restricted):
- ✅ Board Room
- ✅ Lounge

Does NOT see (unrestricted):
- ❌ Study Room A
- ❌ Study Room B
- ❌ Study Room C
- ❌ Seminar Room

### Admin User
Sees (ALL):
- ✅ Study Room A
- ✅ Study Room B
- ✅ Study Room C
- ✅ Seminar Room
- ✅ Board Room
- ✅ Lounge
- ✅ Admin Dashboard

---

## Email-to-Role Mapping Examples

### Students (7+ digit enrollment ID)
```
nnavarro_230000002875@uic.edu.ph         → STUDENT
dramos_240000000449@uic.edu.ph           → STUDENT
jrabang_220000001540@uic.edu.ph          → STUDENT
jrodelas_230000001203@uic.edu.ph         → STUDENT
```

### Faculty (First letter + last name, no numbers)
```
scloribel@uic.edu.ph                     → FACULTY
ccastro@uic.edu.ph                       → FACULTY
cbenablo@uic.edu.ph                      → FACULTY
jsmith@uic.edu.ph                        → FACULTY
```

### Admin (Manual Assignment ONLY)
```
any-email@uic.edu.ph → Can be set to ADMIN manually
                       (never auto-detected for security)
```

---

## New User Journey - Step by Step

### Path 1: Email + Password Registration (NEW)

```
1. Visit http://localhost:3000/login
   └─ See login page

2. Enter email: student@uic.edu.ph
   Enter password: (anything)
   Click Log In
   └─ Authenticates with Supabase

3. After authentication:
   ├─ /api/auth/sync called
   ├─ User role auto-detected from email
   ├─ passwordSetupRequiredAt set to current time
   └─ Redirect triggered

4. PasswordSetupModal appears (BLOCKS access)
   └─ Cannot dismiss or skip

5. Enter new password (must meet requirements)
   ├─ Minimum 8 characters
   ├─ At least one UPPERCASE
   ├─ At least one lowercase
   └─ At least one number

6. Click "Set Password"
   ├─ POST /api/auth/setup-password called
   ├─ Password updated in Supabase Auth
   ├─ passwordSetupRequiredAt cleared
   └─ Modal closes, page reloads

7. Dashboard appears
   ├─ Can see facilities based on role
   ├─ Can start booking
   └─ Session established
```

### Path 2: Google OAuth Sign-In (EXISTING)

```
1. Visit http://localhost:3000/login
   └─ See login page

2. Click "Sign in with University Email"
   └─ Google OAuth window opens

3. Select Google account
   └─ Authenticates with Google

4. Redirected back to /login
   ├─ /api/auth/sync called
   ├─ User role auto-detected
   ├─ passwordSetupRequiredAt NOT set (OAuth doesn't need password)
   └─ Redirect triggered

5. Dashboard appears immediately
   ├─ Can see facilities based on role
   ├─ Can start booking
   └─ Session established

6. (Optional) User can still set password later
   ├─ Go to Profile → Change Password
   └─ Use PasswordChangeForm
```

---

## Testing Scenario

### Test Case: Create Three Test Users

```bash
# Terminal 1: Start dev server
npm run dev

# Browser: http://localhost:3000/login
```

#### Account 1: Student
```
Email: nnavarro_230000002875@uic.edu.ph
Password: TestPass123
Expected role: student
Expected sees: Study Rooms only
```

#### Account 2: Faculty
```
Email: scloribel@uic.edu.ph
Password: FacultyPass456
Expected role: faculty
Expected sees: Board Room, Lounge only
```

#### Account 3: Admin
```
Email: admin@uic.edu.ph
Password: AdminPass789
Then in Supabase SQL:
  UPDATE public.users SET role = 'admin' WHERE email = 'admin@uic.edu.ph'
Expected role: admin
Expected sees: ALL facilities + Admin Dashboard
```

---

## Files Structure - New Additions

```
ORBIT/
├── HOW_TO_RUN_AND_WHAT_CHANGED.md              ← You are here
├── PASSWORD_AUTH_SETUP.md                      ← Detailed guide
├── PASSWORD_AUTH_IMPLEMENTATION.md             ← Technical summary
├── add_password_columns.sql                    ← Manual SQL
├── migrations/
│   └── 0000_known_gorilla_man.sql             ← Auto-generated migration
│
└── orbit-next/src/
    ├── server/utils/
    │   ├── password.ts                         ← NEW
    │   └── roleDetection.ts                    ← NEW
    │
    ├── app/api/auth/
    │   ├── setup-password/route.ts             ← NEW
    │   ├── change-password/route.ts            ← NEW
    │   ├── password-status/route.ts            ← NEW
    │   └── sync/route.ts                       ← UPDATED
    │
    ├── components/modals/auth/
    │   ├── PasswordSetupModal.tsx              ← NEW
    │   ├── PasswordChangeForm.tsx              ← NEW
    │   └── index.ts                            ← NEW
    │
    ├── hooks/data/
    │   └── usePasswordStatus.ts                ← NEW
    │
    ├── shared/
    │   └── schema.ts                           ← UPDATED
    │
    └── app/(app)/booking/components/core/
        └── BookingDashboardInner.tsx           ← UPDATED
```

---

## Commands Quick Reference

```bash
# Install dependencies
npm install

# Validate environment
npm run check-env

# Start development
npm run dev

# Build (with TypeScript/ESLint checks)
npm run build

# Run tests
npm run test

# Fix database connection issues
npm run fix-db
```

---

## Summary: What You Need to Know

✅ **Before**: Google OAuth only, manual role assignment
✅ **After**: Google OAuth + Email/Password, auto role detection, password setup modal

✅ **What's NEW**: 6 new files, 3 API routes, 2 UI components, 2 database columns

✅ **What's the SAME**: All existing features work exactly as before

✅ **To RUN**: 
1. Apply SQL migration in Supabase
2. Run `npm run dev`
3. Test at http://localhost:3000

✅ **No new environment variables needed** - everything already configured!

---

**Everything is ready! Start with the database migration, then run `npm run dev`. Enjoy!** 🚀
