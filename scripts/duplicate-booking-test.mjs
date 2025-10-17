import 'dotenv/config';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

// Simple duplicate booking tester
// Requires env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, TEST_AUTH_EMAIL, TEST_AUTH_PASSWORD, SERVER_URL

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

  // Schedule for tomorrow at 09:00 local time to ensure it's within school hours
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour

    const payload = {
      facilityId: 1,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      purpose: 'Duplicate booking test',
      participants: 1,
    };

    console.log('Creating initial booking (should succeed)');
    const first = await createBooking(token, payload);
    console.log('First:', first.status, first.bodyText || first.body);

    console.log('Attempting immediate overlapping booking (should be blocked)');
    // immediate second booking
    const second = await createBooking(token, payload);
    console.log('Second:', second.status, second.bodyText || second.body);

    console.log('Now attempting concurrent parallel bookings to test races');
    const concurrentPayload1 = { ...payload };
    const concurrentPayload2 = { ...payload };
    // Run two in parallel
    const [r1, r2] = await Promise.all([createBooking(token, concurrentPayload1), createBooking(token, concurrentPayload2)]);
    console.log('Concurrent results:');
    console.log('R1:', r1.status, r1.bodyText || r1.body);
    console.log('R2:', r2.status, r2.bodyText || r2.body);

    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
})();
