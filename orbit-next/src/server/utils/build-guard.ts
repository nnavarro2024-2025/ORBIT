/**
 * Build-time guard to prevent database access during Next.js build phase
 * 
 * Next.js 16 with Turbopack performs "page data collection" during build,
 * which can trigger database queries even with force-dynamic routes.
 * This guard detects build time and prevents actual database operations.
 */

// Detect if we're in a build environment
// During Next.js build, process.env.NEXT_PHASE will be 'phase-production-build'
// or certain NODE_ENV values will indicate build time
export const isBuildTime = (): boolean => {
  // Check if we're in build phase
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[BUILD-GUARD] Detected build phase via NEXT_PHASE');
    return true;
  }
  
  // Check if we're in a build command (npm run build, next build, etc.)
  if (process.env.npm_lifecycle_event === 'build') {
    console.log('[BUILD-GUARD] Detected build phase via npm_lifecycle_event');
    return true;
  }
  
  // Check NODE_ENV
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    // In production build but not on Vercel runtime
    console.log('[BUILD-GUARD] Detected local production build');
    return true;
  }
  
  // Additional safety: check if DATABASE_URL looks like a mock/placeholder
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.includes('localhost:5432/postgres') && !dbUrl.includes('password')) {
    // This is our fallback URL from db.ts, likely build time
    console.log('[BUILD-GUARD] Detected build phase via fallback DATABASE_URL');
    return true;
  }
  
  console.log('[BUILD-GUARD] Not in build phase');
  return false;
};

export class BuildTimeError extends Error {
  constructor(operation: string) {
    super(`Cannot perform ${operation} during build time. This operation requires runtime database access.`);
    this.name = 'BuildTimeError';
  }
}

/**
 * Wrapper for database operations that should be skipped during build
 */
export function guardDatabaseOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  fallbackValue?: T
): Promise<T> {
  if (isBuildTime()) {
    console.warn(`[BUILD-GUARD] Skipping ${operation} during build time`);
    if (fallbackValue !== undefined) {
      return Promise.resolve(fallbackValue);
    }
    throw new BuildTimeError(operation);
  }
  return fn();
}
