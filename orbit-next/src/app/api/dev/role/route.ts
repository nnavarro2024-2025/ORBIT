import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

import { requireActiveUser, storage } from "@/server/core";
import { userRoleEnum } from "@shared/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const role = String(body?.role || "").trim();

    if (!userRoleEnum.enumValues.includes(role as any)) {
      return NextResponse.json({ message: "Invalid role." }, { status: 400 });
    }

    const currentUser = await storage.getUser(authResult.user.id);
    if (!currentUser) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    await storage.updateUserRole(authResult.user.id, role as any);

    try {
      await storage.createActivityLog({
        id: randomUUID(),
        action: "Dev Role Switch",
        details: `Developer switched role from ${currentUser.role} to ${role}`,
        userId: authResult.user.id,
        ipAddress: null,
        userAgent: request.headers.get("user-agent") ?? null,
        createdAt: new Date(),
      });
    } catch (error) {
      console.warn("[api/dev/role] Failed to create activity log", error);
    }

    return NextResponse.json({ success: true, role }, { status: 200 });
  } catch (error) {
    console.error("[api/dev/role] Failed to switch role:", error);
    return NextResponse.json({ message: "Failed to switch role" }, { status: 500 });
  }
}
