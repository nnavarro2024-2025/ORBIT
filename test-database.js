/**
 * Database Connection Test Script
 * Tests Supabase database connection from the backend
 */

import * as dotenv from "dotenv";
dotenv.config();

import pkg from "pg";
const { Pool } = pkg;

console.log("🔍 Testing Database Connection...\n");

// Check environment variables
console.log("📋 Checking environment variables:");
const requiredVars = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
];

let missingVars = [];
for (const varName of requiredVars) {
  const exists = !!process.env[varName];
  const display = exists ? "✅" : "❌";
  console.log(`${display} ${varName}: ${exists ? "Set" : "Missing"}`);
  if (!exists) missingVars.push(varName);
}

if (missingVars.length > 0) {
  console.log("\n❌ Missing required environment variables!");
  console.log("Please set the following in your .env file:");
  missingVars.forEach(v => console.log(`  - ${v}`));
  process.exit(1);
}

// Test PostgreSQL connection
console.log("\n🗄️  Testing PostgreSQL connection...");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function testDatabase() {
  try {
    // Test basic connection
    console.log("   Connecting to database...");
    const client = await pool.connect();
    console.log("   ✅ Connected successfully!");

    // Test query
    console.log("   Running test query...");
    const result = await client.query("SELECT NOW() as current_time");
    console.log(`   ✅ Query successful! Server time: ${result.rows[0].current_time}`);

    // Check if main tables exist
    console.log("\n📊 Checking tables:");
    const tables = [
      "users",
      "facilities",
      "facility_bookings",
      "computer_stations",
      "station_bookings",
      "system_alerts",
      "activity_log"
    ];

    for (const table of tables) {
      try {
        const tableCheck = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )`,
          [table]
        );
        const exists = tableCheck.rows[0].exists;
        console.log(`   ${exists ? "✅" : "❌"} Table "${table}": ${exists ? "Found" : "Missing"}`);
      } catch (err) {
        console.log(`   ❌ Table "${table}": Error checking`);
      }
    }

    // Count users
    try {
      const userCount = await client.query("SELECT COUNT(*) as count FROM users");
      console.log(`\n👥 Total users in database: ${userCount.rows[0].count}`);
    } catch (err) {
      console.log("\n⚠️  Could not count users:", err.message);
    }

    client.release();
    await pool.end();

    console.log("\n✅ Database connection test completed successfully!");
    console.log("\n🚀 Your database is ready for deployment!");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Database connection test failed!");
    console.error("Error:", err.message);
    console.error("\nTroubleshooting:");
    console.error("1. Check that DATABASE_URL is correct");
    console.error("2. Verify your Supabase project is active");
    console.error("3. Check firewall/network settings");
    console.error("4. Ensure SSL is configured correctly");
    process.exit(1);
  }
}

// Test Supabase Client
async function testSupabaseClient() {
  console.log("\n🔐 Testing Supabase Client SDK...");
  
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    console.log("   ✅ Supabase client created successfully!");
    
    // Test basic query
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (error) {
      console.log("   ⚠️  Query test:", error.message);
    } else {
      console.log("   ✅ Supabase client query successful!");
    }
  } catch (err) {
    console.error("   ❌ Supabase client test failed:", err.message);
  }
}

// Run tests
testDatabase()
  .then(() => testSupabaseClient())
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });

