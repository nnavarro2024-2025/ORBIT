import { NextResponse, type NextRequest } from "next/server";

import { requireActiveUser } from "@/server/auth";
import { storage } from "@/server/storage";
import {
  validateLibraryHours,
  validateSameDay,
  getFacilityOrError,
  ensureFacilityIsBookable,
  enforceUserBookingConflicts,
  sendBookingNotifications,
  setArrivalConfirmationDeadline,
  refreshBooking,
} from "@/server/bookings/helpers";
import { createFacilityBookingSchema } from "@shared/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const bookings = await storage.getFacilityBookingsByUser(authResult.user.id);
    return NextResponse.json(bookings ?? [], { status: 200 });
  } catch (error) {
    console.error("[bookings] Failed to fetch user bookings:", error);
    return NextResponse.json({ message: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const rawBody = await request.json();

    const startTime = new Date(rawBody?.startTime);
    const endTime = new Date(rawBody?.endTime);
    const forceCancelConflicts = Boolean(rawBody?.forceCancelConflicts);

    const parsed = createFacilityBookingSchema.parse({
      ...rawBody,
      startTime,
      endTime,
      userId: authResult.user.id,
      status: "pending",
    });

    const hoursValidation = validateLibraryHours(parsed.startTime, parsed.endTime);
    if (!hoursValidation.ok) return NextResponse.json(hoursValidation.error.body, { status: hoursValidation.error.status });

    const sameDayValidation = validateSameDay(parsed.startTime, parsed.endTime);
    if (!sameDayValidation.ok) return NextResponse.json(sameDayValidation.error.body, { status: sameDayValidation.error.status });

    const facilityResult = await getFacilityOrError(parsed.facilityId);
    if (!facilityResult.ok) return NextResponse.json(facilityResult.error.body, { status: facilityResult.error.status });
    const facility = facilityResult.value;

    const facilityEligibility = await ensureFacilityIsBookable(
      authResult.user.id,
      facility,
      parsed.participants,
      parsed.startTime,
      parsed.endTime,
    );
    if (!facilityEligibility.ok) {
      return NextResponse.json(facilityEligibility.error.body, { status: facilityEligibility.error.status });
    }

    const conflictResult = await enforceUserBookingConflicts(
      authResult.user.id,
      parsed.startTime,
      parsed.endTime,
      forceCancelConflicts,
    );
    if (!conflictResult.ok) {
      return NextResponse.json(conflictResult.error.body, { status: conflictResult.error.status });
    }

    let booking = await storage
      .createFacilityBooking(parsed)
      .catch(async (error: any) => {
        if (error?.name === "ConflictError") {
          try {
            const facilityInfo = await storage.getFacility(parsed.facilityId);
            const conflicts = (error.conflicts || []).map((conflict: any) => ({
              id: conflict.id,
              startTime: conflict.startTime,
              endTime: conflict.endTime,
              status: conflict.status,
              userId: conflict.userId,
            }));
            return Promise.reject(
              NextResponse.json(
                {
                  message: "This time slot for the selected facility is already booked. Please choose a different time.",
                  facility: { id: facilityInfo?.id, name: facilityInfo?.name },
                  conflictingBookings: conflicts,
                },
                { status: 409 }
              )
            );
          } catch (innerError) {
            return Promise.reject(
              NextResponse.json(
                {
                  message: "This time slot for the selected facility is already booked. Please choose a different time.",
                  conflictingBookings: error.conflicts || [],
                },
                { status: 409 }
              )
            );
          }
        }
        throw error;
      });

    if (booking instanceof NextResponse) {
      return booking;
    }

    await sendBookingNotifications({
      booking,
      facility,
      userId: authResult.user.id,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
    });

    await setArrivalConfirmationDeadline(booking.id, parsed.startTime);

    const refreshed = await refreshBooking(booking.id);
    return NextResponse.json(refreshed ?? booking, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }

    console.error("[bookings] Failed to create booking:", error);
    const message = error instanceof Error ? error.message : "Failed to create booking";
    return NextResponse.json({ message }, { status: 400 });
  }
}
