#!/usr/bin/env node
// Quick inspector: list system_alerts rows for a given userId
import { storage } from '../server/storage';

async function run() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node inspect-alerts-for-user.mjs <userId>');
    process.exit(2);
  }
  const userId = args[0];
  try {
    const alerts = await storage.getSystemAlerts();
    const matching = (alerts || []).filter(a => a.userId === userId);
    console.log(`Found ${matching.length} alerts for userId=${userId}`);
    for (const a of matching) {
      console.log(JSON.stringify(a, null, 2));
    }
  } catch (e) {
    console.error('Error querying alerts', e);
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
