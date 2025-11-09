import { randomUUID } from "crypto";

import { NextResponse, type NextRequest } from "next/server";

import { requireActiveUser } from "@/server/auth";
import { storage } from "@/server/storage";

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
      return NextResponse.json({ message: "Booking not found." }, { status: 404 });
    }

    if (String(booking.userId) !== String(authResult.user.id)) {
      return NextResponse.json({ message: "You are not allowed to cancel this booking." }, { status: 403 });
    }

    const now = new Date();
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    const isActiveApproved = booking.status === "approved" && start <= now && now <= end;
    const isUpcomingApproved = booking.status === "approved" && start > now;
    const canCancel = booking.status === "pending" || isActiveApproved || isUpcomingApproved;

    if (!canCancel) {
      return NextResponse.json(
        { message: "Only pending, upcoming, or active approved bookings can be cancelled." },
        { status: 400 }
      );
    }

    await storage.updateFacilityBooking(bookingId, {
      status: "cancelled",
      updatedAt: new Date(),
    });

    try {
      const user = await storage.getUser(booking.userId).catch(() => null);
      const facility = await storage.getFacility(booking.facilityId).catch(() => null);

      if (booking.status === "approved" && (isActiveApproved || isUpcomingApproved)) {
        const alertTitle = isActiveApproved ? "Booking Ended" : "Booking Cancelled";
        const verb = isActiveApproved ? "ended" : "cancelled";
        await storage.createSystemAlert({
          id: randomUUID(),
          type: "booking",
          severity: "low",
          title: alertTitle,
          message: `${user?.email || `User ${booking.userId}`} ${verb} their booking for ${
            facility?.name || `Facility ${booking.facilityId}`
          } (${start.toLocaleString()} - ${end.toLocaleString()}).`,
          userId: null,
          isRead: false,
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.warn("[bookings] Failed to create cancellation alert", error);
    }

    try {
      const facility = await storage.getFacility(booking.facilityId).catch(() => null);
      const wasActive = start <= new Date() && new Date() <= end;
      await storage.createActivityLog({
        id: randomUUID(),
        action: wasActive ? "Booking Ended" : "Booking Cancelled",
        details: `User ${wasActive ? "ended" : "cancelled"} booking for ${
          facility?.name || `Facility ${booking.facilityId}`
        } (${start.toLocaleString()} - ${end.toLocaleString()})`,
        userId: booking.userId,
        ipAddress: null,
        userAgent: request.headers.get("user-agent") ?? null,
        createdAt: new Date(),
      });
    } catch (error) {
      console.warn("[bookings] Failed to log cancellation", error);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[bookings] Failed to cancel booking:", error);
    return NextResponse.json({ message: "Failed to cancel booking." }, { status: 500 });
  }
}
