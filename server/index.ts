import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import { createServer, Server } from "http";
import { registerRoutes } from "./routes"; // your routes
import { setupVite, serveStatic, log } from "./vite";

async function startServer() {
  const app = express();

  // --- DYNAMIC CORS: allow all origins (adjust for production!) ---
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true); // allow non-browser tools like Postman, curl
        callback(null, true); // allow all origins dynamically
      },
      credentials: true, // allow cookies/auth headers
    })
  );

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

  // Register API routes
  const server: Server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`❌ Error: ${message}`);
    res.status(status).json({ message });
  });

  // Frontend serving & fallback
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);

    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api")) {
        res.sendFile(path.resolve("dist/public/index.html"));
      } else {
        res.status(404).json({ message: "API route not found" });
      }
    });
  }

  // Start server
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`🚀 Server running on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
