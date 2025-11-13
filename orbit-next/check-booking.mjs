import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jsieqpjrkxqnlpxxrnwt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWVxcGpya3hxbmxweHhybnd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQxMDY4OCwiZXhwIjoyMDc1OTg2Njg4fQ.0_YoPIB_s1GPTd6eXzd3tW_M3WkF_GRoZNtGs9WiLCU';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkBooking() {
  const { data, error } = await supabase
    .from('facility_bookings')
    .select('id, admin_response, equipment')
    .eq('user_id', 'f926eae3-4ef0-4cd3-9423-96736780748b')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Recent bookings:');
  data.forEach((booking, idx) => {
    console.log(`\n--- Booking ${idx + 1} (ID: ${booking.id.substring(0, 8)}) ---`);
    console.log('Equipment:', JSON.stringify(booking.equipment, null, 2));
    console.log('Admin Response:', booking.admin_response || '(none)');
  });
}

checkBooking();
