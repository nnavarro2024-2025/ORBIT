import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";

import { requireAdminUser } from "@/server/auth";
import { storage } from "@/server/storage";
import type { InsertReportSchedule } from "@shared/schema";
import {
  createReportScheduleSchema,
  buildInsertPayload,
  type CreateReportScheduleInput,
  ZodError,
} from "./utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const schedules = await storage.getReportSchedules();
    return NextResponse.json(schedules, { status: 200 });
  } catch (error) {
    console.error("[admin/report-schedules] Failed to fetch schedules:", error);
    return NextResponse.json({ message: "Failed to fetch report schedules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  let parsed: CreateReportScheduleInput;
  try {
    parsed = createReportScheduleSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: "Invalid request body", issues: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  let payload: InsertReportSchedule;
  try {
    payload = buildInsertPayload(parsed, authResult.user.id);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid request body" }, { status: 400 });
  }

  try {
    const created = await storage.createReportSchedule(payload);
    try {
      const descriptionParts: string[] = [
        `Created report schedule "${created.reportType}"`,
        `frequency: ${created.frequency}`,
        `format: ${created.format}`,
        `active: ${created.isActive !== false ? "yes" : "no"}`,
      ];

      if (created.emailRecipients) {
        const recipients = created.emailRecipients
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        descriptionParts.push(`recipients: ${recipients.length ? recipients.join(", ") : "—"}`);
      }

      await storage.createActivityLog({
        id: randomUUID(),
        action: "Report Schedule Created",
        details: `${descriptionParts.join("; ")} (id: ${created.id})`,
        userId: authResult.userRecord?.id ?? authResult.user.id ?? null,
        ipAddress: (request.headers.get("x-forwarded-for") ?? null) as string | null,
        userAgent: (request.headers.get("user-agent") ?? null) as string | null,
        createdAt: new Date(),
      });
    } catch (logError) {
      console.warn("[admin/report-schedules] Failed to log schedule creation", logError);
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[admin/report-schedules] Failed to create schedule:", error);
    return NextResponse.json({ message: "Failed to create report schedule" }, { status: 500 });
  }
}
