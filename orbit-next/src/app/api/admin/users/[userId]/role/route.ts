import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

import { requireAdminUser, storage } from "@/server/core";
import { userRoleEnum } from "@shared/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
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
    const role = String(body?.role || "").trim();

    if (!userRoleEnum.enumValues.includes(role as any)) {
      return NextResponse.json({ message: "Invalid role." }, { status: 400 });
    }

    const targetUser = await storage.getUser(userId);
    if (!targetUser) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    await storage.updateUserRole(userId, role as any);

    try {
      await storage.createActivityLog({
        id: randomUUID(),
        action: "User Role Updated",
        details: `Admin ${authResult.user.email} changed ${targetUser.email} role from ${targetUser.role} to ${role}`,
        userId: authResult.user.id,
        ipAddress: null,
        userAgent: request.headers.get("user-agent") ?? null,
        createdAt: new Date(),
      });
    } catch (error) {
      console.warn("[admin/users/role] Failed to create activity log", error);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[admin/users/role] Failed to update role:", error);
    return NextResponse.json({ message: "Failed to update role" }, { status: 500 });
  }
}
