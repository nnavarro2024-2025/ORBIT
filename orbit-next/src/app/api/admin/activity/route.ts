import { NextResponse, type NextRequest } from "next/server";

import { requireAdminUser } from "@/server/auth";
import { storage } from "@/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;
    const logs = await storage.getActivityLogs(limit && !Number.isNaN(limit) ? Math.max(1, limit) : undefined);
    return NextResponse.json(logs ?? [], { status: 200 });
  } catch (error) {
    console.error("[admin/activity] Failed to fetch activity logs:", error);
    return NextResponse.json({ message: "Failed to fetch activity logs" }, { status: 500 });
  }
}
