import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/server/core";
import { storage } from "@/server/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/password-status
 * Check if user needs to set up password (for first-time email/password users)
 * Returns information about password setup requirement
 */
export async function GET(request: NextRequest) {
  const authResult = await requireUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const userId = authResult.user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { message: "User ID not found" },
        { status: 400 }
      );
    }

    const userRecord = await storage.getUser(userId);
    
    if (!userRecord) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const passwordSetupRequired = userRecord.passwordSetupRequiredAt !== null && userRecord.passwordSetupRequiredAt !== undefined;

    return NextResponse.json(
      {
        passwordSetupRequired,
        email: userRecord.email,
        role: userRecord.role,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[auth/password-status] Error:", error?.message || error);
    return NextResponse.json(
      { message: "Failed to check password status" },
      { status: 500 }
    );
  }
}
