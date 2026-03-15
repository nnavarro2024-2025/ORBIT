import { NextResponse, type NextRequest } from "next/server";
import { requireActiveUser } from "@/server/core";
import { storage } from "@/server/core";
import { supabaseAdmin } from "@/server/config";
import { validatePassword } from "@/server/utils/password";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const setupPasswordSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirmPassword: z.string().min(1, "Password confirmation is required"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * POST /api/auth/setup-password
 * Set password for first-time login (forces users to create a password)
 * Only works if user doesn't have a password set yet
 */
export async function POST(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { password, confirmPassword } = setupPasswordSchema.parse(body);

    const userId = authResult.user.id;
    const supabaseUser = authResult.user;

    // Check password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { message: passwordValidation.message },
        { status: 400 }
      );
    }

    // Update Supabase auth password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (updateError) {
      console.error("[auth/setup-password] Supabase update error:", updateError);
      return NextResponse.json(
        { message: "Failed to set password: " + updateError.message },
        { status: 400 }
      );
    }

    // Update our database to mark password as setup
    const userRecord = await storage.getUser(userId);
    if (!userRecord) {
      return NextResponse.json(
        { message: "User not found in database" },
        { status: 404 }
      );
    }

    // Mark password as set with a placeholder hash and clear the password setup requirement flag
    // Using '*' as a marker that password has been set (actual password is managed by Supabase)
    const updatedUser = await storage.upsertUser({
      ...userRecord,
      passwordHash: "*", // Marker indicating password is set (actual auth handled by Supabase)
      passwordSetupRequiredAt: null,
      updatedAt: new Date(),
    });

    console.log(`[auth/setup-password] Password setup completed for user ${userId}`);

    return NextResponse.json(
      {
        message: "Password set successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          passwordSetupRequiredAt: updatedUser.passwordSetupRequiredAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.errors[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    console.error("[auth/setup-password] Error:", error?.message || error);
    return NextResponse.json(
      { message: "Failed to set password" },
      { status: 500 }
    );
  }
}
