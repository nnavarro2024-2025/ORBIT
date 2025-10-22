process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import type { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer, Server } from "http";
import { registerRoutes } from "./routes"; // your routes
import { pool } from "./db";

async function startServer() {
  // Dynamic imports for CommonJS modules in ES module environment
  const expressModule = await import("express");
  const corsModule = await import("cors");
  
  const express = (expressModule as any).default || expressModule;
  const cors = (corsModule as any).default || corsModule;
  
  const app = express();

  // --- CORS middleware: allow all origins dynamically ---
  app.use(
    cors({
      origin: true, // allow all origins
      credentials: true, // allow cookies and Authorization headers
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Accept"],
      optionsSuccessStatus: 204,
    })
  );

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Apply small, safe schema fixes in development to avoid startup crashes
  // This is intentionally conservative: it only adds columns if they don't exist
  // and is gated to development to avoid surprising production schema changes.
  if (process.env.NODE_ENV === "development") {
    try {
      await pool.query(`ALTER TABLE facilities ADD COLUMN IF NOT EXISTS unavailable_reason TEXT;`);
      await pool.query(`ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS equipment JSONB;`);
      await pool.query(`ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS confirmation_deadline TIMESTAMP;`);
  await pool.query(`ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS arrival_confirmation_deadline TIMESTAMP;`);
  await pool.query(`ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS arrival_confirmed BOOLEAN DEFAULT false;`);
      console.log("✅ Applied development-safe schema updates (unavailable_reason, equipment)");
      
      // One-time cleanup: remove JSON payloads and duplicate item listings from notification messages
      try {
        // First, remove everything after the first occurrence of " - " (the duplicate item list and JSON)
        const result = await pool.query(`
          UPDATE system_alerts 
          SET message = CASE
            WHEN message ~ ' - \\w+ - .* \\{' THEN 
              REGEXP_REPLACE(message, ' - \\w+.*$', '', 'g')
            WHEN message ~ '\\{"items"' THEN 
              REGEXP_REPLACE(message, ' \\{"items".*$', '', 'g')
            ELSE message
          END
          WHERE (title LIKE '%Equipment%' OR title LIKE '%Needs%')
          AND (message ~ ' - \\w+ - ' OR message ~ '\\{"items"')
        `);
        if (result.rowCount && result.rowCount > 0) {
          console.log(`✅ Cleaned up ${result.rowCount} notification messages (removed duplicate lists and JSON)`);
        }
        
        // Remove global equipment alerts (userId = null) - they should only be per-user alerts
        const deleteResult = await pool.query(`
          DELETE FROM system_alerts 
          WHERE title = 'Equipment or Needs Request'
          AND user_id IS NULL
        `);
        if (deleteResult.rowCount && deleteResult.rowCount > 0) {
          console.log(`✅ Removed ${deleteResult.rowCount} global equipment alerts from booking system alerts`);
        }
        
        // Update activity log titles and details for equipment updates
        const updateActivityResult = await pool.query(`
          UPDATE activity_log 
          SET 
            action = 'Equipment Status Updated',
            details = REGEXP_REPLACE(details, 'marked the requested equipment as (prepared|not available) for', 'updated \\1''s equipment request at', 'i')
          WHERE action = 'Equipment Not Available'
          OR details ~ 'marked the requested equipment as not available'
        `);
        if (updateActivityResult.rowCount && updateActivityResult.rowCount > 0) {
          console.log(`✅ Updated ${updateActivityResult.rowCount} activity log entries to use cleaner formatting`);
        }
      } catch (cleanupErr) {
        console.warn("⚠️ Failed to cleanup notification messages:", cleanupErr);
      }
    } catch (err) {
      console.error("⚠️ Failed to apply development-safe schema updates:", err);
    }
  }

  // Register your API routes
  const server: Server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`❌ Error: ${message}`);
    res.status(status).json({ message });
  });

  // Frontend serving & fallback - ONLY in production
  if (app.get("env") === "production") {
    app.use(express.static(path.resolve("dist")));

    app.get("*", (req: Request, res: Response) => {
      if (!req.path.startsWith("/api")) {
        res.sendFile(path.resolve("dist/index.html"));
      } else {
        res.status(404).json({ message: "API route not found" });
      }
    });
  }

  // Start server
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
