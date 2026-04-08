import { randomUUID } from "crypto";

import { NextResponse, type NextRequest } from "next/server";

import { requireActiveUser } from "@/server/core";
import { storage } from "@/server/core";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { bookingId } = await context.params;

  try {
    const booking = await storage.getFacilityBooking(bookingId);
    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    // Allow the booking owner OR an admin to confirm
    const isAdmin = authResult.userRecord?.role === "admin";
    const isOwner = booking.userId === authResult.user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ message: "Not authorized to confirm this booking" }, { status: 403 });
    }

    if (booking.status !== "approved") {
      return NextResponse.json({ message: "Only approved bookings can be confirmed for arrival" }, { status: 400 });
    }

    await storage.updateFacilityBooking(bookingId, {
      arrivalConfirmed: true,
      updatedAt: new Date(),
    } as any);

    try {
      const actor = isAdmin ? `Admin ${authResult.user.id}` : `User ${authResult.user.id}`;
      await storage.createActivityLog({
        id: randomUUID(),
        action: "Arrival Confirmed",
        details: `${actor} confirmed arrival for booking ${bookingId}`,
        userId: authResult.user.id,
        ipAddress: null,
        userAgent: request.headers.get("user-agent") ?? null,
        createdAt: new Date(),
      });
    } catch (error) {
      console.warn("[bookings/confirm-arrival] Failed to create activity log", error);
    }

    try {
      const facility = await storage.getFacility(booking.facilityId).catch(() => null);
      // Only send alert to user if admin confirmed (user already knows if they did it themselves)
      if (isAdmin) {
        await storage.createSystemAlert({
          id: randomUUID(),
          type: "booking",
          severity: "low",
          title: "Arrival Confirmed",
          message: `An admin has confirmed your arrival for ${facility?.name || `Facility ${booking.facilityId}`}. Enjoy your session!`,
          userId: booking.userId,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.warn("[bookings/confirm-arrival] Failed to notify booking owner", error);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[bookings/confirm-arrival] Failed:", error);
    return NextResponse.json({ message: "Failed to confirm arrival" }, { status: 500 });
  }
}
