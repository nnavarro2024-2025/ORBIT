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
    const userId = authResult.user.id;
    const userEmail = authResult.user.email?.toLowerCase() || '';

    console.log(`[notifications] Filtering alerts for user ${userId} (${userEmail})`);
    console.log(`[notifications] Total alerts: ${alerts?.length || 0}`);

    const filtered = (alerts || []).filter((alert) => {
      if (!alert) return false;
      
      // Users should ONLY see alerts explicitly targeted to them (not admin/global alerts)
      // Admin alerts like "Booking Created" have userId=null and are for admins only
      // User alerts like "Booking Scheduled" have userId set and are for specific users
      if (String(alert.userId) === String(userId)) {
        // Hide read equipment notifications (old ones that were replaced by updated colored ones)
        if (alert.isRead && alert.title && (alert.title.includes('Equipment') || alert.title.includes('Needs'))) {
          console.log(`[notifications] ✗ Skipping read equipment alert: ${alert.id} - "${alert.title}"`);
          return false;
        }
        
        console.log(`[notifications] ✓ Matched user alert: ${alert.id} - "${alert.title}"`);
        return true;
      }
      
      return false;
    });

    console.log(`[notifications] Filtered down to ${filtered.length} alerts for user`);
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
