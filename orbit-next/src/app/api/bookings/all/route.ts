import { NextResponse } from "next/server";

import { requireAdminUser, requireActiveUser } from "@/server/core";
import { storage } from "@/server/core";
import { isBuildTime } from "@/server/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (isBuildTime()) {
    return NextResponse.json([], { status: 200 });
  }

  const authResult = await requireActiveUser(new Headers(request.headers));
  if (!authResult.ok) {
    return authResult.response;
  }

  const isAdmin = authResult.userRecord?.role === "admin";

  try {
    if (isAdmin) {
      const bookings = await storage.getAllFacilityBookings();
      return NextResponse.json(bookings ?? [], { status: 200 });
    }

    const activeBookings = await storage.getFacilityBookingsByDateRange(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
    const filtered = activeBookings.filter((booking: any) => {
      if (!booking) return false;
      if (booking.status === "approved") return true;
      if (booking.status === "pending") {
        return String(booking.userId) === String(authResult.user.id);
      }
      return false;
    });

    return NextResponse.json(filtered, { status: 200 });
  } catch (error) {
    console.error("[bookings/all] Failed to fetch bookings:", error);
    return NextResponse.json({ message: "Failed to fetch bookings" }, { status: 500 });
  }
}
