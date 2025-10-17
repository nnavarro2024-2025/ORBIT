import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serverBase = process.env.SERVER_URL || 'http://localhost:5000';
const bookingId = process.env.CANCEL_BOOKING_ID || '2b289bb9-dda7-48c3-a53c-066002a2ae13';

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
  console.log('Signing in as user', userEmail);
  const token = await signIn(userEmail, userPass);
  if (!token) {
    console.error('Failed to obtain auth token');
    process.exit(2);
  }

  const url = serverBase.replace(/\/$/, '') + `/api/bookings/${bookingId}/cancel`;
  console.log('Calling cancel endpoint for booking', bookingId);
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  const text = await res.text();
  console.log('Cancel response', res.status, text);
  if (res.status >= 200 && res.status < 300) {
    console.log('Cancellation successful');
    process.exit(0);
  }
  process.exit(1);
}

run().catch(err => { console.error('Error cancelling booking:', err); process.exit(1); });
