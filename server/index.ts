process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { createServer, type Server } from "http";
import { registerRoutes } from "./routes"; // your route registrations
import { setupVite, serveStatic, log } from "./vite";

async function startServer() {
  const app = express();

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Logging middleware for /api routes
  app.use((req, res, next) => {
    const start = Date.now();
    const pathUrl = req.path;
    let capturedJsonResponse: any;

    const originalResJson = res.json.bind(res);
    res.json = (bodyJson: any) => {
      capturedJsonResponse = bodyJson;
      return originalResJson(bodyJson);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (pathUrl.startsWith("/api")) {
        let logLine = `${req.method} ${pathUrl} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
        log(logLine);
      }
    });

    next();
  });

  // Register all your API routes (make sure they use valid paths)
  const server: Server = await registerRoutes(app);

  // Global error handler middleware (must be after routes)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`❌ Error: ${message}`);
    res.status(status).json({ message });
  });

  // Setup frontend serving
  if (app.get("env") === "development") {
    // Vite dev server integration
    await setupVite(app, server);
  } else {
    // Serve production build static files
    serveStatic(app);

    // React Router client-side routing fallback:
    app.get("*", (req, res) => {
      // Only send index.html for non-API routes
      if (!req.path.startsWith("/api")) {
        res.sendFile(path.resolve("dist/public/index.html"));
      } else {
        res.status(404).json({ message: "API route not found" });
      }
    });
  }

  // Start the HTTP server
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`🚀 Server running on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
