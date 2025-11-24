import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdminUser } from "@/server/core";
import { storage } from "@/server/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { userId } = await context.params;

  try {
    // Get user details before unbanning
    const user = await storage.getUser(userId).catch(() => null);

    // Update user status to active
    await storage.updateUser(userId, {
      status: "active",
      banReason: null,
      banEndDate: null,
      bannedAt: null,
      updatedAt: new Date(),
    } as any);

    // Create activity log
    try {
      await storage.createActivityLog({
        id: randomUUID(),
        action: "User Unbanned",
        details: `Admin ${authResult.user.email} unbanned user ${user?.email || userId}`,
        userId: authResult.user.id,
        ipAddress: null,
        userAgent: request.headers.get("user-agent") ?? null,
        createdAt: new Date(),
      });
    } catch (error) {
      console.warn("[admin/users/unban] Failed to create activity log", error);
    }

    // Create system alert for the unbanned user
    try {
      await storage.createSystemAlert({
        id: randomUUID(),
        type: "security",
        severity: "low",
        title: "Account Restored",
        message: "Your account has been restored by an administrator. You can now access the system.",
        userId: userId,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.warn("[admin/users/unban] Failed to create system alert", error);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[admin/users/unban] Failed to unban user:", error);
    return NextResponse.json({ message: "Failed to unban user" }, { status: 500 });
  }
}
