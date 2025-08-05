var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";
import path3 from "path";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  activityLogs: () => activityLogs,
  activityLogsRelations: () => activityLogsRelations,
  computerStations: () => computerStations,
  computerStationsRelations: () => computerStationsRelations,
  facilities: () => facilities,
  facilitiesRelations: () => facilitiesRelations,
  facilityBookings: () => facilityBookings,
  facilityBookingsRelations: () => facilityBookingsRelations,
  insertActivityLogSchema: () => insertActivityLogSchema,
  insertFacilityBookingSchema: () => insertFacilityBookingSchema,
  insertOrzSessionSchema: () => insertOrzSessionSchema,
  insertSystemAlertSchema: () => insertSystemAlertSchema,
  insertTimeExtensionRequestSchema: () => insertTimeExtensionRequestSchema,
  insertUserSchema: () => insertUserSchema,
  orzSessions: () => orzSessions,
  orzSessionsRelations: () => orzSessionsRelations,
  sessions: () => sessions,
  systemAlerts: () => systemAlerts,
  systemAlertsRelations: () => systemAlertsRelations,
  timeExtensionRequests: () => timeExtensionRequests,
  timeExtensionRequestsRelations: () => timeExtensionRequestsRelations,
  userRoleEnum: () => userRoleEnum,
  userStatusEnum: () => userStatusEnum,
  users: () => users,
  usersRelations: () => usersRelations
});
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  uuid,
  pgEnum
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var userRoleEnum = pgEnum("user_role", ["student", "faculty", "admin"]);
var userStatusEnum = pgEnum("user_status", ["active", "banned", "suspended"]);
var users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default("student").notNull(),
  status: userStatusEnum("status").default("active").notNull(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: varchar("two_factor_secret"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var computerStations = pgTable("computer_stations", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  location: varchar("location").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var orzSessions = pgTable("orz_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  stationId: integer("station_id").references(() => computerStations.id).notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  plannedEndTime: timestamp("planned_end_time").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var timeExtensionRequests = pgTable("time_extension_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => orzSessions.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  requestedMinutes: integer("requested_minutes").notNull(),
  reason: text("reason").notNull(),
  status: varchar("status").default("pending").notNull(),
  // pending, approved, denied
  adminId: varchar("admin_id").references(() => users.id),
  adminResponse: text("admin_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var facilities = pgTable("facilities", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  capacity: integer("capacity").notNull(),
  imageUrl: varchar("image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var facilityBookings = pgTable("facility_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  facilityId: integer("facility_id").references(() => facilities.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  purpose: text("purpose").notNull(),
  participants: integer("participants").notNull(),
  status: varchar("status").default("pending").notNull(),
  // pending, approved, denied, cancelled
  adminId: varchar("admin_id").references(() => users.id),
  adminResponse: text("admin_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var systemAlerts = pgTable("system_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type").notNull(),
  // security, system, user
  severity: varchar("severity").notNull(),
  // low, medium, high, critical
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  userId: varchar("user_id").references(() => users.id),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(),
  details: text("details"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var usersRelations = relations(users, ({ many }) => ({
  orzSessions: many(orzSessions),
  facilityBookings: many(facilityBookings),
  timeExtensionRequests: many(timeExtensionRequests),
  systemAlerts: many(systemAlerts),
  activityLogs: many(activityLogs)
}));
var computerStationsRelations = relations(computerStations, ({ many }) => ({
  orzSessions: many(orzSessions)
}));
var orzSessionsRelations = relations(orzSessions, ({ one, many }) => ({
  user: one(users, { fields: [orzSessions.userId], references: [users.id] }),
  station: one(computerStations, { fields: [orzSessions.stationId], references: [computerStations.id] }),
  timeExtensionRequests: many(timeExtensionRequests)
}));
var timeExtensionRequestsRelations = relations(timeExtensionRequests, ({ one }) => ({
  session: one(orzSessions, { fields: [timeExtensionRequests.sessionId], references: [orzSessions.id] }),
  user: one(users, { fields: [timeExtensionRequests.userId], references: [users.id] }),
  admin: one(users, { fields: [timeExtensionRequests.adminId], references: [users.id] })
}));
var facilitiesRelations = relations(facilities, ({ many }) => ({
  bookings: many(facilityBookings)
}));
var facilityBookingsRelations = relations(facilityBookings, ({ one }) => ({
  facility: one(facilities, { fields: [facilityBookings.facilityId], references: [facilities.id] }),
  user: one(users, { fields: [facilityBookings.userId], references: [users.id] }),
  admin: one(users, { fields: [facilityBookings.adminId], references: [users.id] })
}));
var systemAlertsRelations = relations(systemAlerts, ({ one }) => ({
  user: one(users, { fields: [systemAlerts.userId], references: [users.id] })
}));
var activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, { fields: [activityLogs.userId], references: [users.id] })
}));
var insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true
});
var insertOrzSessionSchema = createInsertSchema(orzSessions).omit({
  id: true,
  createdAt: true
});
var insertTimeExtensionRequestSchema = createInsertSchema(timeExtensionRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertFacilityBookingSchema = createInsertSchema(facilityBookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertSystemAlertSchema = createInsertSchema(systemAlerts).omit({
  id: true,
  createdAt: true
});
var insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true
});

// server/db.ts
import dotenv from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
dotenv.config();
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Please check your environment variables.");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
var db = drizzle(pool, { schema: schema_exports, logger: process.env.NODE_ENV === "development" });

// server/storage.ts
import { eq, and, desc, gte, lte, count } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
  async getUsersByRole(role) {
    return await db.select().from(users).where(eq(users.role, role));
  }
  async updateUserStatus(userId, status) {
    await db.update(users).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, userId));
  }
  // ORZ Session operations
  async createOrzSession(session) {
    const [newSession] = await db.insert(orzSessions).values(session).returning();
    return newSession;
  }
  async getActiveOrzSession(userId) {
    const [session] = await db.select().from(orzSessions).where(and(eq(orzSessions.userId, userId), eq(orzSessions.isActive, true)));
    return session;
  }
  async updateOrzSession(sessionId, updates) {
    await db.update(orzSessions).set(updates).where(eq(orzSessions.id, sessionId));
  }
  async endOrzSession(sessionId) {
    await db.update(orzSessions).set({ isActive: false, endTime: /* @__PURE__ */ new Date() }).where(eq(orzSessions.id, sessionId));
  }
  async getOrzSessionsByUser(userId) {
    return await db.select().from(orzSessions).where(eq(orzSessions.userId, userId)).orderBy(desc(orzSessions.createdAt));
  }
  async getAllActiveSessions() {
    return await db.select().from(orzSessions).where(eq(orzSessions.isActive, true)).orderBy(desc(orzSessions.startTime));
  }
  // Time extension operations
  async createTimeExtensionRequest(request) {
    const [newRequest] = await db.insert(timeExtensionRequests).values(request).returning();
    return newRequest;
  }
  async getTimeExtensionRequest(id) {
    const [request] = await db.select().from(timeExtensionRequests).where(eq(timeExtensionRequests.id, id));
    return request;
  }
  async updateTimeExtensionRequest(id, updates) {
    await db.update(timeExtensionRequests).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(timeExtensionRequests.id, id));
  }
  async getPendingTimeExtensionRequests() {
    return await db.select().from(timeExtensionRequests).where(eq(timeExtensionRequests.status, "pending")).orderBy(desc(timeExtensionRequests.createdAt));
  }
  // Computer station operations
  async getAllComputerStations() {
    return await db.select().from(computerStations).where(eq(computerStations.isActive, true));
  }
  async getComputerStation(id) {
    const [station] = await db.select().from(computerStations).where(eq(computerStations.id, id));
    return station;
  }
  // Facility operations
  async getAllFacilities() {
    return await db.select().from(facilities).where(eq(facilities.isActive, true));
  }
  async getFacility(id) {
    const [facility] = await db.select().from(facilities).where(eq(facilities.id, id));
    return facility;
  }
  async createFacility(facilityData) {
    const [facility] = await db.insert(facilities).values({
      name: facilityData.name,
      description: facilityData.description || "",
      capacity: facilityData.capacity,
      isActive: true,
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    return facility;
  }
  // Facility booking operations
  async createFacilityBooking(booking) {
    const [newBooking] = await db.insert(facilityBookings).values(booking).returning();
    return newBooking;
  }
  async getFacilityBooking(id) {
    const [booking] = await db.select().from(facilityBookings).where(eq(facilityBookings.id, id));
    return booking;
  }
  async updateFacilityBooking(id, updates) {
    await db.update(facilityBookings).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(facilityBookings.id, id));
  }
  async getFacilityBookingsByUser(userId) {
    return await db.select().from(facilityBookings).where(eq(facilityBookings.userId, userId)).orderBy(desc(facilityBookings.createdAt));
  }
  async getPendingFacilityBookings() {
    return await db.select().from(facilityBookings).where(eq(facilityBookings.status, "pending")).orderBy(desc(facilityBookings.createdAt));
  }
  async getFacilityBookingsByDateRange(start, end) {
    return await db.select().from(facilityBookings).where(and(gte(facilityBookings.startTime, start), lte(facilityBookings.endTime, end))).orderBy(desc(facilityBookings.startTime));
  }
  // System alerts
  async createSystemAlert(alert) {
    const [newAlert] = await db.insert(systemAlerts).values(alert).returning();
    return newAlert;
  }
  async getSystemAlerts() {
    return await db.select().from(systemAlerts).orderBy(desc(systemAlerts.createdAt));
  }
  async markAlertAsRead(id) {
    await db.update(systemAlerts).set({ isRead: true }).where(eq(systemAlerts.id, id));
  }
  // Activity logs
  async createActivityLog(log2) {
    const [newLog] = await db.insert(activityLogs).values(log2).returning();
    return newLog;
  }
  async getActivityLogs(limit = 50) {
    return await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
  }
  // Statistics
  async getOrzUsageStats() {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const [todayStats] = await db.select({ count: count() }).from(orzSessions).where(gte(orzSessions.createdAt, today));
    const [activeStats] = await db.select({ count: count() }).from(orzSessions).where(eq(orzSessions.isActive, true));
    return {
      todaySessionsCount: todayStats.count,
      activeSessionsCount: activeStats.count
    };
  }
  async getFacilityUsageStats() {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const [todayStats] = await db.select({ count: count() }).from(facilityBookings).where(gte(facilityBookings.createdAt, today));
    const [pendingStats] = await db.select({ count: count() }).from(facilityBookings).where(eq(facilityBookings.status, "pending"));
    return {
      todayBookingsCount: todayStats.count,
      pendingBookingsCount: pendingStats.count
    };
  }
  async getAdminDashboardStats() {
    const [activeUsers] = await db.select({ count: count() }).from(orzSessions).where(eq(orzSessions.isActive, true));
    const [pendingBookings] = await db.select({ count: count() }).from(facilityBookings).where(eq(facilityBookings.status, "pending"));
    const [systemAlertsCount] = await db.select({ count: count() }).from(systemAlerts).where(eq(systemAlerts.isRead, false));
    const [bannedUsers] = await db.select({ count: count() }).from(users).where(eq(users.status, "banned"));
    return {
      activeUsers: activeUsers.count,
      pendingBookings: pendingBookings.count,
      systemAlerts: systemAlertsCount.count,
      bannedUsers: bannedUsers.count
    };
  }
};
var storage = new DatabaseStorage();

// server/supabaseAuth.ts
import { createClient } from "@supabase/supabase-js";
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
async function isAuthenticated(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Missing token" });
  }
  const supabase = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  });
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error || !user) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
  console.log("\u2705 [AUTH] User authenticated:", user);
  req.user = {
    claims: { sub: user.id },
    // This keeps compatibility with routes.ts
    ...user
  };
  next();
}

// server/services/sessionService.ts
import crypto from "crypto";
var SessionService = class {
  constructor() {
    this.inactivityTimer = /* @__PURE__ */ new Map();
    this.INACTIVITY_LIMIT = 10 * 60 * 1e3;
  }
  // 10 minutes
  async startSession(userId, stationId) {
    const existingSession = await storage.getActiveOrzSession(userId);
    if (existingSession) {
      throw new Error("User already has an active session");
    }
    const plannedEndTime = new Date(Date.now() + 2 * 60 * 60 * 1e3);
    const session = await storage.createOrzSession({
      userId,
      stationId,
      plannedEndTime,
      lastActivity: /* @__PURE__ */ new Date()
    });
    this.setupInactivityTimer(session.id, userId);
    return session;
  }
  async updateActivity(sessionId) {
    await storage.updateOrzSession(sessionId, { lastActivity: /* @__PURE__ */ new Date() });
    this.clearInactivityTimer(sessionId);
    const session = await storage.getActiveOrzSession(sessionId);
    if (session) {
      this.setupInactivityTimer(sessionId, session.userId);
    }
  }
  async extendSession(sessionId, minutes) {
    const session = await storage.getActiveOrzSession(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    const newEndTime = new Date(session.plannedEndTime.getTime() + minutes * 60 * 1e3);
    await storage.updateOrzSession(sessionId, { plannedEndTime: newEndTime });
  }
  async endSession(sessionId) {
    await storage.endOrzSession(sessionId);
    this.clearInactivityTimer(sessionId);
  }
  setupInactivityTimer(sessionId, userId) {
    const timer = setTimeout(async () => {
      await this.endSession(sessionId);
      await storage.createSystemAlert({
        id: crypto.randomUUID(),
        createdAt: /* @__PURE__ */ new Date(),
        userId: userId ?? null,
        type: "system",
        severity: "medium",
        title: "Session Auto-Logout",
        message: `Session ${sessionId} was automatically logged out due to inactivity`,
        isRead: false
      });
    }, this.INACTIVITY_LIMIT);
    this.inactivityTimer.set(sessionId, timer);
  }
  clearInactivityTimer(sessionId) {
    const timer = this.inactivityTimer.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.inactivityTimer.delete(sessionId);
    }
  }
  async checkExpiredSessions() {
    const activeSessions = await storage.getAllActiveSessions();
    const now = /* @__PURE__ */ new Date();
    for (const session of activeSessions) {
      if (session.plannedEndTime <= now) {
        await this.endSession(session.id);
      }
    }
  }
};
var sessionService = new SessionService();
setInterval(() => {
  sessionService.checkExpiredSessions();
}, 5 * 60 * 1e3);

// server/services/emailService.ts
import nodemailer from "nodemailer";
var EmailService = class {
  constructor() {
    const config = {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER || "",
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || ""
      }
    };
    this.transporter = nodemailer.createTransport(config);
  }
  validateEmail(email) {
    if (!email) {
      throw new Error("Cannot send email: recipient email is missing.");
    }
    return email;
  }
  async sendBookingConfirmation(booking, user, facilityName) {
    const toEmail = this.validateEmail(user.email);
    const mailOptions = {
      from: process.env.SMTP_USER || process.env.EMAIL_USER,
      to: toEmail,
      subject: "Facility Booking Confirmation - ORBIT System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976D2;">Facility Booking Confirmation</h2>
          <p>Dear ${user.firstName} ${user.lastName},</p>
          <p>Your facility booking request has been submitted successfully.</p>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Booking Details:</h3>
            <ul>
              <li><strong>Facility:</strong> ${facilityName}</li>
              <li><strong>Date:</strong> ${booking.startTime.toLocaleDateString()}</li>
              <li><strong>Time:</strong> ${booking.startTime.toLocaleTimeString()} - ${booking.endTime.toLocaleTimeString()}</li>
              <li><strong>Purpose:</strong> ${booking.purpose}</li>
              <li><strong>Participants:</strong> ${booking.participants}</li>
              <li><strong>Status:</strong> ${booking.status}</li>
            </ul>
          </div>

          <p>Please present your Student ID and this confirmation when using the facility.</p>
          <p>You will receive another email once your booking is reviewed by an administrator.</p>

          <p>Best regards,<br>ORBIT System Team</p>
        </div>
      `
    };
    await this.transporter.sendMail(mailOptions);
  }
  async sendBookingStatusUpdate(booking, user, facilityName) {
    const toEmail = this.validateEmail(user.email);
    const statusColor = booking.status === "approved" ? "#388E3C" : "#D32F2F";
    const statusText = booking.status === "approved" ? "Approved" : "Declined";
    const mailOptions = {
      from: process.env.SMTP_USER || process.env.EMAIL_USER,
      to: toEmail,
      subject: `Facility Booking ${statusText} - ORBIT System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${statusColor};">Facility Booking ${statusText}</h2>
          <p>Dear ${user.firstName} ${user.lastName},</p>
          <p>Your facility booking request has been <strong style="color: ${statusColor};">${statusText}</strong>.</p>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Booking Details:</h3>
            <ul>
              <li><strong>Facility:</strong> ${facilityName}</li>
              <li><strong>Date:</strong> ${booking.startTime.toLocaleDateString()}</li>
              <li><strong>Time:</strong> ${booking.startTime.toLocaleTimeString()} - ${booking.endTime.toLocaleTimeString()}</li>
              <li><strong>Purpose:</strong> ${booking.purpose}</li>
              ${booking.adminResponse ? `<li><strong>Admin Response:</strong> ${booking.adminResponse}</li>` : ""}
            </ul>
          </div>

          ${booking.status === "approved" ? "<p>Please present your Student ID and this confirmation when using the facility.</p>" : "<p>If you have any questions, please contact the library administration.</p>"}

          <p>Best regards,<br>ORBIT System Team</p>
        </div>
      `
    };
    await this.transporter.sendMail(mailOptions);
  }
  async sendTimeExtensionResponse(request, user) {
    const toEmail = this.validateEmail(user.email);
    const statusColor = request.status === "approved" ? "#388E3C" : "#D32F2F";
    const statusText = request.status === "approved" ? "Approved" : "Denied";
    const mailOptions = {
      from: process.env.SMTP_USER || process.env.EMAIL_USER,
      to: toEmail,
      subject: `Time Extension Request ${statusText} - ORBIT System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${statusColor};">Time Extension Request ${statusText}</h2>
          <p>Dear ${user.firstName} ${user.lastName},</p>
          <p>Your time extension request has been <strong style="color: ${statusColor};">${statusText}</strong>.</p>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Request Details:</h3>
            <ul>
              <li><strong>Requested Extension:</strong> ${request.requestedMinutes} minutes</li>
              <li><strong>Reason:</strong> ${request.reason}</li>
              ${request.adminResponse ? `<li><strong>Admin Response:</strong> ${request.adminResponse}</li>` : ""}
            </ul>
          </div>

          <p>Best regards,<br>ORBIT System Team</p>
        </div>
      `
    };
    await this.transporter.sendMail(mailOptions);
  }
  async sendSecurityAlert(user, alertType, details) {
    const toEmail = this.validateEmail(user.email);
    const mailOptions = {
      from: process.env.SMTP_USER || process.env.EMAIL_USER,
      to: toEmail,
      subject: "Security Alert - ORBIT System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #D32F2F;">Security Alert</h2>
          <p>Dear ${user.firstName} ${user.lastName},</p>
          <p>A security alert has been triggered for your account.</p>

          <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #D32F2F;">
            <h3>Alert Details:</h3>
            <ul>
              <li><strong>Alert Type:</strong> ${alertType}</li>
              <li><strong>Details:</strong> ${details}</li>
              <li><strong>Time:</strong> ${(/* @__PURE__ */ new Date()).toLocaleString()}</li>
            </ul>
          </div>

          <p>If this was not you, please contact the system administrator immediately.</p>

          <p>Best regards,<br>ORBIT System Team</p>
        </div>
      `
    };
    await this.transporter.sendMail(mailOptions);
  }
};
var emailService = new EmailService();

// server/routes.ts
async function ensureFacilitiesExist() {
  let facilities2 = await storage.getAllFacilities();
  if (facilities2.length === 0) {
    console.log("\u{1F3E2} [FACILITIES] No facilities found, creating sample facilities");
    const sampleFacilities = [
      { name: "Study Room A", description: "Quiet study room with 4 seats", capacity: 4 },
      { name: "Study Room B", description: "Group study room with 8 seats", capacity: 8 },
      { name: "Conference Room", description: "Large conference room for meetings", capacity: 20 },
      { name: "Computer Lab", description: "Computer lab with 15 workstations", capacity: 15 }
    ];
    for (const facility of sampleFacilities) {
      await storage.createFacility(facility);
    }
    facilities2 = await storage.getAllFacilities();
  }
  return facilities2;
}
async function registerRoutes(app2) {
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    console.log("\u{1F510} [AUTH] Fetching user info for:", req.user.claims.sub);
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      console.log("\u2705 [AUTH] User found:", user);
      res.json(user);
    } catch (error) {
      console.error("\u274C [AUTH] Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.post("/api/orz/sessions", isAuthenticated, async (req, res) => {
    console.log("\u{1F5A5}\uFE0F [ORZ] Start session req body:", req.body);
    try {
      const userId = req.user.claims.sub;
      const { stationId } = req.body;
      const session = await sessionService.startSession(userId, stationId);
      console.log("\u2705 [ORZ] Session started:", session);
      res.json(session);
    } catch (error) {
      console.error("\u274C [ORZ] Error starting session:", error);
      res.status(400).json({ message: error.message });
    }
  });
  app2.get("/api/orz/sessions/active", isAuthenticated, async (req, res) => {
    console.log("\u{1F4E1} [ORZ] Get active session for:", req.user.claims.sub);
    try {
      const session = await storage.getActiveOrzSession(req.user.claims.sub);
      res.json(session);
    } catch (error) {
      console.error("\u274C [ORZ] Error fetching active session:", error);
      res.status(500).json({ message: "Failed to fetch active session" });
    }
  });
  app2.post("/api/orz/sessions/:sessionId/activity", isAuthenticated, async (req, res) => {
    console.log("\u{1F4CD} [ORZ] Update activity for session:", req.params.sessionId);
    try {
      await sessionService.updateActivity(req.params.sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("\u274C [ORZ] Error updating activity:", error);
      res.status(500).json({ message: "Failed to update activity" });
    }
  });
  app2.post("/api/orz/sessions/:sessionId/end", isAuthenticated, async (req, res) => {
    console.log("\u{1F51A} [ORZ] End session:", req.params.sessionId);
    try {
      await sessionService.endSession(req.params.sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("\u274C [ORZ] Error ending session:", error);
      res.status(500).json({ message: "Failed to end session" });
    }
  });
  app2.get("/api/orz/sessions/history", isAuthenticated, async (req, res) => {
    console.log("\u{1F553} [ORZ] Fetch history for:", req.user.claims.sub);
    try {
      const sessions2 = await storage.getOrzSessionsByUser(req.user.claims.sub);
      res.json(sessions2);
    } catch (error) {
      console.error("\u274C [ORZ] Error fetching session history:", error);
      res.status(500).json({ message: "Failed to fetch session history" });
    }
  });
  app2.post("/api/orz/time-extension", isAuthenticated, async (req, res) => {
    console.log("\u{1F570}\uFE0F [EXTENSION] Request body:", req.body);
    try {
      const userId = req.user.claims.sub;
      const data = insertTimeExtensionRequestSchema.parse({ ...req.body, userId });
      const request = await storage.createTimeExtensionRequest(data);
      res.json(request);
    } catch (error) {
      console.error("\u274C [EXTENSION] Error creating request:", error);
      res.status(400).json({ message: error.message });
    }
  });
  app2.post("/api/bookings", isAuthenticated, async (req, res) => {
    console.log("\u{1F4C5} [BOOKING] New booking request:", req.body);
    try {
      await ensureFacilitiesExist();
      const userId = req.user.claims.sub;
      const data = insertFacilityBookingSchema.parse({
        ...req.body,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        userId
      });
      const booking = await storage.createFacilityBooking(data);
      console.log("\u2705 [BOOKING] Booking saved:", booking);
      const user = await storage.getUser(userId);
      const facility = await storage.getFacility(data.facilityId);
      if (user?.email && facility) {
        await emailService.sendBookingConfirmation(booking, user, facility.name);
      }
      res.json(booking);
    } catch (error) {
      console.error("\u274C [BOOKING] Error creating booking:", error);
      res.status(400).json({ message: error.message });
    }
  });
  app2.get("/api/bookings", isAuthenticated, async (req, res) => {
    console.log("\u{1F4D6} [BOOKING] Fetching bookings for user:", req.user.claims.sub);
    try {
      const bookings = await storage.getFacilityBookingsByUser(req.user.claims.sub);
      console.log("\u2705 [BOOKING] Bookings fetched:", bookings.length);
      res.json(bookings);
    } catch (error) {
      console.error("\u274C [BOOKING] Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });
  app2.get("/api/bookings/pending", isAuthenticated, async (req, res) => {
    const user = await storage.getUser(req.user.claims.sub);
    console.log("\u{1F50D} [ADMIN] Pending bookings requested by:", user?.email || "Unknown");
    if (user?.role !== "admin") {
      console.warn("\u26A0\uFE0F [ADMIN] Access denied for non-admin:", user?.id);
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const bookings = await storage.getPendingFacilityBookings();
      res.json(bookings);
    } catch (error) {
      console.error("\u274C [ADMIN] Error fetching pending bookings:", error);
      res.status(500).json({ message: "Failed to fetch pending bookings" });
    }
  });
  app2.get("/api/facilities", async (req, res) => {
    console.log("\u{1F3E2} [FACILITIES] Fetching facilities");
    try {
      const facilities2 = await ensureFacilitiesExist();
      res.json(facilities2);
    } catch (error) {
      console.error("\u274C [FACILITIES] Error fetching facilities:", error);
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });
  const httpServer = createServer(app2);
  console.log("\u{1F680} Express server configured with all routes.");
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  base: "./",
  // ✅ Needed for preview and Vercel
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 4173,
    host: "0.0.0.0"
    // ✅ Allow access from any device
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
import { fileURLToPath as fileURLToPath2 } from "url";
var __dirname2 = path2.dirname(fileURLToPath2(import.meta.url));
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true
    },
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(__dirname2, "../client/index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "../dist/public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}. Run "npm run build" first.`
    );
  }
  app2.use(express.static(distPath));
  app2.get("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const pathUrl = req.path;
  let capturedJsonResponse;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (pathUrl.startsWith("/api")) {
      let logLine = `${req.method} ${pathUrl} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "\u2026";
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api")) {
        res.sendFile(path3.resolve("dist/public/index.html"));
      }
    });
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
