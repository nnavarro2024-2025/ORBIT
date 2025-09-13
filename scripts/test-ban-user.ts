import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../server/supabaseAdmin';
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';

const supabaseUrlEnv = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKeyEnv = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serverBase = process.env.SERVER_BASE_URL || 'http://localhost:5000';

if (!supabaseUrlEnv || !anonKeyEnv) {
  console.error('Missing Supabase environment variables. Check .env');
  process.exit(1);
}

// Narrow to string for TypeScript (we validated above at runtime)
const supabaseUrl: string = supabaseUrlEnv;
const anonKey: string = anonKeyEnv;

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
      console.error('[ensureUser] Error creating user', email, error.message);
      throw error;
    }
  } catch (e: any) {
    if (e && e.message && e.message.includes('already exists')) {
      // fine
    } else if (e && e.error_description && e.error_description.includes('already exists')) {
      // fine
    } else {
      console.warn('[ensureUser] createUser threw:', e?.message || e);
    }
  }
}

async function signInGetToken(email: string, password: string) {
  const client = createClient(supabaseUrl, anonKey);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const token = (data as any)?.session?.access_token;
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
  console.log('[ban-test] Starting ban wiring test');

  const adminEmail = `ban-admin+${randomUUID()}@example.com`;
  const userEmail = `ban-target+${randomUUID()}@example.com`;
  const password = 'Test123!';

  console.log('[ban-test] Ensuring users exist in Supabase');
  await ensureUser(adminEmail, password, true);
  await ensureUser(userEmail, password, false);

  console.log('[ban-test] Signing in');
  const adminToken = await signInGetToken(adminEmail, password);
  const userToken = await signInGetToken(userEmail, password);

  console.log('[ban-test] Syncing user profiles with server storage');
  await callApi('/api/auth/sync', 'POST', adminToken);
  await callApi('/api/auth/sync', 'POST', userToken);

  // Fetch user record from server to get userId
  const me = await callApi('/api/auth/user', 'GET', userToken);
  console.log('[ban-test] /api/auth/user (target) status', me.status, me.body?.id ? 'has id' : JSON.stringify(me.body));
  const targetId = me.body?.id;
  if (!targetId) {
    console.error('[ban-test] Failed to get target user id from /api/auth/user; aborting');
    process.exit(1);
  }

  console.log('[ban-test] Admin issuing ban on target user id', targetId);
  const banResp = await callApi(`/api/admin/users/${targetId}/ban`, 'POST', adminToken, { reason: 'Test ban via script', duration: 'permanent' });
  console.log('[ban-test] Ban response', banResp.status, banResp.body);
  if (banResp.status !== 200) {
    console.error('[ban-test] Ban endpoint failed. Make sure server is running and admin token has admin role.');
    process.exit(1);
  }

  console.log('[ban-test] Waiting briefly then attempting protected call as banned user');
  await new Promise(r => setTimeout(r, 500));

  const protectedCall = await callApi('/api/bookings', 'GET', userToken);
  console.log('[ban-test] Protected call as banned user status', protectedCall.status, protectedCall.body);

  if (protectedCall.status === 403) {
    console.log('[ban-test] Success: banned user was denied access (403) as expected');
  } else {
    console.warn('[ban-test] Unexpected response for banned user protected call; expected 403');
  }

  console.log('[ban-test] Fetching admin view of banned users (admin-only)');
  const adminBannedList = await callApi('/api/admin/users', 'GET', adminToken);
  console.log('[ban-test] Admin users list status', adminBannedList.status, (adminBannedList.body || []).length);

  console.log('[ban-test] Done');
}

run().catch(err => { console.error('[ban-test] Error', err); process.exit(1); });
