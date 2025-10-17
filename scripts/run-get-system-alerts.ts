import dotenv from 'dotenv';
import { storage } from '../server/storage';

dotenv.config();

async function run() {
  try {
    console.log('Calling storage.getSystemAlerts()');
    const alerts = await storage.getSystemAlerts();
    console.log('Got', alerts.length, 'alerts');
    console.log(alerts.slice(0,5));
  } catch (e:any) {
    console.error('Error from storage.getSystemAlerts():', e && e.stack ? e.stack : e);
    process.exit(1);
  }
}

run();
