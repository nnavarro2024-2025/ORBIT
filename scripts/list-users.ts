import dotenv from 'dotenv';
import { supabaseAdmin } from '../server/supabaseAdmin';

// Minimal type for the properties we use from Supabase user objects
type SupabaseUser = {
  id: string;
  email?: string | null;
  [key: string]: any;
};

dotenv.config();

(async () => {
  try {
    const resp = await supabaseAdmin.auth.admin.listUsers();
  // Response retrieved from supabaseAdmin.auth.admin.listUsers()
    const { data, error } = resp as any;
    if (error) {
      console.error('Error listing users:', error);
      process.exit(2);
    }

    // Support multiple response shapes
    let users: any[] = [];
    if (!data) {
      console.log('No data in response');
      process.exit(0);
    }
    if (Array.isArray(data)) users = data;
    else if (Array.isArray((data as any).users)) users = (data as any).users;
    else if (Array.isArray((data as any).data)) users = (data as any).data;
    else if ((data as any).user) users = [(data as any).user];

    if (!users || users.length === 0) {
      console.log('No users found in response');
      process.exit(0);
    }

    console.log('Found users (first 10):');
    users.slice(0, 10).forEach((u: SupabaseUser) => {
      console.log(`- id: ${u.id}, email: ${u.email}`);
    });
  } catch (err) {
    console.error('Unexpected error listing users:', err);
    process.exit(3);
  }
})();
