import { NextResponse, type NextRequest } from "next/server";
import { requireAdminUser } from "@/server/core";
import { storage } from "@/server/core";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createFacilitySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  capacity: z.number().int().min(1),
  image: z.string().max(255).optional(),
  campusId: z.number().int().optional(),
  allowedRoles: z.array(z.string()).min(1).optional(),
});

export async function GET(request: NextRequest) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const campusIdParam = searchParams.get("campusId");
    if (campusIdParam) {
      const campusId = parseInt(campusIdParam, 10);
      if (isNaN(campusId)) {
        return NextResponse.json({ message: "Invalid campusId" }, { status: 400 });
      }
      const facilities = await storage.getFacilitiesByCampusId(campusId);
      // Only return id and name for modal
      return NextResponse.json(facilities.map(f => ({ id: f.id, name: f.name })), { status: 200 });
    }

    const [allFacilities, allCampuses] = await Promise.all([
      storage.getAllFacilities(),
      storage.getAllCampuses(),
    ]);

    const campusMap = new Map(allCampuses.map(c => [c.id, c]));

    const enriched = allFacilities.map(f => ({
      ...f,
      campusName: f.campusId ? campusMap.get(f.campusId)?.name ?? null : null,
      campusIsActive: f.campusId ? campusMap.get(f.campusId)?.isActive ?? true : true,
    }));

    return NextResponse.json(enriched, { status: 200 });
  } catch (error) {
    console.error("[admin/facilities] Failed to fetch facilities:", error);
    return NextResponse.json({ message: "Failed to fetch facilities" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) return authResult.response;

  try {
    const body = await request.json();
    const parsed = createFacilitySchema.parse(body);
    const facility = await storage.createFacility(parsed);
    return NextResponse.json(facility, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.errors }, { status: 400 });
    }
    console.error("[admin/facilities] Failed to create facility:", error);
    return NextResponse.json({ message: "Failed to create facility" }, { status: 500 });
  }
}
