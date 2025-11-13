// One-time script to mark equipment notifications as read for bookings that already have equipment status set
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jsieqpjrkxqnlpxxrnwt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWVxcGpya3hxbmxweHhybnd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQxMDY4OCwiZXhwIjoyMDc1OTg2Njg4fQ.0_YoPIB_s1GPTd6eXzd3tW_M3WkF_GRoZNtGs9WiLCU';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function cleanupEquipmentNotifications() {
  console.log('🔍 Finding bookings with processed equipment...');
  
  // Get all bookings that have equipment with adminResponse set
  const { data: bookings, error: bookingsError } = await supabase
    .from('facility_bookings')
    .select('id, user_id, equipment, admin_response')
    .not('equipment', 'is', null)
    .not('admin_response', 'is', null);

  if (bookingsError) {
    console.error('❌ Failed to fetch bookings:', bookingsError.message);
    return;
  }

  console.log(`✓ Found ${bookings.length} bookings with processed equipment`);

  // Get all unread equipment notifications
  const { data: alerts, error: alertsError } = await supabase
    .from('system_alerts')
    .select('*')
    .eq('is_read', false)
    .or('title.ilike.%Equipment%,title.ilike.%Needs%');

  if (alertsError) {
    console.error('❌ Failed to fetch alerts:', alertsError.message);
    return;
  }

  console.log(`✓ Found ${alerts.length} unread equipment notifications`);

  // Mark equipment notifications as read for users whose equipment has been processed
  const processedUserIds = new Set(bookings.map(b => b.user_id));
  const alertsToMarkRead = alerts.filter(alert => 
    alert.user_id && processedUserIds.has(alert.user_id)
  );

  if (alertsToMarkRead.length === 0) {
    console.log('✓ No notifications need to be updated');
    return;
  }

  console.log(`📝 Marking ${alertsToMarkRead.length} notifications as read...`);

  for (const alert of alertsToMarkRead) {
    const { error: updateError } = await supabase
      .from('system_alerts')
      .update({ is_read: true })
      .eq('id', alert.id);

    if (updateError) {
      console.error(`❌ Failed to update alert ${alert.id}:`, updateError.message);
    } else {
      console.log(`✓ Marked notification "${alert.title}" as read for user ${alert.user_id}`);
    }
  }

  console.log('✅ Cleanup complete!');
}

cleanupEquipmentNotifications().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
