import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";

import { requireActiveUser, requireAdminUser } from "@/server/core";
import { storage } from "@/server/core";
import { updateFaqSchema } from "@shared/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ faqId: string }> }
) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { faqId } = await context.params;

  try {
    const faqs = await storage.getFaqs();
    const faq = faqs.find((item) => item.id === faqId);
    if (!faq) {
      return NextResponse.json({ message: "FAQ not found" }, { status: 404 });
    }
    return NextResponse.json(faq, { status: 200 });
  } catch (error) {
    console.error("[faqs] Failed to fetch FAQ", error);
    return NextResponse.json({ message: "Failed to fetch FAQ" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ faqId: string }> }
) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { faqId } = await context.params;

  try {
    const body = await request.json();
    const parsed = updateFaqSchema.parse(body);
    const updated = await storage.updateFaq(faqId, parsed);
    if (!updated) {
      return NextResponse.json({ message: "FAQ not found" }, { status: 404 });
    }

    try {
      await storage.createActivityLog({
        id: randomUUID(),
        action: "FAQ Updated",
        details: `FAQ updated: ${updated.question}`,
        userId: authResult.userRecord?.id ?? null,
        ipAddress: (request.headers.get("x-forwarded-for") ?? null) as string | null,
        userAgent: (request.headers.get("user-agent") ?? null) as string | null,
        createdAt: new Date(),
      });
    } catch (logError) {
      console.warn("[faqs] Failed to log FAQ update", logError);
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("[faqs] Failed to update FAQ", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to update FAQ" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ faqId: string }> }
) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { faqId } = await context.params;

  try {
    // Ensure FAQ exists before deletion to provide better error response
    const faqs = await storage.getFaqs();
    const existing = faqs.find((item) => item.id === faqId);
    if (!existing) {
      return NextResponse.json({ message: "FAQ not found" }, { status: 404 });
    }

    await storage.deleteFaq(faqId);

    try {
      await storage.createActivityLog({
        id: randomUUID(),
        action: "FAQ Deleted",
        details: `FAQ deleted: ${existing.question}`,
        userId: authResult.userRecord?.id ?? null,
        ipAddress: (request.headers.get("x-forwarded-for") ?? null) as string | null,
        userAgent: (request.headers.get("user-agent") ?? null) as string | null,
        createdAt: new Date(),
      });
    } catch (logError) {
      console.warn("[faqs] Failed to log FAQ deletion", logError);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[faqs] Failed to delete FAQ", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to delete FAQ" }, { status: 400 });
  }
}
