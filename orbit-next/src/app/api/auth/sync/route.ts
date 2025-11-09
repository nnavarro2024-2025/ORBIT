import { NextResponse, type NextRequest } from "next/server";

import { requireActiveUser } from "@/server/auth";
import { storage } from "@/server/storage";
import { supabaseAdmin } from "@/server/supabaseAdmin";

function getAllowedDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS || "uic.edu.ph,uic.edu")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const userId = authResult.user.id;
    const allowedDomains = getAllowedDomains();

    const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (adminError || !adminUser?.user) {
      console.error("[auth/sync] Failed to fetch user from Supabase Admin:", adminError?.message || "Unknown error");
      return NextResponse.json(
        { message: "User not found in authentication system." },
        { status: 404 }
      );
    }

    const supabaseUser = adminUser.user;
    const email = (supabaseUser.email || "").toLowerCase();
    const domain = email.split("@")[1] || "";

    if (!domain || !allowedDomains.includes(domain)) {
      console.warn(`[auth/sync] Sign-in rejected for non-allowed domain: ${email}`);
      return NextResponse.json(
        { message: "Access restricted to UIC accounts only." },
        { status: 403 }
      );
    }

    const existingUser = await storage.getUser(supabaseUser.id);
    const userRecord = {
      id: supabaseUser.id,
      email: supabaseUser.email ?? "",
      firstName: supabaseUser.user_metadata?.first_name ?? "",
      lastName: supabaseUser.user_metadata?.last_name ?? "",
      profileImageUrl: supabaseUser.user_metadata?.avatar_url ?? "",
      role: existingUser?.role ?? "student",
      status: existingUser?.status ?? "active",
      createdAt: existingUser?.createdAt ?? new Date(supabaseUser.created_at ?? Date.now()),
      updatedAt: new Date(),
    };

    const syncedUser = await storage.upsertUser(userRecord);

    return NextResponse.json({ user: syncedUser }, { status: 200 });
  } catch (error) {
    console.error("[auth/sync] Error syncing user:", error);
    return NextResponse.json({ message: "Failed to sync user" }, { status: 500 });
  }
}
