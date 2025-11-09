import { NextResponse, type NextRequest } from "next/server";

import { requireActiveUser, requireAdminUser } from "@/server/auth";
import { storage } from "@/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const facilities = await storage.getAllFacilities();
    return NextResponse.json(facilities ?? [], { status: 200 });
  } catch (error) {
    console.error("[facilities] Failed to fetch facilities:", error);
    return NextResponse.json({ message: "Failed to fetch facilities" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const facilityId = Number(body?.facilityId);
    const updates = body?.updates ?? {};

    if (!Number.isInteger(facilityId)) {
      return NextResponse.json({ message: "facilityId must be a number" }, { status: 400 });
    }

    await storage.updateFacility(facilityId, updates);
    const facility = await storage.getFacility(facilityId);
    return NextResponse.json(facility ?? { success: true }, { status: 200 });
  } catch (error) {
    console.error("[facilities] Failed to update facility:", error);
    return NextResponse.json({ message: "Failed to update facility" }, { status: 500 });
  }
}
