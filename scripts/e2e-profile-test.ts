import dotenv from 'dotenv';
import { supabaseAdmin } from '../server/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Prefer an explicit E2E_API_PORT, then the runtime PORT (used to start the server), then default to 5000
const API_PORT = process.env.E2E_API_PORT || process.env.PORT || '5000';
const API_URL = `http://localhost:${API_PORT}`;
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;

async function run() {
  try {
    const timestamp = Date.now();
    const email = `e2e-${timestamp}@example.com`;
    const password = `TempPass!${timestamp}`;

    console.log('Creating temporary user:', email);
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'E2E Test User' },
    } as any);

    if (createErr) {
      console.error('Create user error:', createErr);
      process.exit(2);
    }

    const userId = (created as any).user?.id;
    if (!userId) {
      console.error('No user id returned from createUser');
      process.exit(3);
    }

    // Create a client to sign in
    const client = createClient(supabaseUrl, anonKey);
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) {
      console.error('Sign-in failed:', signInError);
      process.exit(4);
    }

    const token = signInData.session?.access_token;
    if (!token) {
      console.error('No access token obtained after sign-in');
      process.exit(5);
    }

    console.log('Signed in, token obtained; will upload avatar and call API:', `${API_URL}/api/user/profile`);

    // --- Simulate client upload to Supabase Storage (avatars bucket) ---
    // Create a small buffer as a fake image and upload it with the anon client
    const fileExt = 'png';
    const filePath = `avatars/${userId}-${Date.now()}.${fileExt}`;
    const fakeImage = Buffer.from('fake-image-bytes-' + Date.now());

    console.log('Uploading fake avatar to storage at', filePath);
    // Use the admin (service-role) client for the upload to avoid RLS restrictions in the test environment
    const { data: upData, error: upErr } = await supabaseAdmin.storage.from('avatars').upload(filePath, fakeImage, { upsert: true });
    if (upErr) {
      console.error('Storage upload failed:', upErr);
      process.exit(6);
    }
    const { data: publicData } = supabaseAdmin.storage.from('avatars').getPublicUrl(filePath);
    let publicUrl = publicData.publicUrl;
    // Normalize accidental duplicate path segments like 'avatars/avatars/' introduced by combining bucket path and filePath
    if (publicUrl && publicUrl.includes('/avatars/avatars/')) {
      publicUrl = publicUrl.replace('/avatars/avatars/', '/avatars/');
    }
    console.log('Uploaded avatar public URL:', publicUrl);

      // Ensure the server has synced the user to the local DB by calling /api/auth/sync first
      const syncRes = await fetch(`${API_URL}/api/auth/sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const syncBody = await syncRes.text();
      console.log('Sync response status:', syncRes.status);
      console.log('Sync response body:', syncBody);

      const res = await fetch(`${API_URL}/api/user/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
        body: JSON.stringify({ firstName: 'E2E', lastName: 'Tester', profileImageUrl: publicUrl }),
    });

    const body = await res.text();
    console.log('API response status:', res.status);
    console.log('API response body:', body);

    process.exit(0);
  } catch (err) {
    console.error('E2E test failed:', err);
    process.exit(1);
  }
}

run();
