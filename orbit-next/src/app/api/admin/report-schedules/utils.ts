import { z, ZodError } from "zod";

import type { InsertReportSchedule, UpdateReportSchedule } from "@shared/schema";

const dateInputSchema = z.union([z.string().trim().min(1), z.date()]);

export const createReportScheduleSchema = z.object({
  reportType: z.string().trim().min(1, "reportType is required"),
  frequency: z.string().trim().min(1, "frequency is required"),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  timeOfDay: z.string().trim().min(1).optional(),
  format: z.string().trim().min(1).optional(),
  emailRecipients: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
  nextRunAt: dateInputSchema.optional(),
  lastRunAt: dateInputSchema.optional(),
});

export const updateReportScheduleSchema = createReportScheduleSchema.partial();

export type CreateReportScheduleInput = z.infer<typeof createReportScheduleSchema>;
export type UpdateReportScheduleInput = z.infer<typeof updateReportScheduleSchema>;

export function normalizeDateInput(value: unknown): Date | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("Invalid date value");
    }
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error("Invalid date value");
    }
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid date value");
    }
    return date;
  }

  throw new Error("Invalid date value");
}

export function buildInsertPayload(parsed: CreateReportScheduleInput, userId: string): InsertReportSchedule {
  const payload: InsertReportSchedule = {
    reportType: parsed.reportType,
    frequency: parsed.frequency,
    format: parsed.format ?? "pdf",
    createdBy: userId,
    updatedBy: userId,
  };

  if (parsed.dayOfWeek !== undefined) {
    payload.dayOfWeek = parsed.dayOfWeek;
  }

  if (parsed.timeOfDay !== undefined) {
    payload.timeOfDay = parsed.timeOfDay;
  }

  if (parsed.format !== undefined) {
    payload.format = parsed.format;
  }

  if (parsed.emailRecipients !== undefined) {
    payload.emailRecipients = parsed.emailRecipients;
  }

  if (parsed.isActive !== undefined) {
    payload.isActive = parsed.isActive;
  }

  const nextRunAt = normalizeDateInput(parsed.nextRunAt);
  if (nextRunAt !== undefined) {
    payload.nextRunAt = nextRunAt;
  }

  const lastRunAt = normalizeDateInput(parsed.lastRunAt);
  if (lastRunAt !== undefined) {
    payload.lastRunAt = lastRunAt;
  }

  return payload;
}

export function buildUpdatePayload(parsed: UpdateReportScheduleInput, userId: string): UpdateReportSchedule {
  const updates: UpdateReportSchedule = {
    updatedBy: userId,
  };

  if (parsed.reportType !== undefined) {
    updates.reportType = parsed.reportType;
  }

  if (parsed.frequency !== undefined) {
    updates.frequency = parsed.frequency;
  }

  if (parsed.dayOfWeek !== undefined) {
    updates.dayOfWeek = parsed.dayOfWeek;
  }

  if (parsed.timeOfDay !== undefined) {
    updates.timeOfDay = parsed.timeOfDay;
  }

  if (parsed.format !== undefined) {
    updates.format = parsed.format;
  }

  if (parsed.emailRecipients !== undefined) {
    updates.emailRecipients = parsed.emailRecipients;
  }

  if (parsed.isActive !== undefined) {
    updates.isActive = parsed.isActive;
  }

  if (parsed.nextRunAt !== undefined) {
    updates.nextRunAt = normalizeDateInput(parsed.nextRunAt) ?? null;
  }

  if (parsed.lastRunAt !== undefined) {
    updates.lastRunAt = normalizeDateInput(parsed.lastRunAt) ?? null;
  }

  return updates;
}

export { ZodError };
