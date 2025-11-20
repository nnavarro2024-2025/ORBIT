import { NextResponse, type NextRequest } from "next/server";

import { requireActiveUser } from "@/server/core";
import { storage } from "@/server/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const alerts = await storage.getSystemAlerts();
    const isAdmin = authResult.userRecord?.role === "admin";

    const filtered = Array.isArray(alerts)
      ? alerts.filter((alert) => {
          if (!alert) return false;
          // Admins should ONLY see global/admin alerts (userId == null)
          // These are alerts like "Booking Created", "Equipment or Needs Request" (admin version)
          if (isAdmin) {
            // Hide read equipment/needs notifications for admins too
            if (alert.userId == null && alert.isRead && alert.title && (alert.title.includes('Equipment') || alert.title.includes('Needs'))) {
              return false;
            }
            return alert.userId == null;
          }
          // Non-admins shouldn't be using this endpoint, but if they do, return empty
          return false;
        })
      : [];

    return NextResponse.json(filtered, { status: 200 });
  } catch (error) {
    console.error("[admin/alerts] Failed to fetch alerts:", error);
    return NextResponse.json({ message: "Failed to fetch alerts" }, { status: 500 });
  }
}
