import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { db } from "./db";
import { setupAuth, isAuthenticated, isAuthenticatedAndActive } from "./supabaseAuth";
// ORZ session service removed
import { emailService } from "./services/emailService";
import { userService } from "./services/userService"; // Import the new userService
import { supabaseAdmin } from "./supabaseAdmin";
import {
  insertFacilityBookingSchema,
  insertTimeExtensionRequestSchema,
  createFacilityBookingSchema,
  facilityBookings,
} from "../shared/schema";
import { eq, and, or, gt, lt, asc, lte } from "drizzle-orm";

// School working hours validation
function isWithinLibraryHours(date: Date): boolean {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // 7:30 AM = 7 * 60 + 30 = 450 minutes
  // 5:00 PM = 17 * 60 = 1020 minutes
  const libraryOpenTime = 7 * 60 + 30; // 7:30 AM
  const libraryCloseTime = 17 * 60; // 5:00 PM
  
  return timeInMinutes >= libraryOpenTime && timeInMinutes <= libraryCloseTime;
}

function formatLibraryHours(): string {
  return "7:30 AM - 5:00 PM";
}

  // =========================
  // 🧪 Create sample data for testing
  // =========================
  async function createSampleData() {
    // Create test users in Supabase if they don't exist
    try {
      // Test regular user
      const { data: testUser, error: testUserError } = await supabaseAdmin.auth.admin.createUser({
        email: 'test@uic.edu.ph',
        password: '123',
        email_confirm: true,
        user_metadata: {
          name: 'Test User',
          role: 'user'
        }
      });

      if (testUserError && !testUserError.message.includes('already exists')) {
        console.log('❌ Error creating test user:', testUserError.message);
      } else if (!testUserError) {
        console.log('✅ Test user created: test@uic.edu.ph / password: 123');
      }

      // Test admin user
      const { data: adminUser, error: adminUserError } = await supabaseAdmin.auth.admin.createUser({
        email: 'admin@uic.edu.ph', 
        password: '123',
        email_confirm: true,
        user_metadata: {
          name: 'Admin User',
          role: 'admin'
        },
        app_metadata: {
          role: 'admin'
        }
      });

      if (adminUserError && !adminUserError.message.includes('already exists')) {
        console.log('❌ Error creating admin user:', adminUserError.message);
      } else if (!adminUserError) {
        console.log('✅ Admin user created: admin@uic.edu.ph / password: 123');
      }

    } catch (error) {
      console.log('⚠️ Test users creation skipped (may already exist)');
    }

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
        { name: "Collaraborative Learning Room 2", description: "Computer lab with workstations", capacity: 8 },
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
        // ORZ feature removed - previously updated session activity here.
        // No-op now.
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

  // Background sweep: cancel pending bookings past confirmation deadline
  // This simple in-process interval is intended for development and small deployments.
  // It will be started once when routes are registered.
  if (process.env.NODE_ENV === 'development') {
    const sweepExpiredPendingBookings = async () => {
      try {
        const now = new Date();
        // Find pending bookings where confirmationDeadline is set and <= now
        let expired: any[] = [];
        try {
          expired = await db.select().from(facilityBookings).where(
            and(
              eq(facilityBookings.status, 'pending'),
              // start_time < now
              lt(facilityBookings.startTime as any, now as any)
            )
          );
        } catch (selectErr: any) {
          // If the confirmation_deadline column doesn't exist yet, skip sweep and log once
          if (selectErr && selectErr.code === '42703') {
            console.warn('[Sweep] Skipping expired bookings sweep: confirmation_deadline column not present yet.');
            return;
          }
          throw selectErr;
        }

        for (const b of expired) {
          try {
            await storage.updateFacilityBooking(b.id, {
              status: 'cancelled',
              adminResponse: 'Automatically cancelled: not confirmed within 15 minutes',
              updatedAt: new Date(),
            });

            // Notify user about cancellation
            const user = await storage.getUser(b.userId);
            const facility = await storage.getFacility(b.facilityId);
            if (user && user.email) {
              await emailService.sendBookingStatusUpdate(b as any, user as any, facility?.name || `Facility ${b.facilityId}`);
            }

            // Create a system alert for the user
            await storage.createSystemAlert({
              id: randomUUID(),
              type: 'booking',
              severity: 'low',
              title: 'Booking Auto-Cancelled',
              message: `Your booking request for ${facility?.name || `Facility ${b.facilityId}`} on ${new Date(b.startTime).toLocaleString()} was automatically cancelled because it was not confirmed within 15 minutes.`,
              userId: b.userId,
              isRead: false,
              createdAt: new Date(),
            });
          } catch (innerErr) {
            console.warn('[Sweep] Failed to cancel expired booking or notify user', innerErr);
          }
        }

        // Also find approved bookings where arrival confirmation deadline has passed and arrival not confirmed
        let expiredArrival: any[] = [];
        try {
          expiredArrival = await db.select().from(facilityBookings).where(
            and(
              eq(facilityBookings.status, 'approved'),
              // arrival_confirmation_deadline <= now
              lt(facilityBookings.arrivalConfirmationDeadline as any, now as any),
              // arrival not confirmed
              eq(facilityBookings.arrivalConfirmed as any, false),
              // only consider bookings that have started (or are at start)
              lte(facilityBookings.startTime as any, now as any)
            )
          );
        } catch (selectErr: any) {
          // If the column doesn't exist yet, skip and log once
          if (selectErr && selectErr.code === '42703') {
            console.warn('[Sweep] Skipping expired arrival sweep: arrival_confirmation columns not present yet.');
          } else {
            throw selectErr;
          }
        }

        for (const b of expiredArrival) {
          try {
            await storage.updateFacilityBooking(b.id, {
              status: 'cancelled',
              adminResponse: 'Automatically cancelled: no-show (not confirmed within 15 minutes)',
              updatedAt: new Date(),
            });

            // Notify user about cancellation
            const user = await storage.getUser(b.userId);
            const facility = await storage.getFacility(b.facilityId);
            if (user && user.email) {
              await emailService.sendBookingStatusUpdate(b as any, user as any, facility?.name || `Facility ${b.facilityId}`);
            }

            // Create a system alert for the user
            await storage.createSystemAlert({
              id: randomUUID(),
              type: 'booking',
              severity: 'low',
              title: 'Booking Auto-Cancelled - No-Show',
              message: `Your approved booking for ${facility?.name || `Facility ${b.facilityId}`} on ${new Date(b.startTime).toLocaleString()} was automatically cancelled because no admin confirmed your arrival within 15 minutes of the start time.`,
              userId: b.userId,
              isRead: false,
              createdAt: new Date(),
            });
          } catch (innerErr) {
            console.warn('[Sweep] Failed to cancel expired arrival booking or notify user', innerErr);
          }
        }
      } catch (err) {
        console.warn('[Sweep] Error while checking expired pending bookings', err);
      }
    };

    // Run immediately and then each minute
    sweepExpiredPendingBookings().catch(() => {});
    setInterval(() => { sweepExpiredPendingBookings().catch(() => {}); }, 60 * 1000);
  }

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

      // Check Supabase app_metadata for admin role, fallback to existing role or default to student
      let userRole: "admin" | "student" | "faculty" = "student";
      if (user.app_metadata?.role === "admin") {
        userRole = "admin";
      } else if (existingUser?.role) {
        userRole = existingUser.role;
      }

      const userRecord = {
        id: user.id,
        email: user.email!,
        firstName: user.user_metadata?.first_name || "",
        lastName: user.user_metadata?.last_name || "",
        profileImageUrl: user.user_metadata?.avatar_url || "",
        role: userRole, // Use the determined role
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

  // Endpoint to accept avatar uploads as base64 JSON and upload via service-role (no client-side service key exposure)
  app.post('/api/upload/avatar', isAuthenticated, async (req: any, res) => {
    try {
      const { fileName, mimeType, base64 } = req.body || {};
      if (!fileName || !base64) {
        return res.status(400).json({ message: 'Missing fileName or base64 in request body' });
      }

      // Decode base64 into a buffer
      const buffer = Buffer.from(base64, 'base64');
      const filePath = `avatars/${fileName}`;

      const { data: upData, error: upErr } = await supabaseAdmin.storage.from('avatars').upload(filePath, buffer, {
        upsert: true,
        contentType: mimeType || 'application/octet-stream',
      } as any);

      if (upErr) {
        console.error('Error uploading avatar via admin client:', upErr);
        return res.status(500).json({ message: 'Failed to upload avatar', error: upErr });
      }

      const { data: publicData } = supabaseAdmin.storage.from('avatars').getPublicUrl(filePath);
      let publicUrl = publicData?.publicUrl || null;
      if (publicUrl && publicUrl.includes('/avatars/avatars/')) {
        publicUrl = publicUrl.replace('/avatars/avatars/', '/avatars/');
      }

      return res.status(200).json({ publicUrl });
    } catch (err) {
      console.error('Error in /api/upload/avatar:', err);
      return res.status(500).json({ message: 'Internal server error' });
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

  // ORZ session and time-extension endpoints removed

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

      // Validate library working hours
      if (!isWithinLibraryHours(data.startTime)) {
        return res.status(400).json({ 
          message: `Start time must be within school working hours (${formatLibraryHours()})` 
        });
      }

      if (!isWithinLibraryHours(data.endTime)) {
        return res.status(400).json({ 
          message: `End time must be within school working hours (${formatLibraryHours()})` 
        });
      }

      // Validate same calendar day: start and end must fall on the same date (no multi-day bookings)
      const startDate = new Date(data.startTime);
      const endDate = new Date(data.endTime);
      if (startDate.getFullYear() !== endDate.getFullYear() || startDate.getMonth() !== endDate.getMonth() || startDate.getDate() !== endDate.getDate()) {
        return res.status(400).json({ message: 'Bookings must start and end on the same calendar day. For multi-day events please create separate bookings for each day.' });
      }

      // Check if user already has overlapping bookings (prevent duplicates)
      const userOverlappingBookings = await storage.checkUserOverlappingBookings(
        userId,
        data.startTime,
        data.endTime
      );

      if (userOverlappingBookings.length > 0) {
        const overlapping = userOverlappingBookings[0];
        return res.status(409).json({ 
          message: `You already have a booking during this time period. Existing booking: ${new Date(overlapping.startTime).toLocaleString()} - ${new Date(overlapping.endTime).toLocaleString()}. Please cancel your existing booking first or choose a different time.`,
          existingBooking: {
            id: overlapping.id,
            startTime: overlapping.startTime,
            endTime: overlapping.endTime,
            facilityId: overlapping.facilityId,
            status: overlapping.status
          }
        });
      }

      // Check if user already has any active booking for this facility (prevent facility spam)
      const userFacilityBookings = await storage.checkUserFacilityBookings(
        userId,
        data.facilityId
      );

      if (userFacilityBookings.length > 0) {
        const existingBooking = userFacilityBookings[0];
        return res.status(409).json({ 
          message: `You already have an active booking for this facility. Please cancel your existing booking first before making a new request for the same facility. Existing booking: ${new Date(existingBooking.startTime).toLocaleString()} - ${new Date(existingBooking.endTime).toLocaleString()}`,
          existingBooking: {
            id: existingBooking.id,
            startTime: existingBooking.startTime,
            endTime: existingBooking.endTime,
            facilityId: existingBooking.facilityId,
            status: existingBooking.status
          }
        });
      }

      // Check if facility is available for booking
      const facility = await storage.getFacility(data.facilityId);
      if (!facility) {
        return res.status(404).json({ message: "Facility not found." });
      }
      
      if (!facility.isActive) {
        return res.status(400).json({ message: "This facility is currently unavailable for booking. Please select another facility." });
      }

      // Check if number of participants exceeds facility capacity
      if (data.participants > facility.capacity) {
        return res.status(400).json({ 
          message: `Number of participants (${data.participants}) exceeds facility capacity (${facility.capacity}). Please reduce the number of participants or choose a larger facility.`,
          facilityCapacity: facility.capacity,
          requestedParticipants: data.participants
        });
      }

      // Check for time conflicts with EXISTING bookings (approved or pending).
      // For stricter enforcement we disallow new requests that overlap any active or pending booking
      // to prevent two different users from reserving the same facility/time window.
      const conflictingBookings = await storage.checkBookingConflicts(
        data.facilityId,
        data.startTime,
        data.endTime
      );

      if (conflictingBookings.length > 0) {
        // Provide clearer conflict details (facility name + conflicting ranges)
        const facilityInfo = await storage.getFacility(data.facilityId);
        const conflicts = conflictingBookings.map(booking => ({
          id: booking.id,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status
        }));
        return res.status(409).json({ 
          message: `This time slot for ${facilityInfo?.name || `Facility ${data.facilityId}`} is already booked or has a pending request. Please choose a different time or facility.`,
          facility: { id: data.facilityId, name: facilityInfo?.name || null },
          conflictingBookings: conflicts
        });
      }

      // Enforce minimum booking duration: at least 30 minutes
      try {
        const durationMs = data.endTime.getTime() - data.startTime.getTime();
        const minMs = 30 * 60 * 1000; // 30 minutes
        if (durationMs <= 0) {
          return res.status(400).json({ message: 'End time must be after start time.' });
        }
        if (durationMs < minMs) {
          return res.status(400).json({ message: 'Booking duration must be at least 30 minutes.' });
        }
      } catch (e) {
        // ignore and proceed (parsing/validation above should catch malformed dates)
      }

      // Enforce minimum lead time: booking must be created at least 1 hour before start
      try {
        const minLeadMs = 60 * 60 * 1000; // 1 hour
        if (new Date(data.startTime).getTime() < Date.now() + minLeadMs) {
          return res.status(400).json({ error: 'BookingTooSoon', message: 'Bookings must start at least 1 hour from now. Please choose a later start time.' });
        }
      } catch (e) {
        // ignore malformed dates; validation earlier should handle
      }

  // Set a confirmation deadline for pending bookings: now + 15 minutes
  // No longer set a 15-minute confirmation deadline for pending requests.
  // Pending bookings will be auto-cancelled if they were not approved by their start time.

  const booking = await storage.createFacilityBooking(data);
      const user = await storage.getUser(userId);

      if (user?.email && facility) {
        await emailService.sendBookingConfirmation(booking, user, facility.name);
      }
      // Create booking request alerts: a global/admin alert and a user confirmation alert
      try {
        const facilityInfo = await storage.getFacility(data.facilityId);
        // Global alert for admins (userId omitted so it's visible to admin queries)
        await storage.createSystemAlert({
          id: randomUUID(),
          type: 'booking',
          severity: 'low',
          title: 'New Booking Request',
          message: `${user?.email || `User ${userId}`} requested a booking for ${facilityInfo?.name || `Facility ${data.facilityId}`} from ${new Date(data.startTime).toLocaleString()} to ${new Date(data.endTime).toLocaleString()}.`,
          userId: null,
          isRead: false,
          createdAt: new Date(),
        });

        // User-facing confirmation notification
        await storage.createSystemAlert({
          id: randomUUID(),
          type: 'booking',
          severity: 'low',
          title: 'Booking Request Submitted',
          message: `Your booking request for ${facilityInfo?.name || `Facility ${data.facilityId}`} on ${new Date(data.startTime).toLocaleString()} has been submitted and is pending approval.`,
          userId: userId,
          isRead: false,
          createdAt: new Date(),
        });
      } catch (e) {
        console.warn('[Alerts] Failed to create booking request alerts', e);
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
      const { purpose, startTime, endTime, facilityId, participants } = req.body;
      const userId = req.user.claims.sub;

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

      // Validate library working hours
      if (!isWithinLibraryHours(parsedStartTime)) {
        return res.status(400).json({ 
          message: `Start time must be within school working hours (${formatLibraryHours()})` 
        });
      }

      if (!isWithinLibraryHours(parsedEndTime)) {
        return res.status(400).json({ 
          message: `End time must be within school working hours (${formatLibraryHours()})` 
        });
      }

      // Validate same calendar day for updates as well
      if (parsedStartTime.getFullYear() !== parsedEndTime.getFullYear() || parsedStartTime.getMonth() !== parsedEndTime.getMonth() || parsedStartTime.getDate() !== parsedEndTime.getDate()) {
        return res.status(400).json({ message: 'Bookings must start and end on the same calendar day. Please split multi-day bookings into separate requests.' });
      }

      // Check if user has overlapping bookings (excluding current booking)
      const userOverlappingBookings = await storage.checkUserOverlappingBookings(
        userId,
        parsedStartTime,
        parsedEndTime,
        bookingId
      );

      if (userOverlappingBookings.length > 0) {
        const overlapping = userOverlappingBookings[0];
        return res.status(409).json({ 
          message: `You already have another booking during this time period. Existing booking: ${new Date(overlapping.startTime).toLocaleString()} - ${new Date(overlapping.endTime).toLocaleString()}. Please choose a different time.`,
          existingBooking: {
            id: overlapping.id,
            startTime: overlapping.startTime,
            endTime: overlapping.endTime,
            facilityId: overlapping.facilityId,
            status: overlapping.status
          }
        });
      }

      // Check if user already has any active booking for this facility (excluding current booking)
      const userFacilityBookings = await storage.checkUserFacilityBookings(
        userId,
        parseInt(facilityId),
        bookingId
      );

      if (userFacilityBookings.length > 0) {
        const existingBooking = userFacilityBookings[0];
        return res.status(409).json({ 
          message: `You already have an active booking for this facility. Please cancel your existing booking first before making another request for the same facility. Existing booking: ${new Date(existingBooking.startTime).toLocaleString()} - ${new Date(existingBooking.endTime).toLocaleString()}`,
          existingBooking: {
            id: existingBooking.id,
            startTime: existingBooking.startTime,
            endTime: existingBooking.endTime,
            facilityId: existingBooking.facilityId,
            status: existingBooking.status
          }
        });
      }

      // Check for time conflicts with existing bookings (excluding the current booking)
      const conflictingBookings = await storage.checkBookingConflicts(
        parseInt(facilityId),
        parsedStartTime,
        parsedEndTime,
        bookingId
      );

      if (conflictingBookings.length > 0) {
        const facilityInfo = await storage.getFacility(parseInt(facilityId));
        const conflicts = conflictingBookings.map(booking => ({
          id: booking.id,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status
        }));
        return res.status(409).json({ 
          message: "This time slot is already booked for the selected facility. Please choose a different time.",
          facility: { id: parseInt(facilityId), name: facilityInfo?.name || null },
          conflictingBookings: conflicts
        });
      }

      // Prepare update payload and include participants if provided
  console.log('[server] PUT /api/bookings/:bookingId - incoming body', req.body);
      
      const updatePayload: any = {
        purpose,
        facilityId: parseInt(facilityId), // Parse facilityId to integer
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        updatedAt: new Date(),
      };

      if (participants !== undefined && participants !== null) {
        // Ensure participants is stored as a number
        const parsedParticipants = Number(participants);
        if (!Number.isNaN(parsedParticipants)) {
          updatePayload.participants = parsedParticipants;
        }
      }

  await storage.updateFacilityBooking(bookingId, updatePayload);

  // Return the updated booking so clients can immediately reflect changes
  const updatedBooking = await storage.getFacilityBooking(bookingId);
  console.log('[server] PUT /api/bookings/:bookingId - updatedBooking', updatedBooking);
  res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking." });
    }
  });

  // Get facility booking status (conflicts and current bookings)
  app.get("/api/facilities/:facilityId/bookings", isAuthenticatedAndActive, async (req: any, res) => {
    try {
      const { facilityId } = req.params;
      const now = new Date();
      
      // Get all active bookings for this facility
      const activeBookings = await db.select().from(facilityBookings).where(
        and(
          eq(facilityBookings.facilityId, parseInt(facilityId)),
          or(
            eq(facilityBookings.status, "approved"),
            eq(facilityBookings.status, "pending")
          ),
          gt(facilityBookings.endTime, now) // Only future or current bookings
        )
      ).orderBy(asc(facilityBookings.startTime));

      // Enforce privacy: pending bookings should not be visible to other users.
      // Admins can see all; regular users only see approved bookings or their own pending/approved bookings.
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      if (requestingUser?.role === 'admin') {
        return res.json(activeBookings);
      }

      const filtered = activeBookings.filter((b: any) => {
        if (b.status === 'approved') return true;
        if (b.userId === requestingUserId) return true; // owners can see their pending requests
        return false; // hide other users' pending bookings
      });

      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch facility bookings" });
    }
  });

  // NEW: Public endpoint to get all approved facility bookings (for availability checking)
  app.get("/api/bookings/all", isAuthenticatedAndActive, async (req: any, res) => {
    try {
      const now = new Date();
      
      // Get all approved bookings that are current or future
      // Only return essential information for privacy
      const bookings = await db.select({
        id: facilityBookings.id,
        facilityId: facilityBookings.facilityId,
        startTime: facilityBookings.startTime,
        endTime: facilityBookings.endTime,
        status: facilityBookings.status,
        createdAt: facilityBookings.createdAt
      }).from(facilityBookings).where(
        and(
          or(
            eq(facilityBookings.status, "approved"),
            eq(facilityBookings.status, "pending")
          ),
          gt(facilityBookings.endTime, now) // Only current and future bookings
        )
      ).orderBy(asc(facilityBookings.startTime));

      // For privacy, only admins should see pending bookings across the system.
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      if (requestingUser?.role === 'admin') {
        return res.json(bookings);
      }

      // Non-admins only get approved bookings when viewing all bookings
      const approvedOnly = bookings.filter((b: any) => b.status === 'approved');
      res.json(approvedOnly);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch facility bookings" });
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

      // Allow cancelling pending requests, upcoming approved bookings, and active (in-progress) approved bookings
      const end = new Date(booking.endTime);
      const isActive = booking.status === 'approved' && start <= now && now <= end;
      const canCancel =
        booking.status === "pending" ||
        (booking.status === "approved" && (start > now || isActive));
      if (!canCancel) {
        return res.status(400).json({ message: "Only pending, upcoming, or active approved bookings can be cancelled." });
      }

      await storage.updateFacilityBooking(bookingId, {
        status: "cancelled",
        updatedAt: new Date(),
      });

      // Create booking cancellation alert
      try {
        const user = await storage.getUser(booking.userId);
        const facility = await storage.getFacility(booking.facilityId);
        // Only create a global/admin alert for scheduled (upcoming approved) or active (in-progress approved) bookings
        // so admins are notified when an approved booking is canceled or ended.
        try {
          if (booking.status === 'approved') {
            const startTime = new Date(booking.startTime);
            const endTime = new Date(booking.endTime);
            const isActiveBooking = startTime <= now && now <= endTime;
            const isScheduledBooking = startTime > now;
            if (isActiveBooking || isScheduledBooking) {
              await storage.createSystemAlert({
                id: randomUUID(),
                type: 'booking',
                severity: 'low',
                title: 'Booking Canceled / Ended',
                message: `${user?.email || `User ${booking.userId}`} cancelled/ended their booking for ${facility?.name || `Facility ${booking.facilityId}`} (${new Date(booking.startTime).toLocaleString()} - ${new Date(booking.endTime).toLocaleString()}).`,
                userId: null,
                isRead: false,
                createdAt: new Date(),
              });
            }
          }
        } catch (e) {
          console.warn('[Alerts] Failed to create booking cancellation alert', e);
        }
      } catch (e) {
        console.warn('[Alerts] Failed to create booking cancellation alert', e);
      }

      // Log activity for cancellation
      try {
        const facility = await storage.getFacility(booking.facilityId).catch(() => null);
        await storage.createActivityLog({
          id: randomUUID(),
          action: 'Booking Canceled',
          details: `User canceled booking for ${facility?.name || `Facility ${booking.facilityId}`} (${new Date(booking.startTime).toLocaleString()} - ${new Date(booking.endTime).toLocaleString()})`,
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
      // Fetch all alerts then return only the global/admin ones (userId == null)
      const alerts = await storage.getSystemAlerts();
      // Use explicit null/undefined check so falsy userId values (e.g. empty string) are not treated as global
      const adminAlerts = Array.isArray(alerts) ? alerts.filter(a => a.userId == null) : [];
      res.json(adminAlerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch system alerts" });
    }
  });

  // Mark alert as read
  app.post("/api/admin/alerts/:alertId/read", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { alertId } = req.params;
      // Temporary debug: log the alert row before attempting admin mark-read
      try {
        const alerts = await storage.getSystemAlerts();
        const matched = Array.isArray(alerts) ? alerts.find(a => a.id === alertId) : null;
        console.warn(`[ADMIN READ ATTEMPT] alertId=${alertId} currentUserId=${matched?.userId ?? 'NULL'} isRead=${matched?.isRead}`);
      } catch (e) {
        console.warn('[ADMIN READ ATTEMPT] failed to fetch alert for debug', e);
      }

      // Only mark global/admin alerts as read via admin route
      const affected = await storage.markAlertAsReadForAdmin(alertId);
      if (!affected) {
        console.warn(`[ADMIN READ] No rows updated when marking alert ${alertId} as read via admin route`);
        return res.status(404).json({ message: 'Alert not found or not an admin/global alert' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark alert as read" });
    }
  });

  // User notifications - personal or global alerts accessible to authenticated users
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Only return notifications explicitly targeted to the current user.
      // Global/admin alerts (userId == null) are intended for admins and should not be included here.
      const alerts = await storage.getSystemAlerts();
      const userAlerts = Array.isArray(alerts) ? alerts.filter(a => a.userId === userId) : [];
      res.json(userAlerts);
    } catch (error) {
      console.error('[NOTIFICATIONS] Failed to fetch notifications', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.post("/api/notifications/:alertId/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { alertId } = req.params;
      // Debug: fetch and log the alert row so we can see its userId at the time of request
      const alerts = await storage.getSystemAlerts();
      const alert = Array.isArray(alerts) ? alerts.find(a => a.id === alertId) : null;
      console.warn(`[USER READ ATTEMPT] userId=${userId} alertId=${alertId} alert.userId=${alert?.userId ?? 'NULL'} isRead=${alert?.isRead}`);
      if (!alert) return res.status(404).json({ message: 'Notification not found' });
      // Disallow marking a global/admin alert (userId == null) as read via this user endpoint.
      // Use explicit null/undefined check to avoid treating falsy userId values as global
      if (alert.userId == null) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (alert.userId !== userId) return res.status(403).json({ message: 'Forbidden' });
      // Use scoped write so a user cannot accidentally mark a global/admin alert as read
      const affected = await storage.markAlertAsReadForUser(alertId, userId);
      if (!affected) {
        console.warn(`[NOTIFICATIONS] User ${userId} attempted to mark alert ${alertId} as read but no rows updated`);
        return res.status(404).json({ message: 'Notification not found or not owned by this user' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('[NOTIFICATIONS] Failed to mark notification read', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
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

      // Notify the booking owner about approval
      let createdNotification: any = null;
      try {
        if (booking) {
          const bookingUser = await storage.getUser(booking.userId);
          const facility = await storage.getFacility(booking.facilityId);
          createdNotification = await storage.createSystemAlert({
            id: randomUUID(),
            type: 'booking',
            severity: 'low',
            title: 'Booking Approved',
            message: `Your booking for ${facility?.name || `Facility ${booking.facilityId}`} on ${booking.startTime.toLocaleString()} has been approved.`,
            userId: booking.userId,
            isRead: false,
            createdAt: new Date(),
          });
        }
      } catch (e) {
        console.warn('[Alerts] Failed to create booking approval notification', e);
      }

      // Set arrival confirmation window: admins must confirm arrival within 15 minutes of booking start.
      try {
        if (booking) {
          const arrivalDeadline = new Date(booking.startTime.getTime() + 15 * 60 * 1000); // +15 minutes
          await storage.updateFacilityBooking(booking.id, {
            arrivalConfirmationDeadline: arrivalDeadline,
            arrivalConfirmed: false,
            updatedAt: new Date(),
          } as any);
        }
      } catch (e) {
        console.warn('[Approval] Failed to set arrival confirmation deadline', e);
      }

      // Auto-deny other pending requests that overlap this approved booking window
      try {
        if (booking) {
          // Resolve facility name once for clearer notifications
          const facilityRecord = await storage.getFacility(booking.facilityId);
          const facilityName = facilityRecord?.name || `Facility ${booking.facilityId}`;

          // Find other pending bookings for the same facility that overlap the time window
          const others = await db.select().from(facilityBookings).where(
            and(
              eq(facilityBookings.facilityId, booking.facilityId),
              eq(facilityBookings.status, 'pending'),
              or(
                // other.start < booking.end AND other.end > booking.start => overlap
                and(lt(facilityBookings.startTime, booking.endTime), gt(facilityBookings.endTime, booking.startTime))
              )
            )
          );

          for (const other of others) {
            try {
              await storage.updateFacilityBooking(other.id, {
                status: 'denied',
                adminResponse: 'Automatically denied: time slot already booked (another request was approved)',
                updatedAt: new Date(),
              });

              // Notify that user about denial with a clear reason
              await storage.createSystemAlert({
                id: randomUUID(),
                type: 'booking',
                severity: 'low',
                title: 'Booking Denied - Slot Taken',
                message: `Your booking request for ${facilityName} from ${new Date(other.startTime).toLocaleString()} to ${new Date(other.endTime).toLocaleString()} was denied because another request for this time slot was approved.`,
                userId: other.userId,
                isRead: false,
                createdAt: new Date(),
              });
            } catch (innerErr) {
              console.warn('[Auto-Deny] Failed to deny or notify other pending booking', innerErr);
            }
          }
        }
      } catch (e) {
        console.warn('[Auto-Deny] Error while processing overlapping pending bookings', e);
      }

      res.json({ success: true, notification: createdNotification });
    } catch (error) {
      res.status(500).json({ message: "Failed to approve booking" });
    }
  });

  // Admin confirms arrival for an approved booking
  app.post("/api/bookings/:bookingId/confirm-arrival", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { bookingId } = req.params;
      const booking = await storage.getFacilityBooking(bookingId);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      if (booking.status !== 'approved') return res.status(400).json({ message: 'Only approved bookings can be confirmed for arrival' });

      await storage.updateFacilityBooking(bookingId, {
        arrivalConfirmed: true,
        updatedAt: new Date(),
      } as any);

      // Create an activity log
      await storage.createActivityLog({
        id: randomUUID(),
        action: 'Arrival Confirmed',
        details: `Admin ${req.user.claims.sub} confirmed arrival for booking ${bookingId}`,
        userId: req.user.claims.sub,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        createdAt: new Date(),
      });

      // Notify user
      try {
        const user = await storage.getUser(booking.userId);
        const facility = await storage.getFacility(booking.facilityId);
        if (user) {
          await storage.createSystemAlert({
            id: randomUUID(),
            type: 'booking',
            severity: 'low',
            title: 'Arrival Confirmed',
            message: `An admin has confirmed your arrival for ${facility?.name || `Facility ${booking.facilityId}`}. Enjoy your session!`,
            userId: booking.userId,
            isRead: false,
            createdAt: new Date(),
          });
        }
      } catch (e) {
        console.warn('[Confirm Arrival] Failed to notify user', e);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[Confirm Arrival] Failed', error);
      res.status(500).json({ message: 'Failed to confirm arrival' });
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

      // Notify the booking owner about denial
      let createdDenialNotification: any = null;
      try {
        if (booking) {
          const bookingUser = await storage.getUser(booking.userId);
          const facility = await storage.getFacility(booking.facilityId);
          createdDenialNotification = await storage.createSystemAlert({
            id: randomUUID(),
            type: 'booking',
            severity: 'low',
            title: 'Booking Denied',
            message: `Your booking for ${facility?.name || `Facility ${booking.facilityId}`} on ${booking.startTime.toLocaleString()} has been denied.`,
            userId: booking.userId,
            isRead: false,
            createdAt: new Date(),
          });
        }
      } catch (e) {
        console.warn('[Alerts] Failed to create booking denial notification', e);
      }

      res.json({ success: true, notification: createdDenialNotification });
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
      
  // ORZ feature removed - previously extended session duration here.
  // No-op now.
      

      // Fetch the associated ORZ session
      const orzSession = await storage.getOrzSession(timeExtensionRequest.sessionId);
      let stationDetails = `session ${timeExtensionRequest.sessionId}`;
      if (orzSession) {
        const computerStation = await storage.getComputerStation(orzSession.stationId);
        if (computerStation) {
          stationDetails = `station ${computerStation.name}`;
        }
      }

      // Get admin user data for logging
      const adminUser = await storage.getUser(req.user.claims.sub);
      const adminEmail = adminUser?.email || req.user.claims.sub;

      // Log the activity
      await storage.createActivityLog({
        id: randomUUID(),
        action: "Time Extension Approved",
        details: `Admin approved time extension request for ${stationDetails} by ${timeExtensionRequest.requestedMinutes} minutes by ${adminEmail}`,
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
            stationDetails = `request for station ${computerStation.name}`;
          }
        }
      }

      // Get admin user data for logging
      const adminUser = await storage.getUser(req.user.claims.sub);
      const adminEmail = adminUser?.email || req.user.claims.sub;

      // Log the activity
      await storage.createActivityLog({
        id: randomUUID(),
        action: "Time Extension Denied",
        details: `Admin denied time extension ${stationDetails} by ${adminEmail}`,
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

      // Get the banned user data for alert messages
      const bannedUser = await storage.getUser(userId);
      const bannedUserEmail = bannedUser?.email || userId;

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
          message: `${cancelledBookingsCount} booking(s) for user ${bannedUserEmail} were automatically cancelled due to user ban.`,
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

      // Get admin user data for the alert message
      const adminUser = await storage.getUser(req.user.claims.sub);
      const adminEmail = adminUser?.email || req.user.claims.sub;

      // Create system alert for user ban
      await storage.createSystemAlert({
        id: randomUUID(),
        type: "user",
        severity: "high",
        title: "User Banned",
        message: `User ${bannedUserEmail} has been banned by ${adminEmail}. Reason: ${reason}. Duration: ${duration === "permanent" ? "Permanent" : duration}. All active sessions terminated and ${cancelledBookingsCount} bookings cancelled.`,
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

      // Get admin user data for the alert message
      const adminUser = await storage.getUser(req.user.claims.sub);
      const adminEmail = adminUser?.email || req.user.claims.sub;

      // Get the unbanned user data for the alert message
      const unbannedUser = await storage.getUser(userId);
      const unbannedUserEmail = unbannedUser?.email || userId;

      // Create system alert for user unban
      await storage.createSystemAlert({
        id: randomUUID(),
        type: "user",
        severity: "medium",
        title: "User Unbanned",
        message: `User ${unbannedUserEmail} has been unbanned by ${adminEmail} and account access restored.`,
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

  // New: Update Facility Availability
  app.put("/api/admin/facilities/:facilityId/availability", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { facilityId } = req.params;
  const { isActive, reason } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean value." });
      }

      const facility = await storage.getFacility(parseInt(facilityId));
      if (!facility) {
        return res.status(404).json({ message: "Facility not found." });
      }

  // Persist isActive and optional reason (clear reason when enabling)
      // If trying to make unavailable, prevent during library open hours to avoid conflicts with active bookings
      if (!isActive) {
        const now = new Date();
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
        const libraryOpenTime = 7 * 60 + 30;
        const libraryCloseTime = 17 * 60;
        const isLibraryClosed = currentTimeInMinutes < libraryOpenTime || currentTimeInMinutes > libraryCloseTime;
        if (!isLibraryClosed) {
          return res.status(400).json({ message: 'Cannot mark facility unavailable during school open hours. Please perform this action after hours.' });
        }
      }

      await storage.updateFacility(parseInt(facilityId), { isActive, unavailableReason: isActive ? null : reason || null });

      // Get admin user data for logging
      const adminUser = await storage.getUser(req.user.claims.sub);
      const adminEmail = adminUser?.email || req.user.claims.sub;

      // Log activity
      await storage.createActivityLog({
        id: randomUUID(),
        userId: req.user.claims.sub,
        action: `Facility ${isActive ? 'Enabled' : 'Disabled'}`,
        details: `${isActive ? 'Made available' : `Made unavailable (Reason: ${reason || 'No reason provided'})`} facility "${facility.name}" by ${adminEmail}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        createdAt: new Date(),
      });

      // Create a global system alert so staff and admins are notified of the availability change
      try {
        await storage.createSystemAlert({
          id: randomUUID(),
          type: 'facility',
          severity: isActive ? 'low' : 'medium',
          title: isActive ? 'Facility Made Available' : 'Facility Made Unavailable',
          message: isActive
            ? `${facility.name} has been made available by ${adminEmail}.`
            : `${facility.name} has been made unavailable by ${adminEmail}. Reason: ${reason || 'No reason provided'}`,
          userId: null, // global/admin visible
          isRead: false,
          createdAt: new Date(),
        });
      } catch (alertErr) {
        console.warn('[Alerts] Failed to create facility availability alert', alertErr);
      }

      res.json({ 
        success: true, 
        message: `Facility ${isActive ? 'made available' : 'made unavailable'} successfully.` 
      });
    } catch (error) {
      console.error("Error updating facility availability:", error);
      res.status(500).json({ message: "Failed to update facility availability." });
    }
  });

  // -------------------------
  // ✅ SERVER BOOT
  // -------------------------
  const httpServer = createServer(app);
  return httpServer;
}