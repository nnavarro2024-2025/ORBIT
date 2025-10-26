// Usage: node scripts/reset-faculty-password.js
// This script resets the password for faculty@uic.edu.ph to '123' using Supabase Admin API.
// You must set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as environment variables.

const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_EMAIL = 'faculty@uic.edu.ph';
const NEW_PASSWORD = '123';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

async function resetPassword(email, newPassword) {
  // Get all users
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'GET',
    headers: {
      apiKey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  const users = await res.json();
  const user = users.find(u => u.email === email);
  if (!user) {
    console.error('User not found:', email);
    process.exit(1);
  }
  // Update password
  const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers: {
      apiKey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: newPassword }),
  });
  if (updateRes.ok) {
    console.log('Password updated for', email);
  } else {
    const err = await updateRes.text();
    console.error('Failed to update password:', err);
    process.exit(1);
  }
}

resetPassword(TARGET_EMAIL, NEW_PASSWORD);