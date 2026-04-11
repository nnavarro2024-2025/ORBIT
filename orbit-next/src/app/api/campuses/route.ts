import { NextResponse, type NextRequest } from "next/server";
import { requireActiveUser } from "@/server/core";
import { storage } from "@/server/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const campuses = await storage.getActiveCampuses();
    return NextResponse.json(campuses ?? [], { status: 200 });
  } catch (error) {
    console.error("[campuses] Failed to fetch campuses:", error);
    return NextResponse.json({ message: "Failed to fetch campuses" }, { status: 500 });
  }
}
