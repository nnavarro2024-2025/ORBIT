import { NextResponse, type NextRequest } from "next/server";

import { requireAdminUser } from "@/server/core";
import { storage } from "@/server/core";
import { isBuildTime } from "@/server/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (isBuildTime()) {
    return NextResponse.json([], { status: 200 });
  }

  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const bookings = await storage.getPendingFacilityBookings();
    return NextResponse.json(bookings ?? [], { status: 200 });
  } catch (error) {
    console.error("[bookings/pending] Failed to fetch pending bookings:", error);
    return NextResponse.json({ message: "Failed to fetch pending bookings" }, { status: 500 });
  }
}
