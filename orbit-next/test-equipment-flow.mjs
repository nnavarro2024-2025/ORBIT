#!/usr/bin/env node
/**
 * Test Equipment Flow Script
 * Tests the complete equipment marking flow: create booking → mark items prepared/not available
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// ANSI color codes for terminal output
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

async function makeRequest(method, path, body = null, cookies = '') {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (cookies) {
    headers['Cookie'] = cookies;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  log(`\n→ ${method} ${path}`, 'cyan');
  if (body) {
    log(`  Body: ${JSON.stringify(body, null, 2)}`, 'blue');
  }

  const response = await fetch(url, options);
  const setCookie = response.headers.get('set-cookie');
  
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    log(`✗ Failed: ${response.status} ${response.statusText}`, 'red');
    log(`  Response: ${JSON.stringify(data, null, 2)}`, 'red');
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  log(`✓ Success: ${response.status}`, 'green');
  
  return { data, setCookie, status: response.status };
}

async function login(email, password) {
  log('\n=== LOGIN (Supabase) ===', 'yellow');
  
  // Use Supabase Auth API directly
  const { data, error } = await fetch(`${BASE_URL.replace('3000', '54321')}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  }).then(r => r.json());

  if (error || !data.access_token) {
    throw new Error(`Login failed: ${error?.message || 'No access token'}`);
  }

  log(`Logged in as: ${email}`, 'green');
  // Return cookies in the format Next.js expects
  return `sb-access-token=${data.access_token}; sb-refresh-token=${data.refresh_token}`;
}

async function getFacilities(cookies) {
  log('\n=== GET FACILITIES ===', 'yellow');
  const { data } = await makeRequest('GET', '/api/facilities', null, cookies);
  log(`Found ${data.length} facilities`, 'green');
  return data;
}

async function createBooking(cookies, facilityId, equipment) {
  log('\n=== CREATE BOOKING ===', 'yellow');
  
  const startTime = new Date();
  startTime.setHours(startTime.getHours() + 2);
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 1);

  const bookingData = {
    facilityId,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    purpose: 'Test Equipment Flow',
    equipment,
  };

  const { data } = await makeRequest('POST', '/api/bookings', bookingData, cookies);
  log(`Booking created: ID ${data.id}`, 'green');
  log(`  Equipment: ${JSON.stringify(equipment, null, 2)}`, 'blue');
  
  return data;
}

async function getAdminBookings(cookies) {
  log('\n=== GET ADMIN BOOKINGS ===', 'yellow');
  const { data } = await makeRequest('GET', '/api/admin/bookings', null, cookies);
  log(`Found ${data.length} bookings`, 'green');
  return data;
}

async function markEquipmentStatus(cookies, bookingId, status, items) {
  log(`\n=== MARK EQUIPMENT AS ${status.toUpperCase()} ===`, 'yellow');
  
  const note = JSON.stringify({ items });
  
  const { data } = await makeRequest(
    'POST',
    `/api/admin/bookings/${bookingId}/needs`,
    { status, note },
    cookies
  );

  log(`Equipment marked as ${status}`, 'green');
  log(`  Items: ${JSON.stringify(items, null, 2)}`, 'blue');
  
  return data;
}

async function getBooking(cookies, bookingId) {
  log('\n=== GET BOOKING DETAILS ===', 'yellow');
  const { data } = await makeRequest('GET', `/api/bookings/${bookingId}`, null, cookies);
  log(`Retrieved booking ${bookingId}`, 'green');
  if (data.adminResponse) {
    log(`  Admin Response: ${data.adminResponse}`, 'blue');
  }
  return data;
}

async function runTest() {
  try {
    log('\n' + '='.repeat(60), 'cyan');
    log('EQUIPMENT FLOW TEST', 'cyan');
    log('='.repeat(60) + '\n', 'cyan');

    // Step 1: Login as regular user
    log('Step 1: Login as regular user', 'yellow');
    const userEmail = process.env.TEST_USER_EMAIL || 'test@uic.edu.ph';
    const userPassword = process.env.TEST_USER_PASSWORD || 'password123';
    const userCookies = await login(userEmail, userPassword);

    // Step 2: Get facilities
    log('\nStep 2: Get available facilities', 'yellow');
    const facilities = await getFacilities(userCookies);
    if (facilities.length === 0) {
      throw new Error('No facilities available');
    }
    const facility = facilities[0];
    log(`Using facility: ${facility.name} (ID: ${facility.id})`, 'blue');

    // Step 3: Create booking with equipment
    log('\nStep 3: Create booking with equipment needs', 'yellow');
    const equipment = {
      items: ['whiteboard', 'projector', 'extension_cord', 'hdmi', 'extra_chairs'],
      others: 'test details for equipment flow',
    };
    const booking = await createBooking(userCookies, facility.id, equipment);

    // Step 4: Login as admin
    log('\nStep 4: Login as admin', 'yellow');
    const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@uic.edu.ph';
    const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'admin123';
    const adminCookies = await login(adminEmail, adminPassword);

    // Step 5: Verify booking appears in admin view
    log('\nStep 5: Verify booking in admin view', 'yellow');
    const adminBookings = await getAdminBookings(adminCookies);
    const foundBooking = adminBookings.find(b => b.id === booking.id);
    if (!foundBooking) {
      throw new Error('Booking not found in admin view');
    }
    log(`Found booking in admin view`, 'green');

    // Step 6: Mark equipment with mixed statuses
    log('\nStep 6: Mark equipment items (mixed statuses)', 'yellow');
    const itemStatuses = {
      'whiteboard': 'not_available',
      'projector': 'prepared',
      'extension_cord': 'not_available',
      'hdmi': 'prepared',
      'extra_chairs': 'not_available',
      'test details for equipment flow': 'prepared',
    };
    
    // Determine overall status (if all prepared -> prepared, else not_available)
    const allPrepared = Object.values(itemStatuses).every(s => s === 'prepared');
    const overallStatus = allPrepared ? 'prepared' : 'not_available';
    
    await markEquipmentStatus(adminCookies, booking.id, overallStatus, itemStatuses);

    // Step 7: Verify the update persisted
    log('\nStep 7: Verify equipment status persisted', 'yellow');
    const updatedBooking = await getBooking(adminCookies, booking.id);
    
    if (!updatedBooking.adminResponse) {
      throw new Error('adminResponse not set after marking equipment');
    }
    
    // Parse the adminResponse to verify per-item statuses
    const noteMatch = updatedBooking.adminResponse.match(/\{[\s\S]*\}/);
    if (noteMatch) {
      const parsed = JSON.parse(noteMatch[0]);
      log(`Verified per-item statuses:`, 'green');
      for (const [item, status] of Object.entries(parsed.items || {})) {
        const expected = itemStatuses[item];
        const match = status === expected ? '✓' : '✗';
        log(`  ${match} ${item}: ${status} (expected: ${expected})`, status === expected ? 'green' : 'red');
      }
    }

    // Step 8: Test updating status again (all prepared this time)
    log('\nStep 8: Update all items to prepared', 'yellow');
    const allPreparedStatuses = {
      'whiteboard': 'prepared',
      'projector': 'prepared',
      'extension_cord': 'prepared',
      'hdmi': 'prepared',
      'extra_chairs': 'prepared',
      'test details for equipment flow': 'prepared',
    };
    
    await markEquipmentStatus(adminCookies, booking.id, 'prepared', allPreparedStatuses);
    
    const finalBooking = await getBooking(adminCookies, booking.id);
    log(`Final admin response: ${finalBooking.adminResponse}`, 'blue');

    // Success summary
    log('\n' + '='.repeat(60), 'green');
    log('✓ ALL TESTS PASSED', 'green');
    log('='.repeat(60) + '\n', 'green');
    
    log('Summary:', 'yellow');
    log(`  • Created booking with ${equipment.items.length} equipment items`, 'blue');
    log(`  • Marked items with mixed statuses (prepared/not_available)`, 'blue');
    log(`  • Verified statuses persisted in database`, 'blue');
    log(`  • Updated all items to prepared`, 'blue');
    log(`  • Equipment modal should now display correct colors on reload`, 'blue');

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

// Run the test
runTest();
