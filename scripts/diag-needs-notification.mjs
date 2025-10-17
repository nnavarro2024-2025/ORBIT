import 'dotenv/config';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

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

  // Create a booking payload using tomorrow's date at 09:00-09:30
  const now = new Date();
  const tom = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0, 0);
  const start = new Date(tom);
  const end = new Date(tom.getTime() + 30 * 60 * 1000);

  const bookingPayload = {
    facilityId: 1,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    purpose: 'Diagnostic test for equipment needs',
    participants: 1,
    equipment: { items: ['whiteboard', 'projector', 'extension_cord'], others: 'test' }
  };

  const bookingUrl = serverBase.replace(/\/$/, '') + '/api/bookings';
  console.log('Posting booking');
  const bookRes = await fetch(bookingUrl, { method: 'POST', headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(bookingPayload) });
  const bookText = await bookRes.text();
  console.log('Booking POST', bookRes.status, bookText);
  let bookingJson = null;
  try { bookingJson = JSON.parse(bookText); } catch (e) { console.error('Failed to parse booking response'); }
  if (!bookingJson || !bookingJson.id) { console.error('Booking creation failed'); process.exit(1); }
  const bookingId = bookingJson.id;

  // Sign in as admin and post needs update
  console.log('Signing in as admin', adminEmail);
  const adminToken = await signIn(adminEmail, adminPass);
  const needsUrl = serverBase.replace(/\/$/, '') + `/api/admin/bookings/${bookingId}/needs`;
  const note = JSON.stringify({ items: { whiteboard: 'not_available', projector: 'prepared', extension_cord: 'not_available' }, others: 'Marked manually' });
  console.log('Posting admin needs update');
  const needsRes = await fetch(needsUrl, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'not_available', note }) });
  const needsText = await needsRes.text();
  console.log('Admin needs response', needsRes.status, needsText);

  // Fetch admin alerts to inspect the admin/global alert
  try {
    const adminAlertsUrl = serverBase.replace(/\/$/, '') + '/api/admin/alerts';
    const aaRes = await fetch(adminAlertsUrl, { method: 'GET', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' } });
    const aaJson = await aaRes.json();
    const matches = aaJson.filter(a => String(a.title||'').startsWith('Equipment or Needs Request') || String(a.title||'').startsWith('Equipment Needs Submitted'));
    console.log('Admin alerts matching:', JSON.stringify(matches, null, 2));
  } catch (e) { console.warn('Failed to fetch admin alerts', e); }

  // Fetch user notifications to ensure they got the per-user alert
  const notesUrl = serverBase.replace(/\/$/, '') + '/api/notifications';
  const notesRes = await fetch(notesUrl, { method: 'GET', headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' } });
  const notesJson = await notesRes.json();
  console.log('User notifications:', JSON.stringify(notesJson.filter(n => String(n.title||'').startsWith('Equipment Needs Submitted')), null, 2));

  console.log('Diagnostic complete');
}

run().catch(err => { console.error('Error in diagnostic script', err); process.exit(1); });
