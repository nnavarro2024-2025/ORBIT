/**
 * Seed script: create equipment_inventory table and populate with default items.
 * Run: npx tsx scripts/seed-equipment.ts
 * (from the orbit-next/ directory)
 *
 * Edit totalCount values to match how many physical units your school has.
 */

import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load .env.local
const envPath = join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('DATABASE_URL not set'); process.exit(1); }

const DEFAULT_EQUIPMENT = [
  { key: 'whiteboard',     label: 'Whiteboard & Markers', totalCount: 2 },
  { key: 'projector',      label: 'Projector',            totalCount: 2 },
  { key: 'extension_cord', label: 'Extension Cord',       totalCount: 3 },
  { key: 'hdmi',           label: 'HDMI Cable',           totalCount: 3 },
  { key: 'extra_chairs',   label: 'Extra Chairs',         totalCount: 10 },
];

async function main() {
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    // Create table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS equipment_inventory (
        id SERIAL PRIMARY KEY,
        key VARCHAR NOT NULL UNIQUE,
        label VARCHAR NOT NULL,
        total_count INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✓ Table equipment_inventory ready');

    // Insert defaults
    for (const item of DEFAULT_EQUIPMENT) {
      await client.query(
        `INSERT INTO equipment_inventory (key, label, total_count)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE
           SET label = EXCLUDED.label,
               total_count = EXCLUDED.total_count,
               updated_at = NOW()`,
        [item.key, item.label, item.totalCount]
      );
      console.log(`  ✓ ${item.label} (${item.totalCount} units)`);
    }
    console.log('Done!');
  } finally {
    client.release();
    await pool.end();
  }
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
