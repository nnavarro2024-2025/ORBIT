// src/server/supabaseAuth.ts
import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // use server key

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      console.warn("🚨 [AUTH] Missing token");
      return res.status(401).json({ message: "Unauthorized: Missing token" });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.warn("🚨 [AUTH] Invalid token:", error?.message);
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    console.log("✅ [AUTH] User authenticated:", user.id);

    (req as any).user = {
      claims: { sub: user.id },
      ...user,
    };

    next();
  } catch (err) {
    console.error("🚨 [AUTH] Unexpected error:", err);
    return res.status(500).json({ message: "Server error during authentication" });
  }
}
