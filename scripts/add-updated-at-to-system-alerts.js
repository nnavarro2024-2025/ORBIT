#!/usr/bin/env node
/**
 * Safe one-off: add updated_at column to system_alerts if missing.
 * Usage: node scripts/add-updated-at-to-system-alerts.js
 * Requires DATABASE_URL in env.
 */
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();
const { Client } = pkg;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set. Provide DATABASE_URL in the environment.');
  process.exit(2);
}

async function run() {
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  try {
    const q = `SELECT column_name FROM information_schema.columns WHERE table_name='system_alerts' AND column_name='updated_at'`;
    const res = await c.query(q);
    if (res.rows && res.rows.length > 0) {
      console.log('Column updated_at already exists on system_alerts. Nothing to do.');
      return;
    }

    console.log('updated_at column not found — adding column (this will set default now()).');
    await c.query('BEGIN');
    await c.query("ALTER TABLE system_alerts ADD COLUMN updated_at TIMESTAMP DEFAULT now()");
    // populate existing rows (should auto-fill due to default but be explicit for some drivers)
    await c.query("UPDATE system_alerts SET updated_at = created_at WHERE updated_at IS NULL");
    await c.query('COMMIT');
    console.log('Added updated_at column and populated existing rows.');
  } catch (e) {
    try { await c.query('ROLLBACK'); } catch (_) {}
    console.error('Failed to add updated_at column:', e && e.message ? e.message : e);
    process.exit(1);
  } finally {
    await c.end();
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
