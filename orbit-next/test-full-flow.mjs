import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jsieqpjrkxqnlpxxrnwt.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWVxcGpya3hxbmxweHhybnd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQxMDY4OCwiZXhwIjoyMDc1OTg2Njg4fQ.0_YoPIB_s1GPTd6eXzd3tW_M3WkF_GRoZNtGs9WiLCU';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function log(message, color = 'reset') {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    reset: '\x1b[0m',
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function fullBookingFlow() {
  log('\n============================================================', 'blue');
  log('FULL BOOKING FLOW TEST (User → Admin → Notification)', 'blue');
  log('============================================================', 'blue');

  try {
    // Step 1: Get test user
    log('\n📋 Step 1: Get test user', 'yellow');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'test@uic.edu.ph')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      throw new Error('Test user not found. Create test@uic.edu.ph first.');
    }
    const testUser = users[0];
    log(`✓ Found user: ${testUser.email} (ID: ${testUser.id})`, 'green');

    // Step 2: Get a facility (Collaborative Learning Room)
    log('\n🏢 Step 2: Get facility', 'yellow');
    const { data: facilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select('*')
      .ilike('name', '%collaborative%');

    if (facilitiesError || !facilities || facilities.length === 0) {
      throw new Error('Collaborative Learning Room not found');
    }
    const facility = facilities[0];
    log(`✓ Using facility: ${facility.name} (ID: ${facility.id})`, 'green');

    // Step 3: Create booking with equipment (USER ACTION)
    log('\n👤 Step 3: USER creates booking with equipment', 'yellow');
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 2);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    const equipment = {
      items: ['whiteboard', 'projector', 'extension_cord'],
      others: 'Laptop stand',
    };

    const { data: booking, error: bookingError } = await supabase
      .from('facility_bookings')
      .insert({
        facility_id: facility.id,
        user_id: testUser.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        purpose: 'Full flow test with equipment',
        status: 'approved',
        participants: 5,
        equipment: equipment,
      })
      .select()
      .single();

    if (bookingError) {
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    log(`✓ Booking created: ID ${booking.id}`, 'green');
    log(`  Equipment: ${equipment.items.join(', ')} + "${equipment.others}"`, 'blue');

    // Wait a bit for notifications to be created
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Check notifications created
    log('\n🔔 Step 4: Check notifications created', 'yellow');
    const { data: alerts, error: alertsError } = await supabase
      .from('system_alerts')
      .select('*')
      .or(`user_id.eq.${testUser.id},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!alertsError && alerts) {
      const equipmentAlerts = alerts.filter(a => 
        a.title && (a.title.includes('Equipment') || a.title.includes('Needs'))
      );
      log(`✓ Found ${equipmentAlerts.length} equipment-related notifications`, 'green');
      equipmentAlerts.forEach(alert => {
        log(`  - ${alert.title} (user_id: ${alert.user_id || 'global'})`, 'blue');
      });
    }

    // Step 5: ADMIN marks equipment
    log('\n👨‍💼 Step 5: ADMIN marks equipment statuses', 'yellow');
    const itemStatuses = {
      'whiteboard': 'not_available',
      'projector': 'prepared',
      'extension cord': 'not_available',
      'Laptop stand': 'prepared',
    };

    const allPrepared = Object.values(itemStatuses).every(s => s === 'prepared');
    const overallStatus = allPrepared ? 'Prepared' : 'Not Available';
    const note = JSON.stringify({ items: itemStatuses });
    const adminResponse = `Needs: ${overallStatus} — ${note}`;

    const { error: updateError } = await supabase
      .from('facility_bookings')
      .update({
        admin_response: adminResponse,
      })
      .eq('id', booking.id);

    if (updateError) {
      throw new Error(`Failed to update equipment status: ${updateError.message}`);
    }

    log(`✓ Admin marked equipment statuses`, 'green');
    Object.entries(itemStatuses).forEach(([item, status]) => {
      const color = status === 'prepared' ? 'green' : 'red';
      log(`  - ${item}: ${status}`, color);
    });

    // Create notification for when admin marks equipment
    log('\n🔔 Creating admin update notification...', 'yellow');
    const updateMessage = `Equipment updated for ${facility.name} booking by ${testUser.email}. ${note}`;
    const { error: notifError } = await supabase
      .from('system_alerts')
      .insert({
        type: 'booking',
        severity: 'low',
        title: 'Equipment Needs Updated',
        message: updateMessage,
        user_id: null, // Global notification for admins
        is_read: false,
        created_at: new Date().toISOString(),
      });
    
    if (!notifError) {
      log('✓ Admin notification created', 'green');
    }

    // Step 6: Verify booking has adminResponse
    log('\n✅ Step 6: Verify equipment statuses saved', 'yellow');
    const { data: verifyBooking, error: verifyError } = await supabase
      .from('facility_bookings')
      .select('id, equipment, admin_response')
      .eq('id', booking.id)
      .single();

    if (verifyError) {
      throw new Error(`Failed to verify booking: ${verifyError.message}`);
    }

    log('✓ Booking retrieved from database:', 'green');
    log(`  Equipment: ${JSON.stringify(verifyBooking.equipment)}`, 'blue');
    log(`  Admin Response: ${verifyBooking.admin_response}`, 'blue');

    // Step 7: Simulate notification bell parsing
    log('\n🔔 Step 7: Simulate notification bell parsing', 'yellow');
    if (verifyBooking.admin_response) {
      const match = verifyBooking.admin_response.match(/[—\-]\s*(\{[\s\S]*\})\s*$/);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]);
        log('✓ Notification bell would parse:', 'green');
        Object.entries(parsed.items).forEach(([item, status]) => {
          const color = status === 'prepared' ? 'green' : 'red';
          const icon = status === 'prepared' ? '✓' : '✕';
          log(`  ${icon} ${item}: ${status}`, color);
        });
      }
    }

    log('\n============================================================', 'green');
    log('✓ ALL STEPS COMPLETED SUCCESSFULLY', 'green');
    log('============================================================', 'green');
    log('\n📌 Test Summary:', 'yellow');
    log(`  Booking ID: ${booking.id}`, 'blue');
    log(`  User: ${testUser.email}`, 'blue');
    log(`  Facility: ${facility.name}`, 'blue');
    log(`  Equipment items: ${equipment.items.length} + others`, 'blue');
    log(`  Admin marked: ✓`, 'green');
    log('\n💡 Next steps:', 'yellow');
    log('  1. Refresh your browser', 'blue');
    log('  2. Check notification bell for equipment alert', 'blue');
    log('  3. Verify colored checkboxes (green ✓ for prepared, red ✕ for not available)', 'blue');
    log('  4. Go to admin dashboard and open booking details', 'blue');
    log('  5. Click "Check Equipment" - colors should persist after reload', 'blue');

  } catch (error) {
    log('\n❌ ERROR:', 'red');
    log(error.message, 'red');
    if (error.stack) {
      log(error.stack, 'red');
    }
    process.exit(1);
  }
}

fullBookingFlow();
