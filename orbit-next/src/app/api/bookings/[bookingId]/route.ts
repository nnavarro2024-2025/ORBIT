import { randomUUID } from "crypto";

import { NextResponse, type NextRequest } from "next/server";

import { requireActiveUser } from "@/server/auth";
import { storage } from "@/server/storage";
import {
  isWithinLibraryHours,
  formatLibraryHours,
  validateSameDay,
  refreshBooking,
} from "@/server/bookings/helpers";
import { db } from "@/server/db";
import { facilityBookings } from "@shared/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { bookingId } = await context.params;

  try {
    const payload = await request.json();
    const { purpose, startTime, endTime, facilityId, participants } = payload ?? {};

    const existingBooking = await storage.getFacilityBooking(bookingId);
    if (!existingBooking) {
      return NextResponse.json({ message: "Booking not found." }, { status: 404 });
    }

    const requesterId = authResult.user.id;
    const requesterRecord = authResult.userRecord ?? (await storage.getUser(requesterId));
    const isAdmin = requesterRecord?.role === "admin";

    if (!isAdmin && String(existingBooking.userId) !== String(requesterId)) {
      return NextResponse.json({ message: "You are not allowed to update this booking." }, { status: 403 });
    }

    if (!purpose || !startTime || !endTime || facilityId === undefined || facilityId === null) {
      return NextResponse.json(
        { message: "Purpose, start time, end time, and facilityId are required." },
        { status: 400 }
      );
    }

    const parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);

    if (Number.isNaN(parsedStartTime.getTime()) || Number.isNaN(parsedEndTime.getTime())) {
      return NextResponse.json({ message: "Invalid start or end time format." }, { status: 400 });
    }

    if (!isAdmin) {
      if (!isWithinLibraryHours(parsedStartTime)) {
        return NextResponse.json(
          { message: `Start time must be within school working hours (${formatLibraryHours()})` },
          { status: 400 }
        );
      }

      if (!isWithinLibraryHours(parsedEndTime)) {
        return NextResponse.json(
          { message: `End time must be within school working hours (${formatLibraryHours()})` },
          { status: 400 }
        );
      }

      const sameDayValidation = validateSameDay(parsedStartTime, parsedEndTime);
      if (!sameDayValidation.ok) {
        return NextResponse.json(sameDayValidation.error.body, { status: sameDayValidation.error.status });
      }
    }

    const bookingOwnerId = existingBooking.userId;
    const parsedFacilityId = Number(facilityId);

    if (!Number.isInteger(parsedFacilityId)) {
      return NextResponse.json({ message: "Invalid facility id." }, { status: 400 });
    }

    if (!isAdmin) {
      const overlappingBookings = await storage.checkUserOverlappingBookings(
        bookingOwnerId,
        parsedStartTime,
        parsedEndTime,
        bookingId
      );
      if (overlappingBookings.length > 0) {
        const conflict = overlappingBookings[0];
        return NextResponse.json(
          {
            message:
              "You already have another booking during this time period. Please choose a different time.",
            existingBooking: {
              id: conflict.id,
              startTime: conflict.startTime,
              endTime: conflict.endTime,
              facilityId: conflict.facilityId,
              status: conflict.status,
            },
          },
          { status: 409 }
        );
      }

      const facilityBookings = await storage.checkUserFacilityBookings(
        bookingOwnerId,
        parsedFacilityId,
        bookingId
      );
      if (facilityBookings.length > 0) {
        const conflict = facilityBookings[0];
        return NextResponse.json(
          {
            message:
              "You already have an active booking for this facility. Please cancel your existing booking first.",
            existingBooking: {
              id: conflict.id,
              startTime: conflict.startTime,
              endTime: conflict.endTime,
              facilityId: conflict.facilityId,
              status: conflict.status,
            },
          },
          { status: 409 }
        );
      }
    }

    const conflictingApproved = await storage.checkApprovedBookingConflicts(
      parsedFacilityId,
      parsedStartTime,
      parsedEndTime,
      bookingId
    );

    if (conflictingApproved.length > 0) {
      const facility = await storage.getFacility(parsedFacilityId);
      const conflicts = conflictingApproved.map((booking) => ({
        id: booking.id,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
      }));
      return NextResponse.json(
        {
          message: "This time slot for the selected facility is already booked. Please choose a different time.",
          facility: { id: parsedFacilityId, name: facility?.name ?? null },
          conflictingBookings: conflicts,
        },
        { status: 409 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      purpose,
      facilityId: parsedFacilityId,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      updatedAt: new Date(),
    };

    if (payload.status && ["pending", "approved", "denied", "cancelled"].includes(payload.status)) {
      updatePayload.status = payload.status;
    }

    if (payload.arrivalConfirmed !== undefined) {
      updatePayload.arrivalConfirmed = Boolean(payload.arrivalConfirmed);
    }

    if (payload.arrivalConfirmationDeadline) {
      const deadline = new Date(payload.arrivalConfirmationDeadline);
      if (!Number.isNaN(deadline.getTime())) {
        updatePayload.arrivalConfirmationDeadline = deadline;
      }
    }

    try {
      const incomingEquipment = payload?.equipment;
      if (incomingEquipment) {
        const normalized = {
          items: Array.isArray(incomingEquipment.items)
            ? incomingEquipment.items.map((item: unknown) => String(item))
            : [],
          others: incomingEquipment.others ? String(incomingEquipment.others) : null,
        };
        updatePayload.equipment = normalized;
      }
    } catch (error) {
      console.warn("[bookings] Failed to normalize equipment", error);
    }

    if (participants !== undefined && participants !== null) {
      const parsedParticipants = Number(participants);
      if (!Number.isNaN(parsedParticipants)) {
        updatePayload.participants = parsedParticipants;
      }
    }

    await storage.updateFacilityBooking(bookingId, updatePayload as any);

    if (updatePayload.equipment) {
      try {
        await db.update(facilityBookings).set({ equipment: updatePayload.equipment as any }).where(eq(facilityBookings.id, bookingId));
      } catch (error) {
        console.warn("[bookings] Failed to persist equipment via db", error);
      }
    }

    try {
      const facility = await storage.getFacility(parsedFacilityId).catch(() => null);
      await storage.createActivityLog({
        id: randomUUID(),
        action: "Booking Updated",
        details: `Booking ${bookingId} for ${facility?.name || `Facility ${parsedFacilityId}`} updated to ${parsedStartTime.toLocaleString()} - ${parsedEndTime.toLocaleString()}`,
        userId: bookingOwnerId,
        ipAddress: request.headers.get("x-forwarded-for") || request.ip || null,
        userAgent: request.headers.get("user-agent"),
        createdAt: new Date(),
      });
    } catch (logError) {
      console.warn("[bookings] Failed to log booking update", logError);
    }

    const refreshed = await refreshBooking(bookingId);
    return NextResponse.json(refreshed ?? updatePayload, { status: 200 });
  } catch (error) {
    console.error("[bookings] Failed to update booking:", error);
    return NextResponse.json({ message: "Failed to update booking." }, { status: 500 });
  }
}
