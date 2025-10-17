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

function extractAllJsonBlocks(s) {
  try {
    const matches = Array.from(s.matchAll(/(\{[\s\S]*?\})/g)).map(m => m[1]);
    const parsed = [];
    for (const raw of matches) {
      let block = raw;
      // attempt to unescape common escaped sequences (if message contains stringified JSON)
      try {
        block = block.replace(/\\"/g, '"').replace(/\\n/g, '\n');
      } catch (e) {}
      try {
        parsed.push(JSON.parse(block));
        continue;
      } catch (e) {
        // fallback: extract quoted key:value pairs into an object
        try {
          const obj = {};
          const re = /"([^"}]+)"\s*:\s*"([^"}]+)"/g;
          let m;
          while ((m = re.exec(block)) !== null) {
            obj[m[1]] = m[2];
          }
          if (Object.keys(obj).length > 0) parsed.push(obj);
        } catch (ee) { /* ignore */ }
      }
    }
    return parsed;
  } catch (e) { return []; }
}

function humanSummaryFromStructured(note) {
  try {
    if (!note) return null;
    const parts = [];
    if (note.items) {
      if (Array.isArray(note.items)) parts.push(note.items.join(', '));
      else if (typeof note.items === 'object') parts.push(Object.entries(note.items).map(([k,v]) => `${k}: ${v}`).join('\n'));
    }
    if (note.others) parts.push(`Other: ${note.others}`);
    return parts.join('\n\n');
  } catch (e) { return null; }
}

async function run() {
  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@uic.edu.ph';
  const adminPass = process.env.TEST_ADMIN_PASSWORD || '123';
  const token = await signIn(adminEmail, adminPass);
  console.log('Signed in as admin. Token length:', token?.length || 0);

  const allRes = await fetch(serverBase + '/api/admin/alerts/all', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  if (allRes.status !== 200) { console.error('Failed to fetch alerts', allRes.status); process.exit(1); }
  const alerts = await allRes.json();
  let updated = 0;
  for (const a of alerts) {
    try {
      if (!a || !a.message) continue;
    const parsedBlocks = extractAllJsonBlocks(a.message || '');
    if (!parsedBlocks || parsedBlocks.length === 0) continue;
    // Merge human summaries for all parsed blocks
    const humans = parsedBlocks.map(p => humanSummaryFromStructured(p)).filter(Boolean);
    if (humans.length === 0) continue;
    // Replace all JSON blocks with the joined human summary
    let newMsg = a.message;
    newMsg = newMsg.replace(/(\{[\s\S]*?\})/g, '\n\n' + humans.join('\n\n'));
    const upd = await fetch(serverBase + `/api/admin/alerts/${a.id}/updateMessage`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: newMsg }) });
    if (upd.status === 200) { updated++; console.log('Updated alert', a.id); }
    } catch (e) { console.warn('Failed to process alert', a.id, e); }
  }
  console.log('Updated', updated, 'alerts');
}

run().catch(e => { console.error(e); process.exit(1); });
