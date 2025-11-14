import "./json-parse-patch";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { types } from "pg";

import * as schema from "@shared/schema";

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

// Setup custom JSONB type parser to handle "undefined" strings
// This needs to run before any database queries are made
function setupJSONBParser() {
  const parseJSONB = (val: string) => {
    if (val === null || val === undefined) return null;
    const trimmed = String(val).trim();
    
    // Handle both quoted and unquoted "undefined", "null", empty string
    // PostgreSQL JSONB stores strings WITH quotes, so "undefined" becomes '"undefined"'
    if (
      trimmed === "undefined" || 
      trimmed === '"undefined"' ||  // JSON-quoted string
      trimmed === "null" || 
      trimmed === '"null"' ||       // JSON-quoted string  
      trimmed === '""' ||           // Empty JSON string
      trimmed === ""
    ) {
      return null;
    }
    
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      console.warn("[DB] Failed to parse JSONB, returning null:", trimmed.substring(0, 50));
      return null;
    }
  };
  
  types.setTypeParser(114, parseJSONB);   // JSON type
  types.setTypeParser(3802, parseJSONB);  // JSONB type
}

// Call parser setup immediately
setupJSONBParser();

function getPool() {
  if (_pool) return _pool;

  let raw = process.env.DATABASE_URL || "postgresql://localhost:5432/postgres";
  raw = raw.trim();

  // On serverless platforms, keep pool size very small to avoid exceeding
  // Supabase pooler limits when lambdas spin up in parallel.
  const isServerless = process.env.VERCEL === "1" || process.env.AWS_REGION;
  const configuredMax = parseInt(process.env.DB_POOL_MAX || (isServerless ? "1" : "5"), 10);
  const max = Math.max(1, isServerless ? Math.min(configuredMax, 1) : configuredMax);

  // Normalize to ensure pgBouncer transaction pooling to prevent session exhaustion.
  try {
    const url = new URL(raw);
    if (!/localhost|127\.0\.0\.1/i.test(url.hostname)) {
      if (!url.searchParams.get("pgbouncer")) url.searchParams.set("pgbouncer", "true");
      if (!url.searchParams.get("pool_mode")) url.searchParams.set("pool_mode", "transaction");
      if (!url.searchParams.get("connection_limit")) url.searchParams.set("connection_limit", String(max));
    }
    raw = url.toString();
  } catch (e) {
    console.warn("[db] Could not parse DATABASE_URL for normalization", e);
  }

  const idleTimeoutMillis = parseInt(process.env.DB_POOL_IDLE_MS || "10000", 10);

  _pool = new Pool({
    connectionString: raw,
    max,
    idleTimeoutMillis,
    allowExitOnIdle: true,
    ssl: /localhost|127\.0\.0\.1/.test(raw) ? undefined : { rejectUnauthorized: false },
  });

  _pool.on("error", (err) => {
    console.error("[db] Pool error", err);
  });

  return _pool;
}

export const pool = new Proxy({} as Pool, {
  get(_, prop) {
    return (getPool() as any)[prop];
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    // During build time, return mock implementations that don't access the database
    if (process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE === 'phase-production-build') {
      // Return a mock drizzle instance with common methods
      return {
        select: () => ({
          from: () => ({
            where: () => ({ then: () => Promise.resolve([]) }),
            orderBy: () => ({ then: () => Promise.resolve([]) }),
            then: () => Promise.resolve([]),
          }),
          then: () => Promise.resolve([]),
        }),
        insert: () => ({
          values: () => ({
            returning: () => ({ then: () => Promise.resolve([]) }),
            onConflictDoUpdate: () => ({ returning: () => ({ then: () => Promise.resolve([]) }) }),
            then: () => Promise.resolve([]),
          }),
          then: () => Promise.resolve([]),
        }),
        update: () => ({
          set: () => ({
            where: () => ({ then: () => Promise.resolve({ rowCount: 0 }) }),
            then: () => Promise.resolve({ rowCount: 0 }),
          }),
          then: () => Promise.resolve({ rowCount: 0 }),
        }),
        delete: () => ({
          where: () => ({ then: () => Promise.resolve({ rowCount: 0 }) }),
          then: () => Promise.resolve({ rowCount: 0 }),
        }),
        transaction: (cb: any) => Promise.resolve(cb({
          select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
          insert: () => ({ values: () => ({ returning: () => Promise.resolve([]) }) }),
          update: () => ({ set: () => ({ where: () => Promise.resolve({ rowCount: 0 }) }) }),
          delete: () => ({ where: () => Promise.resolve({ rowCount: 0 }) }),
        })),
      }[prop as string] || (() => Promise.resolve([]));
    }
    
    if (!_db) {
      _db = drizzle(getPool(), { schema, logger: false });
    }
    return (_db as any)[prop];
  },
});
