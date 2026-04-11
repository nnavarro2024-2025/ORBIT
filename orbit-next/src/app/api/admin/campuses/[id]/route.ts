import { NextResponse, type NextRequest } from "next/server";
import { requireAdminUser } from "@/server/core";
import { storage } from "@/server/core";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateCampusSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) return authResult.response;

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ message: "Invalid campus ID" }, { status: 400 });
    }

    const existing = await storage.getCampus(id);
    if (!existing) {
      return NextResponse.json({ message: "Campus not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateCampusSchema.parse(body);
    const updated = await storage.updateCampus(id, parsed);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.errors }, { status: 400 });
    }
    console.error("[admin/campuses] Failed to update campus:", error);
    return NextResponse.json({ message: "Failed to update campus" }, { status: 500 });
  }
}
