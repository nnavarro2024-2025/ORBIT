import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jsieqpjrkxqnlpxxrnwt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWVxcGpya3hxbmxweHhybnd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQxMDY4OCwiZXhwIjoyMDc1OTg2Njg4fQ.0_YoPIB_s1GPTd6eXzd3tW_M3WkF_GRoZNtGs9WiLCU';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkNotifications() {
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'test@uic.edu.ph')
    .limit(1);
  
  const testUserId = users[0].id;
  
  console.log('\n=== Checking Notifications ===\n');
  
  // Check user-specific notifications
  const { data: userAlerts } = await supabase
    .from('system_alerts')
    .select('*')
    .eq('user_id', testUserId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log(`User-specific notifications (${userAlerts.length}):`);
  userAlerts.forEach(alert => {
    console.log(`  - ${alert.title} | Read: ${alert.is_read} | ${alert.created_at}`);
  });
  
  // Check global notifications
  const { data: globalAlerts } = await supabase
    .from('system_alerts')
    .select('*')
    .is('user_id', null)
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log(`\nGlobal notifications (${globalAlerts.length}):`);
  globalAlerts.forEach(alert => {
    console.log(`  - ${alert.title} | Read: ${alert.is_read} | ${alert.created_at}`);
  });
}

checkNotifications();
