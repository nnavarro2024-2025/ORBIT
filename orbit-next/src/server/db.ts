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
    if (trimmed === "undefined" || trimmed === "null" || trimmed === "") return null;
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      console.warn("[DB] Failed to parse JSONB, returning null");
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
  
  const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/postgres";
  
  _pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
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
    if (!_db) {
      _db = drizzle(getPool(), { schema, logger: false });
    }
    return (_db as any)[prop];
  },
});
