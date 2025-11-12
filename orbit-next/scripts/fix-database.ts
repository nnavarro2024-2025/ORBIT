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
    
    // First, let's see what we have
    console.log("📊 Inspecting current equipment data...");
    const inspect = await pool.query(`
      SELECT id, equipment::text as equipment_text
      FROM facility_bookings 
      WHERE equipment IS NOT NULL
      LIMIT 10;
    `);
    console.log(`Found ${inspect.rowCount} rows with equipment data`);
    inspect.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.equipment_text}`);
    });
    
    // Fix equipment column with "undefined" strings
    console.log("\n🧹 Cleaning up invalid JSONB data in facility_bookings.equipment...");
    
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
    
    // Also fix rows where equipment contains undefined in JSON
    const result4 = await pool.query(`
      UPDATE facility_bookings 
      SET equipment = NULL 
      WHERE equipment::text LIKE '%undefined%'
      RETURNING id;
    `);
    console.log(`✅ Fixed ${result4.rowCount || 0} rows containing "undefined" in JSON`);

    // Count final NULL values
    const countResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM facility_bookings 
      WHERE equipment IS NULL;
    `);
    console.log(`\n📊 Total rows with NULL equipment: ${countResult.rows[0].count}`);

    console.log("✨ Database cleanup complete!");
  } catch (error) {
    console.error("❌ Error fixing database:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixDatabase();
