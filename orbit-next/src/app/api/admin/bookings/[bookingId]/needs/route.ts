import { NextResponse, type NextRequest } from "next/server";

import { requireAdminUser } from "@/server/auth";
import { storage } from "@/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const { bookingId } = params;
    const payload = await request.json();
    const { status, note } = payload;

    if (!status || (status !== 'prepared' && status !== 'not_available')) {
      return NextResponse.json(
        { message: "Invalid status. Must be 'prepared' or 'not_available'" },
        { status: 400 }
      );
    }

    // Build admin_response string with status and JSON note
    const statusText = status === 'prepared' ? 'Prepared' : 'Not Available';
    const adminResponse = note ? `Needs: ${statusText} — ${note}` : `Needs: ${statusText}`;

    // Get booking details for notification
    const booking = await storage.getFacilityBooking(bookingId);
    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    // Update the booking
    await storage.updateFacilityBooking(bookingId, {
      adminResponse: adminResponse,
    });

    // Mark old equipment notifications as read and create new update notification
    try {
      const { randomUUID } = await import("crypto");
      
      // Mark old equipment notifications as read for both user and admin (userId: null)
      const alerts = await storage.getSystemAlerts();
      const equipmentAlerts = alerts.filter((alert: any) => 
        alert.title &&
        (alert.title.includes('Equipment') || alert.title.includes('Needs')) &&
        !alert.isRead &&
        (alert.userId === booking.userId || alert.userId === null)
      );
      
      for (const alert of equipmentAlerts) {
        await storage.updateSystemAlert(alert.id, { isRead: true } as any);
      }

      // Create new notification with equipment status
      const admin = await storage.getUser(authResult.user.id).catch(() => null);
      const user = await storage.getUser(booking.userId).catch(() => null);
      const facility = await storage.getFacility(booking.facilityId).catch(() => null);
      
      const adminEmail = admin?.email || 'Admin';
      const facilityName = facility?.name || `Facility ${booking.facilityId}`;
      
      // Build message with equipment status in a format the Header can parse
      // Format: "Admin updated your equipment request. [Equipment: {...}]"
      let equipmentJson = '';
      if (note) {
        try {
          const parsed = JSON.parse(note);
          if (parsed.items) {
            equipmentJson = ` [Equipment: ${JSON.stringify(parsed.items)}]`;
          }
        } catch (e) {
          // If parsing fails, just show generic status
          equipmentJson = ` Status: ${statusText}`;
        }
      } else {
        equipmentJson = ` Status: ${statusText}`;
      }
      
      const userMessage = `${adminEmail} updated your equipment request for ${facilityName}.${equipmentJson}`;
      
      await storage.createSystemAlert({
        id: randomUUID(),
        type: "user",
        severity: "low",
        title: "Equipment or Needs Request",
        message: userMessage,
        userId: booking.userId,
        isRead: false,
        createdAt: new Date(),
      });
    } catch (notifError) {
      console.warn("[admin/bookings/needs] Failed to create equipment update notification", notifError);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[admin/bookings/needs] Failed to update needs:", error);
    return NextResponse.json(
      { message: "Failed to update equipment needs" },
      { status: 500 }
    );
  }
}
