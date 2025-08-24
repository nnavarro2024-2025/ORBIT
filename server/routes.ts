import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./supabaseAuth";
import { sessionService } from "./services/sessionService";
import { emailService } from "./services/emailService";
import { supabaseAdmin } from "../client/src/lib/supabaseAdmin";
import {
  insertFacilityBookingSchema,
  insertTimeExtensionRequestSchema,
} from "@shared/schema";

// Helper to seed facilities if none exist
async function ensureFacilitiesExist() {
  let facilities = await storage.getAllFacilities();
  if (facilities.length === 0) {
    console.log("🏢 [FACILITIES] No facilities found, creating sample facilities");
    const sampleFacilities = [
      { name: "Study Room A", description: "Quiet study room with 4 seats", capacity: 4 },
      { name: "Study Room B", description: "Group study room with 8 seats", capacity: 8 },
      { name: "Conference Room", description: "Large conference room for meetings", capacity: 20 },
      { name: "Computer Lab", description: "Computer lab with 15 workstations", capacity: 15 },
    ];

    for (const facility of sampleFacilities) {
      await storage.createFacility(facility);
    }

    facilities = await storage.getAllFacilities();
  }
  return facilities;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // =========================
  // 🧠 AUTH ROUTES
  // =========================
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      console.log("🔐 [AUTH] User found:", user);
      res.json(user);
    } catch (error) {
      console.error("❌ [AUTH] Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (error || !user) {
        console.error("❌ [AUTH SYNC] Failed to get user from Supabase Auth:", error);
        return res.status(404).json({ message: "User not found in Supabase Auth" });
      }

      const userRecord = {
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.firstName || "",
        lastName: user.user_metadata?.lastName || "",
        profileImageUrl: user.user_metadata?.avatar_url || "",
        role: "student" as "student" | "faculty" | "admin",
        status: "active" as "active" | "banned" | "suspended",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedUser = await storage.upsertUser(userRecord);
      console.log("🔄 [AUTH SYNC] User synced:", updatedUser);
      res.json(updatedUser);
    } catch (error) {
      console.error("❌ [AUTH SYNC] Error syncing user:", error);
      res.status(500).json({ message: "Failed to sync user data" });
    }
  });

  // =========================
  // 💻 ORZ SESSION ROUTES
  // =========================
  app.post("/api/orz/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { stationId } = req.body;
      const session = await sessionService.startSession(userId, stationId);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.get("/api/orz/sessions/active", isAuthenticated, async (req: any, res) => {
    try {
      const session = await storage.getActiveOrzSession(req.user.claims.sub);
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active session" });
    }
  });

  app.post("/api/orz/sessions/:sessionId/activity", isAuthenticated, async (req: any, res) => {
    try {
      await sessionService.updateActivity(req.params.sessionId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update activity" });
    }
  });

  app.post("/api/orz/sessions/:sessionId/end", isAuthenticated, async (req: any, res) => {
    try {
      await sessionService.endSession(req.params.sessionId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to end session" });
    }
  });

  app.get("/api/orz/sessions/history", isAuthenticated, async (req: any, res) => {
    try {
      const sessions = await storage.getOrzSessionsByUser(req.user.claims.sub);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch session history" });
    }
  });

  // =========================
  // ⏱️ TIME EXTENSION
  // =========================
  app.post("/api/orz/time-extension", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertTimeExtensionRequestSchema.parse({ ...req.body, userId });
      const request = await storage.createTimeExtensionRequest(data);
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // =========================
  // 🏢 FACILITY BOOKINGS
  // =========================
  app.post("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      await ensureFacilitiesExist();
      const userId = req.user.claims.sub;
      const data = insertFacilityBookingSchema.parse({
        ...req.body,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        userId,
      });
      const booking = await storage.createFacilityBooking(data);

      const user = await storage.getUser(userId);
      const facility = await storage.getFacility(data.facilityId);
      if (user?.email && facility) {
        await emailService.sendBookingConfirmation(booking, user, facility.name);
      }

      res.json(booking);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.get("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const bookings = await storage.getFacilityBookingsByUser(req.user.claims.sub);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // =========================
  // 🔐 ADMIN ACCESS (TEMP BYPASS + DEBUG)
  // =========================
  app.get("/api/bookings/pending", isAuthenticated, async (req: any, res) => {
    const user = await storage.getUser(req.user.claims.sub);

    console.log("🔍 [ADMIN DEBUG] user id:", req.user.claims.sub);
    console.log("🔍 [ADMIN DEBUG] fetched user:", user);

    // TEMP BYPASS: anyone authenticated can fetch
    // Uncomment for real admin-only access:
    // if (user?.role !== "admin") {
    //   console.warn("⚠️ [ADMIN] Access denied for non-admin:", user?.id);
    //   return res.status(403).json({ message: "Admin access required" });
    // }

    try {
      const bookings = await storage.getPendingFacilityBookings();
      console.log("✅ [ADMIN DEBUG] Pending bookings fetched:", bookings.length);
      bookings.forEach((b, i) =>
        console.log(`📌 [BOOKING ${i + 1}]`, b)
      );
      res.json(bookings);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching pending bookings:", error);
      res.status(500).json({ message: "Failed to fetch pending bookings" });
    }
  });

  // =========================
  // 🏢 FACILITIES ROUTES
  // =========================
  app.get("/api/facilities", async (req: any, res) => {
    try {
      const facilities = await ensureFacilitiesExist();
      res.json(facilities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });

  // =========================
  // ✅ SERVER BOOT
  // =========================
  const httpServer = createServer(app);
  console.log("🚀 Express server configured with all routes.");
  return httpServer;
}
