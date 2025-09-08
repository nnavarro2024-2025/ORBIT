import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAuthenticatedAndActive } from "./supabaseAuth";
import { sessionService } from "./services/sessionService";
import { emailService } from "./services/emailService";
import { userService } from "./services/userService"; // Import the new userService
import { supabaseAdmin } from "./supabaseAdmin";
import {
  insertFacilityBookingSchema,
  insertTimeExtensionRequestSchema,
  createFacilityBookingSchema,
} from "../shared/schema";

  // =========================
  // 🧪 Create sample data for testing
  // =========================
  async function createSampleData() {
    // Create sample computer stations
    const existingStations = await storage.getAllComputerStations();
    
    if (existingStations.length === 0) {
      const stations = [
        { name: "Station 1", location: "ORZ Lab A", isActive: true },
        { name: "Station 2", location: "ORZ Lab A", isActive: true },
        { name: "Station 3", location: "ORZ Lab B", isActive: true },
        { name: "Station 4", location: "ORZ Lab B", isActive: true },
        { name: "Station 5", location: "ORZ Lab C", isActive: true },
      ];
      for (const station of stations) {
        await storage.createComputerStation(station);
      }
    }

    // Create sample facilities if they don't exist
    let facilities = await storage.getAllFacilities();
    if (facilities.length === 0) {
      const sampleFacilities = [
        { name: "Collaraborative Learning Room 1", description: "Quiet study space with 4 tables", capacity: 8 },
        { name: "Collaraborative Learning Room 2", description: "Computer lab with 10 workstations", capacity: 10 },
        { name: "Board Room", description: "Conference room for group meetings", capacity: 12 },
      ];
      
      for (const facility of sampleFacilities) {
        await storage.createFacility(facility);
      }
      facilities = await storage.getAllFacilities(); // Re-fetch facilities after creation
    }
  }

// =========================
// 🧰 Admin middleware
// =========================
async function requireAdmin(req: any, res: any, next: any) {
  try {
    const userId = req.user.claims.sub;

    // Check Supabase first as the source of truth for roles
    const { data: { user: supabaseUser }, error: supabaseError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (supabaseError || !supabaseUser) {
      if (process.env.NODE_ENV === 'development') {
        console.error("❌ [ADMIN] Error fetching user from Supabase or user not found. Supabase Error:", supabaseError);
      }
      return res.status(403).json({ message: "Admin access required - User not found in Auth system" });
    }

    if (supabaseUser.app_metadata?.role !== 'admin') {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[ADMIN] User ${userId} is not admin in Supabase. Role: ${supabaseUser.app_metadata?.role}`);
      }
      return res.status(403).json({ message: "Admin access required" });
    }

    // If they are an admin in Supabase, ensure their local profile is up-to-date.
    // This part ensures the local database reflects the Supabase role.
    const existingUser = await storage.getUser(userId);
    const userRecord = {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      firstName: supabaseUser.user_metadata?.firstName || "",
      lastName: supabaseUser.user_metadata?.lastName || "",
      profileImageUrl: supabaseUser.user_metadata?.avatar_url || "",
      role: "admin" as const, // Explicitly set to admin if Supabase says so
      status: (existingUser?.status || "active") as "active" | "banned",
      createdAt: existingUser?.createdAt || new Date(supabaseUser.created_at),
      updatedAt: new Date(),
    };
    await storage.upsertUser(userRecord);

    // After syncing, check the role from the local database as well
    const localUser = await storage.getUser(userId);
    if (localUser?.role !== 'admin') {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[ADMIN] User ${userId} is not admin in local DB after sync. Role: ${localUser?.role}`);
      }
      return res.status(403).json({ message: "Admin access required - Local DB role mismatch" });
    }
    
    next();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("❌ [ADMIN] Critical error in requireAdmin middleware:", error);
    }
    return res.status(500).json({ message: "Error checking admin role" });
  }
}

// =========================
// 🌟 Activity tracking middleware
// =========================
async function updateLastActivity(req: any, res: any, next: any) {
  if (req.user && req.user.claims && req.user.claims.sub) {
    try {
      const userId = req.user.claims.sub;
      const activeOrzSession = await storage.getActiveOrzSession(userId);

      if (activeOrzSession) {
        // Only update activity if an ORZ session exists.
        await sessionService.updateActivity(userId);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error in updateLastActivity middleware:", error);
      }
    }
  }
  next();
}

// =========================
// 🔒 Require Active ORZ Session middleware
// =========================
async function requireActiveOrzSession(req: any, res: any, next: any) {
  if (!req.user || !req.user.claims || !req.user.claims.sub) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const userId = req.user.claims.sub;
    const activeOrzSession = await storage.getActiveOrzSession(userId);

    if (!activeOrzSession) {
      return res.status(401).json({ message: "Active ORZ session required. Please start a new session." });
    }
    next();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Error in requireActiveOrzSession middleware:", error);
    }
    res.status(500).json({ message: "Error checking ORZ session status." });
  }
}

// =========================
// 🌟 Register routes
// =========================
export async function registerRoutes(app: Express): Promise<Server> {
  
  
  // Ensure sample data exists
  await createSampleData();

  // -------------------------
  // 🧠 AUTH ROUTES
  // -------------------------
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Fetch user from Supabase Auth to get the latest user_metadata
      const { data: { user: supabaseUser }, error: supabaseError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (supabaseError || !supabaseUser) {
        console.error("Error fetching user from Supabase Auth:", supabaseError?.message);
        return res.status(404).json({ message: "User not found in authentication system." });
      }

      // Sync user data with local database
      const existingUser = await storage.getUser(supabaseUser.id);
      const userRecord = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        firstName: supabaseUser.user_metadata?.first_name || "",
        lastName: supabaseUser.user_metadata?.last_name || "",
        profileImageUrl: supabaseUser.user_metadata?.avatar_url || "",
        role: existingUser?.role || "student", // Preserve existing role or default
        status: existingUser?.status || "active", // Preserve existing status or default
        createdAt: existingUser?.createdAt || new Date(supabaseUser.created_at),
        updatedAt: new Date(),
      };
      const syncedUser = await storage.upsertUser(userRecord); // Use upsertUser to create or update

      res.json(syncedUser);
    } catch (error) {
      console.error("Error fetching or syncing user data:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Basic API info endpoint
  app.get("/api", (req: any, res) => {
    res.json({ 
      message: "TaskMasterPro API",
      version: "1.0.0",
      status: "running",
      timestamp: new Date().toISOString(),
      endpoints: {
        test: "/api/test",
        facilities: "/api/facilities",
        auth: "/api/auth/user"
      }
    });
  });

  // Test endpoint to check if server is running
  app.get("/api/test", (req: any, res) => {
    res.json({ message: "Server is running!", timestamp: new Date().toISOString() });
  });

  // Test endpoint to check authentication
  app.get("/api/test-auth", isAuthenticated, async (req: any, res) => {
    res.json({ 
      message: "Authentication working!", 
      user: req.user.claims.sub,
      timestamp: new Date().toISOString() 
    });
  });

  app.post("/api/auth/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (error || !user) return res.status(404).json({ message: "User not found in Supabase Auth" });

      const existingUser = await storage.getUser(user.id);

      const userRecord = {
        id: user.id,
        email: user.email!,
        firstName: user.user_metadata?.first_name || "",
        lastName: user.user_metadata?.last_name || "",
        profileImageUrl: user.user_metadata?.avatar_url || "",
        role: existingUser?.role || "student", // Preserve role
        status: existingUser?.status || "active",
        createdAt: existingUser?.createdAt || new Date(user.created_at),
        updatedAt: new Date(),
      };

      const updatedUser = await storage.upsertUser(userRecord);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to sync user data" });
    }
  });

  // New: Logout route
  app.post("/api/auth/logout", isAuthenticated, async (req: any, res) => {
    try {
      // Supabase client-side logout is usually handled on the client.
      // If you have server-side sessions, you might destroy them here.
      // For now, we'll just send a success response.
      res.json({ success: true, message: "Logged out successfully." });
    } catch (error) {
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  // -------------------------
  // ⚙️ USER SETTINGS ROUTES
  // -------------------------
  app.put("/api/user/profile", isAuthenticatedAndActive, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, profileImageUrl } = req.body; // Added profileImageUrl
      if (!firstName || !lastName) {
        return res.status(400).json({ message: "First name and last name are required." });
      }
      const updatedUser = await userService.updateUserProfile(userId, firstName, lastName, profileImageUrl); // Pass profileImageUrl
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile." });
    }
  });

  app.put("/api/user/password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { newPassword } = req.body;
      if (!newPassword) {
        return res.status(400).json({ message: "New password is required." });
      }
      // In a real app, you'd validate current password before allowing change
      await userService.changePassword(userId, newPassword);
      res.json({ success: true, message: "Password updated successfully." });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password." });
    }
  });

  app.put("/api/user/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { emailNotifications } = req.body; // Removed theme
      const updatedUser = await userService.updateUserSettings(userId, { emailNotifications }); // Removed theme
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Failed to update settings." });
    }
  });

  // -------------------------
  // 💻 ORZ SESSION ROUTES
  // -------------------------
  app.post("/api/orz/sessions", isAuthenticated, updateLastActivity, async (req: any, res) => {
    try {
      const session = await sessionService.startSession(req.user.claims.sub, req.body.stationId);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.get("/api/orz/sessions/active", isAuthenticatedAndActive, async (req: any, res) => {
    try {
      const session = await storage.getActiveOrzSession(req.user.claims.sub);
      // If no active session, return null or an empty object, not a 401
      if (!session) {
        return res.json(null); // Or { activeSession: false }
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active session" });
    }
  });

  app.post("/api/orz/sessions/:sessionId/activity", isAuthenticated, requireActiveOrzSession, updateLastActivity, async (req: any, res) => {
    try {
      // This route is specifically for ORZ session activity, so it should still use sessionId
      // The general updateLastActivity middleware handles overall user activity
      await sessionService.updateActivity(req.user.claims.sub); // Changed to use userId
      res.json({ success: true });
    }  catch (error) {
      res.status(500).json({ message: "Failed to update activity" });
    }
  });

  app.post("/api/orz/sessions/:sessionId/end", isAuthenticated, requireActiveOrzSession, updateLastActivity, async (req: any, res) => {
    try {
      await sessionService.endSession(req.params.sessionId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to end session" });
    }
  });

  app.get("/api/orz/sessions/history", isAuthenticatedAndActive, async (req: any, res) => {
    try {
      const sessions = await storage.getOrzSessionsByUser(req.user.claims.sub);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch session history" });
    }
  });

  app.get("/api/orz/stations", isAuthenticated, async (req: any, res) => {
    try {
      const stations = await storage.getAllComputerStations();
      res.json(stations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch computer stations" });
    }
  });

  // -------------------------
  // ⏱️ TIME EXTENSION
  // -------------------------
  app.post("/api/orz/time-extension", isAuthenticated, requireActiveOrzSession, updateLastActivity, async (req: any, res) => {
    try {
      const data = insertTimeExtensionRequestSchema.parse({ ...req.body, userId: req.user.claims.sub });
      const request = await storage.createTimeExtensionRequest(data);
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // -------------------------
  // 🏢 FACILITY BOOKINGS
  // -------------------------
  app.post("/api/bookings", isAuthenticatedAndActive, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = createFacilityBookingSchema.parse({
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

  app.get("/api/bookings", isAuthenticatedAndActive, async (req: any, res) => {
    try {
      const bookings = await storage.getFacilityBookingsByUser(req.user.claims.sub);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // New: Admin endpoint to get all bookings
  app.get("/api/admin/bookings", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const bookings = await storage.getAllFacilityBookings(); // Assuming this function exists in storage
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all bookings" });
    }
  });

  app.put("/api/bookings/:bookingId", isAuthenticated, async (req: any, res) => {
    try {
      const { bookingId } = req.params;
      const { purpose, startTime, endTime, facilityId } = req.body;

      // Basic validation for proposed changes
      if (!purpose || !startTime || !endTime) {
        return res.status(400).json({ message: "Purpose, start time, and end time are required." });
      }

      // Parse dates
      const parsedStartTime = new Date(startTime);
      const parsedEndTime = new Date(endTime);

      if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
        return res.status(400).json({ message: "Invalid start or end time format." });
      }

      await storage.updateFacilityBooking(bookingId, {
        purpose,
        facilityId: parseInt(facilityId), // Parse facilityId to integer
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        updatedAt: new Date(),
      });

      res.json({ success: true, message: "Booking updated successfully." });
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking." });
    }
  });

  // Allow a user to cancel their own booking
  app.post("/api/bookings/:bookingId/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const { bookingId } = req.params;
      const userId = req.user.claims.sub;

      const booking = await storage.getFacilityBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found." });
      }
      if (booking.userId !== userId) {
        return res.status(403).json({ message: "You are not allowed to cancel this booking." });
      }

      const now = new Date();
      const start = new Date(booking.startTime);

      // Only allow cancelling pending requests or approved upcoming bookings
      const canCancel =
        booking.status === "pending" || (booking.status === "approved" && start > now);
      if (!canCancel) {
        return res.status(400).json({ message: "Only pending or upcoming approved bookings can be cancelled." });
      }

      await storage.updateFacilityBooking(bookingId, {
        status: "cancelled",
        updatedAt: new Date(),
      });

      // Create booking cancellation alert
      try {
        const user = await storage.getUser(booking.userId);
        const facility = await storage.getFacility(booking.facilityId);
        await storage.createSystemAlert({
          id: randomUUID(),
          type: 'booking',
          severity: 'low',
          title: 'Booking Canceled',
          message: `${user?.email || `User ${booking.userId}`} canceled their booking for ${facility?.name || `Facility ${booking.facilityId}`} from ${new Date(booking.startTime).toLocaleString()} to ${new Date(booking.endTime).toLocaleString()}.`,
          userId: booking.userId,
          isRead: false,
          createdAt: new Date(),
        });
      } catch (e) {
        console.warn('[Alerts] Failed to create booking cancellation alert', e);
      }

      // Log activity for cancellation
      try {
        await storage.createActivityLog({
          id: randomUUID(),
          action: 'Booking Canceled',
          details: `User canceled booking ${bookingId}`,
          userId: userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          createdAt: new Date(),
        });
      } catch (e) {
        console.warn('[Activity] Failed to log booking cancellation', e);
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ message: "Failed to cancel booking." });
    }
  });

  

  

  

  // -------------------------
  // 🔐 ADMIN ACCESS
  // -------------------------
  app.get("/api/admin/stats", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      
      const stats = await storage.getAdminDashboardStats();
      
      res.json(stats);
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/admin/sessions", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const sessions = await storage.getAllActiveSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active sessions" });
    }
  });

  app.get("/api/admin/sessions/history", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const sessions = await storage.getAllEndedSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ended sessions" });
    }
  });

  app.get("/api/admin/alerts", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const alerts = await storage.getSystemAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch system alerts" });
    }
  });

  // Mark alert as read
  app.post("/api/admin/alerts/:alertId/read", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { alertId } = req.params;
      await storage.markAlertAsRead(alertId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark alert as read" });
    }
  });

  app.get("/api/admin/activity", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const activities = await storage.getActivityLogs(20);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  app.get("/api/bookings/pending", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const bookings = await storage.getPendingFacilityBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending bookings" });
    }
  });

  app.post("/api/bookings/:bookingId/approve", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { bookingId } = req.params;
      const { adminResponse } = req.body;
      
      await storage.updateFacilityBooking(bookingId, {
        status: "approved",
        adminResponse,
        updatedAt: new Date(),
      });

      // Fetch booking details for activity log
      const booking = await storage.getFacilityBooking(bookingId);
      let details = `Admin approved booking ${bookingId}`;
      if (booking) {
        const user = await storage.getUser(booking.userId);
        const facility = await storage.getFacility(booking.facilityId);
        const userEmail = user?.email || `ID: ${booking.userId}`;
        const facilityName = facility?.name || `ID: ${booking.facilityId}`;
        details = `Admin approved booking for ${userEmail} at ${facilityName} from ${booking.startTime.toLocaleString()} to ${booking.endTime.toLocaleString()}`;
      }

      // Log the activity
      await storage.createActivityLog({
        id: randomUUID(),
        action: "Booking Approved",
        details: details,
        userId: req.user.claims.sub,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        createdAt: new Date(),
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to approve booking" });
    }
  });

  app.post("/api/bookings/:bookingId/deny", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { bookingId } = req.params;
      const { adminResponse } = req.body;
      
      await storage.updateFacilityBooking(bookingId, {
        status: "denied",
        adminResponse,
        updatedAt: new Date(),
      });

      // Fetch booking details for activity log
      const booking = await storage.getFacilityBooking(bookingId);
      let details = `Admin denied booking ${bookingId}`;
      if (booking) {
        const user = await storage.getUser(booking.userId);
        const facility = await storage.getFacility(booking.facilityId);
        const userEmail = user?.email || `ID: ${booking.userId}`;
        const facilityName = facility?.name || `ID: ${booking.facilityId}`;
        details = `Admin denied booking for ${userEmail} at ${facilityName} from ${booking.startTime.toLocaleString()} to ${booking.endTime.toLocaleString()}`;
      }

      // Log the activity
      await storage.createActivityLog({
        id: randomUUID(),
        action: "Booking Denied",
        details: details,
        userId: req.user.claims.sub,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        createdAt: new Date(),
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to deny booking" });
    }
  });

  app.get("/api/orz/time-extension/pending", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const requests = await storage.getPendingTimeExtensionRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending time extensions" });
    }
  });

  app.post("/api/orz/time-extension/:requestId/approve", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { requestId } = req.params;
      const { adminResponse } = req.body;
      
      

      // Get the time extension request details
      const timeExtensionRequest = await storage.getTimeExtensionRequest(requestId);

      if (!timeExtensionRequest) {
        console.error(`[BACKEND] Time extension request ${requestId} not found.`);
        return res.status(404).json({ message: "Time extension request not found" });
      }

      
      

      // Update the status of the time extension request
      await storage.updateTimeExtensionRequest(requestId, {
        status: "approved",
        adminResponse,
        adminId: req.user.claims.sub,
        updatedAt: new Date(),
      });
      

      // Extend the actual session
      
      await sessionService.extendSession(timeExtensionRequest.sessionId, timeExtensionRequest.requestedMinutes);
      

      // Fetch the associated ORZ session
      const orzSession = await storage.getOrzSession(timeExtensionRequest.sessionId);
      let stationDetails = `session ${timeExtensionRequest.sessionId}`;
      if (orzSession) {
        const computerStation = await storage.getComputerStation(orzSession.stationId);
        if (computerStation) {
          stationDetails = `station ${computerStation.name} (ID: ${computerStation.id})`;
        }
      }

      // Log the activity
      await storage.createActivityLog({
        id: randomUUID(),
        action: "Time Extension Approved",
        details: `Admin approved time extension request ${requestId} for ${stationDetails} by ${timeExtensionRequest.requestedMinutes} minutes.`,
        userId: req.user.claims.sub,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        createdAt: new Date(),
      });
      

      res.json({ success: true });
    } catch (error) {
      console.error("Error approving time extension:", error); // Add logging for errors
      console.error("Detailed error message:", (error as Error).message); // ADDED FOR DEBUGGING
      console.error("Error stack:", (error as Error).stack); // ADDED FOR DEBUGGING
      res.status(500).json({ message: "Failed to approve time extension" });
    }
  });

  app.post("/api/orz/time-extension/:requestId/deny", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { requestId } = req.params;
      const { adminResponse } = req.body;
      
      await storage.updateTimeExtensionRequest(requestId, {
        status: "denied",
        adminResponse,
        adminId: req.user.claims.sub,
        updatedAt: new Date(),
      });

      // Get the time extension request details
      const timeExtensionRequest = await storage.getTimeExtensionRequest(requestId);

      if (!timeExtensionRequest) {
        console.error(`[BACKEND] Time extension request ${requestId} not found.`);
        // Continue processing even if request not found, to log the denial attempt
      }

      // Fetch the associated ORZ session if the request was found
      let stationDetails = `request ${requestId}`;
      if (timeExtensionRequest) {
        const orzSession = await storage.getOrzSession(timeExtensionRequest.sessionId);
        if (orzSession) {
          const computerStation = await storage.getComputerStation(orzSession.stationId);
          if (computerStation) {
            stationDetails = `request ${requestId} for station ${computerStation.name} (ID: ${computerStation.id})`;
          }
        }
      }

      // Log the activity
      await storage.createActivityLog({
        id: randomUUID(),
        action: "Time Extension Denied",
        details: `Admin denied time extension ${stationDetails}.`,
        userId: req.user.claims.sub,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        createdAt: new Date(),
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to deny time extension" });
    }
  });

  // Admin user management
  app.get("/api/admin/users", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers(); // Now fetches all users
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/:userId", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching single user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/admin/users/:userId/promote", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!["student", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role specified. Must be 'student' or 'admin'." });
      }

      // Step 1: Update the role in Supabase Auth (the source of truth)
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: { role: role }
      });

      if (updateError) {
        console.error(`❌ [ADMIN] Error updating role in Supabase for user ${userId}:`, updateError.message);
        return res.status(500).json({ message: "Failed to update user role in authentication system." });
      }

      // Step 2: Update the role in the local database for immediate consistency
      await storage.updateUserRole(userId, role);

      // Step 3: Log the activity
      // Log the activity
      await storage.createActivityLog({
        id: randomUUID(),
        action: "User Role Updated",
        details: `Admin ${req.user.claims.sub} updated user ${userId} to role ${role}`,
        userId: req.user.claims.sub,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        createdAt: new Date(),
      });

      res.json({ success: true, message: `User ${userId} role updated to ${role}.` });
    } catch (error) {
      console.error(`❌ [ADMIN] Failed to update user role for ${req.params.userId}:`, error);
      res.status(500).json({ message: "Failed to update user role." });
    }
  });

  // Development endpoint to promote current user to admin
  app.post("/api/dev/promote-to-admin", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Update the role in Supabase Auth
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: { role: "admin" }
      });

      if (updateError) {
        console.error(`❌ [DEV] Error promoting user to admin in Supabase:`, updateError.message);
        return res.status(500).json({ message: "Failed to promote user to admin in authentication system." });
      }

      // Update the role in the local database
      await storage.updateUserRole(userId, "admin");

      // Log the activity
      await storage.createActivityLog({
        id: randomUUID(),
        action: "User Promoted to Admin (Dev)",
        details: `User ${userId} was promoted to admin via development endpoint`,
        userId: userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        createdAt: new Date(),
      });

      res.json({ success: true, message: "Successfully promoted to admin. Please refresh the page." });
    } catch (error) {
      console.error(`❌ [DEV] Failed to promote user to admin:`, error);
      res.status(500).json({ message: "Failed to promote user to admin." });
    }
  });

  // Ban user endpoint
  app.post("/api/admin/users/:userId/ban", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { reason, duration } = req.body;

      if (!reason || !duration) {
        return res.status(400).json({ message: "Reason and duration are required." });
      }

      // Calculate ban end date based on duration
      let banEndDate: Date | null = null;
      if (duration === "permanent") {
        banEndDate = null; // Permanent ban
      } else if (duration === "7days") {
        banEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else if (duration === "30days") {
        banEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      } else if (duration === "custom" && req.body.customDate) {
        banEndDate = new Date(req.body.customDate);
      } else {
        return res.status(400).json({ message: "Invalid duration specified." });
      }

      // Ban user with reason and duration
      await storage.banUser(userId, reason, banEndDate);

      // End all active ORZ sessions for the banned user
      await storage.endAllUserSessions(userId);

      // Cancel all pending and approved bookings for the banned user
      const cancelledBookingsCount = await storage.cancelAllUserBookings(userId, req.user.claims.sub, reason);

      // Create additional system alert for booking cancellations if any bookings were cancelled
      if (cancelledBookingsCount > 0) {
        await storage.createSystemAlert({
          id: randomUUID(),
          type: "booking",
          severity: "medium",
          title: "Bookings Cancelled Due to User Ban",
          message: `${cancelledBookingsCount} booking(s) for user ${userId} were automatically cancelled due to user ban.`,
          userId: req.user.claims.sub,
          isRead: false,
          createdAt: new Date(),
        });
      }

      // Optionally sign out user from Supabase (invalidate their auth session)
      try {
        // Note: Supabase Admin API doesn't have signUserOut, but we can update user metadata to force re-auth
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          app_metadata: { 
            ...((await supabaseAdmin.auth.admin.getUserById(userId)).data.user?.app_metadata || {}),
            banned: true,
            banned_at: new Date().toISOString()
          }
        });
        console.log(`✅ [ADMIN] Updated banned user ${userId} metadata in Supabase`);
      } catch (signOutError) {
        console.error(`⚠️ [ADMIN] Could not update user ${userId} in Supabase:`, signOutError);
        // Continue with ban process even if metadata update fails
      }

      // Create system alert for user ban
      await storage.createSystemAlert({
        id: randomUUID(),
        type: "user",
        severity: "high",
        title: "User Banned",
        message: `User ${userId} has been banned by admin. Reason: ${reason}. Duration: ${duration === "permanent" ? "Permanent" : duration}. All active sessions terminated and ${cancelledBookingsCount} bookings cancelled.`,
        userId: req.user.claims.sub, // Admin who performed the action
        isRead: false,
        createdAt: new Date(),
      });

      // Log the activity
      await storage.createActivityLog({
        id: randomUUID(),
        action: "User Banned",
        details: `Admin ${req.user.claims.sub} banned user ${userId}. Reason: ${reason}. Duration: ${duration}`,
        userId: req.user.claims.sub,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        createdAt: new Date(),
      });

      res.json({ 
        success: true, 
        message: `User ${userId} has been banned. All active sessions terminated and ${cancelledBookingsCount} bookings cancelled.`,
        details: {
          sessionsTerminated: true,
          bookingsCancelled: cancelledBookingsCount
        }
      });
    } catch (error) {
      console.error(`❌ [ADMIN] Failed to ban user ${req.params.userId}:`, error);
      res.status(500).json({ message: "Failed to ban user." });
    }
  });

  // Unban user endpoint
  app.post("/api/admin/users/:userId/unban", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;

      // Unban user (clears ban reason and dates)
      await storage.unbanUser(userId);

      // Create system alert for user unban
      await storage.createSystemAlert({
        id: randomUUID(),
        type: "user",
        severity: "medium",
        title: "User Unbanned",
        message: `User ${userId} has been unbanned by admin and account access restored.`,
        userId: req.user.claims.sub, // Admin who performed the action
        isRead: false,
        createdAt: new Date(),
      });

      // Log the activity
      await storage.createActivityLog({
        id: randomUUID(),
        action: "User Unbanned",
        details: `Admin ${req.user.claims.sub} unbanned user ${userId}`,
        userId: req.user.claims.sub,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        createdAt: new Date(),
      });

      res.json({ success: true, message: `User ${userId} has been unbanned.` });
    } catch (error) {
      console.error(`❌ [ADMIN] Failed to unban user ${req.params.userId}:`, error);
      res.status(500).json({ message: "Failed to unban user." });
    }
  });

  // -------------------------
  // 🏢 FACILITIES ROUTES
  // -------------------------
  app.get("/api/facilities", async (req: any, res) => {
    try {
      const facilities = await storage.getAllFacilities();
      res.json(facilities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });

  // New: Update Facility
  app.put("/api/facilities/:facilityId", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { facilityId } = req.params;
      const { name, description, capacity, isActive } = req.body;

      if (!name || !description || !capacity) {
        return res.status(400).json({ message: "Name, description, and capacity are required." });
      }

      await storage.updateFacility(parseInt(facilityId), {
        name,
        description,
        capacity,
        isActive,
      });

      res.json({ success: true, message: "Facility updated successfully." });
    } catch (error) {
      console.error("Error updating facility:", error);
      res.status(500).json({ message: "Failed to update facility." });
    }
  });

  // -------------------------
  // ✅ SERVER BOOT
  // -------------------------
  const httpServer = createServer(app);
  return httpServer;
}