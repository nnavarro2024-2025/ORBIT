import { NextResponse, type NextRequest } from "next/server";

import { requireAdminUser } from "@/server/core";
import { storage } from "@/server/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const users = await storage.getAllUsers();
    return NextResponse.json(users ?? [], { status: 200 });
  } catch (error) {
    console.error("[admin/users] Failed to fetch users:", error);
    return NextResponse.json({ message: "Failed to fetch users" }, { status: 500 });
  }
}
