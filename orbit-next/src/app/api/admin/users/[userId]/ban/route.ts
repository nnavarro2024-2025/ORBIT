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
    const body = await request.json();
    const { reason, duration, customDate } = body;

    if (!reason) {
      return NextResponse.json({ message: "Ban reason is required" }, { status: 400 });
    }

    // Calculate ban end date based on duration
    let banEndDate: Date | null = null;
    if (duration === 'permanent') {
      banEndDate = null;
    } else if (duration === 'custom' && customDate) {
      banEndDate = new Date(customDate);
    } else {
      // Default durations (1day, 1week, 1month)
      const now = new Date();
      if (duration === '1day') {
        banEndDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      } else if (duration === '1week') {
        banEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (duration === '1month') {
        banEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
    }

    // Update user status to banned
    await storage.updateUser(userId, {
      status: "banned",
      banReason: reason,
      banEndDate: banEndDate,
      bannedAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Get user details for logging
    const bannedUser = await storage.getUser(userId).catch(() => null);

    // Create activity log
    try {
      const durationText = duration === 'permanent' 
        ? 'permanently' 
        : duration === 'custom' 
        ? `until ${banEndDate?.toLocaleString()}` 
        : `for ${duration}`;

      await storage.createActivityLog({
        id: randomUUID(),
        action: "User Banned",
        details: `Admin ${authResult.user.email} banned user ${bannedUser?.email || userId} ${durationText}. Reason: ${reason}`,
        userId: authResult.user.id,
        ipAddress: null,
        userAgent: request.headers.get("user-agent") ?? null,
        createdAt: new Date(),
      });
    } catch (error) {
      console.warn("[admin/users/ban] Failed to create activity log", error);
    }

    // Create system alert for the banned user
    try {
      const durationText = duration === 'permanent' 
        ? 'permanently' 
        : duration === 'custom' 
        ? `until ${banEndDate?.toLocaleString()}` 
        : `for ${duration}`;

      await storage.createSystemAlert({
        id: randomUUID(),
        type: "security",
        severity: "high",
        title: "Account Banned",
        message: `Your account has been banned ${durationText}. Reason: ${reason}`,
        userId: userId,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.warn("[admin/users/ban] Failed to create system alert", error);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[admin/users/ban] Failed to ban user:", error);
    return NextResponse.json({ message: "Failed to ban user" }, { status: 500 });
  }
}
