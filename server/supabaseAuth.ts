// src/server/supabaseAuth.ts
import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { storage } from "./storage";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

  // Only log errors in development
  if (error && process.env.NODE_ENV === 'development') {
    console.error("❌ [isAuthenticated] Supabase getUser error:", error.message);
    if (error.message.includes("JWT expired")) {
      console.error("🚨 [isAuthenticated] JWT token has expired!");
    }
  }

  if (error || !user) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }

  // 👇 Attach user in a way that works with your current routes
  (req as any).user = {
    claims: { sub: user.id }, // This keeps compatibility with routes.ts
    ...user,
  };

  next();
}

// Enhanced middleware that also checks for banned status
export async function isAuthenticatedAndActive(req: Request, res: Response, next: NextFunction) {
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

  // Check user status in database
  try {
    const userRecord = await storage.getUser(user.id);
    if (!userRecord) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    if (userRecord.status === "banned") {
      return res.status(403).json({ message: "Access denied: User is banned" });
    }

    if (userRecord.status === "suspended") {
      return res.status(403).json({ message: "Access denied: User is suspended" });
    }

    // Attach user with status info
    (req as any).user = {
      claims: { sub: user.id },
      userRecord,
      ...user,
    };

    next();
  } catch (dbError) {
    console.error("Error checking user status:", dbError);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function setupAuth() {
  // No setup needed for Supabase Auth
}
