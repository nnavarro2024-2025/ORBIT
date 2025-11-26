import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";

import { requireAdminUser } from "@/server/core";
import { storage } from "@/server/core";
import {
  updateReportScheduleSchema,
  buildUpdatePayload,
  ZodError,
  type UpdateReportScheduleInput,
} from "../utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id?: string;
  }>;
};

async function getScheduleId(context: RouteContext): Promise<string | null> {
  const params = await context.params;
  const id = params?.id;
  if (!id || typeof id !== "string" || !id.trim()) {
    return null;
  }
  return id;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const authResult = await requireAdminUser(request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  const scheduleId = await getScheduleId(context);
  if (!scheduleId) {
    return NextResponse.json({ message: "Invalid schedule id" }, { status: 400 });
  }

  const existing = await storage.getReportSchedule(scheduleId);
  if (!existing) {
    return NextResponse.json({ message: "Schedule not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  let parsed: UpdateReportScheduleInput;
  try {
    parsed = updateReportScheduleSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: "Invalid request body", issues: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  let updates;
  try {
    updates = buildUpdatePayload(parsed, authResult.user.id);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid request body" }, { status: 400 });
  }

  try {
    const updated = await storage.updateReportSchedule(scheduleId, updates);
    if (!updated) {
      return NextResponse.json({ message: "Schedule not found" }, { status: 404 });
    }
    try {
      const changeDetails: string[] = [];
      const fieldsToCheck: Array<[keyof typeof updates, string]> = [
        ["reportType", "report type"],
        ["frequency", "frequency"],
        ["dayOfWeek", "day of week"],
        ["timeOfDay", "time of day"],
        ["format", "format"],
        ["emailRecipients", "recipients"],
        ["isActive", "active"],
        ["nextRunAt", "next run at"],
        ["lastRunAt", "last run at"],
      ];

      for (const [key, label] of fieldsToCheck) {
        if (key in updates) {
          const before = (existing as Record<string, unknown>)[key];
          const after = (updated as Record<string, unknown>)[key];
          if ((before ?? null) !== (after ?? null)) {
            changeDetails.push(`${label} changed from "${before ?? "—"}" to "${after ?? "—"}"`);
          }
        }
      }

      const summary = changeDetails.length ? changeDetails.join("; ") : "No field changes detected";
      await storage.createActivityLog({
        id: randomUUID(),
        action: "Report Schedule Updated",
        details: `${summary} (id: ${scheduleId})`,
        userId: authResult.userRecord?.id ?? authResult.user.id ?? null,
        ipAddress: (request.headers.get("x-forwarded-for") ?? null) as string | null,
        userAgent: (request.headers.get("user-agent") ?? null) as string | null,
        createdAt: new Date(),
      });
    } catch (logError) {
      console.warn(`[admin/report-schedules] Failed to log schedule update ${scheduleId}:`, logError);
    }
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error(`[admin/report-schedules] Failed to update schedule ${scheduleId}:`, error);
    return NextResponse.json({ message: "Failed to update report schedule" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const authResult = await requireAdminUser(_request.headers);
  if (!authResult.ok) {
    return authResult.response;
  }

  const scheduleId = await getScheduleId(context);
  if (!scheduleId) {
    return NextResponse.json({ message: "Invalid schedule id" }, { status: 400 });
  }

  const existing = await storage.getReportSchedule(scheduleId);
  if (!existing) {
    return NextResponse.json({ message: "Schedule not found" }, { status: 404 });
  }

  try {
    await storage.deleteReportSchedule(scheduleId);
    try {
      await storage.createActivityLog({
        id: randomUUID(),
        action: "Report Schedule Deleted",
        details: `Deleted report schedule "${existing.reportType}" (id: ${existing.id})`,
        userId: authResult.userRecord?.id ?? authResult.user.id ?? null,
        ipAddress: (_request.headers.get("x-forwarded-for") ?? null) as string | null,
        userAgent: (_request.headers.get("user-agent") ?? null) as string | null,
        createdAt: new Date(),
      });
    } catch (logError) {
      console.warn(`[admin/report-schedules] Failed to log schedule deletion ${scheduleId}:`, logError);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`[admin/report-schedules] Failed to delete schedule ${scheduleId}:`, error);
    return NextResponse.json({ message: "Failed to delete report schedule" }, { status: 500 });
  }
}
