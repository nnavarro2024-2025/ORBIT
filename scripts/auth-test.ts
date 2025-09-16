import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import fetch from 'node-fetch';

// Load env from repo root .env
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  process.exit(2);
}

// CLI parsing for known flags
const args = process.argv.slice(2);
// Default test credentials provided by user
let email = process.env.TEST_AUTH_EMAIL || 'test@uic.edu.ph';
let password = process.env.TEST_AUTH_PASSWORD || '123';
let serverCheckUrl: string | undefined;
// Admin credentials (used to call admin endpoint if present)
let adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@uic.edu.ph';
let adminPassword = process.env.TEST_ADMIN_PASSWORD || '123';
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--email' && args[i + 1]) {
    email = args[i + 1];
    i++;
  } else if (a === '--password' && args[i + 1]) {
    password = args[i + 1];
    i++;
  } else if (a === '--server-url' && args[i + 1]) {
    serverCheckUrl = args[i + 1];
    i++;
  } else if (a === '--admin-email' && args[i + 1]) {
    adminEmail = args[i + 1];
    i++;
  } else if (a === '--admin-password' && args[i + 1]) {
    adminPassword = args[i + 1];
    i++;
  }
}

// Non-interactive defaults are used; pass flags to override if needed.

async function run() {
  // Use defaults if not provided; do not prompt interactively
  if (!email || !password) {
    console.error('\nMissing credentials. Provide --email/--password or set TEST_AUTH_EMAIL/TEST_AUTH_PASSWORD in .env');
    process.exit(2);
  }

  const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

  console.log(`\nSigning in as ${email}`);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('Sign-in error:', error.message || JSON.stringify(error));
    process.exit(1);
  }

  const session = data.session;
  if (!session) {
    console.error('No session returned.');
    process.exit(1);
  }

  console.log('Successfully signed in. Access token length:', session.access_token?.length || 0);

  // verify token by calling getUser with the auth header
  const supabaseWithToken = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });

  const { data: userData, error: userError } = await supabaseWithToken.auth.getUser();
  if (userError) {
    console.error('getUser error:', userError.message || JSON.stringify(userError));
    process.exit(1);
  }

  console.log('User verified:', userData.user?.id);
  console.log('Email:', userData.user?.email);

  // Optional: call a server endpoint to test server-side middleware. If --server-url is
  // not provided, try common local dev ports (5173 then 5174).
  const defaultCandidates = ['http://localhost:5173', 'http://localhost:5174'];
  const candidates = serverCheckUrl ? [serverCheckUrl] : defaultCandidates;

  for (const url of candidates) {
    try {
      console.log(`Calling server endpoint ${url} with Authorization header...`);
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      });

      const text = await res.text();
      console.log(`Server responded from ${url} (${res.status}):`);
      console.log(text);

      // stop after the first successful call
      break;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error(`Error calling ${url}:`, msg);
      // try the next candidate
    }
  }

  // --- Create a booking with equipment to test the API ---
  // Build a sensible booking payload (start time +1h, 1 hour duration)
  try {
  const serverBase = serverCheckUrl || process.env.SERVER_URL || 'http://localhost:5000';
    const bookingUrl = serverBase.replace(/\/$/, '') + '/api/bookings';
  const start = new Date(Date.now() + 90 * 60 * 1000); // +90 minutes to avoid BookingTooSoon
  const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour duration
    const bookingPayload = {
      facilityId: 1,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      purpose: 'E2E test booking - equipment',
      participants: 2,
      equipment: {
        items: ['projector', 'hdmi'],
        others: 'Wireless microphone'
      }
    };

    console.log('\nPosting test booking to', bookingUrl);
    const bookRes = await fetch(bookingUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingPayload),
    });

    const bookText = await bookRes.text();
    console.log(`Booking POST ${bookRes.status}:`, bookText);

    // If booking created and returned JSON with id, optionally call admin needs endpoint if admin creds provided
    let createdBookingId: string | undefined;
    try {
      const parsed = JSON.parse(bookText);
      createdBookingId = parsed?.id || parsed?.booking?.id || parsed?.data?.id;
    } catch (_e) {
      // ignore parse errors
    }

    // If user passed --admin-email/--admin-password environment or flags, attempt admin flow
    if (createdBookingId && adminEmail && adminPassword) {
      console.log('\nSigning in as admin to mark needs...');
      const adminSupabase = createClient(supabaseUrl!, supabaseAnonKey!);
      const { data: adminData, error: adminErr } = await adminSupabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
      if (adminErr) {
        console.error('Admin sign-in error:', adminErr.message || JSON.stringify(adminErr));
      } else {
        const adminToken = adminData.session?.access_token;
        if (adminToken) {
          const needsUrl = serverBase.replace(/\/$/, '') + `/api/admin/bookings/${createdBookingId}/needs`;
          console.log('Calling admin needs endpoint:', needsUrl);
          const needsRes = await fetch(needsUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'prepared', note: 'Prepared by automated test' }),
          });
          const needsText = await needsRes.text();
          console.log(`Admin needs POST ${needsRes.status}:`, needsText);
        }
      }
    }
  } catch (err: unknown) {
    console.error('Error creating booking or admin flow:', err instanceof Error ? err.message : JSON.stringify(err));
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
