import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  process.exit(2);
}

const args = process.argv.slice(2);
let email = process.env.TEST_AUTH_EMAIL || 'test@uic.edu.ph';
let password = process.env.TEST_AUTH_PASSWORD || '123';
let serverCheckUrl = undefined;
let adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@uic.edu.ph';
let adminPassword = process.env.TEST_ADMIN_PASSWORD || '123';

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--email' && args[i + 1]) { email = args[i + 1]; i++; }
  else if (a === '--password' && args[i + 1]) { password = args[i + 1]; i++; }
  else if (a === '--server-url' && args[i + 1]) { serverCheckUrl = args[i + 1]; i++; }
  else if (a === '--admin-email' && args[i + 1]) { adminEmail = args[i + 1]; i++; }
  else if (a === '--admin-password' && args[i + 1]) { adminPassword = args[i + 1]; i++; }
  else if (a === '--help' || a === '-h') {
    console.log('Usage: node scripts/auth-test.js [--email EMAIL] [--password PWD] [--server-url URL] [--admin-email EMAIL] [--admin-password PWD]');
    process.exit(0);
  }
}

async function signIn(email, password) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

async function fetchWithAuth(url, token, opts = {}) {
  const headers = Object.assign({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, opts.headers || {});
  return await fetch(url, Object.assign({}, opts, { headers }));
}

function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

// Compute next valid start time within library hours (7:30 - 19:00) that is at least minLeadMs from now
function computeNextValidStart(durationMs, minLeadMs = 60 * 60 * 1000) {
  const openHour = 7; const openMin = 30; // 7:30
  const closeHour = 19; const closeMin = 0; // 19:00
  const now = new Date();
  const earliest = new Date(now.getTime() + minLeadMs);

  // Try slots for the next 7 days at 15-minute increments between open and close-duration
  for (let d = 0; d < 7; d++) {
    const day = new Date(earliest.getTime());
    day.setDate(earliest.getDate() + d);
    day.setHours(openHour, openMin, 0, 0);
    const dayOpen = new Date(day.getTime());
    const dayClose = new Date(day.getTime()); dayClose.setHours(closeHour, closeMin, 0, 0);

    for (let t = 0; t < (24 * 4); t++) { // 15-min increments
      const candidate = new Date(dayOpen.getTime() + t * 15 * 60 * 1000);
      const candidateEnd = new Date(candidate.getTime() + durationMs);
      if (candidate < earliest) continue;
      if (candidateEnd > dayClose) break; // no more slots this day
      return { start: candidate.toISOString(), end: candidateEnd.toISOString() };
    }
  }
  // Fallback: schedule 2 days from now at 9:00 for the duration
  const fallbackStart = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  fallbackStart.setHours(9, 0, 0, 0);
  return { start: fallbackStart.toISOString(), end: new Date(fallbackStart.getTime() + durationMs).toISOString() };
}

async function tryCreateBooking(session, serverBase, payload, attemptInfo = {}) {
  let token = session.access_token;
  let attempt = attemptInfo.attempt || 1;
  let maxAttempts = 8;

  const url = serverBase.replace(/\/$/, '') + '/api/bookings';

  while (attempt <= maxAttempts) {
    try {
      console.log(`Attempt ${attempt} -> POST ${url}`);
      const res = await fetchWithAuth(url, token, { method: 'POST', body: JSON.stringify(payload) });
      const text = await res.text();
      if (res.ok) {
        console.log(`Booking POST ${res.status}:`, text);
        try { return JSON.parse(text); } catch { return text; }
      }

      // parse body if possible
      let body = null;
      try { body = JSON.parse(text); } catch { body = { text }; }

      const msg = (body?.message || body?.error || body?.msg || text || '').toString().toLowerCase();

      // Common error: booking too soon
      if (/too soon|bookingtoosoon|start time/i.test(msg) || (msg.includes('starttime') && msg.includes('too'))) {
        console.log('Detected BookingTooSoon or start time too soon. Choosing next valid slot within library hours and retrying.');
        const duration = new Date(payload.endTime).getTime() - new Date(payload.startTime).getTime();
        const next = computeNextValidStart(duration, 60 * 60 * 1000);
        payload.startTime = next.start;
        payload.endTime = next.end;
        attempt++;
        await wait(800);
        continue;
      }

      // Handle user already has active booking -> try to cancel it and retry once
      if (res.status === 409 && body?.error && String(body.error).toLowerCase().includes('userhasactivebooking')) {
        try {
          const active = body.activeBookings && body.activeBookings[0];
          const activeId = active?.id || active?.bookingId || active?.id;
          if (activeId) {
            console.log('Found active booking id:', activeId, '-> attempting to cancel it automatically');
            const cancelUrl = serverBase.replace(/\/$/, '') + `/api/bookings/${activeId}/cancel`;
            const cancelRes = await fetchWithAuth(cancelUrl, token, { method: 'POST' });
            const cancelText = await cancelRes.text();
            console.log(`Cancel ${cancelRes.status}:`, cancelText);
            if (cancelRes.ok) {
              // after cancelling, pick a next valid slot within library hours and reset attempt counter
              const durationMs = new Date(payload.endTime).getTime() - new Date(payload.startTime).getTime();
              const nextSlot = computeNextValidStart(durationMs, 30 * 60 * 1000);
              payload.startTime = nextSlot.start;
              payload.endTime = nextSlot.end;
              attempt = 1;
              await wait(600);
              continue;
            }
          }
        } catch (e) {
          console.warn('Auto-cancel of active booking failed:', e?.message || e);
        }
      }

      // Common error: invalid facility id
      if (/facility|facilityid|invalid facility|no such facility/i.test(msg)) {
        console.log('Detected invalid facility. Fetching available facilities to pick a valid id and retry.');
        try {
          const facRes = await fetchWithAuth(serverBase.replace(/\/$/, '') + '/api/facilities', token, { method: 'GET' });
          const facText = await facRes.text();
          const facJson = JSON.parse(facText);
          if (Array.isArray(facJson) && facJson.length > 0) {
            payload.facilityId = facJson[0].id;
            console.log('Using facilityId =', payload.facilityId);
            attempt++;
            await wait(500);
            continue;
          }
        } catch (e) {
          console.warn('Could not fetch facilities to auto-fix facilityId:', e?.message || e);
        }
      }

      // Unauthorized - try reauth once
      if (res.status === 401 || /unauthorized|invalid token|not authenticated/i.test(msg)) {
        if (attemptInfo.reauthTried) {
          console.warn('Already tried reauth; aborting.');
          throw new Error(`Unauthorized after reauth attempt: ${text}`);
        }
        console.log('Unauthorized. Attempting to re-authenticate and retry once.');
        const newSession = await signIn(attemptInfo.email || process.env.TEST_AUTH_EMAIL || email, attemptInfo.password || process.env.TEST_AUTH_PASSWORD || password);
        token = newSession.access_token;
        attemptInfo.reauthTried = true;
        attempt++;
        continue;
      }

      // If none of the heuristics matched, throw with body text
      throw new Error(`Booking failed (status ${res.status}): ${text}`);
    } catch (err) {
      // If it's an Error from signIn or network, decide whether to retry
      console.error('Error while creating booking attempt:', err?.message || err);
      if (attempt < maxAttempts) {
        attempt++;
        console.log('Retrying after backoff...');
        await wait(500 * attempt);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Exceeded max booking attempts');
}

async function run() {
  if (!email || !password) {
    console.error('Missing credentials. Provide --email/--password or set TEST_AUTH_EMAIL/TEST_AUTH_PASSWORD');
    process.exit(2);
  }

  console.log(`Signing in as ${email}`);
  let session;
  try { session = await signIn(email, password); }
  catch (e) { console.error('Sign-in error:', e?.message || e); process.exit(1); }

  if (!session) { console.error('No session returned.'); process.exit(1); }
  console.log('Successfully signed in.');

  const serverBase = serverCheckUrl || process.env.SERVER_URL || 'http://localhost:5000';

  // Build booking payload
  let start = new Date(Date.now() + 90 * 60 * 1000);
  let end = new Date(start.getTime() + 60 * 60 * 1000);
  const bookingPayload = {
    facilityId: process.env.TEST_FACILITY_ID ? (isNaN(Number(process.env.TEST_FACILITY_ID)) ? process.env.TEST_FACILITY_ID : Number(process.env.TEST_FACILITY_ID)) : 1,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    purpose: 'Automated test booking - equipment',
    participants: 2,
    equipment: { items: ['projector', 'hdmi'], others: 'Wireless microphone' }
  };

  try {
    const created = await tryCreateBooking(session, serverBase, bookingPayload, { attempt: 1, email, password });
    console.log('Booking creation result:', created);

    // If booking created and admin creds available, try marking needs
    let createdBookingId = created?.id || created?.booking?.id || (created?.data && created.data.id) || null;
    if (createdBookingId && adminEmail && adminPassword) {
      console.log('Signing in as admin to mark needs...');
      try {
        const adminSession = await signIn(adminEmail, adminPassword);
        if (adminSession?.access_token) {
          const needsUrl = serverBase.replace(/\/$/, '') + `/api/admin/bookings/${createdBookingId}/needs`;
          const resp = await fetchWithAuth(needsUrl, adminSession.access_token, { method: 'POST', body: JSON.stringify({ status: 'prepared', note: 'Prepared by automated test' }) });
          const txt = await resp.text();
          console.log(`Admin needs POST ${resp.status}:`, txt);
        }
      } catch (e) { console.warn('Admin flow failed:', e?.message || e); }
    }
  } catch (err) {
    console.error('Final error creating booking or admin flow:', err?.message || err);
    process.exit(1);
  }

  process.exit(0);
}

run().catch((err) => { console.error('Unexpected error:', err); process.exit(1); });
