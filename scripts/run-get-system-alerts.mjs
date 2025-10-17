import 'dotenv/config';
import('../server/storage.js').then(mod => {
  (async () => {
    try {
      console.log('Calling storage.getSystemAlerts()...');
      const alerts = await mod.storage.getSystemAlerts();
      console.log('Got alerts count:', Array.isArray(alerts) ? alerts.length : typeof alerts);
      if (Array.isArray(alerts)) console.log(alerts.slice(0,5));
    } catch (e) {
      console.error('storage.getSystemAlerts() threw:', e && e.stack ? e.stack : e);
      process.exit(1);
    }
  })();
}).catch(e => { console.error('Failed to import storage:', e); process.exit(1); });
