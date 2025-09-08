import * as dotenv from "dotenv";
dotenv.config();
import pkg from "pg"; // ✅ Default import for ESM
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

const { Pool } = pkg; // ✅ Destructure Pool from default export

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Please check your environment variables.");
}

// Create connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Create drizzle instance
export const db = drizzle(pool, { schema, logger: false });
