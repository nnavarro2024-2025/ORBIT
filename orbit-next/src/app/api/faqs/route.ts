import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";

import { requireActiveUser, requireAdminUser } from "@/server/core";
import { storage } from "@/server/core";
import { insertFaqSchema } from "@shared/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireActiveUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const faqs = await storage.getFaqs();
    return NextResponse.json({ data: faqs }, { status: 200 });
  } catch (error) {
    console.error("[faqs] Failed to fetch FAQs", error);
    return NextResponse.json({ message: "Failed to fetch FAQs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const parsed = insertFaqSchema.parse(body);
    const faq = await storage.createFaq(parsed);

    try {
      await storage.createActivityLog({
        id: randomUUID(),
        action: "FAQ Created",
        details: `FAQ created: ${faq.question}`,
        userId: authResult.userRecord?.id ?? null,
        ipAddress: (request.headers.get("x-forwarded-for") ?? null) as string | null,
        userAgent: (request.headers.get("user-agent") ?? null) as string | null,
        createdAt: new Date(),
      });
    } catch (logError) {
      console.warn("[faqs] Failed to log FAQ creation", logError);
    }

    return NextResponse.json(faq, { status: 201 });
  } catch (error) {
    console.error("[faqs] Failed to create FAQ", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to create FAQ" }, { status: 400 });
  }
}
