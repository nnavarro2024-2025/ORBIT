import 'dotenv/config';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.TEST_AUTH_EMAIL;
const password = process.env.TEST_AUTH_PASSWORD;
const serverBase = (process.env.SERVER_URL || 'http://localhost:5000').replace(/\/$/, '');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars.');
  process.exit(2);
}
if (!email || !password) {
  console.error('Missing TEST_AUTH_EMAIL / TEST_AUTH_PASSWORD.');
  process.exit(2);
}

async function signIn() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data?.session) throw new Error('No session from Supabase');
  return data.session.access_token;
}

async function createBooking(token, payload) {
  const res = await fetch(`${serverBase}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) {}
  return { status: res.status, bodyText: text, body: json };
}

(async () => {
  try {
    console.log('Signing in...');
    const token = await signIn();
    console.log('Got token length:', token.length);

    // Schedule tomorrow at 09:00 for 1 hour
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const payload1 = {
      facilityId: 1,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      purpose: 'Booking facility 1 then 2 test',
      participants: 1,
    };

    const payload2 = {
      facilityId: 2,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      purpose: 'Booking facility 1 then 2 test',
      participants: 1,
    };

    console.log('Creating booking for facility 1');
    const r1 = await createBooking(token, payload1);
    console.log('Facility 1 result:', r1.status, r1.bodyText || r1.body);

    console.log('Creating booking for facility 2 (same time)');
    const r2 = await createBooking(token, payload2);
    console.log('Facility 2 result:', r2.status, r2.bodyText || r2.body);

    console.log('Now try concurrent booking attempt for facility 2 (parallel with another for facility 2)');
    const [c1, c2] = await Promise.all([createBooking(token, payload2), createBooking(token, payload2)]);
    console.log('Concurrent results for facility 2:');
    console.log('C1:', c1.status, c1.bodyText || c1.body);
    console.log('C2:', c2.status, c2.bodyText || c2.body);

    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
})();
