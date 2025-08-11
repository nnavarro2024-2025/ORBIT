process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import { createServer, Server } from "http";
import { registerRoutes } from "./routes"; // your routes
import { setupVite, serveStatic, log } from "./vite";

async function startServer() {
  const app = express();

  // --- CORS middleware with strict origin whitelist ---
  const allowedOrigins = [
    "http://localhost:5000",               // your local frontend URL
    "https://your-production-frontend.com",
    "https://orbit-hklrot71t-james-lemuels-projects.vercel.app" // add your deployed frontend URL here later
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. Postman, curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true, // Allow cookies and Authorization headers
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Accept"],
      optionsSuccessStatus: 204, // For legacy browsers support
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

  // Register your API routes
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
