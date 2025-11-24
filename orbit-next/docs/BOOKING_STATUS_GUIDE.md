# Booking Status System Guide

## Overview
This document clarifies the booking status system to prevent confusion between **database statuses** and **UI display labels**.

## Database Statuses (Schema)

The `facility_bookings` table has a `status` column that can only contain these values:

| Status | Description |
|--------|-------------|
| `pending` | Booking submitted, awaiting admin approval |
| `approved` | Booking approved by admin |
| `denied` | Booking rejected by admin |
| `cancelled` | Booking cancelled (by user or system) |

**Schema Location:** `orbit-next/src/shared/schema.ts`

## UI Display Labels

The UI shows different labels based on the **combination** of database status and **current time**.

**Why "Scheduled"?** Users understand bookings as "auto-scheduled" when they book, so we show "Scheduled" instead of "Approved" for better UX.

| Display Label | Condition | Database Status |
|--------------|-----------|-----------------|
| **Scheduled** | Auto-scheduled booking (approved, hasn't started) | `approved` + `startTime > now` |
| **Active** | User arrived and booking is in progress | `approved` + `arrivalConfirmed=true` + `startTime ≤ now ≤ endTime` |
| **Completed** | Booking finished and done | `approved` + `endTime < now` |
| **Pending** | Awaiting approval | `pending` |
| **Denied** | Rejected by admin | `denied` |
| **Cancelled** | Cancelled booking | `cancelled` |

**Implementation:** `orbit-next/src/app/(app)/booking/lib/helpers/bookingUtils.ts` → `getBookingStatus()`

## Common Mistakes to Avoid

❌ **WRONG:** Checking `booking.status === 'scheduled'`
```typescript
// This will NEVER match! 'scheduled' is not a database status
if (booking.status === 'scheduled') { ... }
```

✅ **CORRECT:** Check for approved bookings
```typescript
// Check the actual database status
if (booking.status === 'approved') { ... }

// Or use the display label function
const { label } = getBookingStatus(booking);
if (label === 'Scheduled') { ... }
```

❌ **WRONG:** Including 'scheduled' in status sets
```typescript
const blockingStatuses = new Set(['approved', 'scheduled', 'pending']);
```

✅ **CORRECT:** Only use database statuses
```typescript
const blockingStatuses = new Set(['approved', 'pending']);
```

## Status Flow

```
User submits booking
       ↓
   [pending] ← Database status
       ↓
Admin reviews
       ↓
    ┌──────┴──────┐
    ↓             ↓
[approved]    [denied] ← Database statuses
    ↓
Time-based labels (UI only):
    ↓
Before start: "Scheduled"
During time:  "Active"
After end:    "Done"
```

## Auto-Scheduling vs Manual Approval

- **All bookings** start with `status='pending'`
- **Admin approval** changes status to `approved`
- **Auto-scheduling** is just automatic approval (still sets `status='approved'`)
- **Display label:** Users see "Scheduled" (not "Approved") because they understand it as an auto-scheduled booking
- There is no separate "auto-scheduled" status in the database - it's all just `approved`

## Key Files

1. **Schema Definition**
   - `orbit-next/src/shared/schema.ts` (line 96)
   - Defines valid database statuses

2. **Status Display Logic**
   - `orbit-next/src/app/(app)/booking/lib/helpers/bookingUtils.ts`
   - `getBookingStatus()` function converts database status to UI labels

3. **Reports Display**
   - `orbit-next/src/app/(app)/admin/lib/reports/index.ts` (line 69-82)
   - Shows how "Scheduled", "Active", "Completed" labels are derived

## Summary

- **Database:** Only `pending`, `approved`, `denied`, `cancelled`
- **UI:** Shows "Scheduled", "Active", "Done" for approved bookings based on time
- **Rule:** Never use "scheduled" as a database status value
- **Auto-scheduling:** Sets `status='approved'` (same as manual approval)
