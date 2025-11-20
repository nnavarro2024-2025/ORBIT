import { randomUUID } from "crypto";

import { NextResponse, type NextRequest } from "next/server";

import { requireAdminUser } from "@/server/core";
import { storage } from "@/server/core";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { bookingId } = await context.params;

  try {
    const booking = await storage.getFacilityBooking(bookingId);
    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "approved") {
      return NextResponse.json({ message: "Only approved bookings can be confirmed for arrival" }, { status: 400 });
    }

    await storage.updateFacilityBooking(bookingId, {
      arrivalConfirmed: true,
      updatedAt: new Date(),
    } as any);

    try {
      await storage.createActivityLog({
        id: randomUUID(),
        action: "Arrival Confirmed",
        details: `Admin ${authResult.user.id} confirmed arrival for booking ${bookingId}`,
        userId: authResult.user.id,
        ipAddress: null,
        userAgent: request.headers.get("user-agent") ?? null,
        createdAt: new Date(),
      });
    } catch (error) {
      console.warn("[bookings/confirm-arrival] Failed to create activity log", error);
    }

    try {
      const user = await storage.getUser(booking.userId).catch(() => null);
      const facility = await storage.getFacility(booking.facilityId).catch(() => null);
      if (user) {
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
