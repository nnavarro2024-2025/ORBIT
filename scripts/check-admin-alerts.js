import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serverBase = process.env.SERVER_URL || 'http://localhost:5000';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(2);
}

const adminEmail = 'admin@uic.edu.ph';
const adminPassword = '123';

async function run() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('Signing in admin:', adminEmail);
  const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
  if (error) {
    console.error('Admin sign-in error:', error.message || error);
    process.exit(1);
  }
  const session = data.session;
  if (!session) {
    console.error('No session returned for admin');
    process.exit(1);
  }
  console.log('Admin signed in. Access token length:', session.access_token?.length || 0);

  // Print token claims via supabase get user
  const supabaseWithToken = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${session.access_token}` } } });
  const { data: userData, error: userErr } = await supabaseWithToken.auth.getUser();
  if (userErr) console.warn('getUser error:', userErr.message || userErr);
  console.log('Supabase user:', userData.user?.id, userData.user?.email, 'app_metadata:', userData.user?.app_metadata);

  // Call admin alerts endpoints (sanitized and all) for debugging
  const endpoints = ['/api/admin/alerts', '/api/admin/alerts/all'];
  for (const ep of endpoints) {
    const url = serverBase.replace(/\/$/, '') + ep;
    try {
      console.log('\nCalling', url);
      const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } });
      const text = await res.text();
      console.log('Status:', res.status);
      console.log('Headers:');
      try { console.log(JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2)); } catch (e) {}
      console.log('Response body:');
      console.log(text);
      if (!res.ok) console.warn('Non-OK response from', ep);
    } catch (e) {
      console.error('Error calling', url, e?.message || e);
    }
  }
}

run().catch(err => { console.error('Unexpected:', err); process.exit(1); });
