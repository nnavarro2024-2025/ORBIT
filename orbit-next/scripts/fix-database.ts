import { Pool } from "pg";
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load .env.local file
const envPath = join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL not found in environment");
  process.exit(1);
}

async function fixDatabase() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("🔧 Connecting to database...");
    
    // Fix equipment column with "undefined" strings
    console.log("🧹 Cleaning up invalid JSONB data in facility_bookings.equipment...");
    
    const result1 = await pool.query(`
      UPDATE facility_bookings 
      SET equipment = NULL 
      WHERE equipment::text = '"undefined"'
      RETURNING id;
    `);
    console.log(`✅ Fixed ${result1.rowCount || 0} rows with "undefined"`);

    const result2 = await pool.query(`
      UPDATE facility_bookings 
      SET equipment = NULL 
      WHERE equipment::text = '""'
      RETURNING id;
    `);
    console.log(`✅ Fixed ${result2.rowCount || 0} rows with empty string`);

    const result3 = await pool.query(`
      UPDATE facility_bookings 
      SET equipment = NULL 
      WHERE equipment::text = '"null"'
      RETURNING id;
    `);
    console.log(`✅ Fixed ${result3.rowCount || 0} rows with "null"`);

    // Count final NULL values
    const countResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM facility_bookings 
      WHERE equipment IS NULL;
    `);
    console.log(`📊 Total rows with NULL equipment: ${countResult.rows[0].count}`);

    console.log("✨ Database cleanup complete!");
  } catch (error) {
    console.error("❌ Error fixing database:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixDatabase();
