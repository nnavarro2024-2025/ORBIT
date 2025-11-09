import { randomUUID } from "crypto";

import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gt, lt, ne, or } from "drizzle-orm";

import { requireAdminUser } from "@/server/auth";
import { storage } from "@/server/storage";
import {
  setArrivalConfirmationDeadline,
} from "@/server/bookings/helpers";
import { db } from "@/server/db";
import { facilityBookings } from "@shared/schema";

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
    const existingBooking = await storage.getFacilityBooking(bookingId);
    if (!existingBooking) {
      return NextResponse.json({ message: "Booking not found." }, { status: 404 });
    }

    const payload = await request.json().catch(() => ({}));
    const adminResponse = payload?.adminResponse;

    await storage.updateFacilityBooking(bookingId, {
      status: "approved",
      adminResponse,
      updatedAt: new Date(),
    });

    const booking = await storage.getFacilityBooking(bookingId);

    let activityDetails = `Admin approved booking ${bookingId}`;
    if (booking) {
      const user = await storage.getUser(booking.userId).catch(() => null);
      const facility = await storage.getFacility(booking.facilityId).catch(() => null);
      const userEmail = user?.email || `ID: ${booking?.userId}`;
      const facilityName = facility?.name || `ID: ${booking?.facilityId}`;
      activityDetails = `Admin approved booking for ${userEmail} at ${facilityName} from ${booking?.startTime?.toString()} to ${booking?.endTime?.toString()}`;
    }

    try {
      await storage.createActivityLog({
        id: randomUUID(),
        action: "Booking Approved",
        details: activityDetails,
        userId: authResult.user.id,
        ipAddress: null,
        userAgent: request.headers.get("user-agent") ?? null,
        createdAt: new Date(),
      });
    } catch (error) {
      console.warn("[bookings/approve] Failed to create activity log", error);
    }

    let createdNotification: any = null;
    if (booking) {
      try {
        const bookingUser = await storage.getUser(booking.userId).catch(() => null);
        const facility = await storage.getFacility(booking.facilityId).catch(() => null);
        createdNotification = await storage.createSystemAlert({
          id: randomUUID(),
          type: "booking",
          severity: "low",
          title: "Booking Approved",
          message: `Your booking for ${facility?.name || `Facility ${booking.facilityId}`} on ${booking.startTime.toLocaleString()} has been approved.`,
          userId: booking.userId,
          isRead: false,
          createdAt: new Date(),
        });
      } catch (error) {
        console.warn("[bookings/approve] Failed to create approval notification", error);
      }
    }

    try {
      if (booking) {
        await setArrivalConfirmationDeadline(booking.id, booking.startTime instanceof Date ? booking.startTime : new Date(booking.startTime));
      }
    } catch (error) {
      console.warn("[bookings/approve] Failed to set arrival confirmation deadline", error);
    }

    if (booking) {
      try {
        const facilityRecord = await storage.getFacility(booking.facilityId).catch(() => null);
        const facilityName = facilityRecord?.name || `Facility ${booking.facilityId}`;

        const overlappingPending = await db
          .select()
          .from(facilityBookings)
          .where(
            and(
              eq(facilityBookings.facilityId, booking.facilityId),
              eq(facilityBookings.status, "pending"),
              ne(facilityBookings.userId, booking.userId),
              or(
                and(lt(facilityBookings.startTime, booking.endTime), gt(facilityBookings.endTime, booking.startTime))
              ),
            ),
          );

        for (const other of overlappingPending) {
          try {
            await storage.updateFacilityBooking(other.id, {
              status: "denied",
              adminResponse: "Automatically denied: time slot already booked (another request was approved)",
              updatedAt: new Date(),
            });

            await storage.createSystemAlert({
              id: randomUUID(),
              type: "booking",
              severity: "low",
              title: "Booking Denied - Slot Taken",
              message: `Your booking for ${facilityName} from ${new Date(other.startTime).toLocaleString()} to ${new Date(other.endTime).toLocaleString()} was denied because another booking for this time slot was approved.`,
              userId: other.userId,
              isRead: false,
              createdAt: new Date(),
            });
          } catch (error) {
            console.warn("[bookings/approve] Failed to deny overlapping booking", error);
          }
        }

        const userPending = await db
          .select()
          .from(facilityBookings)
          .where(
            and(
              eq(facilityBookings.userId, booking.userId),
              eq(facilityBookings.status, "pending"),
              ne(facilityBookings.id, booking.id),
            ),
          );

        for (const pending of userPending) {
          try {
            await storage.updateFacilityBooking(pending.id, {
              status: "denied",
              adminResponse: "Automatically denied: another booking was approved for you",
              updatedAt: new Date(),
            });

            await storage.createSystemAlert({
              id: randomUUID(),
              type: "booking",
              severity: "low",
              title: "Booking Denied - Related Approval",
              message: `Your other booking for ${new Date(pending.startTime).toLocaleString()} to ${new Date(pending.endTime).toLocaleString()} was denied because another one of your bookings was approved.`,
              userId: pending.userId,
              isRead: false,
              createdAt: new Date(),
            });
          } catch (error) {
            console.warn("[bookings/approve] Failed to deny same-user pending booking", error);
          }
        }
      } catch (error) {
        console.warn("[bookings/approve] Failed to auto-deny pending bookings", error);
      }
    }

    return NextResponse.json({ success: true, notification: createdNotification }, { status: 200 });
  } catch (error) {
    console.error("[bookings/approve] Failed:", error);
    return NextResponse.json({ message: "Failed to approve booking" }, { status: 500 });
  }
}
