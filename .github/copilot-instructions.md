# ORBIT AI Coding Agent Instructions

## Architecture Overview

**ORBIT** is a Next.js 15 facility booking system with PostgreSQL, Drizzle ORM, and Supabase Auth. The monorepo structure shares schema between root and `orbit-next/` with critical JSON.parse patches for JSONB handling.

### Monorepo Schema Pattern
- Root schema: `shared/schema.ts` (includes JSON.parse global patch)
- App schema: `orbit-next/src/shared/schema.ts` (mirrors root)
- **Critical**: The JSON.parse patch prevents crashes from JSONB values like `"undefined"`, `"null"`, or empty strings
- Drizzle config references both: `drizzle.config.ts` → `["./shared/schema.ts", "./orbit-next/src/shared/schema.ts"]`

### Path Aliases (tsconfig.json)
```
@/*           → orbit-next/src/*
@shared/*     → orbit-next/src/shared/* or shared/*
@app-server/* → orbit-next/src/server/*
@admin/*      → orbit-next/src/app/(app)/admin/*
@hooks/*      → orbit-next/src/hooks/*
```

## Core Architectural Patterns

### Storage Layer (Singleton Pattern)
**All database access** goes through `src/server/core/storage.ts`:
```typescript
import { storage } from "@/server/core";
// or from "@app-server/core"

const bookings = await storage.getFacilityBookingsByUser(userId);
await storage.createFacilityBooking({ ... });
```
Never import Drizzle `db` directly in API routes. The `storage` singleton provides typed CRUD methods and handles JSONB parsing.

### Booking Holds System
Prevents double-booking via temporary slot reservations (`src/server/core/bookingHolds.ts`):
- **TTL**: 2 minutes (extendable)
- **Pattern**: Acquire hold → validate → create booking → release hold
- Used in `POST /api/bookings` to ensure exclusive slot access during form submission

### Authentication Guards
Two server-side helpers in `src/server/core/auth.ts`:
```typescript
import { requireActiveUser, requireAdminUser } from "@/server/core";

// In API route handlers:
const authResult = await requireActiveUser(request.headers);
if (!authResult.ok) return authResult.response;

const user = authResult.user;        // Supabase User object
const userRecord = authResult.userRecord; // DB user record with role/status
```
- `requireActiveUser`: Validates auth token + user not banned/suspended
- `requireAdminUser`: Extends `requireActiveUser` + enforces `role === 'admin'`

### Booking Status Hierarchy
**Database values** (stored in `facilityBookings.status`):
- `pending` → admin review needed
- `approved` → confirmed booking
- `denied` → rejected by admin
- `cancelled` → user/admin cancelled

**UI Display Labels** (derived from status + timestamps):
- "Scheduled" = `approved` + `startTime > now`
- "Active" = `approved` + `now` between `startTime`/`endTime`
- "Done" = `approved` + `endTime < now`

Never store "Scheduled", "Active", or "Done" in the database. Compute them in UI components.

## Development Workflows

### Running the App
```bash
cd orbit-next
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (TS/ESLint checks DISABLED)
npm run test         # Vitest suite with pg-mem mocking
npm run check-env    # Validate .env.local variables
```

### Database Management
```bash
# From root directory (where drizzle.config.ts lives):
npx drizzle-kit generate   # Create migration from schema changes
npx drizzle-kit push       # Push schema directly to DB (dev only)
npx drizzle-kit studio     # Open Drizzle Studio GUI
```

### Testing
- Test files: `orbit-next/src/server/__tests__/**/*.test.ts`
- Uses `pg-mem` for in-memory PostgreSQL
- Path aliases resolved via `vite-tsconfig-paths` in `vitest.config.mts`

## API Route Patterns

### Standard Route Handler Structure
```typescript
// orbit-next/src/app/api/example/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { requireActiveUser } from "@/server/core";
import { storage } from "@/server/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) return authResult.response;

  const data = await storage.getSomeData();
  return NextResponse.json(data);
}
```

### Booking Creation Pattern
See `src/app/api/bookings/route.ts` for the canonical booking flow:
1. Import helpers: `validateLibraryHours`, `validateSameDay`, `getFacilityOrError`, `ensureFacilityIsBookable`, `enforceUserBookingConflicts`, `sendBookingNotifications`
2. Validate Zod schema: `createFacilityBookingSchema.parse(body)`
3. Check business rules (library hours, same-day, facility availability)
4. Create booking with arrival confirmation deadline if applicable
5. Send email notifications (via `emailService.ts` - currently no-op logger)

## Client-Side Data Fetching

### TanStack Query Pattern
All client components use React Query hooks from `src/hooks/data/`:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

// Query
const { data, isLoading } = useQuery({
  queryKey: ["/api/bookings"],
  queryFn: async () => {
    const res = await apiRequest("GET", "/api/bookings");
    return res.json();
  },
});

// Mutation with optimistic updates
const mutation = useMutation({
  mutationFn: async (data) => {
    return apiRequest("POST", "/api/bookings", data);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
  },
});
```
- API client: `src/lib/api/queryClient.ts` (auto-includes Supabase auth token)
- Global client: exported as `queryClient` from `src/lib/api/index.ts`

### Supabase Auth Client
```typescript
import { supabase } from "@/lib/config";

const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```
Client-side auth is handled via Supabase SDK. Server-side uses bearer token validation in `src/server/core/auth.ts`.

## Critical Build Configuration

### JSON.parse Protection (Multi-Layer)
PostgreSQL JSONB edge cases require patching at 4 levels:
1. **Global patch**: `shared/schema.ts` top-level (runs first)
2. **Webpack banner**: `next.config.ts` injects patch into every server bundle
3. **Type parser**: `src/server/config/db.ts` (if present)
4. **Runtime patch**: `src/server/utils/json-parse-patch.ts`

When modifying JSONB columns (e.g., `equipment`, `unavailableDates`), ensure values are valid JSON or null. Never pass `"undefined"` strings.

### Build Flags (next.config.ts)
```typescript
typescript: { ignoreBuildErrors: true }  // Type-check in IDE only
eslint: { ignoreDuringBuilds: true }     // Lint in dev only
```
Production builds skip TS/ESLint to speed up deployment. Validate types locally before pushing.

### No Client Components in src/server/
The `src/server/` directory contains **server-only code**. Never add `"use client"` directives here. If you need shared utilities, place them in `src/shared/` or `src/lib/utils/`.

## Environment Variables

Required in `.env.local` (orbit-next directory):
```env
DATABASE_URL=postgresql://...           # PostgreSQL connection
NEXT_PUBLIC_SUPABASE_URL=https://...   # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...      # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=...          # Supabase admin key (server-only)
SMTP_HOST=smtp.gmail.com               # Email service
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@example.com
CRON_SECRET=...                        # Protect /api/cron endpoints
```
Run `npm run check-env` to validate before starting dev server.

## Common Tasks

### Adding a New Booking Validation Rule
1. Add helper to `src/server/bookings/helpers.ts` following `ValidationResult<T>` pattern
2. Import in `src/app/api/bookings/route.ts` POST handler
3. Call validation before `storage.createFacilityBooking(...)`

### Creating a New Admin API Endpoint
1. Create route: `src/app/api/admin/[feature]/route.ts`
2. Use `requireAdminUser` guard at the top
3. Add corresponding React Query hook in `src/hooks/data/use[Feature].ts`
4. Wire up in admin dashboard section: `src/app/(app)/admin/components/sections/[feature]/`

### Modifying Database Schema
1. Edit `shared/schema.ts` (root) + `orbit-next/src/shared/schema.ts` (keep in sync)
2. Run `npx drizzle-kit generate` from root
3. Review migration in `migrations/` folder
4. Apply: `npx drizzle-kit push` (dev) or run migration in production
5. Update Zod validators if adding/changing fields

### Debugging JSONB Parsing Issues
If you see errors like `JSON.parse: unexpected character`, check:
1. Is the column using JSONB type in schema?
2. Are you passing valid JSON or null (not `"undefined"` string)?
3. Is the JSON.parse patch loaded? Check `shared/schema.ts` top of file
4. Test with `npx drizzle-kit studio` to inspect raw DB values
