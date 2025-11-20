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
    const stats = await storage.getAdminDashboardStats();
    return NextResponse.json(stats ?? {}, { status: 200 });
  } catch (error) {
    console.error("[admin/stats] Failed to fetch stats:", error);
    return NextResponse.json({ message: "Failed to fetch stats" }, { status: 500 });
  }
}
