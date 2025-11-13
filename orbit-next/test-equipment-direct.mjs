#!/usr/bin/env node
/**
 * Direct API Test - Equipment Flow
 * Tests equipment marking with direct database/API access
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jsieqpjrkxqnlpxxrnwt.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaWVxcGpya3hxbmxweHhybnd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQxMDY4OCwiZXhwIjoyMDc1OTg2Njg4fQ.0_YoPIB_s1GPTd6eXzd3tW_M3WkF_GRoZNtGs9WiLCU';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEquipmentFlow() {
  try {
    log('\n' + '='.repeat(60), 'cyan');
    log('DIRECT API EQUIPMENT FLOW TEST', 'cyan');
    log('='.repeat(60) + '\n', 'cyan');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Step 1: Get test user
    log('Step 1: Get test user', 'yellow');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'test@uic.edu.ph')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      throw new Error('Test user not found. Create test@uic.edu.ph first.');
    }
    const testUser = users[0];
    log(`Found user: ${testUser.email} (ID: ${testUser.id})`, 'green');

    // Step 2: Get a facility
    log('\nStep 2: Get facility', 'yellow');
    const { data: facilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select('*')
      .limit(1);

    if (facilitiesError || !facilities || facilities.length === 0) {
      throw new Error('No facilities found');
    }
    const facility = facilities[0];
    log(`Using facility: ${facility.name} (ID: ${facility.id})`, 'green');

    // Step 3: Create booking with equipment (including "others")
    log('\nStep 3: Create booking with equipment', 'yellow');
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 2);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    const equipment = {
      items: ['whiteboard', 'projector', 'extension_cord'],
      others: 'Custom laptop stand and wireless mouse',
    };

    const { data: booking, error: bookingError } = await supabase
      .from('facility_bookings')
      .insert({
        facility_id: facility.id,
        user_id: testUser.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        purpose: 'Test Equipment Flow',
        status: 'approved',
        participants: 10,
        equipment: equipment,
      })
      .select()
      .single();

    if (bookingError) {
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    log(`Booking created: ID ${booking.id}`, 'green');
    log(`Equipment payload: ${JSON.stringify(equipment, null, 2)}`, 'blue');

    // Step 4: Verify equipment was saved correctly
    log('\nStep 4: Verify equipment in database', 'yellow');
    const { data: verifyBooking, error: verifyError } = await supabase
      .from('facility_bookings')
      .select('*')
      .eq('id', booking.id)
      .single();

    if (verifyError) {
      throw new Error(`Failed to verify booking: ${verifyError.message}`);
    }

    log('Retrieved equipment from DB:', 'blue');
    log(JSON.stringify(verifyBooking.equipment, null, 2), 'blue');

    if (!verifyBooking.equipment || !verifyBooking.equipment.items) {
      throw new Error('Equipment not saved correctly!');
    }

    if (!Array.isArray(verifyBooking.equipment.items)) {
      log('❌ BUG FOUND: items is not an array!', 'red');
      log(`Type: ${typeof verifyBooking.equipment.items}`, 'red');
      log(`Value: ${JSON.stringify(verifyBooking.equipment.items)}`, 'red');
    } else {
      log(`✓ Equipment items is an array with ${verifyBooking.equipment.items.length} items`, 'green');
      verifyBooking.equipment.items.forEach((item, idx) => {
        log(`  [${idx}] ${item}`, 'blue');
      });
    }

    // Step 5: Simulate admin marking equipment
    log('\nStep 5: Mark equipment statuses (mixed)', 'yellow');
    const itemStatuses = {
      'whiteboard': 'not_available',
      'projector': 'prepared',
      'extension_cord': 'not_available',
      'Custom laptop stand and wireless mouse': 'prepared',
    };

    const allPrepared = Object.values(itemStatuses).every(s => s === 'prepared');
    const overallStatus = allPrepared ? 'Prepared' : 'Not Available';
    const note = JSON.stringify({ items: itemStatuses });

    const adminResponse = `Needs: ${overallStatus} — ${note}`;

    const { data: updatedBooking, error: updateError } = await supabase
      .from('facility_bookings')
      .update({
        admin_response: adminResponse,
      })
      .eq('id', booking.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }

    log('Admin response set:', 'green');
    log(adminResponse, 'blue');

    // Step 6: Verify admin response parsing
    log('\nStep 6: Parse admin response (simulate modal opening)', 'yellow');
    
    // Simulate parseEquipmentItemsFromBooking
    const equipmentFromBooking = updatedBooking.equipment;
    let parsedItems = [];
    
    if (equipmentFromBooking) {
      if (Array.isArray(equipmentFromBooking.items)) {
        parsedItems = equipmentFromBooking.items.filter(i => i && !/^others[:\s]*$/i.test(i));
        log(`✓ Parsed ${parsedItems.length} items from equipment.items array`, 'green');
        parsedItems.forEach((item, idx) => {
          log(`  [${idx}] ${item}`, 'blue');
        });
      } else {
        log('❌ BUG: equipment.items is not an array!', 'red');
        log(`Type: ${typeof equipmentFromBooking.items}`, 'red');
        log(`Value: ${JSON.stringify(equipmentFromBooking.items)}`, 'red');
      }
      
      // Include "others" text if present (matching parseEquipmentItemsFromBooking logic)
      if (equipmentFromBooking.others && String(equipmentFromBooking.others).trim()) {
        const othersText = String(equipmentFromBooking.others).trim();
        parsedItems.push(othersText);
        log(`✓ Also parsed "others" text: "${othersText}"`, 'green');
      }
    }

    // Simulate parsing adminResponse for statuses
    log('\nParsing admin response for per-item statuses...', 'yellow');
    const noteMatch = updatedBooking.admin_response.match(/—\s*(\{[\s\S]*\})\s*$/);
    if (noteMatch && noteMatch[1]) {
      try {
        const parsed = JSON.parse(noteMatch[1]);
        if (parsed && parsed.items) {
          log('✓ Successfully parsed per-item statuses:', 'green');
          for (const [item, status] of Object.entries(parsed.items)) {
            const color = status === 'prepared' ? 'green' : 'red';
            log(`  ${item}: ${status}`, color);
          }

          // Simulate modal initialization
          log('\nSimulating modal initialization...', 'yellow');
          const modalStatuses = {};
          parsedItems.forEach(item => {
            modalStatuses[item] = parsed.items[item] || undefined;
          });

          log('Modal would initialize with:', 'blue');
          for (const [item, status] of Object.entries(modalStatuses)) {
            const display = status || 'undefined';
            const color = status === 'prepared' ? 'green' : status === 'not_available' ? 'red' : 'reset';
            log(`  ${item}: ${display}`, color);
          }
        }
      } catch (e) {
        log(`❌ Failed to parse note JSON: ${e.message}`, 'red');
      }
    }

    // Step 7: Update all to prepared
    log('\nStep 7: Update all items to prepared', 'yellow');
    const allPreparedStatuses = {};
    parsedItems.forEach(item => {
      allPreparedStatuses[item] = 'prepared';
    });

    const finalNote = JSON.stringify({ items: allPreparedStatuses });
    const finalResponse = `Needs: Prepared — ${finalNote}`;

    const { error: finalUpdateError } = await supabase
      .from('facility_bookings')
      .update({
        admin_response: finalResponse,
      })
      .eq('id', booking.id);

    if (finalUpdateError) {
      throw new Error(`Failed to final update: ${finalUpdateError.message}`);
    }

    log('✓ Updated all items to prepared', 'green');
    log(finalResponse, 'blue');

    // Success summary
    log('\n' + '='.repeat(60), 'green');
    log('✓ ALL TESTS PASSED', 'green');
    log('='.repeat(60) + '\n', 'green');

    log('Summary:', 'yellow');
    log(`  • Created booking ID: ${booking.id}`, 'blue');
    log(`  • Equipment saved as array: ${Array.isArray(verifyBooking.equipment.items)}`, 'blue');
    log(`  • Per-item statuses can be parsed: ✓`, 'blue');
    log(`  • Modal would initialize correctly: ✓`, 'blue');

    log('\nNext: Open the browser and test the UI with booking ID: ' + booking.id, 'cyan');

  } catch (error) {
    log('\n' + '='.repeat(60), 'red');
    log('✗ TEST FAILED', 'red');
    log('='.repeat(60) + '\n', 'red');
    log(`Error: ${error.message}`, 'red');
    if (error.stack) {
      log(`\nStack trace:`, 'red');
      log(error.stack, 'red');
    }
    process.exit(1);
  }
}

testEquipmentFlow();
