import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../server/supabaseAdmin';
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serverBase = process.env.SERVER_BASE_URL || 'http://localhost:5000';

async function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

async function ensureUser(email: string, password: string, isAdmin = false) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: email },
      app_metadata: isAdmin ? { role: 'admin' } : undefined,
    } as any);
    if (error && !error.message.includes('already exists')) {
      console.error('[auth-test] Error creating user', email, error.message);
      throw error;
    }
  } catch (e: any) {
    // ignore already exists
    if (e && e.message && e.message.includes('already exists')) {
      // fine
    } else if (e && e.error_description && e.error_description.includes('already exists')) {
      // fine
    } else {
      // If supabaseAdmin client throws for some reason, rethrow
      console.warn('[auth-test] createUser threw:', e?.message || e);
    }
  }
}

async function signInGetToken(email: string, password: string) {
  const client = createClient(supabaseUrl, anonKey);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  // data.session may be null in some flows, but we expect a session
  const token = (data as any).session?.access_token;
  if (!token) throw new Error('No access token returned for ' + email);
  return token;
}

async function callApi(path: string, method = 'GET', token?: string, body?: any) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${serverBase}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = text; }
  return { status: res.status, body: json };
}

async function run() {
  console.log('[auth-test] Starting authenticated end-to-end test');

  // create unique test users
  const userAEmail = `test-a+${randomUUID()}@example.com`;
  const userBEmail = `test-b+${randomUUID()}@example.com`;
  const adminEmail = `test-admin+${randomUUID()}@example.com`;
  const password = 'Test123!';

  console.log('[auth-test] Creating Supabase users');
  await ensureUser(userAEmail, password, false);
  await ensureUser(userBEmail, password, false);
  await ensureUser(adminEmail, password, true);

  console.log('[auth-test] Signing in users');
  const tokenA = await signInGetToken(userAEmail, password);
  const tokenB = await signInGetToken(userBEmail, password);
  const tokenAdmin = await signInGetToken(adminEmail, password);

  // Sync profiles with server storage
  console.log('[auth-test] Syncing users with server storage');
  await callApi('/api/auth/sync', 'POST', tokenA);
  await callApi('/api/auth/sync', 'POST', tokenB);
  await callApi('/api/auth/sync', 'POST', tokenAdmin);

  // Prepare booking times: start at tomorrow 10:00 - 11:00, but retry forward days if there's an approved conflict
  const now = new Date();
  const baseDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0, 0);

  async function tryCreateBooking(token: string, facilityId: number, startBase: Date, durationMs: number, purpose: string, maxAttempts = 7) {
    for (let i = 0; i < maxAttempts; i++) {
      const attemptStart = new Date(startBase.getTime() + i * 24 * 60 * 60 * 1000);
      const attemptEnd = new Date(attemptStart.getTime() + durationMs);
      const resp = await callApi('/api/bookings', 'POST', token, {
        facilityId,
        startTime: attemptStart.toISOString(),
        endTime: attemptEnd.toISOString(),
        participants: 2,
        purpose,
      });

      console.log(`[auth-test] tryCreateBooking attempt ${i} status`, resp.status);
      if (resp.status === 200) {
        return { booking: resp.body, start: attemptStart, end: attemptEnd };
      }

      if (resp.status === 409) {
        // Conflict with an approved booking; try next day
        console.log('[auth-test] Conflict on attempt, trying next day');
        continue;
      }

      throw new Error('Failed to create booking: ' + JSON.stringify(resp));
    }
    throw new Error('Unable to find free slot after retries');
  }

  const durationMs = 60 * 60 * 1000; // 1 hour
  console.log('[auth-test] Creating booking A as user A (with retries if needed)');
  const { booking: bookingA, start, end } = await tryCreateBooking(tokenA, 1, baseDay, durationMs, 'Auth test A');

  console.log('[auth-test] Waiting 10s before creating booking B');
  await sleep(10000);

  console.log('[auth-test] Creating booking B as user B for the same slot');
  const createB = await callApi('/api/bookings', 'POST', tokenB, {
    facilityId: 1,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    participants: 3,
    purpose: 'Auth test B',
  });
  console.log('[auth-test] createB status', createB.status, createB.body);
  if (createB.status !== 200) throw new Error('Failed to create booking B: ' + JSON.stringify(createB));
  const bookingB = createB.body;

  console.log('[auth-test] Approving booking A as admin');
  const approve = await callApi(`/api/bookings/${bookingA.id}/approve`, 'POST', tokenAdmin, { adminResponse: 'Approved via test' });
  console.log('[auth-test] approve status', approve.status, approve.body);
  if (approve.status !== 200) throw new Error('Failed to approve booking A: ' + JSON.stringify(approve));

  // Wait a short moment for DB changes
  await sleep(500);

  console.log('[auth-test] Fetching booking B as user B to check status');
  const userBBookings = await callApi('/api/bookings', 'GET', tokenB);
  console.log('[auth-test] userB bookings', userBBookings.status, userBBookings.body);

  console.log('[auth-test] Fetching notifications for user B');
  const notifications = await callApi('/api/notifications', 'GET', tokenB);
  console.log('[auth-test] notifications', notifications.status, notifications.body?.slice?.(0,10));

  console.log('[auth-test] Done');
}

run().catch(err => {
  console.error('[auth-test] Error', err);
  process.exit(1);
});
