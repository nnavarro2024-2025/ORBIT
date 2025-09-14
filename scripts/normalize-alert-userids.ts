import { db } from '../server/db';
import { systemAlerts } from '../shared/schema';

async function findAndFix() {
  // Find alerts where user_id is empty string or only whitespace
  const query = `SELECT id, user_id, title, message, created_at FROM system_alerts WHERE TRIM(COALESCE(user_id, '')) = '' AND user_id IS NOT NULL`;
  const rows = await db.execute(query);
  console.log('Found rows with non-null but empty user_id:', rows.rows?.length || 0);
  if (rows.rows && rows.rows.length > 0) {
    for (const r of rows.rows) {
      console.log(r);
    }
    // Optional: prompt or automatically normalize
    console.log('\nTo normalize these rows to NULL, run the following SQL manually in a safe environment:');
    console.log(`UPDATE system_alerts SET user_id = NULL WHERE TRIM(COALESCE(user_id, '')) = '' AND user_id IS NOT NULL;`);
  } else {
    console.log('No problematic rows found.');
  }
}

findAndFix().catch((e) => {
  console.error('Error running normalize script:', e);
  process.exit(1);
});
