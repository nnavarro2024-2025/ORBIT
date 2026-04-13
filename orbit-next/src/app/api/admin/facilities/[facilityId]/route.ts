import { NextResponse, type NextRequest } from "next/server";
import { requireAdminUser } from "@/server/core";
import { storage } from "@/server/core";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateFacilitySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  capacity: z.number().int().min(1).optional(),
  image: z.string().max(255).optional().nullable(),
  campusId: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
  unavailableReason: z.string().max(500).optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ facilityId: string }> }
) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) return authResult.response;

  try {
    const { facilityId: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ message: "Invalid facility ID" }, { status: 400 });
    }

    const existing = await storage.getFacility(id);
    if (!existing) {
      return NextResponse.json({ message: "Facility not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateFacilitySchema.parse(body);

    // If enabling, clear unavailableReason
    if (parsed.isActive === true) {
      parsed.unavailableReason = null;
    }

    await storage.updateFacility(id, parsed);
    const updated = await storage.getFacility(id);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.errors }, { status: 400 });
    }
    console.error("[admin/facilities] Failed to update facility:", error);
    return NextResponse.json({ message: "Failed to update facility" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ facilityId: string }> }
) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) return authResult.response;

  try {
    const { facilityId: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ message: "Invalid facility ID" }, { status: 400 });
    }

    const existing = await storage.getFacility(id);
    if (!existing) {
      return NextResponse.json({ message: "Facility not found" }, { status: 404 });
    }

    await storage.deleteFacility(id);
    return NextResponse.json({ message: "Facility deleted" }, { status: 200 });
  } catch (error) {
    console.error("[admin/facilities] Failed to delete facility:", error);
    return NextResponse.json({ message: "Failed to delete facility" }, { status: 500 });
  }
}
