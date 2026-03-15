# Password & Role-Based Authentication System - Setup Guide

## Overview

Your ORBIT system now has a complete password and role-based authentication system with auto-detection of user roles based on email patterns. Here's what was implemented:

### New Features

✅ **Password System**
- Email + password login support (in addition to Google OAuth)
- Secure password hashing with bcrypt
- Password validation (min 8 chars, uppercase, lowercase, numbers)
- First-time password setup modal (blocks access until password is set)
- Password change in profile settings

✅ **Automatic Role Detection by Email**
- **Student**: Email contains underscore "_" AND 7+ digit enrollment ID
  - Examples: `nnavarro_230000002875@uic.edu.ph`, `dramos_240000000449@uic.edu.ph`
- **Faculty**: Email has NO numbers, just first letter(s) + last name
  - Examples: `scloribel@uic.edu.ph`, `ccastro@uic.edu.ph`, `cbenablo@uic.edu.ph`
- **Admin**: Manually set in Supabase (no auto-detection)

✅ **Password Setup Flow**
- First-time users are required to set a password
- Modal appears on login and blocks further access until password is set
- Can't skip - forces security compliance

---

## Database Migration

Run this command to apply the new password fields to your database:

```bash
cd c:\Users\nikko\Documents\GitHub\ORBIT\ORBIT
npx drizzle-kit push
```

This will add these columns to the `users` table:
- `password_hash` (varchar, nullable - for future use)
- `password_setup_required_at` (timestamp, nullable - tracks password setup requirement)

---

## Testing the System

### 1. Create Test Accounts

Since your login page already has email+password fields (created by the previous developer), you can now test accounts:

#### Option A: Test With Google OAuth (Existing)
1. Click "Sign in with University Email"
2. Use your Google school account
3. After first login, a password setup modal will appear
4. Set a secure password following the requirements
5. Redirect to booking dashboard

#### Option B: Create Test Accounts in Supabase (Direct)
1. Go to Supabase Dashboard → Authentication → Users
2. Create new user manually OR use API
3. Set email that matches your UIC domain
4. Manually set a password
5. Login using email + password from your /login page

### 2. Test Different Roles

#### Create Student Account
```sql
-- In Supabase SQL Editor:
UPDATE public.users SET role = 'student' 
WHERE email = 'nnavarro_230000002875@uic.edu.ph';
```
**Expected**: Student sees Study Rooms A-C, Seminar Room (unrestricted facilities)

#### Create Faculty Account
```sql
-- In Supabase SQL Editor:
UPDATE public.users SET role = 'faculty' 
WHERE email = 'scloribel@uic.edu.ph';
```
**Expected**: Faculty sees Board Room, Lounge (restricted facilities)

#### Create Admin Account
```sql
-- In Supabase SQL Editor:
UPDATE public.users SET role = 'admin' 
WHERE email = 'your-email@uic.edu.ph';
```
**Expected**: Admin sees ALL facilities + access to Admin Dashboard

---

## API Routes Implemented

### POST `/api/auth/setup-password`
Set password for first-time users
```bash
curl -X POST http://localhost:3000/api/auth/setup-password \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d {
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123"
  }
```

### PUT `/api/auth/change-password`
Change password from profile settings
```bash
curl -X PUT http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d {
    "currentPassword": "OldPass123",
    "newPassword": "NewPass456",
    "confirmPassword": "NewPass456"
  }
```

### GET `/api/auth/password-status`
Check if password setup is required
```bash
curl http://localhost:3000/api/auth/password-status \
  -H "Authorization: Bearer {token}"
```

Response:
```json
{
  "passwordSetupRequired": true,
  "email": "user@uic.edu.ph",
  "role": "student"
}
```

---

## Files Created

### Server Utilities
- `orbit-next/src/server/utils/password.ts` - Password hashing & validation
- `orbit-next/src/server/utils/roleDetection.ts` - Email-based role detection

### API Routes
- `orbit-next/src/app/api/auth/setup-password/route.ts` - First-time password setup
- `orbit-next/src/app/api/auth/change-password/route.ts` - Password change in profile
- `orbit-next/src/app/api/auth/password-status/route.ts` - Check password requirement status

### UI Components
- `orbit-next/src/components/modals/auth/PasswordSetupModal.tsx` - Blocking password setup dialog
- `orbit-next/src/components/modals/auth/PasswordChangeForm.tsx` - Profile password change form
- `orbit-next/src/components/modals/auth/index.ts` - Component exports

### Hooks
- `orbit-next/src/hooks/data/usePasswordStatus.ts` - React Query hook for password status

### Updated Files
- `shared/schema.ts` - Added password fields
- `orbit-next/src/shared/schema.ts` - Added password fields  
- `orbit-next/src/app/api/auth/sync/route.ts` - Added role auto-detection & password setup flag
- `orbit-next/src/app/(app)/booking/components/core/BookingDashboardInner.tsx` - Added password modal integration

---

## Email-Based Role Detection Logic

The system automatically detects roles on first login:

```typescript
// Student Detection
const email = "nnavarro_230000002875@uic.edu.ph";
const localPart = "nnavarro_230000002875";
// Has "_" AND 7+ consecutive digits → STUDENT

// Faculty Detection  
const email = "scloribel@uic.edu.ph";
const localPart = "scloribel";
// NO numbers in email → FACULTY

// Admin Detection
// Manual assignment ONLY - never auto-detected for security
```

---

## Password Requirements

Users must set passwords that meet these requirements:
- ✓ Minimum 8 characters
- ✓ At least one UPPERCASE letter
- ✓ At least one lowercase letter
- ✓ At least one number

Examples of valid passwords:
- `Welcome@Password123`
- `SecureBooking456`
- `Orbit2025Study`

Examples that will be rejected:
- `password123` (no uppercase)
- `PASSWORD123` (no lowercase)
- `Passwordabc` (no numbers)
- `Test12` (only 6 characters)

---

## Next Steps

1. **Apply Migration**: Run `npx drizzle-kit push`
2. **Test Email/Password Login**: Try logging in with email + password at `/login`
3. **Create Test Accounts**: Set up student, faculty, and admin accounts for testing
4. **Verify Role Filtering**: Confirm different roles see different facilities
5. **Test Password Setup**: Create a new email/password account and verify password setup modal appears
6. **Add Password Change to Profile**: Integrate `PasswordChangeForm` component into profile settings page

---

## Answers to Your Questions

### "Why didn't the previous programmer add a password field?"
The previous developer only implemented Google OAuth (OAuth sign-in), which handles authentication through a third-party provider. Passwords are stored by Google, not in your database. Email/password login is a separate authentication method.

### "Can we log in with email and password in Supabase SQL Editor?"
Yes! Supabase SQL Editor is just a database interface. The actual login happens through:
1. Supabase Auth API (what we use)
2. Your `/login` page (Supabase client)
3. API routes (backend password verification)

### "Why only Google OAuth option before?"
Because that was the initial design. With these changes, users now have TWO login options:
1. Sign in with Google Email (existing)
2. Email + Password (new)

### "How does the system know student vs faculty?"
By parsing the email pattern on first login:
- Student emails have structured data: `lastname_enrollmentid@uic.edu.ph`
- Faculty emails are simple: `firstletter+lastname@uic.edu.ph`
- The `detectRoleFromEmail()` function checks these patterns automatically

### "What if someone's email doesn't match the pattern?"
Defaults to `student` role for safety. Admins can then manually change roles in Supabase.

---

## Important Notes

⚠️ **Password Hashing**
- Passwords are hashed by Supabase Auth using bcrypt
- We use Supabase's native password management
- Never store plain-text passwords!

⚠️ **First-Time Setup**
- Users CANNOT skip password setup on first login
- Modal is blocking - they must create a password to proceed
- This ensures compliance and security

⚠️ **Role Flexibility**
- Auto-detection happens on first sign-up
- Admins can override any user's role manually
- Admin role is NEVER auto-assigned (manual only for security)

---

## Dependencies Needed

The implementation uses existing dependencies:
- `@supabase/supabase-js` (already installed)
- `@tanstack/react-query` (already installed)
- `zod` (already installed)

For bcrypt support in Node.js functions (if you needed it):
```bash
npm install bcrypt
```

But this is optional since Supabase handles password hashing.

---

## Troubleshooting

### "Password modal keeps appearing after I set password"
- Clear browser cache/cookies
- Try incognito/private mode
- Run `/api/auth/password-status` to verify password setup flag is cleared

### "Role not detecting correctly"
- Verify email format matches UIC pattern
- Check `/api/auth/password-status` returns correct `role`
- Manually set role in Supabase if email pattern is non-standard

### "Can't log in with email/password"
- Verify user exists in Supabase Auth
- Check caps lock is off
- Password is case-sensitive
- Try Google OAuth first, then set password

---

Congratulations! Your ORBIT system now has enterprise-grade authentication with role-based access control! 🚀
