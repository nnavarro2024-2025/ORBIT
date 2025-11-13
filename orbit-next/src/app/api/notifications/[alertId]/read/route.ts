import { NextResponse, type NextRequest } from "next/server";

import { requireActiveUser } from "@/server/auth";
import { storage } from "@/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ alertId: string }> }
) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const { alertId } = await context.params;
    
    // Mark the alert as read for this specific user
    await storage.markAlertAsReadForUser(alertId, authResult.user.id);
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[notifications/read] Failed to mark notification as read:", error);
    return NextResponse.json(
      { message: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
