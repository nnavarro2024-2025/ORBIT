import { NextResponse, type NextRequest } from "next/server";

import { requireAdminUser } from "@/server/auth";
import { storage } from "@/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const bookings = await storage.getAllFacilityBookings();
    const safeBookings = (bookings ?? []).map((booking: any) => {
      const clone = { ...booking };
      if (typeof clone.equipment === "string") {
        const trimmed = clone.equipment.trim();
        if (trimmed === "undefined" || trimmed === "null") {
          clone.equipment = null;
        }
      }
      if (clone.equipment === undefined) {
        clone.equipment = null;
      }
      return clone;
    });
    return NextResponse.json(safeBookings, { status: 200 });
  } catch (error) {
    console.error("[admin/bookings] Failed to fetch bookings:", error);
    return NextResponse.json({ message: "Failed to fetch bookings" }, { status: 500 });
  }
}
