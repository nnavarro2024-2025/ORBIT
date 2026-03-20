import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/server/core";
import { storage } from "@/server/core";
import { supabaseAdmin } from "@/server/config";
import { hasPasswordProvider, inferRoleFromUicEmail } from "@/server/core";

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
    const inferredRole = inferRoleFromUicEmail(supabaseUser.email ?? "");
    const extractedNames = extractNamesFromMetadata(supabaseUser.user_metadata || {});
    const userRecord = {
      id: supabaseUser.id,
      email: supabaseUser.email ?? "",
      firstName: extractedNames.firstName ?? existingUser?.firstName ?? "",
      lastName: extractedNames.lastName ?? existingUser?.lastName ?? "",
      profileImageUrl: supabaseUser.user_metadata?.avatar_url ?? existingUser?.profileImageUrl ?? "",
      role: existingUser?.role ?? inferredRole,
      status: existingUser?.status ?? "active",
      createdAt: existingUser?.createdAt ?? new Date(supabaseUser.created_at ?? Date.now()),
      updatedAt: new Date(),
    };

    const syncedUser = await storage.upsertUser(userRecord);

    return NextResponse.json(
      {
        user: syncedUser,
        requiresPasswordSetup: !hasPasswordProvider(supabaseUser),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[auth/user] Error fetching or syncing user data:", error);
    return NextResponse.json({ message: "Failed to fetch user" }, { status: 500 });
  }
}
