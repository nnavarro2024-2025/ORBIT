import { storage } from "@/server/core";
import { emailService } from "@/server/emailService";
import { generateReport } from "./reportGenerator";
import type { ReportSchedule } from "@shared/schema";

/**
 * Calculate the next run time for a schedule based on its frequency
 */
export function calculateNextRunAt(schedule: ReportSchedule, fromDate: Date = new Date()): Date {
  const next = new Date(fromDate);

  // Parse time or default to 9:00 AM
  let hours = 9;
  let minutes = 0;
  if (schedule.timeOfDay) {
    const [h, m] = schedule.timeOfDay.split(":").map(Number);
    hours = h;
    minutes = m;
  }

  if (schedule.frequency === "daily") {
    // Next day at specified time
    next.setDate(next.getDate() + 1);
    next.setHours(hours, minutes, 0, 0);
  } else if (schedule.frequency === "weekly") {
    // Next occurrence of dayOfWeek at specified time
    const targetDay = schedule.dayOfWeek ?? 1; // Default to Monday
    const currentDay = next.getDay();
    let daysUntilTarget = (targetDay - currentDay + 7) % 7;
    if (daysUntilTarget === 0) daysUntilTarget = 7; // Next week
    next.setDate(next.getDate() + daysUntilTarget);
    next.setHours(hours, minutes, 0, 0);
  } else if (schedule.frequency === "monthly") {
    // First day of next month at specified time
    next.setMonth(next.getMonth() + 1);
    next.setDate(1);
    next.setHours(hours, minutes, 0, 0);
  }

  return next;
}

/**
 * Process all due report schedules
 */
export async function processDueReportSchedules(): Promise<{ processed: number; failed: number }> {
  console.log("[scheduleProcessor] Starting report schedule processing...");
  
  const now = new Date();
  let processed = 0;
  let failed = 0;

  try {
    // Get all active schedules
    const allSchedules = await storage.getReportSchedules();
    const activeSchedules = allSchedules.filter(s => s.isActive);

    console.log(`[scheduleProcessor] Found ${activeSchedules.length} active schedules`);

    for (const schedule of activeSchedules) {
      // Check if this schedule is due to run
      if (schedule.nextRunAt && new Date(schedule.nextRunAt) <= now) {
        console.log(`[scheduleProcessor] Processing schedule: ${schedule.reportType} (${schedule.id})`);
        
        try {
          await processSchedule(schedule);
          processed++;
        } catch (error) {
          console.error(`[scheduleProcessor] Failed to process schedule ${schedule.id}:`, error);
          failed++;
        }
      }
    }

    console.log(`[scheduleProcessor] Completed. Processed: ${processed}, Failed: ${failed}`);
  } catch (error) {
    console.error("[scheduleProcessor] Fatal error during schedule processing:", error);
  }

  return { processed, failed };
}

/**
 * Process a single report schedule
 */
async function processSchedule(schedule: ReportSchedule): Promise<void> {
  const now = new Date();

  try {
    // Generate the report PDF
    console.log(`[scheduleProcessor] Generating report: ${schedule.reportType}`);
    const pdfBytes = await generateReport(schedule.reportType);

    // Send email to recipients
    const recipients = schedule.emailRecipients
      ? schedule.emailRecipients.split(",").map(r => r.trim()).filter(Boolean)
      : [];

    if (recipients.length > 0) {
      console.log(`[scheduleProcessor] Sending report to ${recipients.length} recipient(s)`);
      await sendReportEmail(schedule.reportType, recipients, pdfBytes);
    } else {
      console.warn(`[scheduleProcessor] No recipients for schedule ${schedule.id}`);
    }

    // Calculate next run time
    const nextRunAt = calculateNextRunAt(schedule, now);

    // Update schedule with last run time and next run time
    await storage.updateReportSchedule(String(schedule.id), {
      lastRunAt: now,
      nextRunAt,
      updatedAt: now,
    } as any);

    console.log(`[scheduleProcessor] Successfully processed schedule ${schedule.id}. Next run: ${nextRunAt.toISOString()}`);
  } catch (error) {
    console.error(`[scheduleProcessor] Error processing schedule ${schedule.id}:`, error);
    throw error;
  }
}

/**
 * Send report via email (stub implementation - logs to console)
 */
async function sendReportEmail(
  reportType: string,
  recipients: string[],
  pdfBytes: Uint8Array
): Promise<void> {
  // This is a stub implementation that logs to console
  // In production, you would use a real email service (nodemailer, SendGrid, etc.)
  
  console.info("[emailService][noop] sendReportEmail", {
    to: recipients.join(", "),
    subject: `Scheduled Report: ${reportType}`,
    reportType,
    pdfSize: `${(pdfBytes.length / 1024).toFixed(2)} KB`,
    timestamp: new Date().toISOString(),
  });

  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 100));
}
