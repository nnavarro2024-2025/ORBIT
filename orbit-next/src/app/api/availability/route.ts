import { NextResponse, type NextRequest } from "next/server";

import { requireActiveUser } from "@/server/core";
import { storage } from "@/server/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildDateFromParam(param: string | null): Date {
  if (!param) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  // Parse as local date (avoid UTC shift by constructing with components)
  const [yearStr, monthStr, dayStr] = param.split("-");
  if (yearStr && monthStr && dayStr) {
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    const day = Number(dayStr);
    if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
      return new Date(year, month, day, 0, 0, 0, 0);
    }
  }

  const fallback = new Date(param);
  if (Number.isNaN(fallback.getTime())) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  return fallback;
}

export async function GET(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const dateParam = request.nextUrl.searchParams.get("date");
    const targetDate = buildDateFromParam(dateParam);

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();

    const startWindow = new Date(year, month, day, 7, 30, 0, 0);
    const endWindow = new Date(year, month, day, 19, 0, 0, 0);

    const facilities = await storage.getAllFacilities();
    const bookings = await storage.getFacilityBookingsByDateRange(startWindow, endWindow);

    const slots: { start: Date; end: Date }[] = [];
    let cursor = new Date(startWindow);
    while (cursor < endWindow) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + 30 * 60 * 1000);
      slots.push({ start: slotStart, end: slotEnd });
      cursor = slotEnd;
    }

    const isAdmin = authResult.userRecord?.role === "admin";
    const requesterId = authResult.user.id;

    const result = facilities.map((facility) => {
      const checkDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      let isUnavailableToday = false;

      try {
        const unavailableDates = (facility as any)?.unavailableDates;
        if (Array.isArray(unavailableDates)) {
          isUnavailableToday = unavailableDates.some((range: any) => {
            try {
              const start = range?.startDate ?? range?.start;
              const end = range?.endDate ?? range?.end;
              if (!start || !end) return false;
              return checkDate >= start && checkDate <= end;
            } catch {
              return false;
            }
          });
        }
      } catch {
        isUnavailableToday = false;
      }

      const isCollaborative = String(facility?.name ?? "")
        .toLowerCase()
        .includes("collaborative learning");
      const maxUsageHours = isCollaborative ? 2 : null;

      const facilityBookings = (bookings || []).filter((booking: any) => {
        if (!booking || booking.facilityId !== facility?.id) return false;
        if (booking.status === "cancelled" || booking.status === "denied") return false;

        if (booking.status === "approved") return true;
        if (booking.status === "pending") {
          if (isAdmin) return true;
          return booking.userId === requesterId;
        }

        return false;
      });

      const slotStates = slots.map((slot) => {
        const overlapping = facilityBookings.filter((booking: any) => {
          try {
            const existingStart = new Date(booking.startTime);
            const existingEnd = new Date(booking.endTime);
            return slot.start < existingEnd && slot.end > existingStart;
          } catch {
            return false;
          }
        });

        if (overlapping.length > 0) {
          const uniqueBookings = Array.from(
            new Map(overlapping.map((entry) => [entry.id, entry])).values()
          );

          return {
            start: slot.start.toISOString(),
            end: slot.end.toISOString(),
            status: "scheduled" as const,
            bookings: uniqueBookings.map((booking: any) => ({
              id: booking.id,
              startTime: booking.startTime,
              endTime: booking.endTime,
              status: booking.status,
              userId: booking.userId,
            })),
          };
        }

        return {
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          status: "available" as const,
        };
      });

      return {
        facility: {
          id: facility?.id,
          name: facility?.name,
          capacity: facility?.capacity,
          isActive: Boolean(facility?.isActive) && !isUnavailableToday,
          unavailableReason: isUnavailableToday ? facility?.unavailableReason ?? null : null,
        },
        maxUsageHours,
        slots: slotStates,
      };
    });

    return NextResponse.json({
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      windowStart: startWindow.toISOString(),
      windowEnd: endWindow.toISOString(),
      data: result,
    });
  } catch (error) {
    console.error("[availability] Failed to compute availability:", error);
    return NextResponse.json({ message: "Failed to compute availability" }, { status: 500 });
  }
}
