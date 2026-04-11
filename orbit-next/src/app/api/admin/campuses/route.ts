import { NextResponse, type NextRequest } from "next/server";
import { requireAdminUser } from "@/server/core";
import { storage } from "@/server/core";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createCampusSchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) return authResult.response;

  try {
    const campuses = await storage.getAllCampuses();
    return NextResponse.json(campuses, { status: 200 });
  } catch (error) {
    console.error("[admin/campuses] Failed to fetch campuses:", error);
    return NextResponse.json({ message: "Failed to fetch campuses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) return authResult.response;

  try {
    const body = await request.json();
    const parsed = createCampusSchema.parse(body);
    const campus = await storage.createCampus(parsed);
    return NextResponse.json(campus, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.errors }, { status: 400 });
    }
    console.error("[admin/campuses] Failed to create campus:", error);
    return NextResponse.json({ message: "Failed to create campus" }, { status: 500 });
  }
}
