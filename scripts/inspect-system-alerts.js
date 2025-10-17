import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL missing'); process.exit(2); }

async function run() {
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  try {
    const q = `SELECT id, title, message, user_id, created_at, CASE WHEN to_regclass('public.system_alerts') IS NULL THEN NULL ELSE COALESCE(system_alerts.updated_at, system_alerts.created_at) END as recent FROM system_alerts ORDER BY COALESCE(system_alerts.updated_at, system_alerts.created_at) DESC LIMIT 5`;
    console.log('Running query (using COALESCE on updated_at)...');
    const res = await c.query(q);
    console.log('Rows:', res.rows.length);
    console.log(res.rows.slice(0,5));
  } catch (e) {
    console.error('Query error:', e && e.message ? e.message : e);
  } finally {
    await c.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
