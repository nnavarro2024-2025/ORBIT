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
    const isAdmin = authResult.userRecord?.role === "admin";

    const filtered = Array.isArray(alerts)
      ? alerts.filter((alert) => {
          if (!alert) return false;
          if (isAdmin) return true;
          if (alert.userId == null) return true;
          return String(alert.userId) === String(userId);
        })
      : [];

    return NextResponse.json(filtered, { status: 200 });
  } catch (error) {
    console.error("[admin/alerts] Failed to fetch alerts:", error);
    return NextResponse.json({ message: "Failed to fetch alerts" }, { status: 500 });
  }
}
