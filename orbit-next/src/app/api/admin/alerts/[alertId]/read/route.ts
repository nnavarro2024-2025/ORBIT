import { NextResponse, type NextRequest } from "next/server";

import { requireAdminUser } from "@/server/core";
import { storage } from "@/server/core";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ alertId: string }> },
) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { alertId } = await context.params;
  if (!alertId) {
    return NextResponse.json({ message: "Alert id is required" }, { status: 400 });
  }

  try {
    await storage.markAlertAsReadForAdmin(String(alertId));
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(`[admin/alerts/${alertId}/read] Failed to mark alert as read:`, error);
    return NextResponse.json({ message: "Failed to mark alert as read" }, { status: 500 });
  }
}
