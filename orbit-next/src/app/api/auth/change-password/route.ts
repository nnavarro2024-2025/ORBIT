import { NextResponse, type NextRequest } from "next/server";
import { requireActiveUser } from "@/server/core";
import { storage } from "@/server/core";
import { supabaseAdmin } from "@/server/config";
import { validatePassword } from "@/server/utils/password";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(1, "New password is required"),
  confirmPassword: z.string().min(1, "Password confirmation is required"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});

/**
 * PUT /api/auth/change-password
 * Change user's password (requires current password for verification)
 */
export async function PUT(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = changePasswordSchema.parse(body);

    const userId = authResult.user.id;
    const userEmail = authResult.user.email;

    if (!userEmail) {
      return NextResponse.json(
        { message: "User email not found" },
        { status: 400 }
      );
    }

    // Verify current password by attempting to sign in with it
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json(
        { message: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { message: passwordValidation.message },
        { status: 400 }
      );
    }

    // Check that new password is different from current
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { message: "New password must be different from current password" },
        { status: 400 }
      );
    }

    // Update Supabase auth password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("[auth/change-password] Supabase update error:", updateError);
      return NextResponse.json(
        { message: "Failed to change password: " + updateError.message },
        { status: 400 }
      );
    }

    // Update last modified timestamp in our database
    const userRecord = await storage.getUser(userId);
    if (userRecord) {
      await storage.upsertUser({
        ...userRecord,
        updatedAt: new Date(),
      });
    }

    return NextResponse.json(
      { message: "Password changed successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.errors[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    console.error("[auth/change-password] Error:", error?.message || error);
    return NextResponse.json(
      { message: "Failed to change password" },
      { status: 500 }
    );
  }
}
