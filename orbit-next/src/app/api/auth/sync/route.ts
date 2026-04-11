import { randomUUID } from "crypto";

import { NextResponse, type NextRequest } from "next/server";

import { requireActiveUser } from "@/server/core";
import { storage } from "@/server/core";
import { hasPasswordProvider, inferRoleFromUicEmail } from "@/server/core";
import { isBuildTime } from "@/server/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAllowedDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS || "uic.edu.ph,uic.edu")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function extractNamesFromMetadata(metadata: any): { firstName?: string; lastName?: string } {
  const first = String(metadata?.first_name ?? metadata?.firstName ?? "").trim();
  const last = String(metadata?.last_name ?? metadata?.lastName ?? "").trim();

  if (first || last) {
    return { firstName: first || undefined, lastName: last || undefined };
  }

  const fullName = String(metadata?.full_name ?? metadata?.name ?? "").trim();
  if (!fullName) {
    return {};
  }

  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0] };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.slice(-1).join(""),
  };
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

    const inferredRole = inferRoleFromUicEmail(email);
    const extractedNames = extractNamesFromMetadata(supabaseUser.user_metadata || {});
    const userRecord = {
      id: userId,
      email: supabaseUser.email ?? "",
      firstName: extractedNames.firstName ?? existingUser?.firstName ?? "",
      lastName: extractedNames.lastName ?? existingUser?.lastName ?? "",
      profileImageUrl: supabaseUser.user_metadata?.avatar_url ?? existingUser?.profileImageUrl ?? "",
      role: existingUser?.role ?? inferredRole,
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

    // Send welcome notification for new users
    if (!existingUser) {
      await storage.createSystemAlert({
        id: randomUUID(),
        type: "user",
        severity: "low",
        title: "Welcome to ORBIT",
        message: "Welcome! Thank you for choosing ORBIT. You can now browse and book facilities.",
        userId,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).catch((err) => {
        console.warn("[auth/sync] Failed to create welcome notification", err);
      });
    }

    return NextResponse.json(
      {
        user: syncedUser,
        requiresPasswordSetup: !hasPasswordProvider(supabaseUser),
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[auth/sync] Unexpected error syncing user:", error?.message || error);
    return NextResponse.json({ 
      message: "Failed to sync user: " + (error?.message || "Unknown error") 
    }, { status: 500 });
  }
}
