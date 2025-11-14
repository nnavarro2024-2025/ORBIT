import { NextResponse, type NextRequest } from "next/server";

import { requireActiveUser } from "@/server/auth";
import { storage } from "@/server/storage";
import { isBuildTime } from "@/server/build-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAllowedDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS || "uic.edu.ph,uic.edu")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  if (isBuildTime()) {
    // During build we cannot perform Supabase/auth/database calls. Return a safe placeholder.
    return NextResponse.json({ user: null, build: true }, { status: 200 });
  }

  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const supabaseUser = authResult.user;
    const userId = supabaseUser.id;
    const allowedDomains = getAllowedDomains();

    if (!supabaseUser.email) {
      console.error("[auth/sync] Authenticated user is missing email", supabaseUser);
      return NextResponse.json({ message: "Authenticated user is missing email" }, { status: 400 });
    }

    const email = (supabaseUser.email || "").toLowerCase();
    const domain = email.split("@")[1] || "";

    if (!domain || !allowedDomains.includes(domain)) {
      console.warn(`[auth/sync] Sign-in rejected for non-allowed domain: ${email}`);
      return NextResponse.json(
        { message: "Access restricted to UIC accounts only." },
        { status: 403 }
      );
    }

    let existingUser;
    try {
      existingUser = await storage.getUser(userId);
    } catch (dbError: any) {
      const errorMsg = dbError?.message || String(dbError);
      console.error("[auth/sync] Database getUser error:", errorMsg);
      
      // Check if it's a connection pool error
      if (errorMsg.includes("MaxClientsInSessionMode") || errorMsg.includes("connection pool")) {
        console.error("🚨 [auth/sync] Database connection pool exhausted. This usually means:");
        console.error("   - Too many concurrent connections");
        console.error("   - DB_POOL_MAX is too high for your Supabase plan");
        console.error("   - Consider reducing DB_POOL_MAX to 1 or using pgBouncer");
      }
      
      return NextResponse.json(
        { message: "Database connection error. Please try again." },
        { status: 503 } // Service Unavailable instead of 500
      );
    }

    const userRecord = {
      id: userId,
      email: supabaseUser.email ?? "",
      firstName: supabaseUser.user_metadata?.first_name ?? "",
      lastName: supabaseUser.user_metadata?.last_name ?? "",
      profileImageUrl: supabaseUser.user_metadata?.avatar_url ?? "",
      role: existingUser?.role ?? "student",
      status: existingUser?.status ?? "active",
      createdAt: existingUser?.createdAt ?? new Date(supabaseUser.created_at ?? Date.now()),
      updatedAt: new Date(),
    };

    let syncedUser;
    try {
      syncedUser = await storage.upsertUser(userRecord);
    } catch (dbError: any) {
      console.error("[auth/sync] Database upsertUser error:", dbError?.message || dbError);
      return NextResponse.json(
        { message: "Database upsert error: " + (dbError?.message || "Unknown error") },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: syncedUser }, { status: 200 });
  } catch (error: any) {
    console.error("[auth/sync] Unexpected error syncing user:", error?.message || error);
    return NextResponse.json({ 
      message: "Failed to sync user: " + (error?.message || "Unknown error") 
    }, { status: 500 });
  }
}
