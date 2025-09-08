process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import type { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer, Server } from "http";
import { registerRoutes } from "./routes"; // your routes

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
