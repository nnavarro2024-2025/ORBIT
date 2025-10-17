import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;

dotenv.config();
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Set DATABASE_URL in .env to connect to the DB');
  process.exit(2);
}

async function run() {
  const c = new Client({ connectionString: dbUrl });
  try {
    await c.connect();
    console.log('Connected to DB');
    const res = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'system_alerts'`);
    console.log('system_alerts table exists:', res.rows.length > 0);
    if (res.rows.length > 0) {
      const cols = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='system_alerts'`);
      console.log('Columns:', cols.rows);
      const samples = await c.query(`SELECT id, title, "message", "user_id", created_at, updated_at FROM system_alerts ORDER BY created_at DESC LIMIT 5`);
      console.log('Sample rows:', samples.rows);
    }
  } catch (e) {
    console.error('DB error:', e.message || e);
  } finally {
    await c.end().catch(()=>{});
  }
}

run();
