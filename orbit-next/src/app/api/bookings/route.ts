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

    const reminderOptIn = rawBody?.reminderOptIn === undefined ? true : Boolean(rawBody.reminderOptIn);
    const rawLeadMinutes = Number(rawBody?.reminderLeadMinutes);
    const reminderLeadMinutes = Number.isFinite(rawLeadMinutes)
      ? Math.min(Math.max(Math.floor(rawLeadMinutes), 5), 1440)
      : 60;

    const parsed = createFacilityBookingSchema.parse({
      ...rawBody,
      reminderOptIn,
      reminderLeadMinutes,
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

    // Check facility-specific duration and daily booking limits
    const facilityName = facility.name.toLowerCase();
    const isCollabRoom = facilityName.includes('collaborative learning room 1') || facilityName.includes('collaborative learning room 2');
    
    if (isCollabRoom) {
      // Max 2 hours for collaborative learning rooms
      const durationMs = parsed.endTime.getTime() - parsed.startTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      
      if (durationHours > 2) {
        return NextResponse.json(
          { message: 'Collaborative Learning Rooms can only be booked for a maximum of 2 hours.' },
          { status: 400 }
        );
      }
      
      // Max 2 bookings per day for collaborative learning rooms
      // TEMPORARILY DISABLED FOR TESTING
      /*
      const startOfDay = new Date(parsed.startTime);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(parsed.startTime);
      endOfDay.setHours(23, 59, 59, 999);
      
      const allUserBookings = await storage.getFacilityBookingsByUser(authResult.user.id);
      const existingBookingsToday = allUserBookings.filter((b: any) => {
        const bookingStart = new Date(b.startTime);
        return (
          b.facilityId === parsed.facilityId &&
          (b.status === 'approved' || b.status === 'pending') &&
          bookingStart >= startOfDay &&
          bookingStart <= endOfDay
        );
      });
      
      if (existingBookingsToday.length >= 2) {
        return NextResponse.json(
          { message: 'You can only book this Collaborative Learning Room twice per day. You have reached your daily limit.' },
          { status: 400 }
        );
      }
      */
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
