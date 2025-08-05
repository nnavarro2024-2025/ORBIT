// src/server/supabaseAuth.ts
import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Missing token" });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }

  console.log("✅ [AUTH] User authenticated:", user);

  // 👇 Attach user in a way that works with your current routes
  (req as any).user = {
    claims: { sub: user.id }, // This keeps compatibility with routes.ts
    ...user,
  };

  next();
}

export async function setupAuth() {
  // No setup needed for Supabase Auth
}
