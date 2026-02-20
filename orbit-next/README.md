# ORBIT - Online Resource Booking & Inventory Tracking

A modern facility booking and management system built with Next.js 15, featuring real-time availability, admin dashboard, automated reminders, and comprehensive reporting.

## Features

### Core Booking System
- 🏢 **Facility Booking** - Book collaborative learning rooms, board rooms, and other facilities with real-time availability
- ⏱️ **Booking Holds** - Temporary slot reservation system during booking creation to prevent conflicts
- ✅ **Arrival Confirmation** - Admin-required arrival verification for approved bookings
- 🔔 **Automated Reminders** - Configurable email reminders (default 60 minutes before booking)
- 📧 **Email Notifications** - Automated confirmation, approval, denial, and reminder emails

### Administrative Features
- 👥 **User Management** - Role-based access control (Student, Faculty, Admin) with ban/suspension capabilities
- 📊 **Admin Dashboard** - Comprehensive booking management with multi-tab navigation
- 📈 **Reporting & Analytics** - PDF report generation with scheduled delivery (daily/weekly/monthly)
- 🚨 **System Alerts** - Multi-severity notification system (security, system, user alerts)
- 📝 **Activity Logging** - Detailed audit trail of all user actions
- ❓ **FAQ Management** - Dynamic FAQ system with categories and admin editor

### Technical Features
- 🔐 **Supabase Authentication** - Secure auth with UIC email domain restriction
- 🎨 **Modern UI** - Built with shadcn/ui components and Tailwind CSS
- ⚡ **Optimistic Updates** - TanStack Query for responsive UX
- 🛡️ **Type Safety** - Full TypeScript with Zod validation
- 🧪 **Testing Suite** - Vitest configuration for unit and integration tests

## Tech Stack

- **Framework:** Next.js 15.1 (App Router) with React 19.2
- **Database:** PostgreSQL (hosted on Supabase)
- **ORM:** Drizzle ORM 0.39
- **Authentication:** Supabase Auth (client-side SDK)
- **UI Components:** shadcn/ui, Tailwind CSS 3.4, Radix UI primitives
- **Forms & Validation:** React Hook Form 7.55 + Zod 3.24
- **State Management:** TanStack Query 5.60 (React Query)
- **PDF Generation:** pdf-lib for admin reports
- **Email Service:** Custom SMTP integration via `emailService.ts`
- **Testing:** Vitest 4.0 with pg-mem for database mocking

## Getting Started

### Prerequisites
- Node.js 20+ installed
- PostgreSQL database (Supabase recommended)
- Environment variables configured (see below)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd orbit-next
   npm install
   ```

2. **Set up environment variables:**
   Create `.env.local` with the following variables:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host:5432/database
   
   # Supabase (for authentication)
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Email (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=noreply@yourapp.com
   
   # Cron Job Security (optional)
   CRON_SECRET=your-random-secret-string
   ```

3. **Run database migrations:**
   ```bash
   npx drizzle-kit push
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Open application:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Deployment

### Deploy to Vercel (Recommended)

This application is optimized for Vercel deployment. See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.

**Quick Deploy:**
1. Push code to GitHub
2. Import project to Vercel
3. Configure environment variables
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

## Project Structure

```
orbit-next/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (app)/             # Protected routes (requires auth)
│   │   │   ├── admin/         # Admin dashboard & management
│   │   │   └── booking/       # User booking interface
│   │   ├── (auth)/            # Auth pages (login, suspended)
│   │   ├── (public)/          # Public landing page
│   │   ├── api/               # API route handlers
│   │   │   ├── admin/         # Admin-only endpoints
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── bookings/      # Booking CRUD operations
│   │   │   ├── booking-holds/ # Slot hold management
│   │   │   ├── facilities/    # Facility management
│   │   │   ├── faqs/          # FAQ CRUD
│   │   │   ├── notifications/ # Alert system
│   │   │   └── cron/          # Scheduled job endpoints
│   │   ├── layout.tsx         # Root layout with providers
│   │   └── globals.css        # Global Tailwind styles
│   ├── components/            # React components
│   │   ├── common/           # Shared components (grids, search)
│   │   ├── faq/              # FAQ display & admin editor
│   │   ├── layout/           # Sidebar, header, toasts
│   │   ├── loading/          # Skeleton loaders
│   │   ├── modals/           # Dialog components by feature
│   │   └── ui/               # shadcn/ui primitives
│   ├── hooks/                # React hooks
│   │   ├── data/            # Data fetching hooks
│   │   └── ui/              # UI-related hooks
│   ├── lib/                  # Client-side utilities
│   │   ├── api/             # API client & query setup
│   │   ├── config/          # Supabase client, sidebar config
│   │   └── utils/           # Helper functions
│   ├── server/              # Server-side code (no client components!)
│   │   ├── bookings/       # Booking business logic & helpers
│   │   ├── config/         # DB connection, Supabase admin
│   │   ├── core/           # Storage layer, auth, booking holds
│   │   ├── pdf/            # PDF report generation
│   │   ├── services/       # Report scheduling, processing
│   │   ├── utils/          # Server utilities, build guards
│   │   └── emailService.ts # SMTP email sender
│   └── shared/             # Shared between client/server
│       ├── schema.ts       # Drizzle schema & Zod validators
│       ├── bookingRules.ts # Booking duration constants
│       └── faq.ts          # FAQ category definitions
├── shared/                 # Root-level shared schema (monorepo)
│   ├── schema.ts          # Main schema with JSON.parse patch
│   └── bookingRules.ts
├── migrations/            # Drizzle ORM migrations
├── scripts/              # Utility scripts
│   ├── check-env.ts     # Environment validation
│   ├── fix-database.ts  # Database repair utilities
│   └── seed-*.ts        # Data seeding scripts
├── drizzle.config.ts    # Drizzle Kit configuration
├── next.config.ts       # Next.js config with webpack patches
├── tsconfig.json        # TypeScript config with path aliases
└── vitest.config.mts    # Vitest test configuration
```

### Key Architectural Patterns

**Monorepo Schema Sharing**: The database schema is defined in both `shared/schema.ts` (root) and `orbit-next/src/shared/schema.ts`. The root schema includes a critical JSON.parse patch for handling PostgreSQL JSONB edge cases.

**Path Aliases** (see `tsconfig.json`):
- `@/*` → `src/*`
- `@shared/*` → `src/shared/*` or `../shared/*`
- `@app-server/*` → `src/server/*`
- `@admin/*` → `src/app/(app)/admin/*`
- `@hooks/*` → `src/hooks/*`

**Storage Layer Pattern**: All database access goes through `src/server/core/storage.ts` (singleton `storage`), which provides a clean interface for CRUD operations and complex queries.

**Booking Holds System**: Implements a temporary slot reservation system (5-minute TTL) to prevent double-booking during the creation process. See `src/server/core/bookingHolds.ts`.

## Available Scripts

- `npm run dev` - Start Next.js development server (port 3000)
- `npm run build` - Build for production (TypeScript/ESLint checks disabled)
- `npm start` - Start production server
- `npm test` - Run Vitest test suite
- `npm run check-env` - Validate environment variables (via tsx)
- `npm run fix-db` - Run database repair utilities (via tsx)

### Database Management (via Drizzle Kit)

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Push schema directly to database (dev only)
npx drizzle-kit push

# Open Drizzle Studio (database GUI)
npx drizzle-kit studio
```

### Utility Scripts

Located in `scripts/` directory, run with `tsx`:
- `seed-activity-logs.ts` - Populate activity log sample data
- `seed-faqs.ts` - Initialize FAQ content
- `smoke-faqs.ts` - Test FAQ endpoints

## Database Schema Overview

### Core Tables

**users** - User accounts with role-based access
- Roles: `student`, `faculty`, `admin`
- Status: `active`, `banned`, `suspended`
- Includes ban management (reason, end date) and 2FA fields

**facilities** - Bookable spaces
- Name, description, capacity, image
- Active/inactive status with unavailable reason
- JSON field for unavailable date ranges

**facilityBookings** - Booking records
- Core fields: facilityId, userId, startTime, endTime, purpose
- Status flow: `pending` → `approved`/`denied` or `cancelled`
- UI displays derived states: "Scheduled", "Active", "Done" (based on time)
- Arrival confirmation system for admin verification
- Reminder settings (opt-in, lead time, scheduled time)
- Equipment field (JSONB array)

**bookingReminders** - Scheduled email reminders
- Linked to facilityBookings (1:1)
- Status tracking with retry attempts

**systemAlerts** - Notification system
- Types: security, system, user
- Severity: low, medium, high, critical
- Read/unread tracking per user

**activityLogs** - Audit trail
- User actions with details, IP, user agent
- Immutable log records

**faqs** - Frequently Asked Questions
- Categories defined in `shared/faq.ts`
- Order field for admin-controlled sorting
- Helpful/not helpful vote tracking

**reportSchedules** - Automated report generation
- Frequency: daily, weekly, monthly
- Email delivery configuration
- Next/last run timestamps

**computerStations** - Legacy table (ORZ feature removed)

## Key Features & Workflows

### Booking Creation Flow
1. User selects facility + time slot
2. **Slot hold acquired** (5-min TTL, prevents conflicts)
3. User fills booking form with purpose, participants, equipment
4. Hold refreshed on form activity
5. Booking created → status: `pending`
6. Hold released automatically
7. Admin reviews → `approved`/`denied`
8. If approved + arrival confirmation enabled → Admin confirms arrival after start time
9. Email reminder sent at configured lead time

### Admin Dashboard Sections
- **Booking Management** - Approve/deny pending requests, view all bookings
- **User Management** - Ban/suspend users, role assignment
- **System Alerts** - Create security/system notifications
- **Activity Logs** - View audit trail with filtering
- **Settings** - Manage facilities, FAQs, report schedules

### Authentication Flow
- Supabase Auth with UIC email domain restriction
- Session management via Supabase client SDK
- Server-side auth via `src/server/core/auth.ts`
- Middleware protection for authenticated routes

## Development Notes

### Build Configuration
- **TypeScript errors ignored during build** - Type checking happens in IDE
- **ESLint disabled during build** - Linting is a development-time activity
- **Custom webpack JSON.parse patch** - Handles PostgreSQL JSONB edge cases (undefined, null strings)

### JSONB Handling
The codebase includes multiple layers of JSON.parse protection for PostgreSQL JSONB columns:
1. Global patch in `shared/schema.ts`
2. Webpack banner injection in `next.config.ts`
3. Custom type parser in `src/server/config/db.ts`
4. Runtime patch in `src/server/utils/json-parse-patch.ts`

This prevents crashes when JSONB values are `"undefined"`, `"null"`, or empty strings.

### Testing
- Vitest configured with `vitest.config.mts`
- Uses `pg-mem` for in-memory PostgreSQL mocking
- Path aliases configured via `vite-tsconfig-paths`

### Deployment (Vercel)
- Optimized for Vercel with `vercel.json` config
- Environment variables must be set in Vercel dashboard
- Database migrations should run before deployment
- See `VERCEL_DEPLOYMENT.md` for complete guide

## Documentation

- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md) - Complete deployment instructions
- [Next.js Documentation](https://nextjs.org/docs) - Framework docs
- [Drizzle ORM Docs](https://orm.drizzle.team) - Database ORM
- [shadcn/ui](https://ui.shadcn.com) - UI component library
- [TanStack Query](https://tanstack.com/query/latest) - Data fetching

## Support

For issues or questions, contact the development team.
