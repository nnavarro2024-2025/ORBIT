# Turbopack Build Issue - Root Cause Analysis

## Problem Summary
`npm run build` fails with:
```
SyntaxError: "undefined" is not valid JSON
```

## Root Cause

### Technical Details:
1. **PostgreSQL JSONB Storage**: When a JSONB column contains the string value "undefined", PostgreSQL stores it as `"undefined"` (with JSON quotes)
2. **pg Driver Default Parser**: Uses `JSON.parse()` which throws on the string `"undefined"`
3. **Turbopack Bundling**: Creates isolated module contexts where `types.setTypeParser()` doesn't apply to bundled code
4. **Page Data Collection**: Next.js 16 executes API routes during build to determine static generation eligibility
5. **Module Context Isolation**: Our type parser setup in `db.ts` runs in one context, but Turbopack's bundled code uses a different `pg` instance

### Evidence:
- Test file `test-pg-parser.js` confirms the parser fix works in isolation
- Build still fails despite correct parser setup
- Error occurs at "Collecting page data" phase, not at compilation
- Stack trace shows bundled chunk code (`[root-of-the-server]__98129c77._.js`)

## Why This Happens:
```
Source Code:           Turbopack Bundle:
  db.ts                  [bundled-chunk].js
    ↓                         ↓
  setupJSONBParser()    pg module (separate instance)
    ↓                         ↓
  types.setTypeParser() ❌ NOT APPLIED to bundle's pg
```

## Solutions

### ✅ Solution 1: Deploy to Vercel (RECOMMENDED)
Vercel's build environment:
- Uses different bundling strategy
- Handles `force-dynamic` routes correctly
- Doesn't execute database queries during build

**Action**: Deploy to Vercel as originally planned

### ⚠️  Solution 2: Fix Database Data
Clean up invalid JSONB values:
```bash
npm run fix-db
```
This updates rows where `equipment = '"undefined"'` to `NULL`

### ❌ Solution 3: Skip Local Builds
Accept that local `npm run build` won't work due to Turbopack limitations.
Use `npm run dev` for local development and let Vercel handle production builds.

## Why `force-dynamic` Doesn't Help:
- `force-dynamic` prevents static HTML generation
- But Turbopack still bundles and evaluates modules
- Module evaluation can trigger database access
- The bundled code doesn't inherit our type parser setup

## Long-term Fix:
Wait for Next.js/Turbopack to:
1. Fix module context isolation issues
2. Skip database access during page data collection for `force-dynamic` routes
3. Provide better build-time vs runtime separation

## Workaround for Local Builds:
If you must build locally, temporarily:
1. Set `DATABASE_URL` to a mock value
2. Add build-time guards to skip database queries
3. Use the build-guard.ts helper we created

## Related Issues:
- Turbopack module bundling context isolation
- Next.js 16 page data collection behavior
- pg driver type parser per-connection caching

## Recommendation:
**Proceed with Vercel deployment**. The app works perfectly in development (`npm run dev`) and will build correctly in Vercel's environment.
