import { NextResponse, type NextRequest } from "next/server";
import { processDueReportSchedules } from "@/server/services/scheduleProcessor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/process-report-schedules
 * 
 * This endpoint should be called periodically (e.g., every 5-15 minutes) by a cron service.
 * 
 * Options for scheduling:
 * 1. Vercel Cron Jobs (vercel.json configuration)
 * 2. External cron services (cron-job.org, EasyCron, etc.)
 * 3. GitHub Actions with scheduled workflows
 * 4. Cloud Functions/Lambda with EventBridge/Cloud Scheduler
 * 
 * For security, you should add authentication (API key, secret token, etc.)
 */
export async function GET(request: NextRequest) {
  // Optional: Add authentication
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[cron/process-report-schedules] Unauthorized access attempt");
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  console.log("[cron/process-report-schedules] Starting scheduled report processing...");

  try {
    const result = await processDueReportSchedules();
    
    return NextResponse.json({
      success: true,
      message: "Report schedules processed",
      processed: result.processed,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  } catch (error) {
    console.error("[cron/process-report-schedules] Fatal error:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to process report schedules",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

/**
 * POST endpoint (optional) - same functionality as GET for flexibility
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
