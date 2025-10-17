import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serverBase = process.env.SERVER_URL || 'http://localhost:5000';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars');
  process.exit(2);
}

async function signIn(email, password) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return data.session?.access_token;
}

async function findSlot(token, facilityId = 1, maxDays = 3) {
  for (let dayOffset = 0; dayOffset <= maxDays; dayOffset++) {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const availUrl = serverBase.replace(/\/$/, '') + `/api/availability?date=${yyyy}-${mm}-${dd}`;
    try {
      const avRes = await fetch(availUrl, { method: 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      if (avRes.status !== 200) continue;
      const avJson = await avRes.json();
      const data = avJson.data || [];
      const fac = data.find(f => f.facility && String(f.facility.id) === String(facilityId));
      if (fac && Array.isArray(fac.slots)) {
        const slot = fac.slots.find(s => s.status === 'available');
        if (slot) {
          return { start: new Date(slot.start), end: new Date(slot.end) };
        }
      }
    } catch (e) {
      // ignore and try next
    }
  }
  return null;
}

async function run() {
  const userEmail = process.env.TEST_AUTH_EMAIL || 'test@uic.edu.ph';
  const userPass = process.env.TEST_AUTH_PASSWORD || '123';
  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@uic.edu.ph';
  const adminPass = process.env.TEST_ADMIN_PASSWORD || '123';

  console.log('Signing in as user', userEmail);
  const userToken = await signIn(userEmail, userPass);

  const slot = await findSlot(userToken, process.env.FACILITY_ID || 1, 3);
  if (!slot) {
    console.error('No available slot found');
    process.exit(1);
  }

  const bookingPayload = {
    facilityId: parseInt(process.env.FACILITY_ID || '1'),
    startTime: slot.start.toISOString(),
    endTime: slot.end.toISOString(),
    purpose: process.env.PURPOSE || 'Automated booking flow',
    participants: 1,
    equipment: { items: ['projector', 'hdmi'], others: 'Wireless mic' },
    forceCancelConflicts: true
  };

  const bookingUrl = serverBase.replace(/\/$/, '') + '/api/bookings';
  console.log('Creating booking for', bookingPayload.startTime);
  const bookRes = await fetch(bookingUrl, { method: 'POST', headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(bookingPayload) });
  const bookText = await bookRes.text();
  console.log('Booking response:', bookRes.status, bookText);
  if (bookRes.status !== 200) process.exit(1);
  const booking = JSON.parse(bookText);

  // Optionally run admin needs (prepared) step
  console.log('Signing in as admin', adminEmail);
  const adminToken = await signIn(adminEmail, adminPass);
  const needsUrl = serverBase.replace(/\/$/, '') + `/api/admin/bookings/${booking.id}/needs`;
  console.log('Calling admin needs endpoint (prepared)');
  const needsRes = await fetch(needsUrl, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'prepared', note: JSON.stringify({ items: { projector: 'prepared', hdmi: 'prepared' } }) }) });
  console.log('Admin needs status:', needsRes.status, await needsRes.text());

  // Wait briefly then fetch notifications
  await new Promise(r => setTimeout(r, 500));

  console.log('\n--- Admin alerts (sanitized) ---');
  try {
    const aa = await fetch(serverBase.replace(/\/$/, '') + '/api/admin/alerts', { method: 'GET', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' } });
    console.log('Status', aa.status);
    const aaJson = await aa.json();
    console.log(JSON.stringify((aaJson || []).slice(0,10), null, 2));
  } catch (e) { console.warn('Failed to fetch admin alerts', e); }

  console.log('\n--- User notifications ---');
  try {
    const un = await fetch(serverBase.replace(/\/$/, '') + '/api/notifications', { method: 'GET', headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' } });
    console.log('Status', un.status);
    const unJson = await un.json();
    console.log(JSON.stringify(unJson, null, 2));
  } catch (e) { console.warn('Failed to fetch user notifications', e); }

  console.log('\nBooking flow complete. Booking id:', booking.id);
}

run().catch(err => { console.error('Booking flow failed:', err); process.exit(1); });
