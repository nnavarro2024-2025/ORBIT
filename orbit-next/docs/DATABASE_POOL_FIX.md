# Database Connection Pool Fix

## Problem
The application was experiencing `MaxClientsInSessionMode` errors, causing authentication to fail both locally and in production.

## Root Cause
**Wrong Supabase Pooler Port** - The application was using port **5432** (Session mode) instead of port **6543** (Transaction mode) for the Supabase pooler connection.

Supabase pooler has two modes:
- **Port 5432**: Session mode - limited connections (6-10), keeps connection for entire session
- **Port 6543**: Transaction mode - many more connections, releases after each transaction

The application was configured with:
- `DB_POOL_MAX=5` but using **port 5432**
- This caused `MaxClientsInSessionMode` errors because the pooler reached its session limit
- Even with `pool_mode=transaction` in the URL, port 5432 enforces session mode

This created a vicious cycle where:
1. Auth sync fails due to pool exhaustion
2. Client retries the request
3. More connections are created
4. Pool gets even more exhausted

## Solution Implemented

### 1. Reduced Pool Size
Changed `DB_POOL_MAX` from `5` to `1` in both `.env.local` and `.env.production`:
```env
DB_POOL_MAX=1
DB_POOL_IDLE_MS=5000
```

**Why this works:**
- With pgBouncer in transaction mode, a single connection can handle multiple transactions efficiently
- Reduces the risk of exhausting Supabase's connection pool
- Prevents connection leaks during development hot-reloading

### 2. Added Connection Timeout
Added `connectionTimeoutMillis` to prevent hanging connections:
```typescript
connectionTimeoutMillis: 3000
```

### 3. Updated Default Configuration
Changed the default pool size in `db.ts` from 5 to 1 for non-serverless environments.

### 4. Improved Error Messages
Added specific logging for connection pool errors to help diagnose issues faster.

### 5. Ensured pgBouncer Usage
Confirmed that both local and production environments use the pooler URL:
```
postgresql://postgres.jsieqpjrkxqnlpxxrnwt:password@aws-1-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&pool_mode=transaction
```

## Key Configuration

### Local (.env.local)
```env
# CRITICAL: Use port 6543 for transaction mode, NOT 5432!
DATABASE_URL=postgresql://postgres.jsieqpjrkxqnlpxxrnwt:jameslemuelA123A@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DB_POOL_MAX=1
DB_POOL_IDLE_MS=10000
DB_POOL_CONNECTION_TIMEOUT_MS=10000
```

### Production (.env.production)
```env
# CRITICAL: Use port 6543 for transaction mode, NOT 5432!
DATABASE_URL=postgresql://postgres.jsieqpjrkxqnlpxxrnwt:jameslemuelA123A@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DB_POOL_MAX=1
DB_POOL_IDLE_MS=5000
```

## Testing
After the fix:
1. Stop all Node.js processes: `Get-Process -Name node | Stop-Process -Force`
2. Clear Next.js cache: `Remove-Item -Path .next -Recurse -Force`
3. Restart the dev server: `npm run dev`
4. Test authentication flow

## Best Practices Going Forward

1. **Always use pgBouncer** for Supabase connections
2. **Keep pool size minimal** (1-2 connections) unless you have a paid Supabase plan
3. **Use transaction mode** for pgBouncer (already configured)
4. **Monitor connection usage** in Supabase dashboard
5. **Close connections properly** in long-running operations

## Vercel Environment Variables
Make sure these are set in Vercel:
```
DATABASE_URL=postgresql://postgres.jsieqpjrkxqnlpxxrnwt:jameslemuelA123A@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DB_POOL_MAX=1
DB_POOL_IDLE_MS=5000
```

## CRITICAL: Port Numbers Matter!
- **Port 5432**: Direct connection / Session pooling (limited connections)
- **Port 6543**: Transaction pooling (recommended, many more connections)
- Always use **6543** when using the pooler URL!

## Related Files Modified
- `orbit-next/.env.local` - Reduced pool size
- `orbit-next/.env.production` - Added pgBouncer configuration
- `orbit-next/src/server/db.ts` - Changed default pool size, added connection timeout
- `orbit-next/src/app/api/auth/sync/route.ts` - Improved error logging
