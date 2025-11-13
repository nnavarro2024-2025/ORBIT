import { NextResponse, type NextRequest } from "next/server";

import { requireActiveUser } from "@/server/auth";
import {
  acquireSlotHold,
  refreshSlotHold,
  releaseSlotHold,
  serializeSlotHold,
} from "@/server/bookingHolds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value === "string" || value instanceof Date) {
    const date = new Date(value);
                if (!Number.isNaN(date.getTime())) return date;
  }

  return undefined;
};

export async function DELETE(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const urlHoldId = request.nextUrl.searchParams.get("holdId");
    let holdId = urlHoldId && urlHoldId.length > 0 ? urlHoldId : undefined;

    if (!holdId) {
      try {
        const body = await request.json();
        holdId = typeof body?.holdId === "string" ? body.holdId : undefined;
      } catch {
        // ignore body parse errors; we'll validate below
      }
    }

    if (!holdId) {
      return NextResponse.json(
        { message: "holdId is required to release a slot hold." },
        { status: 400 }
      );
    }

    const result = releaseSlotHold(holdId, authResult.user.id);
    if (!result.ok) {
      return NextResponse.json(
        { message: result.message },
        { status: result.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[booking-holds] Failed to release hold", error);
    return NextResponse.json(
      { message: "Failed to release slot hold." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const holdId = typeof body?.holdId === "string" ? body.holdId : undefined;
    const facilityIdRaw = body?.facilityId;
    const startTimeRaw = body?.startTime;
    const endTimeRaw = body?.endTime;

    const facilityId = Number(facilityIdRaw);
    const startTime = parseDate(startTimeRaw);
    const endTime = parseDate(endTimeRaw);

    const result = await acquireSlotHold({
      holdId,
      facilityId: Number.isFinite(facilityId) ? facilityId : undefined,
      startTime,
      endTime,
      userId: authResult.user.id,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          message: result.message,
          conflictingHoldExpiresAt: result.conflictingHoldExpiresAt ?? null,
          conflictingBookings: result.conflictingBookings ?? null,
        },
        { status: result.status }
      );
    }

    return NextResponse.json({ hold: serializeSlotHold(result.hold) });
  } catch (error) {
    console.error("[booking-holds] Failed to acquire hold", error);
    return NextResponse.json(
      { message: "Failed to acquire slot hold." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const holdId = typeof body?.holdId === "string" ? body.holdId : undefined;

    if (!holdId) {
      return NextResponse.json(
        { message: "holdId is required to refresh a slot hold." },
        { status: 400 }
      );
    }

    const result = await refreshSlotHold(holdId, authResult.user.id);

    if (!result.ok) {
      return NextResponse.json(
        { message: result.message },
        { status: result.status }
      );
    }

    return NextResponse.json({ hold: serializeSlotHold(result.hold) });
  } catch (error) {
    console.error("[booking-holds] Failed to refresh hold", error);
    return NextResponse.json(
      { message: "Failed to refresh slot hold." },
      { status: 500 }
    );
  }
}
