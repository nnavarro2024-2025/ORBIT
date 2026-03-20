import { NextResponse, type NextRequest } from "next/server";
import { requireActiveUser } from "@/server/core";
import { storage } from "@/server/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/equipment/availability?startTime=ISO&endTime=ISO
 *
 * Returns each equipment item from the inventory with how many are already
 * booked (approved or pending) for the requested time window.
 * Clients use this to show "Not Available" when bookedCount >= totalCount.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) return authResult.response;

  const { searchParams } = new URL(request.url);
  const startStr = searchParams.get("startTime");
  const endStr = searchParams.get("endTime");

  if (!startStr || !endStr) {
    return NextResponse.json({ message: "startTime and endTime query params are required" }, { status: 400 });
  }

  const startTime = new Date(startStr);
  const endTime = new Date(endStr);

  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return NextResponse.json({ message: "Invalid date format" }, { status: 400 });
  }

  const availability = await storage.getEquipmentAvailability(startTime, endTime);

  // Shape: { key: string, label: string, totalCount: number, bookedCount: number, available: number }[]
  const result = availability.map(item => ({
    key: item.key,
    label: item.label,
    totalCount: item.totalCount,
    bookedCount: item.bookedCount,
    available: Math.max(0, item.totalCount - item.bookedCount),
  }));

  return NextResponse.json(result);
}
