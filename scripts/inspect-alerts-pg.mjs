#!/usr/bin/env node
import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

async function run() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node inspect-alerts-pg.mjs <userId>');
    process.exit(2);
  }
  const userId = args[0];
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL must be set in environment');
    process.exit(2);
  }
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const res = await client.query('SELECT id, type, title, message, user_id, is_read, created_at FROM system_alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId]);
    console.log(`Found ${res.rows.length} alerts for user ${userId}`);
    for (const r of res.rows) {
      console.log('---');
      console.log(`id: ${r.id}`);
      console.log(`title: ${r.title}`);
      console.log(`user_id: ${r.user_id}`);
      console.log(`is_read: ${r.is_read}`);
      console.log(`created_at: ${r.created_at}`);
      console.log('message:');
      console.log(r.message);
    }
  } finally {
    await client.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
