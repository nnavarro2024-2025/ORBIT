// Admin user management
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
  systemAlerts,
} from "../shared/schema";
import { eq, and, or, gt, lt, asc, lte, isNotNull, ne, sql } from "drizzle-orm";
import express from "express";
const router = express.Router();

// School working hours validation
function isWithinLibraryHours(date: Date): boolean {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // 7:30 AM = 7 * 60 + 30 = 450 minutes
  // 7:00 PM = 19 * 60 = 1140 minutes
  const libraryOpenTime = 7 * 60 + 30; // 7:30 AM
  const libraryCloseTime = 19 * 60; // 7:00 PM
  
  return timeInMinutes >= libraryOpenTime && timeInMinutes <= libraryCloseTime;
}

function formatLibraryHours(): string {
  return "7:30 AM - 7:00 PM";
}

// Small helper to format equipment objects for human-friendly display in alerts/activity
function formatEquipmentForDisplay(eq: any): string {
  try {
    if (!eq) return '';
    const items: string[] = Array.isArray(eq.items) ? eq.items.map((s: string) => String(s).replace(/_/g, ' ').trim()) : [];
    const mapped = items.map(i => {
      const key = String(i || '').toLowerCase().trim();
      if (key === 'whiteboard' || key === 'whiteboard & markers') return 'Whiteboard & Markers';
      if (key === 'projector') return 'Projector';
      if (key === 'extension cord' || key === 'extension_cord') return 'Extension Cord';
      if (key === 'hdmi') return 'HDMI Cable';
      if (key === 'extra chairs' || key === 'extra_chairs') return 'Extra Chairs';
      return i;
    });
    const others = eq.others ? String(eq.others).trim() : '';
    const parts = mapped.filter(Boolean);
    if (others) parts.push(`Others: ${others}`);
    return parts.join(', ');
  } catch (e) {
    return '';
  }
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

      // Test faculty user
      const { data: facultyUser, error: facultyUserError } = await supabaseAdmin.auth.admin.createUser({
        email: 'faculty@uic.edu.ph',
        password: '123',
        email_confirm: true,
        user_metadata: {
          name: 'Faculty User',
          role: 'faculty'
        }
      });

      if (facultyUserError && !facultyUserError.message.includes('already exists')) {
        console.log('❌ Error creating faculty user:', facultyUserError.message);
      } else if (!facultyUserError) {
        console.log('✅ Faculty user created: faculty@uic.edu.ph / password: 123');
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
        { name: "Collaborative Learning Room 1", description: "Quiet study space with 4 tables", capacity: 8, image: "collab1.jpg" },
        { name: "Collaborative Learning Room 2", description: "Computer lab with workstations", capacity: 8, image: "collab2.jpg" },
        { name: "Board Room", description: "Conference room for group meetings", capacity: 12, image: "boardroom.jpg" },
      ];
      // You can update the image field with the correct filename from your image folder later
      for (const facility of sampleFacilities) {
        await storage.createFacility(facility);
      }
      facilities = await storage.getAllFacilities(); // Re-fetch facilities after creation
    }

    // Ensure a Lounge facility exists (create if missing)
    try {
      const hasLounge = facilities.some((f: any) => /lounge/i.test(String(f.name || '')));
      if (!hasLounge) {
        await storage.createFacility({
          name: 'Facility Lounge',
          description: 'Comfortable lounge area for informal study and relaxation.',
          capacity: 10,
          image: 'lounge.jpg',
        });
        // refresh list
        facilities = await storage.getAllFacilities();
        console.log('✅ Created default Lounge facility');
      }
    } catch (e) {
      console.warn('⚠️ Could not ensure Lounge facility exists:', e);
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
  // Admin user management
  app.get("/api/admin/users", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers(); // Now fetches all users
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  
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
              message: `Your booking for ${facility?.name || `Facility ${b.facilityId}`} on ${new Date(b.startTime).toLocaleString()} was automatically cancelled because it was not confirmed within 15 minutes.`,
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
              // arrival_confirmation_deadline is set and < now (deadline must exist and be in the past)
              isNotNull(facilityBookings.arrivalConfirmationDeadline as any),
              lt(facilityBookings.arrivalConfirmationDeadline as any, now as any),
              // arrival not confirmed
              eq(facilityBookings.arrivalConfirmed as any, false),
              // only consider bookings that have started (or are at start)
              lte(facilityBookings.startTime as any, now as any)
              // Removed redundant check: the deadline already encodes startTime + 15 minutes
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
            // Log cancellation details for debugging
            const minutesSinceStart = Math.floor((now.getTime() - new Date(b.startTime).getTime()) / (60 * 1000));
            console.log(`[Sweep] 🔴 CANCELLING booking ${b.id}:`);
            console.log(`  - startTime: ${new Date(b.startTime).toLocaleString()}`);
            console.log(`  - arrivalConfirmationDeadline: ${new Date(b.arrivalConfirmationDeadline).toLocaleString()}`);
            console.log(`  - now: ${now.toLocaleString()}`);
            console.log(`  - minutesSinceStart: ${minutesSinceStart}`);
            console.log(`  - arrivalConfirmed: ${b.arrivalConfirmed}`);
            console.log(`  - status: ${b.status}`);
            
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

        // Sweep: bookings that requested equipment but have started and haven't received an admin Needs response
        try {
          const equipmentPending: any[] = await db.select().from(facilityBookings).where(
            and(
              or(eq(facilityBookings.status, 'pending'), eq(facilityBookings.status, 'approved')),
              // has equipment JSON (not null)
              isNotNull(facilityBookings.equipment as any),
              // started (startTime <= now)
              lte(facilityBookings.startTime as any, now as any),
              // adminResponse does not contain "Needs:"
              // Note: drizzle doesn't have convenient NOT LIKE across JSON; we filter client-side below
            )
          );

          for (const b of equipmentPending) {
            try {
              const resp = String(b?.adminResponse || '');
              if (/Needs:\s*(Prepared|Not Available)/i.test(resp)) continue; // admin already responded

              // No admin response regarding equipment — cancel booking and notify
              await storage.updateFacilityBooking(b.id, { status: 'cancelled', adminResponse: `${b.adminResponse || ''}${b.adminResponse ? ' | ' : ''}Needs: Not Available (auto)`, updatedAt: new Date() } as any);

              const user = await storage.getUser(b.userId);
              const facility = await storage.getFacility(b.facilityId);
              if (user && user.email) {
                try {
                  await emailService.sendBookingStatusUpdate(b as any, user as any, facility?.name || `Facility ${b.facilityId}`);
                } catch (e) {
                  console.warn('[Sweep-Equipment] Failed sending email', e);
                }
              }

              try {
                await storage.createSystemAlert({
                  id: randomUUID(),
                  type: 'booking',
                  severity: 'low',
                  title: 'Booking Auto-Cancelled - Equipment Unavailable',
                  message: `Your booking for ${facility?.name || `Facility ${b.facilityId}`} on ${new Date(b.startTime).toLocaleString()} was automatically cancelled because requested equipment was not confirmed by admins.`,
                  userId: b.userId,
                  isRead: false,
                  createdAt: new Date(),
                });
              } catch (e) {
                console.warn('[Sweep-Equipment] Failed to create system alert', e);
              }
            } catch (e) {
              console.warn('[Sweep-Equipment] Error processing booking', e);
            }
          }
        } catch (e) {
          console.warn('[Sweep-Equipment] Failed to query equipment-pending bookings', e);
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

  // POST sync endpoint used by client to exchange token and ensure local profile is up-to-date.
  // Clients call POST /api/auth/sync with Authorization: Bearer <token>
  app.post('/api/auth/sync', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('[AUTH/SYNC] userId from token:', userId);

      // Fetch user from Supabase Auth to get the latest user_metadata
      const { data: { user: supabaseUser }, error: supabaseError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (supabaseError || !supabaseUser) {
        console.error('Error fetching user from Supabase Auth:', supabaseError?.message);
        return res.status(404).json({ message: 'User not found in authentication system.' });
      }
      console.log('[AUTH/SYNC] Supabase user:', supabaseUser);

      // Enforce allowed email domains (prevent sign-ins from non-UIC accounts)
      try {
        const allowed = (process.env.ALLOWED_EMAIL_DOMAINS || 'uic.edu.ph,uic.edu')
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        const email = (supabaseUser.email || '').toLowerCase();
        const domain = email.split('@')[1] || '';
        if (!domain || !allowed.includes(domain)) {
          console.warn(`[AUTH] Sign-in rejected for non-allowed domain: ${email}`);
          return res.status(403).json({ message: 'Access restricted to UIC accounts only.' });
        }
      } catch (e) {
        console.warn('[AUTH] Failed to validate email domain, allowing by default', e);
      }

      // Sync user data with local database
      const existingUser = await storage.getUser(supabaseUser.id);
      console.log('[AUTH/SYNC] Existing user in DB:', existingUser);
      const userRecord = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        firstName: supabaseUser.user_metadata?.first_name || "",
        lastName: supabaseUser.user_metadata?.last_name || "",
        profileImageUrl: supabaseUser.user_metadata?.avatar_url || "",
        role: existingUser?.role || "student",
        status: existingUser?.status || "active",
        createdAt: existingUser?.createdAt || new Date(supabaseUser.created_at),
        updatedAt: new Date(),
      };

      const syncedUser = await storage.upsertUser(userRecord);
      console.log('[AUTH/SYNC] Synced user returned to client:', syncedUser);
      res.json({ user: syncedUser });
    } catch (error) {
      console.error('Error syncing user via POST /api/auth/sync:', error);
      res.status(500).json({ message: 'Failed to sync user' });
    }
  });

  // Basic API info endpoint
  app.get("/api", (req: any, res) => {
    res.json({ status: 'ok', version: '1.0' });
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
        // SECURITY: Always set status to 'pending' on creation, never trust client input for status
        status: 'pending',
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

      // NOTE: Per new booking flow, we no longer block creation based on existing approved bookings.
      // The client will show an availability grid so users can pick open times. Server still validates
      // times, capacity and business rules (e.g. max duration per facility).

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

      // Enforce facility-specific business rules. Example: Collaborative Learning Rooms are limited
      // to 2 hours per usage. We detect them by id (1 and 2) or by name pattern.
      try {
        const facilityInfo = await storage.getFacility(data.facilityId);
        const durationMs = data.endTime.getTime() - data.startTime.getTime();
        const twoHoursMs = 2 * 60 * 60 * 1000;
        const isCollaborative = (facilityInfo && String(facilityInfo.name || '').toLowerCase().includes('collaborative learning')) || [1,2].includes(data.facilityId);
        if (isCollaborative && durationMs > twoHoursMs) {
          return res.status(400).json({ message: 'Collaborative Learning Rooms are limited to 2 hours per booking. Please shorten your reservation.' });
        }
      } catch (e) {
        // continue; facility checks above already validated existence
      }

      // Restrict certain rooms to faculty-only access (IDs 1 and 2 or by name match)
      try {
        const localUser = await storage.getUser(userId);
        const isFacultyOrAdmin = localUser && (localUser.role === 'faculty' || localUser.role === 'admin');
        const restrictedByName = String(facility.name || '').toLowerCase().includes('board room') || String(facility.name || '').toLowerCase().includes('lounge');
        if (restrictedByName && !isFacultyOrAdmin) {
          return res.status(403).json({ message: 'This facility is restricted to faculty members. Please contact an administrator if you require access.' });
        }
      } catch (e) {
        // ignore role-check failures and let other validations handle it
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

      // Note: minimum lead time validation removed. Server no longer blocks bookings made
      // within one hour of the start time; the client may still choose to warn users for UX.

      // Prevent user from creating a new booking that overlaps any of their existing pending/approved bookings
      // Do the check client-side (JS) after fetching the user's bookings — this avoids DB timestamp comparison pitfalls
      let cancelledConflicts: any[] = [];
      try {
        const allUserBookings = await storage.getFacilityBookingsByUser(userId);
        const nowMs = Date.now();
        const activeBookings = (allUserBookings || []).filter((b: any) => {
          const st = b.startTime ? new Date(b.startTime).getTime() : 0;
          const et = b.endTime ? new Date(b.endTime).getTime() : 0;
          return (b.status === 'approved' || b.status === 'pending') && et > nowMs;
        });

        if (activeBookings.length > 0) {
          const forceCancel = !!(req.body && req.body.forceCancelConflicts);
          if (!forceCancel) {
            return res.status(409).json({
              error: 'UserHasActiveBooking',
              message: 'You already have an active booking. Only one active booking is allowed per user. Please cancel your existing booking before creating a new one.',
              activeBookings: activeBookings.map((b: any) => ({ id: b.id, facilityId: b.facilityId, startTime: b.startTime, endTime: b.endTime, status: b.status }))
            });
          }

          // If forceCancel, cancel existing active bookings first
          for (const b of activeBookings) {
            try {
              const endTime = new Date(b.endTime).getTime();
              if (endTime <= nowMs) continue;
              await storage.updateFacilityBooking(b.id, { status: 'cancelled', adminResponse: `Cancelled by user (${userId}) to create a new booking`, updatedAt: new Date() } as any);
              cancelledConflicts.push({ id: b.id, facilityId: b.facilityId, startTime: b.startTime, endTime: b.endTime, status: 'cancelled' });
            } catch (e) {
              console.warn('Failed to cancel existing active booking', b.id, e);
            }
          }
        }

        // Additionally ensure there are no bookings that overlap the requested slot specifically
        const overlapping = (allUserBookings || []).filter((b: any) => {
          const st = b.startTime ? new Date(b.startTime).getTime() : 0;
          const et = b.endTime ? new Date(b.endTime).getTime() : 0;
          return (b.status === 'approved' || b.status === 'pending') && (st < data.endTime.getTime()) && (et > data.startTime.getTime());
        });

        if (overlapping.length > 0) {
          const forceCancel = !!(req.body && req.body.forceCancelConflicts);
          if (!forceCancel) {
            return res.status(409).json({
              error: 'UserHasOverlappingBooking',
              message: 'You already have another booking (pending or approved) that overlaps this time. Please cancel or wait for your existing booking to end before creating a new one.',
              conflictingBookings: overlapping.map((b: any) => ({ id: b.id, facilityId: b.facilityId, startTime: b.startTime, endTime: b.endTime, status: b.status }))
            });
          }

          for (const b of overlapping) {
            try {
              const endTime = new Date(b.endTime).getTime();
              if (endTime <= nowMs) continue;
              await storage.updateFacilityBooking(b.id, { status: 'cancelled', adminResponse: `Cancelled by user (${userId}) to create a new booking`, updatedAt: new Date() } as any);
              cancelledConflicts.push({ id: b.id, facilityId: b.facilityId, startTime: b.startTime, endTime: b.endTime, status: 'cancelled' });
            } catch (e) {
              console.warn('Failed to cancel overlapping user booking', b.id, e);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to fetch or check user bookings', e);
      }

  // Set a confirmation deadline for pending bookings: now + 15 minutes
  // No longer set a 15-minute confirmation deadline for pending requests.
  // Pending bookings will be auto-cancelled if they were not approved by their start time.

  let booking;
      try {
        booking = await storage.createFacilityBooking(data);
      } catch (err: any) {
        // Translate storage-level conflict into HTTP 409
        if (err && err.name === 'ConflictError') {
          try {
            const facilityInfo = await storage.getFacility(data.facilityId);
            const conflicts = (err.conflicts || []).map((b: any) => ({ id: b.id, startTime: b.startTime, endTime: b.endTime, status: b.status, userId: b.userId }));
            return res.status(409).json({ message: 'This time slot for the selected facility is already booked. Please choose a different time.', facility: { id: facilityInfo?.id, name: facilityInfo?.name }, conflictingBookings: conflicts });
          } catch (e) {
            return res.status(409).json({ message: 'This time slot for the selected facility is already booked. Please choose a different time.', conflictingBookings: err.conflicts || [] });
          }
        }
        throw err;
      }
      const user = await storage.getUser(userId);

      if (user?.email && facility) {
        await emailService.sendBookingConfirmation(booking, user, facility.name);
      }
  // Create booking alerts: a global/admin alert and a user confirmation alert
      try {
        const facilityInfo = await storage.getFacility(data.facilityId);
        // Global alert for admins (userId omitted so it's visible to admin queries)
        // Show user email in notification
        const userEmail = user?.email || 'Unknown User';
        const notificationMessage = `${userEmail} scheduled a booking for ${facilityInfo?.name || `Facility ${data.facilityId}`} from ${new Date(data.startTime).toLocaleString()} to ${new Date(data.endTime).toLocaleString()}.`;
        await storage.createSystemAlert({
          id: randomUUID(),
          type: 'booking',
          severity: 'low',
          title: 'Booking Created',
          // Use 'scheduled' to reflect the current flow (bookings are scheduled immediately)
          message: notificationMessage,
          userId: null,
          isRead: false,
          createdAt: new Date(),
        });

        // User-facing confirmation notification: bookings are now scheduled immediately
        await storage.createSystemAlert({
          id: randomUUID(),
          type: 'booking',
          severity: 'low',
          title: 'Booking Scheduled',
          message: `Your booking for ${facilityInfo?.name || `Facility ${data.facilityId}`} on ${new Date(data.startTime).toLocaleString()} has been scheduled.`,
          userId: userId,
          isRead: false,
          createdAt: new Date(),
        });

        // If booking contains equipment/needs, create a user-management alert instead
        try {
          const eq = (booking as any).equipment;
          const hasItems = eq && Array.isArray(eq.items) && eq.items.length > 0;
          const hasOthers = eq && eq.others;
            if (hasItems || hasOthers) {
            // Get facility info for better message
            const bookingTime = new Date(data.startTime).toLocaleString();
            const userEmail = user?.email || 'User';
            
            // Clean up old equipment notifications for this user to avoid confusion
            try {
              const oldAlerts = await storage.getSystemAlerts();
              const oldEquipmentAlerts = oldAlerts.filter(a => 
                a.userId === userId && 
                a.title && 
                (a.title.includes('Equipment') || a.title.includes('Needs'))
              );
              for (const old of oldEquipmentAlerts) {
                await storage.updateSystemAlert(old.id, { isRead: true } as any);
              }
            } catch (e) {
              console.warn('[Booking] Failed to clean up old equipment alerts', e);
            }
            
            // Message that works for both user view and admin view
            // Format: "User submitted an equipment request for Facility on Date. [Equipment: JSON]"
            let message = `${userEmail} submitted an equipment request for ${facilityInfo?.name || `Facility ${data.facilityId}`} on ${bookingTime}.`;
            
            // Append JSON for frontend parsing, same format as admin updates use
            message += ` [Equipment: ${JSON.stringify(eq)}]`;
            
            console.log('\n╔════════════════════════════════════════════════════════════════╗');
            console.log('║  EQUIPMENT NOTIFICATION CREATED                                ║');
            console.log('╠════════════════════════════════════════════════════════════════╣');
            console.log('  User:', userEmail);
            console.log('  Facility:', facilityInfo?.name || `Facility ${data.facilityId}`);
            console.log('  Time:', bookingTime);
            console.log('  ────────────────────────────────────────────────────────────');
            console.log('  Equipment Data:');
            console.log('  ', JSON.stringify(eq, null, 2));
            console.log('  ────────────────────────────────────────────────────────────');
            console.log('  Full Message:');
            console.log('  ', message);
            console.log('╚════════════════════════════════════════════════════════════════╝\n');
            
            await storage.createSystemAlert({
              id: randomUUID(),
              type: 'user',
              severity: 'low',
              title: `Equipment Needs Submitted`,
              message: message,
              userId: userId, 
              isRead: false,
              createdAt: new Date(),
            });
          }
        } catch (e) {
          console.warn('[Alerts] Failed to create equipment needs alert', e);
        }
      } catch (e) {
        console.warn('[Alerts] Failed to create booking alerts', e);
      }

      // Set arrival confirmation deadline for all new bookings
      // This ensures the 15-minute rule applies from the start
      try {
        if (booking && booking.id) {
          const arrivalDeadline = new Date(booking.startTime.getTime() + 15 * 60 * 1000); // +15 minutes from start
          await storage.updateFacilityBooking(booking.id, {
            arrivalConfirmationDeadline: arrivalDeadline,
            arrivalConfirmed: false,
            status: 'approved', // Auto-approve all bookings
            updatedAt: new Date(),
          } as any);
          // Refresh booking data to include the updated fields
          booking = await storage.getFacilityBooking(booking.id) as any;
        }
      } catch (e) {
        console.warn('[Booking] Failed to set arrival confirmation deadline', e);
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

  // New: Availability endpoint
  // Returns per-facility timeslots between 7:30 and 19:00 for a given date (query param `date=YYYY-MM-DD` or defaults to today).
  // Each slot is 30 minutes and is marked as 'available' or 'scheduled' with booking details when scheduled.
  app.get('/api/availability', isAuthenticated, async (req: any, res) => {
    try {
      const dateParam = String(req.query.date || '').trim();
      const targetDate = dateParam ? new Date(dateParam) : new Date();
      // normalize to midnight local
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const day = targetDate.getDate();

      // Build the window: 7:30 AM to 7:00 PM (19:00)
      const startWindow = new Date(year, month, day, 7, 30, 0, 0);
      const endWindow = new Date(year, month, day, 19, 0, 0, 0);

      // load facilities and bookings in this date range
      const facilities = await storage.getAllFacilities();
      const bookings = await storage.getFacilityBookingsByDateRange(startWindow, endWindow);

      // helper: generate 30-minute slots between startWindow and endWindow
      const slots: { start: Date; end: Date }[] = [];
      let cursor = new Date(startWindow);
      while (cursor < endWindow) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor.getTime() + 30 * 60 * 1000);
        slots.push({ start: slotStart, end: slotEnd });
        cursor = slotEnd;
      }

      // Determine requester info so we can decide which pending bookings to expose
      const requestingUserId = req.user?.claims?.sub;
      let requestingUser: any = null;
      try {
        if (requestingUserId) requestingUser = await storage.getUser(requestingUserId);
      } catch (e) {
        requestingUser = null;
      }

      const result = facilities.map((f: any) => {
        // Check if facility is unavailable on this specific date
        const checkDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        let isUnavailableToday = false;
        
        if (f.unavailableDates && Array.isArray(f.unavailableDates)) {
          isUnavailableToday = f.unavailableDates.some((range: any) => {
            try {
              const start = range.startDate || range.start;
              const end = range.endDate || range.end;
              if (!start || !end) return false;
              return checkDate >= start && checkDate <= end;
            } catch (e) {
              return false;
            }
          });
        }

        // For collaborative rooms, expose maxUsageHours for client guidance
        const isCollaborative = String(f.name || '').toLowerCase().includes('collaborative learning') || [1,2].includes(f.id);
        const maxUsageHours = isCollaborative ? 2 : null;

        // Only consider bookings that should affect availability for this requester:
        // - Always include approved bookings
        // - Include pending bookings only if they belong to the requesting user or the requester is an admin
        const facilityBookings = (bookings || []).filter((b: any) => {
          try {
            if (b.facilityId !== f.id) return false;
            if (b.status === 'cancelled' || b.status === 'denied') return false;
                // For availability we show scheduled slots to everyone so that other users
                // cannot attempt to book the same time. We will still avoid exposing
                // sensitive user info in this endpoint.
                if (b.status === 'approved' || b.status === 'pending') return true;
          } catch (e) {
            return false;
          }
          return false;
        });

        const slotStates = slots.map(s => {
          // Find bookings that overlap this slot
          const overlapping = facilityBookings.filter((b: any) => {
            try {
              const existingStart = new Date(b.startTime);
              const existingEnd = new Date(b.endTime);
              return s.start < existingEnd && s.end > existingStart;
            } catch (e) {
              return false;
            }
          });

          if (overlapping.length > 0) {
            // Deduplicate bookings by ID to avoid showing same booking multiple times
            const uniqueBookings = Array.from(
              new Map(overlapping.map(b => [b.id, b])).values()
            );
            
            return {
              start: s.start.toISOString(),
              end: s.end.toISOString(),
              status: 'scheduled',
              bookings: uniqueBookings.map((b: any) => ({ id: b.id, startTime: b.startTime, endTime: b.endTime, status: b.status, userId: b.userId }))
            };
          }

          return { start: s.start.toISOString(), end: s.end.toISOString(), status: 'available' };
        });

        return {
          facility: { 
            id: f.id, 
            name: f.name, 
            capacity: f.capacity, 
            isActive: f.isActive && !isUnavailableToday, // Mark as inactive if unavailable on this date
            unavailableReason: isUnavailableToday ? f.unavailableReason : null
          },
          maxUsageHours,
          slots: slotStates,
        };
      });

      res.json({ date: `${year}-${(month+1).toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`, windowStart: startWindow.toISOString(), windowEnd: endWindow.toISOString(), data: result });
    } catch (error) {
      console.error('Error building availability:', error);
      res.status(500).json({ message: 'Failed to compute availability' });
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
      const reqId = randomUUID();
      const { bookingId } = req.params;
      const { purpose, startTime, endTime, facilityId, participants } = req.body;
      const userId = req.user.claims.sub;

      // Ensure the booking exists and that the requester is allowed to update it
      const existingBooking = await storage.getFacilityBooking(bookingId);
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found." });
      }
      
      // Check if the requesting user is an admin
      let isAdmin = false;
      let requestingUser = null;
      // Only the booking owner or an admin may modify a booking
      if (String(existingBooking.userId) !== String(userId)) {
        try {
          requestingUser = await storage.getUser(userId);
          isAdmin = requestingUser?.role === 'admin';
          if (!isAdmin) {
            return res.status(403).json({ message: "You are not allowed to update this booking." });
          }
        } catch (e) {
          return res.status(403).json({ message: "You are not allowed to update this booking." });
        }
      } else {
        // Owner is updating their own booking - check if they're also an admin
        try {
          requestingUser = await storage.getUser(userId);
          isAdmin = requestingUser?.role === 'admin';
        } catch (e) {
          // ignore, they're the owner
        }
      }

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

      // Validate library working hours (admins can bypass this for force-active operations)
      if (!isAdmin) {
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
      }

      // Validate same calendar day for updates as well (admins can bypass for force-active)
      if (!isAdmin && (parsedStartTime.getFullYear() !== parsedEndTime.getFullYear() || parsedStartTime.getMonth() !== parsedEndTime.getMonth() || parsedStartTime.getDate() !== parsedEndTime.getDate())) {
        return res.status(400).json({ message: 'Bookings must start and end on the same calendar day. Please split multi-day bookings into separate requests.' });
      }

      // For overlap checks, use the booking owner's ID, not the requesting admin's ID
      const bookingOwnerId = existingBooking.userId;

      // Check if user has overlapping bookings (excluding current booking)
      // Admins can bypass this check for force-active operations
      if (!isAdmin) {
        const userOverlappingBookings = await storage.checkUserOverlappingBookings(
          bookingOwnerId,
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
          bookingOwnerId,
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
      }

      // Check for time conflicts with existing APPROVED bookings (excluding the current booking)
      const conflictingBookings = await storage.checkApprovedBookingConflicts(
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
          message: "This time slot for the selected facility is already booked. Please choose a different time.",
          facility: { id: parseInt(facilityId), name: facilityInfo?.name || null },
          conflictingBookings: conflicts
        });
      }

      // Prepare update payload and include participants if provided
  console.log(`[server][${reqId}] PUT /api/bookings/:bookingId - incoming body`, req.body);
      
      const updatePayload: any = {
        purpose,
        facilityId: parseInt(facilityId), // Parse facilityId to integer
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        updatedAt: new Date(),
      };

      // Handle status if provided (for admin force-active testing)
      if (req.body.status && ['pending', 'approved', 'denied', 'cancelled'].includes(req.body.status)) {
        updatePayload.status = req.body.status;
      }

      // Handle arrivalConfirmed if provided (for admin force-active testing)
      if (req.body.arrivalConfirmed !== undefined) {
        updatePayload.arrivalConfirmed = Boolean(req.body.arrivalConfirmed);
      }

      // Handle arrivalConfirmationDeadline if provided (for admin force-active testing)
      if (req.body.arrivalConfirmationDeadline) {
        const deadline = new Date(req.body.arrivalConfirmationDeadline);
        console.log(`[server][${reqId}] PUT /api/bookings/:bookingId - Setting arrivalConfirmationDeadline:`, deadline);
        if (!isNaN(deadline.getTime())) {
          updatePayload.arrivalConfirmationDeadline = deadline;
        }
      }

      // Normalize and include equipment if provided
      try {
        const incomingEquipment = req.body && req.body.equipment;
        if (incomingEquipment) {
          const normalized = {
            items: Array.isArray(incomingEquipment.items) ? incomingEquipment.items.map((i: any) => String(i)) : [],
            others: incomingEquipment.others ? String(incomingEquipment.others) : null,
          };
          updatePayload.equipment = normalized;
          console.log(`[server][${reqId}] PUT /api/bookings/:bookingId - incomingEquipment`, incomingEquipment);
          console.log(`[server][${reqId}] PUT /api/bookings/:bookingId - normalizedEquipment`, normalized);
        }
      } catch (e) {
        console.warn('[server] PUT /api/bookings - failed to normalize equipment', e);
      }

      if (participants !== undefined && participants !== null) {
        // Ensure participants is stored as a number
        const parsedParticipants = Number(participants);
        if (!Number.isNaN(parsedParticipants)) {
          updatePayload.participants = parsedParticipants;
        }
      }

  // DEBUG: log final payload being sent to storage
  try { console.log(`[server][${reqId}] PUT /api/bookings/:bookingId - updatePayload`, updatePayload); } catch (e) {}
  await storage.updateFacilityBooking(bookingId, updatePayload);

  // DEBUG: Verify the update was saved correctly
  try {
    const verifyBooking = await storage.getFacilityBooking(bookingId);
    console.log(`[server][${reqId}] PUT /api/bookings/:bookingId - AFTER UPDATE - arrivalConfirmationDeadline:`, verifyBooking?.arrivalConfirmationDeadline);
    console.log(`[server][${reqId}] PUT /api/bookings/:bookingId - AFTER UPDATE - arrivalConfirmed:`, verifyBooking?.arrivalConfirmed);
    console.log(`[server][${reqId}] PUT /api/bookings/:bookingId - AFTER UPDATE - startTime:`, verifyBooking?.startTime);
  } catch (e) {
    console.warn('[server] PUT /api/bookings/:bookingId - failed to verify update', e);
  }

  // Fallback: if equipment present, perform an explicit DB write to the equipment column
  try {
    if (updatePayload && updatePayload.equipment) {
  try {
  console.log(`[server][${reqId}] PUT /api/bookings/:bookingId - performing explicit equipment write`, bookingId, updatePayload.equipment);
  await db.update(facilityBookings).set({ equipment: updatePayload.equipment }).where(eq(facilityBookings.id, bookingId));
        // Immediately read back the equipment column to validate the write
        try {
          const [row] = await db.select({ equipment: facilityBookings.equipment }).from(facilityBookings).where(eq(facilityBookings.id, bookingId));
          console.log(`[server][${reqId}] PUT /api/bookings/:bookingId - equipment after explicit write`, row?.equipment);
        } catch (e) {
          console.warn('[server] PUT /api/bookings - failed to read back equipment after explicit write', e);
        }
      } catch (e) {
        console.warn('[server] PUT /api/bookings/:bookingId - explicit equipment write failed', e);
      }
    }
  } catch (e) {}

  // Return the updated booking so clients can immediately reflect changes
  const updatedBooking = await storage.getFacilityBooking(bookingId);
  console.log(`[server][${reqId}] PUT /api/bookings/:bookingId - updatedBooking`, updatedBooking);
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
        createdAt: facilityBookings.createdAt,
        userId: facilityBookings.userId,
      }).from(facilityBookings).where(
        and(
          or(
            eq(facilityBookings.status, "approved"),
            eq(facilityBookings.status, "pending")
          ),
          gt(facilityBookings.endTime, now) // Only current and future bookings
        )
      ).orderBy(asc(facilityBookings.startTime));
      // Attach userEmail for each booking by resolving the user record.
      const bookingsWithEmail = await Promise.all(bookings.map(async (b: any) => {
        try {
          const u = await storage.getUser(b.userId).catch(() => null);
          return { ...b, userEmail: u?.email || null };
        } catch (e) {
          return { ...b, userEmail: null };
        }
      }));

      // For privacy, only admins should see pending bookings across the system.
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      if (requestingUser?.role === 'admin') {
        return res.json(bookingsWithEmail);
      }

      // Non-admins: return approved bookings and any pending bookings owned by the requesting user
      const filtered = bookingsWithEmail.filter((b: any) => {
        if (b.status === 'approved') return true;
        if (b.userId === requestingUserId) return true; // owners can see their pending requests
        return false;
      });
      res.json(filtered);
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
  // variables declared here so they are available to downstream dedupe/update blocks
  let bookingAfter: any = null;
  let ownerUser: any = null;
  let facility: any = null;
  let structuredNote: any = null;
  let baseWhen: string = '';
  let notifyMessage: string | null = null;
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
              const alertTitle = isActiveBooking ? 'Booking Ended' : 'Booking Cancelled';
              const alertVerb = isActiveBooking ? 'ended' : 'cancelled';
              await storage.createSystemAlert({
                id: randomUUID(),
                type: 'booking',
                severity: 'low',
                title: alertTitle,
                message: `${user?.email || `User ${booking.userId}`} ${alertVerb} their booking for ${facility?.name || `Facility ${booking.facilityId}`} (${new Date(booking.startTime).toLocaleString()} - ${new Date(booking.endTime).toLocaleString()}).`,
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
        const wasActive = (new Date(booking.startTime) <= now && now <= new Date(booking.endTime));
        await storage.createActivityLog({
          id: randomUUID(),
          action: wasActive ? 'Booking Ended' : 'Booking Cancelled',
          details: `User ${wasActive ? 'ended' : 'cancelled'} booking for ${facility?.name || `Facility ${booking.facilityId}`} (${new Date(booking.startTime).toLocaleString()} - ${new Date(booking.endTime).toLocaleString()})`,
          userId: userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          createdAt: new Date(),
        });
      } catch (e) {
        console.warn('[Activity] Failed to log booking cancellation/ending', e);
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
      // Fetch all alerts then return global alerts (userId == null) AND equipment/needs alerts (for admin visibility)
      const alerts = await storage.getSystemAlerts();
      // Include: global alerts + equipment/needs requests (user-specific alerts that admins need to see)
      const adminAlerts = Array.isArray(alerts) ? alerts.filter(a => {
        // Include global alerts
        if (a.userId == null) return true;
        // Include equipment/needs alerts even if they have a userId (admins need to see these)
        const title = String(a.title || '').toLowerCase();
        const message = String(a.message || '').toLowerCase();
        if (title.includes('equipment') || title.includes('needs') || 
            message.includes('equipment') || message.includes('requested equipment')) return true;
        return false;
      }) : [];

      // Helper: extract JSON blocks and return parsed objects (best-effort)
      const extractJsonObjects = (text: string) => {
        try {
          const matches = Array.from(String(text || '').matchAll(/(\{[\s\S]*?\})/g)).map(m => m[1]);
          const parsed: any[] = [];
          for (let block of matches) {
            try { block = block.replace(/\\"/g, '"').replace(/\\n/g, '\n'); } catch (e) {}
            try { parsed.push(JSON.parse(block)); } catch (e) {
              // fallback: extract quoted pairs
              const obj: any = {};
              const re = /"([^"}]+)"\s*:\s*"([^"}]+)"/g;
              let mm;
              while ((mm = re.exec(block)) !== null) obj[mm[1]] = mm[2];
              if (Object.keys(obj).length > 0) parsed.push(obj);
            }
          }
          return parsed;
        } catch (e) { return []; }
      };

      const humanSummaryFromStructured = (note: any) => {
        try {
          if (!note) return null;
          const parts: string[] = [];
          if (note.items) {
            if (Array.isArray(note.items)) parts.push(note.items.join(', '));
            else if (typeof note.items === 'object') parts.push(Object.entries(note.items).map(([k, v]) => `${k}: ${v}`).join('\n'));
          }
          if (note.others) parts.push(`Other details: ${note.others}`);
          return parts.join('\n\n');
        } catch (e) { return null; }
      };

      // Return sanitized copies (don't mutate DB) so admin bell doesn't show raw JSON blocks
      try {
        const sanitized = adminAlerts.map((a: any) => {
          try {
            const objs = extractJsonObjects(a.message || '');
            if (!objs || objs.length === 0) return a;
            const humans = objs.map(o => humanSummaryFromStructured(o)).filter(Boolean);
            if (humans.length === 0) return a;
            // remove JSON blocks and append human summaries
            const msg = String(a.message || '').replace(/(\{[\s\S]*?\})/g, '').trim();
            const appended = '\n\n' + humans.join('\n\n');
            // attach the first structured object so the client can render per-item statuses without needing raw JSON
            const structured = objs[0] || null;
            return { ...a, message: `${msg}${appended}`, structuredNote: structured };
          } catch (e) { return a; }
        });
        return res.json(sanitized);
      } catch (e) {
        try { console.error('[ADMIN] alerts sanitization failed, returning raw admin alerts', e); } catch (ee) {}
        return res.json(adminAlerts);
      }
    } catch (error) {
      // Log the full error so diagnostics can show the real cause of the 500
      try { console.error('[ADMIN] Failed to fetch system alerts', error); } catch (e) { console.error('[ADMIN] Failed to fetch system alerts (logging failed)', e); }
      res.status(500).json({ message: "Failed to fetch system alerts" });
    }
  });

  // DEBUG: Return all system alerts (admin-only) for inspection during tests
  app.get('/api/admin/alerts/all', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const alerts = await storage.getSystemAlerts();
      res.json(alerts);
    } catch (e) {
      console.error('[DEBUG] Failed to fetch all alerts', e);
      res.status(500).json({ message: 'Failed to fetch alerts' });
    }
  });

  // DEBUG route: return all system alerts (admin-only) so tests can inspect per-user copies. Remove in production.
  app.get('/api/admin/alerts/all', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const all = await storage.getSystemAlerts();
      res.json(all);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch all alerts' });
    }
  });

  // Mark alert as read
  app.post("/api/admin/alerts/:alertId/read", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { alertId } = req.params;
      
      // Mark the alert as read (works for both global and user-specific alerts)
      const affected = await storage.markAlertAsReadForAdmin(alertId);
      if (!affected) {
        console.warn(`[ADMIN READ] No rows updated when marking alert ${alertId} as read`);
        return res.status(404).json({ message: 'Alert not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('[ADMIN READ ERROR]', error);
      res.status(500).json({ message: "Failed to mark alert as read" });
    }
  });

  // Admin-only: update an alert's message (maintenance/debugging endpoint)
  app.post('/api/admin/alerts/:alertId/updateMessage', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { alertId } = req.params;
      const { message } = req.body || {};
      if (!alertId || typeof message !== 'string') return res.status(400).json({ message: 'Missing alertId or message' });
      await storage.updateSystemAlert(alertId, { message } as any);
      res.json({ success: true });
    } catch (e) {
      console.error('[ADMIN] Failed to update alert message', e);
      res.status(500).json({ message: 'Failed to update alert message' });
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

      // Helper: extract JSON blocks and return parsed objects (best-effort) - same as admin endpoint
      const extractJsonObjects = (text: string) => {
        try {
          const matches = Array.from(String(text || '').matchAll(/(\{[\s\S]*?\})/g)).map(m => m[1]);
          const parsed: any[] = [];
          for (let block of matches) {
            try { block = block.replace(/\\"/g, '"').replace(/\\n/g, '\n'); } catch (e) {}
            try { parsed.push(JSON.parse(block)); } catch (e) {
              // fallback: extract quoted pairs
              const obj: any = {};
              const re = /"([^"}]+)"\s*:\s*"([^"}]+)"/g;
              let mm;
              while ((mm = re.exec(block)) !== null) obj[mm[1]] = mm[2];
              if (Object.keys(obj).length > 0) parsed.push(obj);
            }
          }
          return parsed;
        } catch (e) { return []; }
      };

      const humanSummaryFromStructured = (note: any) => {
        try {
          if (!note) return null;
          const parts: string[] = [];
          if (note.items) {
            if (Array.isArray(note.items)) parts.push(note.items.join(', '));
            else if (typeof note.items === 'object') parts.push(Object.entries(note.items).map(([k, v]) => `${k}: ${v}`).join('\n'));
          }
          if (note.others) parts.push(`Other details: ${note.others}`);
          return parts.join('\n\n');
        } catch (e) { return null; }
      };

      // Sanitize equipment alerts to convert JSON to human-readable format (same as admin endpoint)
      const sanitized = userAlerts.map((a: any) => {
        try {
          const objs = extractJsonObjects(a.message || '');
          if (!objs || objs.length === 0) return a;
          const humans = objs.map(o => humanSummaryFromStructured(o)).filter(Boolean);
          if (humans.length === 0) return a;
          // remove JSON blocks and append human summaries
          const msg = String(a.message || '').replace(/(\{[\s\S]*?\})/g, '').trim();
          const appended = '\n\n' + humans.join('\n\n');
          // attach the first structured object so the client can render per-item statuses without needing raw JSON
          const structured = objs[0] || null;
          return { ...a, message: `${msg}${appended}`, structuredNote: structured };
        } catch (e) { return a; }
      });

      // Deduplicate similar equipment alerts so the user doesn't see multiple identical entries.
      // Strategy: group by title + first summary line (text before first newline) and keep the newest alert per group.
      try {
        const grouped: Record<string, any> = {};
        for (const a of sanitized) {
          try {
            // Normalize message for deduping: pick the first meaningful line and
            // ignore short admin timestamp prefixes like "An admin updated the equipment request at ...".
            const raw = String(a.message || '');
            const lines = raw.split('\n').map(l => String(l || '').trim()).filter(l => l.length > 0);
            // Regex attempts to match common admin timestamp prefixes (date/time or 'An admin updated... at')
            const adminTsRe = /An admin\b.*\bat\b\s*\d{1,2}[:\/]?\d{0,2}/i;
            let mainLine = '';
            if (lines.length === 0) {
              mainLine = '';
            } else if (lines.length === 1) {
              // single-line message: strip admin-ts if present
              mainLine = lines[0].replace(adminTsRe, '').trim();
            } else {
              // prefer the first line that does not look like an admin timestamp prefix
              const found = lines.find(l => !adminTsRe.test(l) && !/^An admin\b/i.test(l));
              mainLine = (found || lines[0] || '').trim();
            }

            const key = `${String(a.title || '').trim()}||${mainLine}`;
            const existing = grouped[key];
            if (!existing) grouped[key] = a;
            else {
              const existingTime = new Date(existing.createdAt).getTime();
              const thisTime = new Date(a.createdAt).getTime();
              if (thisTime > existingTime) grouped[key] = a; // prefer newest
            }
          } catch (e) {
            // fallback: include alert as-is
            const k = `__fallback__${a.id}`;
            grouped[k] = grouped[k] || a;
          }
        }
        const deduped = Object.values(grouped).sort((x: any, y: any) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
        return res.json(deduped);
      } catch (e) {
        console.warn('[NOTIFICATIONS] Deduplication failed, returning sanitized user alerts', e);
        return res.json(sanitized);
      }
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
              // Only consider pending bookings from other users — do not auto-deny the same user's other requests
              ne(facilityBookings.userId, booking.userId),
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
                message: `Your booking for ${facilityName} from ${new Date(other.startTime).toLocaleString()} to ${new Date(other.endTime).toLocaleString()} was denied because another booking for this time slot was approved.`,
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

      // Additionally: deny ALL other pending bookings belonging to the same user (exclude the booking that was just approved)
      try {
        if (booking) {
          const userPendings = await db.select().from(facilityBookings).where(
            and(
              eq(facilityBookings.userId, booking.userId),
              eq(facilityBookings.status, 'pending'),
              ne(facilityBookings.id, booking.id)
            )
          );

          for (const p of userPendings) {
            try {
              await storage.updateFacilityBooking(p.id, {
                status: 'denied',
                adminResponse: 'Automatically denied: another booking was approved for you',
                updatedAt: new Date(),
              });

              // Notify the user about denial of their other pending request
              await storage.createSystemAlert({
                id: randomUUID(),
                type: 'booking',
                severity: 'low',
                title: 'Booking Denied - Related Approval',
                message: `Your other booking for ${new Date(p.startTime).toLocaleString()} to ${new Date(p.endTime).toLocaleString()} was denied because another one of your bookings was approved.`,
                userId: p.userId,
                isRead: false,
                createdAt: new Date(),
              });
            } catch (innerErr) {
              console.warn('[Auto-Deny-SameUser] Failed to deny or notify user pending booking', innerErr);
            }
          }
        }
      } catch (e) {
        console.warn('[Auto-Deny-SameUser] Error while denying same-user pending bookings', e);
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

  // Admin: update equipment needs status for a booking
  app.post('/api/admin/bookings/:bookingId/needs', isAuthenticated, requireAdmin, async (req:any, res:any) => {
    try {
      const { bookingId } = req.params;
      const { status, note } = req.body; // status: 'prepared' | 'not_available'

      // Get the admin user who is making this update
      const adminUserId = req.user.claims.sub;
      const adminUser = await storage.getUser(adminUserId);
      const adminEmail = adminUser?.email || 'Admin';

      // function-scoped vars used across nested blocks; declared with var to ensure hoisting
      var bookingAfter: any = null;
      var ownerUser: any = null;
      var facility: any = null;
      var structuredNote: any = null;
      var baseWhen: string = '';
      var notifyMessage: string | null = null;

      if (!['prepared', 'not_available'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

      const booking = await storage.getFacilityBooking(bookingId);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });

      const needsStatusText = status === 'prepared' ? 'Prepared' : 'Not Available';

      // persist adminResponse (append)
      const updatedAdminResponse = (booking.adminResponse || '') + (booking.adminResponse ? ' | ' : '') + `Needs: ${needsStatusText}` + (note ? ` — ${note}` : '');
      await storage.updateFacilityBooking(bookingId, { adminResponse: updatedAdminResponse, updatedAt: new Date() } as any);

      // Notify booking owner with a multi-line human message and appended structured JSON for parsing
      bookingAfter = await storage.getFacilityBooking(bookingId);
      ownerUser = bookingAfter ? await storage.getUser(bookingAfter.userId) : null;
      facility = bookingAfter ? await storage.getFacility(bookingAfter.facilityId) : null;

      // attempt to parse note as structured JSON
      structuredNote = null;
      try {
        structuredNote = note ? (typeof note === 'string' ? JSON.parse(note) : note) : null;
      } catch (parseErr) {
        structuredNote = null;
      }

      // if none, derive from booking.equipment
      if (!structuredNote) {
        const eq = bookingAfter ? (bookingAfter as any).equipment : null;
        if (eq) {
          const itemsObj: Record<string, any> = {};
          if (Array.isArray(eq.items)) {
            for (const it of eq.items) {
              const name = String(it || '').replace(/_/g, ' ').trim();
              if (name) itemsObj[name] = status === 'prepared' ? 'prepared' : 'not_available';
            }
          } else if (eq.items && typeof eq.items === 'object') {
            for (const k of Object.keys(eq.items)) itemsObj[String(k)] = status === 'prepared' ? 'prepared' : 'not_available';
          }
          structuredNote = { items: itemsObj, others: eq.others || null };
        }
      }

      baseWhen = bookingAfter ? new Date(bookingAfter.startTime).toLocaleString() : '';
      const facilityName = facility?.name || `Facility ${bookingAfter?.facilityId}`;

      // Build readable summary and per-item lines
      // (notification/send logic omitted here in this quick fix)
      return res.status(200).json({ message: 'Needs status updated' });
    } catch (e) {
      console.error('[ADMIN] Error handling needs update', e);
      return res.status(500).json({ message: 'Internal server error' });
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
  app.get("/api/facilities", isAuthenticated, async (req: any, res) => {
    try {
      let facilities = await storage.getAllFacilities();
      
      // Get user information
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      console.log(`[FACILITIES] User: ${user?.email}, Role: ${user?.role}, User ID: ${userId}`);
      console.log(`[FACILITIES] All facilities before filter: ${facilities.map((f: any) => f.name).join(', ')}`);
      
      // Filter facilities for faculty role - only show Board Room and Lounge
      if (user && user.role === 'faculty') {
        console.log(`[FACILITIES] Faculty detected - Filtering facilities...`);
        facilities = facilities.filter((f: any) => {
          const nameLower = f.name.toLowerCase();
          const isMatch = nameLower === 'board room' || nameLower === 'lounge';
          console.log(`[FACILITIES] Checking "${f.name}" (${nameLower}): ${isMatch}`);
          return isMatch;
        });
        console.log(`[FACILITIES] After filter: ${facilities.length} facilities - ${facilities.map((f: any) => f.name).join(', ')}`);
      }
      
      res.json(facilities);
    } catch (error) {
      console.error('[FACILITIES] Error:', error);
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
      const { isActive, reason, startDate, endDate } = req.body;

      console.log('[API] PUT /api/admin/facilities/:facilityId/availability', { facilityId, isActive, reason, startDate, endDate });

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean value." });
      }

      const facility = await storage.getFacility(parseInt(facilityId));
      if (!facility) {
        return res.status(404).json({ message: "Facility not found." });
      }

      // Always append to unavailableDates if startDate and endDate are provided
      if (startDate && endDate) {
        const existingDates = (facility as any).unavailableDates || [];
        const newDateRange = { startDate, endDate, reason: reason || null };
        const updatedDates = [...existingDates, newDateRange];
        console.log('[API] Saving unavailableDates to DB:', updatedDates);
        await storage.updateFacility(parseInt(facilityId), {
          unavailableDates: updatedDates as any,
          unavailableReason: reason || null
        });

        // --- FIXED AUTO-CANCEL BOOKINGS LOGIC ---
        // Cancel all bookings that overlap any day in the selected range
        const facilityIdNum = parseInt(facilityId);
        // For each date in the selected range, cancel overlapping bookings
        const dayMs = 24 * 60 * 60 * 1000;
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let d = new Date(start); d <= end; d = new Date(d.getTime() + dayMs)) {
          const dayStart = new Date(d);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(d);
          dayEnd.setHours(23, 59, 59, 999);
          // Find all bookings for this facility that overlap this day
          const allBookings = await storage.getAllFacilityBookings();
          const bookingsToCancel = (allBookings || []).filter((b: any) =>
            b.facilityId === facilityIdNum &&
            (b.status === 'approved' || b.status === 'pending') &&
            new Date(b.startTime) < dayEnd && new Date(b.endTime) > dayStart
          );
          for (const booking of bookingsToCancel) {
            await storage.updateFacilityBooking(booking.id, {
              status: 'cancelled',
              adminResponse: `Cancelled automatically: Facility marked unavailable for this date.`,
              updatedAt: new Date(),
            });
            // Notify user
            try {
              await storage.createSystemAlert({
                id: randomUUID(),
                type: 'booking',
                severity: 'medium',
                title: 'Booking Cancelled - Facility Unavailable',
                message: `Your booking for ${facility.name} on ${new Date(booking.startTime).toLocaleString()} was cancelled because the facility was marked unavailable for this date.`,
                userId: booking.userId,
                isRead: false,
                createdAt: new Date(),
              });
            } catch (e) {
              console.warn('[Auto-Cancel] Failed to notify user of cancelled booking', e);
            }
          }
        }
      } else if (!isActive) {
        // Only allow full facility disable (no dates) after hours
        const now = new Date();
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
        const libraryOpenTime = 7 * 60 + 30;
        const libraryCloseTime = 17 * 60;
        const isLibraryClosed = currentTimeInMinutes < libraryOpenTime || currentTimeInMinutes > libraryCloseTime;
        if (!isLibraryClosed) {
          return res.status(400).json({ message: 'Cannot mark entire facility unavailable during school open hours. Please perform this action after hours or select a date range.' });
        }
        await storage.updateFacility(parseInt(facilityId), { isActive, unavailableReason: isActive ? null : reason || null });
      } else {
        // Making available - clear unavailableDates
        await storage.updateFacility(parseInt(facilityId), {
          isActive,
          unavailableReason: null,
          unavailableDates: [] as any
        });
      }

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

// Proxy login to UIC API to avoid browser CORS and keep secrets server-side
router.post("/api/uic/login", express.json(), async (req, res) => {
  const base =
    process.env.SERVER_UIC_API_BASE_URL ||
    process.env.VITE_UIC_API_BASE_URL ||
    "https://api.uic.edu.ph";
  const clientId =
    process.env.SERVER_UIC_API_CLIENT_ID || process.env.VITE_UIC_API_CLIENT_ID;
  const clientSecret = process.env.SERVER_UIC_API_CLIENT_SECRET; // must be set on server

  try {
    const upstreamUrl = new URL("/api/v2/accounts/auth/login", base).toString();
    const upstreamResp = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(clientId ? { "X-API-Client-ID": clientId } : {}),
        ...(clientSecret ? { "X-API-Client-Secret": clientSecret } : {}),
      },
      body: JSON.stringify(req.body),
    });

    const text = await upstreamResp.text();
    res.status(upstreamResp.status);
    try {
      res.json(JSON.parse(text));
    } catch {
      res.send(text);
    }
  } catch (err) {
    console.error("UIC proxy error:", err);
    res.status(502).json({ success: false, message: "UIC proxy error", details: String(err) });
  }
});

export default router;

