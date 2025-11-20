import { NextResponse, type NextRequest } from "next/server";

import { requireActiveUser } from "@/server/core";
import { storage } from "@/server/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ faqId: string }> }
) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { faqId } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));
    const helpful = Boolean(body?.helpful);

    const updated = await storage.recordFaqFeedback(faqId, helpful);
    if (!updated) {
      return NextResponse.json({ message: "FAQ not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("[faqs] Failed to record feedback", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to record feedback" }, { status: 400 });
  }
}
