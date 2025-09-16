## ORBIT — AI coding assistant instructions

These notes help an AI agent (Copilot / assistant) be productive in the ORBIT repository.
Be concise, reference code locations, and follow the project's conventions.

High-level architecture

- Full-stack TypeScript project: React + Vite frontend in `client/` and an Express backend in `server/`.
- Supabase is used for Auth and (optionally) Postgres hosting. Drizzle ORM defines the database in `shared/schema.ts`.
- Frontend talks to backend via a small API surface under `/api` (`server/routes.ts` and `api/*`). The frontend also uses `@supabase/supabase-js` for client auth (`client/src/lib/supabase.ts`).

Important files to reference

- Root README.md — quick start, scripts, and high-level design.
- `package.json` (root & `client/package.json`) — npm scripts and important dev workflows (dev, build, db:push).
- `shared/schema.ts` — canonical data shapes (Drizzle tables & Zod schemas). Use this for type and API shape guidance.
- `server/index.ts` and `server/routes.ts` — server entry and route registration, middleware, and background tasks (development sweeps).
- `server/storage.ts` — single source of truth for DB queries and operations. Prefer updating/storage helpers here for changes to data access.
- `client/src/lib/api.ts` — authenticatedFetch wrapper: how the frontend sends Authorization headers and constructs API URLs (VITE_API_BASE_URL vs relative `/api`).
- `client/src/App.tsx` and `client/src/hooks/useAuth.tsx` — app boot and auth sync flow (supabase session -> local API /api/auth/sync).

Developer workflows & scripts (how to run / debug)

- Install and initial setup: `npm install` (root) and `cd client && npm install` (postinstall runs automatically in root `postinstall`).
- Development (both): `npm run dev` (runs `dev:server` + `dev:client`).
  - Backend dev: `npm run dev:server` uses `tsx server/index.ts` and expects env variables from `.env`.
  - Frontend dev: `npm run dev:client` runs Vite in `client/`.
- Build: `npm run build` (bundles both client and server via `build.js` and `esbuild`). For vercel-specific build use `client` scripts `build:vercel`.
- Database: `npm run db:push` (drizzle-kit push). See `shared/schema.ts` for schema details and types.
- Tests: integration/system tests exist as scripts in `scripts/` (e.g. `scripts/system-test.mjs`, `scripts/test-api.mjs`). Run with `node scripts/system-test.mjs` or `npm run test-system` if configured.

Project conventions and patterns (do this project-specific way)

- Data access: prefer high-level methods on `server/storage.ts` (IStorage / DatabaseStorage). Avoid direct SQL/Drizzle calls elsewhere — updating `storage.ts` keeps behavior centralized.
- Auth flow: Supabase is the authority for authentication and roles. The backend uses `supabaseAdmin` to reconcile roles into the local DB (see `server/routes.ts` requireAdmin middleware). When writing auth changes, ensure server-side sync (`/api/auth/sync`) is updated accordingly.
- Environment variables: frontend uses `VITE_` prefix (see `client/src/lib/supabase.ts`). Backend uses `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SESSION_SECRET`, etc. Don't leak service role keys into client code.
- Frontend -> Backend API addressing: use `client/src/lib/api.ts` logic — the code prefers `VITE_API_BASE_URL` when present; otherwise the dev proxy relies on `/api` paths. When changing endpoints, update `authenticatedFetch`.
- Error handling: `authenticatedFetch` intentionally handles 401/403 by signing out and logging; be conservative when modifying this behavior — it affects UX across the app.
- Feature toggles / removed features: ORZ session functionality has been removed but stubs remain across codebase (search for "ORZ"). When reintroducing similar features, update both `shared/schema.ts`, `storage.ts`, and route logic in `server/routes.ts`.

Integration points & external dependencies

- Supabase (auth + database): `client/src/lib/supabase.ts`, `server/supabase.ts`, `server/supabaseAdmin.ts`.
- Drizzle ORM + drizzle-kit for schema & migrations: `shared/schema.ts`, `drizzle.config.ts`, `migrations/`.
- Email: `server/services/emailService.ts` (Nodemailer). If editing email flows, also update `.env.example` and README usage notes.
- Vercel deployment: `vercel.json`, `vite.config.vercel.ts`, and `scripts/deploy.ps1`. For serverless handlers, see `api/` for Vercel-specific endpoints.

Coding style & quick fixes

- TypeScript-first: prefer typed changes using `shared/schema.ts` types (e.g., FacilityBooking, User) for signatures.
- Centralize DB updates in `server/storage.ts`. Add helper functions there first, then call them from `routes.ts` or services.
- Small, safe dev-only schema updates: `server/index.ts` applies guarded ALTER TABLE changes in development. Don't rely on that in production — use drizzle migrations instead.

Examples the assistant can follow (copyable patterns)

- Adding an API route that updates a facility:

  - Add route handler in `server/routes.ts` (or `api/facilities.ts` for serverless).
  - Use `await storage.updateFacility(facilityId, updates);` to persist changes.
  - Validate payload using `createFacilityBookingSchema` or other zod schemas from `shared/schema.ts`.

- Creating a new DB accessor in `storage.ts`:
  - Add a method signature to IStorage interface near other facility functions.
  - Implement it on `DatabaseStorage` using `db` and `drizzle` helpers imported at the top.
  - Exported types are in `shared/schema.ts` — use them for inputs/return types.

What not to change without CI / manual testing

- Do not change `authenticatedFetch`'s auth behavior lightly; it affects global sign-out handling.
- Avoid wholesale removal of ORZ stubs without migrating related Zod schemas and storage fallbacks.
- Do not push schema changes directly to production without running `drizzle-kit` migrations and verifying `db:push` in a test environment.

When in doubt, inspect these locations first

- `shared/schema.ts` (data shapes and zod validation)
- `server/storage.ts` (database access)
- `server/routes.ts` (middleware and route wiring)
- `client/src/lib/api.ts` and `client/src/lib/supabase.ts` (frontend API & auth flow)
- Root `package.json` scripts and `README.md` (how to run/build/tests)

If you modify developer-facing behaviors, update README.md and `.env.example` accordingly.

If anything above is unclear or you want an expanded section (e.g., session flows, ORZ removal notes, or example patches), tell me which area to expand and I will iterate.
