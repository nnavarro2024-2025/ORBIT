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

async function run() {
  const userEmail = process.env.TEST_AUTH_EMAIL || 'test@uic.edu.ph';
  const userPass = process.env.TEST_AUTH_PASSWORD || '123';
  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@uic.edu.ph';
  const adminPass = process.env.TEST_ADMIN_PASSWORD || '123';

  console.log('Signing in as user', userEmail);
  const userToken = await signIn(userEmail, userPass);
  console.log('User token length:', userToken?.length || 0);

  // Create a booking. Find an available 30-minute slot via /api/availability (today + next 3 days)
  const bookingUrl = serverBase.replace(/\/$/, '') + '/api/bookings';
  let chosenStart = null;
  let chosenEnd = null;
  for (let dayOffset = 0; dayOffset < 4 && !chosenStart; dayOffset++) {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const availUrl = serverBase.replace(/\/$/, '') + `/api/availability?date=${yyyy}-${mm}-${dd}`;
    try {
      const avRes = await fetch(availUrl, { method: 'GET', headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' } });
      if (avRes.status !== 200) continue;
      const avJson = await avRes.json();
      const data = avJson.data || [];
      const fac = data.find(f => f.facility && String(f.facility.id) === '1');
      if (fac && Array.isArray(fac.slots)) {
        const slot = fac.slots.find(s => s.status === 'available');
        if (slot) {
          chosenStart = new Date(slot.start);
          chosenEnd = new Date(slot.end);
          break;
        }
      }
    } catch (e) {
      // ignore and try next day
    }
  }

  if (!chosenStart) {
    console.error('No available slot found for facility 1 in the next 4 days. Exiting.');
    process.exit(1);
  }

  const bookingPayload = {
    facilityId: 1,
    startTime: chosenStart.toISOString(),
    endTime: chosenEnd.toISOString(),
    purpose: 'E2E test booking - equipment',
    participants: 1,
    equipment: { items: ['projector', 'hdmi'], others: 'Wireless mic' }
  };

  console.log('Posting booking for slot', bookingPayload.startTime, '--', bookingPayload.endTime);
  const bookRes = await fetch(bookingUrl, { method: 'POST', headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(bookingPayload) });
  const bookText = await bookRes.text();
  console.log('Booking POST', bookRes.status, bookText);
  let bookingId = null;
  let bookingJson = null;
  try { bookingJson = JSON.parse(bookText); bookingId = bookingJson.id; } catch (e) { console.error('Failed to parse booking response', e); }
  if (!bookingId) {
    console.error('Booking creation failed. Exiting.');
    process.exit(1);
  }

  // Sign in as admin and call admin needs endpoint
  console.log('Signing in as admin', adminEmail);
  const adminToken = await signIn(adminEmail, adminPass);
  const needsUrl = serverBase.replace(/\/$/, '') + `/api/admin/bookings/${bookingId}/needs`;
  console.log('Calling admin needs endpoint with status=prepared');
  const needsRes = await fetch(needsUrl, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'prepared', note: JSON.stringify({ items: { projector: 'prepared', hdmi: 'prepared' } }) }) });
  console.log('Admin needs response status:', needsRes.status);
  const needsText = await needsRes.text();
  console.log('Admin needs response:', needsText);

  // Wait a moment then sign in as user and fetch notifications
  await new Promise(r => setTimeout(r, 1000));
  // Fetch admin alerts as admin to inspect whether global alert was updated
  try {
    const adminAlertsUrl = serverBase.replace(/\/$/, '') + '/api/admin/alerts';
    const aaRes = await fetch(adminAlertsUrl, { method: 'GET', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' } });
    console.log('Admin alerts status:', aaRes.status);
    const aaJson = await aaRes.json();
    console.log('Admin alerts:', JSON.stringify(aaJson.filter(a => String(a.title||'').startsWith('Equipment Needs Submitted')), null, 2));
  } catch (e) { console.warn('Failed to fetch admin alerts for inspection', e); }
  // Fetch all alerts (admin-only debug route) to inspect per-user copies
  try {
    const allAlertsUrl = serverBase.replace(/\/$/, '') + '/api/admin/alerts/all';
    const allRes = await fetch(allAlertsUrl, { method: 'GET', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' } });
    console.log('/api/admin/alerts/all status:', allRes.status);
    const allJson = await allRes.json();
    // Filter for alerts that mention the booking owner by userId or email
    const ownerId = bookingJson?.userId;
    const ownerEmail = bookingJson ? (bookingJson.userId && null) : null; // email not present in bookingJson; fallback to user's email var
    const byUserId = Array.isArray(allJson) ? allJson.filter(a => String(a.userId || '') === String(ownerId)) : [];
    const mentioningUser = Array.isArray(allJson) ? allJson.filter(a => String(a.message || '').includes(String(ownerId) || '') || String(a.message || '').includes(userEmail || '')) : [];
    console.log('Alerts with userId===ownerId:', JSON.stringify(byUserId, null, 2));
    console.log('Alerts mentioning owner id/email:', JSON.stringify(mentioningUser, null, 2));
  } catch (e) {
    console.warn('Failed to fetch /api/admin/alerts/all', e);
  }
  // Inspect admin alerts (global)
  try {
    const adminAlertsUrl = serverBase.replace(/\/$/, '') + '/api/admin/alerts';
    const ar = await fetch(adminAlertsUrl, { method: 'GET', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' } });
    console.log('Admin alerts (global) fetch status:', ar.status);
    const arJson = await ar.json();
    console.log('Admin alerts (sample):', JSON.stringify((arJson || []).slice(0,5), null, 2));
  } catch (e) { console.warn('Failed to fetch admin alerts for inspection', e); }
  console.log('Fetching user notifications');
  const notesUrl = serverBase.replace(/\/$/, '') + '/api/notifications';
  const notesRes = await fetch(notesUrl, { method: 'GET', headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' } });
  console.log('Notifications status:', notesRes.status);
  const notesJson = await notesRes.json();
  console.log('Notifications:', JSON.stringify(notesJson, null, 2));

  // Check for Equipment Needs Submitted notification
  const found = Array.isArray(notesJson) && notesJson.find(n => String(n.title || '').startsWith('Equipment Needs Submitted'));
  console.log('Found equipment needs notification for user?', !!found);
  if (!found) process.exit(2);
  console.log('Test passed: user received per-user equipment notification');
  process.exit(0);
}

run().catch(err => { console.error('Error in test:', err); process.exit(1); });
