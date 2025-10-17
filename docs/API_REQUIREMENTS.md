# ORBIT - API Requirements & Migration Guide

This document summarizes the API surface required by the ORBIT application, request/response contracts, authentication and authorization rules, storage method mapping, data shapes, and a step-by-step migration checklist for importing data from another database.

## Overview

- Auth: Supabase protects authentication. Server expects JWT via `isAuthenticated` and `isAuthenticatedAndActive` middleware. Admin routes require `requireAdmin`.
- Main resources: `users`, `facilities`, `facility_bookings`, `system_alerts`, `activity_logs`, `computer_stations`.
- Business hours: 7:30 AM - 7:00 PM (local server timezone). Slots are 30 minutes for availability.
- Booking states: `pending`, `approved`, `denied`, `cancelled`.

## Auth & Role Rules

- All user-sensitive endpoints require `isAuthenticated`.
- Additional `isAuthenticatedAndActive` used for endpoints where user status matters.
- Admin routes require `requireAdmin` which:
  - Reads Supabase admin metadata for role.
  - Upserts local user record and ensures local role is `admin`.
  - Responds 403 if not admin.
- Privacy: pending bookings are not exposed to other users; non-admins only see approved bookings and their own pending bookings.

## Required REST Endpoints (contract summary)

### Public/Auth

- GET /api

  - Response: `{ status: 'ok', version: '1.0' }`

- GET /api/auth/user

  - Auth: isAuthenticated
  - Returns local user record after syncing from Supabase.

- POST /api/auth/sync

  - Auth: isAuthenticated
  - Body: none (JWT used)
  - Returns local user object (upserted)

- POST /api/auth/logout

  - Auth: isAuthenticated
  - Returns: `{ success: true }`

- POST /api/upload/avatar
  - Auth: isAuthenticated
  - Body: `{ fileName, mimeType?, base64 }`
  - Returns: `{ publicUrl }` after uploading via Supabase service role

### User settings

- PUT /api/user/profile

  - Auth: isAuthenticatedAndActive
  - Body: `{ firstName, lastName, profileImageUrl? }`
  - Returns: updated user

- PUT /api/user/password

  - Auth: isAuthenticated
  - Body: `{ newPassword }`

- PUT /api/user/settings
  - Auth: isAuthenticated
  - Body: `{ emailNotifications }`

### Availability & Facilities

- GET /api/availability?date=YYYY-MM-DD

  - Auth: isAuthenticated
  - Returns: `{ date, windowStart, windowEnd, data: [ { facility: { id, name, capacity, isActive }, maxUsageHours, slots: [ { start, end, status: 'available'|'scheduled', bookings?: [{ id, startTime, endTime, status, userId }] } ] } ] }`

- GET /api/facilities/:facilityId/bookings
  - Auth: isAuthenticatedAndActive
  - Returns: approved + relevant pending bookings for the facility (privacy filtering applied)

### Bookings (user)

- POST /api/bookings

  - Auth: isAuthenticatedAndActive
  - Body (createFacilityBookingSchema):
    - `facilityId: number`, `startTime: ISO`, `endTime: ISO`, `purpose: string`, `participants: number`, `equipment?: object`, `forceCancelConflicts?: boolean`
  - Validations: hours, same-day, capacity, collaborative room limits, min duration 30m, user overlapping booking checks
  - Returns: created booking object or HTTP 409 with conflict details `{ conflictingBookings: [...] }`

- GET /api/bookings

  - Auth: isAuthenticatedAndActive
  - Returns: bookings owned by requester

- GET /api/bookings/all

  - Auth: isAuthenticatedAndActive
  - Returns: current/future approved/pending bookings; non-admins filtered to approved + their own pending

- PUT /api/bookings/:bookingId

  - Auth: isAuthenticated
  - Permission: owner or admin
  - Body: `{ purpose, startTime, endTime, facilityId, participants, equipment? }`
  - Returns: updated booking or 409 on conflicts

- POST /api/bookings/:bookingId/cancel
  - Auth: isAuthenticated
  - Permission: owner
  - Returns: `{ success: true }`

### Admin booking flows

- GET /api/admin/bookings

  - Auth: requireAdmin
  - Returns: all bookings

- GET /api/bookings/pending

  - Auth: requireAdmin
  - Returns: pending bookings

- POST /api/bookings/:bookingId/approve

  - Auth: requireAdmin
  - Body: `{ adminResponse? }`
  - Effects: set status=approved, set arrivalConfirmationDeadline = startTime + 15m, deny overlapping pending bookings, create alerts, activity logs

- POST /api/bookings/:bookingId/deny

  - Auth: requireAdmin
  - Body: `{ adminResponse? }`

- POST /api/bookings/:bookingId/confirm-arrival

  - Auth: requireAdmin
  - Effects: set arrivalConfirmed=true, create activity log and notification

- POST /api/admin/bookings/:bookingId/needs
  - Auth: requireAdmin
  - Body: `{ status: 'prepared'|'not_available', note? }`
  - Effects: append adminResponse, create/update per-user and global alerts, dedupe alerts, activity log

### Notifications & Admin alerts

- GET /api/notifications

  - Auth: isAuthenticated
  - Returns: per-user notifications (deduped)

- POST /api/notifications/:alertId/read

  - Auth: isAuthenticated
  - Action: mark alert as read for the user

- GET /api/admin/alerts

  - Auth: requireAdmin
  - Returns: admin/global alerts (sanitized)

- POST /api/admin/alerts/:alertId/read

  - Auth: requireAdmin
  - Action: mark admin alert as read

- POST /api/admin/alerts/:alertId/updateMessage
  - Auth: requireAdmin
  - Body: `{ message }`

### Admin stats & activity

- GET /api/admin/stats

  - Auth: requireAdmin
  - Returns: `{ activeUsers, pendingBookings, systemAlerts, bannedUsers }`

- GET /api/admin/activity
  - Auth: requireAdmin
  - Returns: activity logs

## Storage API (IStorage) - methods required by server

Implementers migrating DB should provide equivalents for these methods:

- getUser(id), getUserByEmail, upsertUser, getUsersByRole, getAllUsers, updateUserStatus, banUser, unbanUser, updateUserRole, updateUser
- getAllComputerStations, getComputerStation, createComputerStation
- getAllFacilities, getFacility, createFacility, updateFacility
- createFacilityBooking (transactional, with conflict detection and advisory locking), getFacilityBooking, updateFacilityBooking, getAllFacilityBookings, getFacilityBookingsByUser, getPendingFacilityBookings, getFacilityBookingsByDateRange
- checkApprovedBookingConflicts, checkUserOverlappingBookings, checkUserAnyOverlappingBookings, checkUserHasActiveBooking, checkUserFacilityBookings, cancelAllUserBookings
- createSystemAlert, getSystemAlerts, markAlertAsRead, markAlertAsReadForUser, markAlertAsReadForAdmin, updateSystemAlert
- createActivityLog, getActivityLogs
- getAdminDashboardStats

Note: `createFacilityBooking` in the current Postgres implementation uses `pg_advisory_xact_lock(facilityId)` to avoid race conditions. If you replace Postgres, provide equivalent concurrency control.

## Data shapes (canonical)

- users: `id:string, email:string, firstName?, lastName?, profileImageUrl?, role:'student'|'faculty'|'admin', status:'active'|'banned'|'suspended', createdAt, updatedAt`
- facilities: `id:int, name:string, description?, capacity:int, imageUrl?, isActive:boolean, createdAt`
- facility_bookings: `id:uuid, facilityId:int, userId:string, startTime:timestamp, endTime:timestamp, purpose:text, participants:int, equipment:jsonb?, arrivalConfirmationDeadline?, arrivalConfirmed:boolean, status: 'pending'|'approved'|'denied'|'cancelled', adminId?, adminResponse?, createdAt, updatedAt`
- system_alerts: `id:uuid, type, severity, title, message, userId|null, isRead:boolean, createdAt`
- activity_logs: `id:uuid, userId?, action, details, ipAddress?, userAgent?, createdAt`

## Migration checklist (recommended)

1. Keep Supabase Auth if possible. If not, ensure JWT-compatible auth and a `requireAdmin` equivalent.
2. Export and import `users` first. Ensure `user.id` matches Supabase `sub` (or map accordingly).
3. Export/import `facilities` (watch id collisions with sample data).
4. Export bookings. Transform timestamps to ISO and map statuses. Important: map `userId` to Supabase IDs.
5. Import `system_alerts` and `activity_logs` if needed.
6. Validate availability: call `GET /api/availability?date=...` and confirm slots.
7. Run smoke tests: login as user, list bookings, create booking, admin approve, cancel.
8. Address concurrency: keep pg advisory locks or create a migration-safe locking scheme.

## Migration strategies

- Preferred: use server-side storage adapter that writes directly to the new DB implementing the `IStorage` methods. This preserves business logic and avoids bypassing validations.
- Alternative: write an ETL that POSTs to the existing server endpoints (`POST /api/bookings`, `POST /api/users` via auth-sync) — this will run server-side validation but may need a migration-phase bypass for business rules (e.g., times outside working hours).

## Notes & Caveats

- Timezones: server code assumes local server timezone for library hours and date normalization. Convert times during import.
- Privacy: pending bookings are sensitive. Ensure your import preserves user ownership.
- Equipment JSON: keep shape compatible with current `equipment` handling (items array or object, others string).

---

If you want I can:

- generate a runnable Node migration script that transforms rows from your old DB into POST requests to this API or direct DB inserts (tell me the source DB type), or
- scaffold a storage adapter implementing `IStorage` for a target DB (e.g., MySQL, MongoDB), or
- produce a compact CSV -> JSON transform for bookings ready to import.

Tell me which option you prefer and what the source DB is (Postgres/MySQL/SQLite/Mongo/etc.).
