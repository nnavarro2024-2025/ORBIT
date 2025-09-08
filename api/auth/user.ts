import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../server/db-vercel';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { createClient } from "@supabase/supabase-js";
import { User, JwtPayload } from '@supabase/supabase-js';

// ✅ This is the correct way to get the admin client for your backend.
// Note: This relies on your environment variables being set correctly on Vercel.
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 1. Get the JWT token from the authorization header
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }

    // 2. Verify the JWT token using the Supabase admin client
    const { data: jwtData, error: jwtError } = await (supabaseAdmin.auth.admin as any).verifyJWT(token);
    if (jwtError) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    // 3. Fetch the user's data from your database using the verified JWT subject
    const userId = jwtData.sub;
    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 4. Return the user profile
    return res.status(200).json(user);

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}