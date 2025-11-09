import { NextResponse, type NextRequest } from "next/server";

import { requireActiveUser } from "@/server/auth";
import { storage } from "@/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const alerts = await storage.getSystemAlerts();
    const userId = authResult.user.id;

    const filtered = (alerts || []).filter((alert) => {
      if (!alert) return false;
      if (alert.userId == null) return true;
      return String(alert.userId) === String(userId);
    });

    return NextResponse.json(filtered, { status: 200 });
  } catch (error) {
    console.error("[notifications] Failed to fetch notifications:", error);
    return NextResponse.json({ message: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ message: "Notification id is required" }, { status: 400 });
    }

    await storage.markAlertAsReadForUser(String(id), authResult.user.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[notifications] Failed to update notification:", error);
    return NextResponse.json({ message: "Failed to update notification" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}
