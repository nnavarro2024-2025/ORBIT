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
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limitNum = limitParam ? Number(limitParam) : undefined;
    const finalLimit = limitNum && !Number.isNaN(limitNum) ? Math.max(1, limitNum) : undefined;
    const logs = await storage.getActivityLogs(undefined, finalLimit);
    return NextResponse.json(logs ?? [], { status: 200 });
  } catch (error) {
    console.error("[admin/activity] Failed to fetch activity logs:", error);
    return NextResponse.json({ message: "Failed to fetch activity logs" }, { status: 500 });
  }
}
