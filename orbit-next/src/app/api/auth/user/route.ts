import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/server/auth";
import { storage } from "@/server/storage";
import { supabaseAdmin } from "@/server/supabaseAdmin";

export async function GET(request: NextRequest) {
  const authResult = await requireUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const userId = authResult.user.id;

    const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (adminError || !adminUser?.user) {
      console.error("[auth/user] Failed to fetch user from Supabase Admin:", adminError?.message || "Unknown error");
      return NextResponse.json(
        { message: "User not found in authentication system." },
        { status: 404 }
      );
    }

    const supabaseUser = adminUser.user;

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

    return NextResponse.json(syncedUser, { status: 200 });
  } catch (error) {
    console.error("[auth/user] Error fetching or syncing user data:", error);
    return NextResponse.json({ message: "Failed to fetch user" }, { status: 500 });
  }
}
