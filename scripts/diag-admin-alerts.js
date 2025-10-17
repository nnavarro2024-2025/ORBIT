import 'dotenv/config';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

// Minimal ESM arg parsing
const rawArgs = process.argv.slice(2);
function parseArgs(arr) {
  const out = {};
  for (let i = 0; i < arr.length; i++) {
    const a = arr[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true;
      if (val !== true) i++;
      out[key] = val;
    }
  }
  return out;
}

const args = parseArgs(rawArgs);
const server = args['server-url'] || args.server || 'http://localhost:5000';
const email = args['email'] || 'admin@uic.edu.ph';
const password = args['password'] || '123';

async function signInAndGetAlerts() {
  try {
    console.log('Signing in via Supabase as', email);
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase env vars missing. Set SUPABASE_URL and SUPABASE_ANON_KEY or VITE_/NEXT_PUBLIC_ variants.');
      process.exit(2);
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data || !data.session) {
      console.error('Supabase sign-in failed', error || data);
      process.exit(1);
    }
    const token = data.session.access_token;
    console.log('Signed in, token length:', String(token).length);

    const endpoints = ['/api/admin/alerts', '/api/admin/alerts/all'];
    for (const ep of endpoints) {
      console.log('Fetching', ep);
      const alertsRes = await fetch(`${server}${ep}`, { headers: { Authorization: `Bearer ${token}` } });
      const text = await alertsRes.text();
      if (!alertsRes.ok) {
        console.error(`${ep} returned`, alertsRes.status, text);
      } else {
        try { const json = JSON.parse(text); console.log(`${ep} ->`, JSON.stringify(json, null, 2)); }
        catch (e) { console.log(`${ep} ->`, text); }
      }
    }
  } catch (e) {
    console.error('Diagnostic script error:', e && e.message ? e.message : e);
    process.exit(1);
  }
}

signInAndGetAlerts();
