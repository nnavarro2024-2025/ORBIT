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
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum("user_role", ["student", "faculty", "admin"]);

// User status enum
export const userStatusEnum = pgEnum("user_status", ["active", "banned", "suspended"]);

// Booking edit status enum


// Users table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default("student").notNull(),
  status: userStatusEnum("status").default("active").notNull(),
  banReason: text("ban_reason"),
  banEndDate: timestamp("ban_end_date"),
  bannedAt: timestamp("banned_at"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: varchar("two_factor_secret"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Computer stations
export const computerStations = pgTable("computer_stations", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  location: varchar("location").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ORZ computer sessions removed
// ORZ feature has been removed; type stubs are defined later to maintain compatibility.

// Facilities
export const facilities = pgTable("facilities", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  capacity: integer("capacity").notNull(),
  imageUrl: varchar("image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Facility bookings
export const facilityBookings = pgTable("facility_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  facilityId: integer("facility_id").references(() => facilities.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  purpose: text("purpose").notNull(),
  participants: integer("participants").notNull(),
  status: varchar("status").default("pending").notNull(), // pending, approved, denied, cancelled
  adminId: varchar("admin_id").references(() => users.id),
  adminResponse: text("admin_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  
});

// System alerts
export const systemAlerts = pgTable("system_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type").notNull(), // security, system, user
  severity: varchar("severity").notNull(), // low, medium, high, critical
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  userId: varchar("user_id").references(() => users.id),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Activity logs
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(),
  details: text("details"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  facilityBookings: many(facilityBookings),
  systemAlerts: many(systemAlerts),
  activityLogs: many(activityLogs),
}));

export const computerStationsRelations = relations(computerStations, ({ many: _many }) => ({
  // ORZ sessions removed
}));

// ORZ relations removed

export const facilitiesRelations = relations(facilities, ({ many }) => ({
  bookings: many(facilityBookings),
}));

export const facilityBookingsRelations = relations(facilityBookings, ({ one }) => ({
  facility: one(facilities, { fields: [facilityBookings.facilityId], references: [facilities.id] }),
  user: one(users, { fields: [facilityBookings.userId], references: [users.id] }),
  admin: one(users, { fields: [facilityBookings.adminId], references: [users.id] }),
}));

export const systemAlertsRelations = relations(systemAlerts, ({ one }) => ({
  user: one(users, { fields: [systemAlerts.userId], references: [users.id] }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
}));

// Schemas for validation - using simplified approach to avoid drizzle-zod typing issues
export const insertUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().optional(),
  role: z.enum(["student", "admin"]).default("student"),
  status: z.enum(["active", "banned", "suspended"]).default("active"),
  banReason: z.string().optional(),
  banEndDate: z.date().optional(),
  bannedAt: z.date().optional(),
  twoFactorEnabled: z.boolean().default(false),
  twoFactorSecret: z.string().optional(),
});

export const insertOrzSessionSchema = z.object({
  userId: z.string(),
  stationId: z.number(),
  plannedEndTime: z.date(),
  endTime: z.date().optional(),
  isActive: z.boolean().default(true),
  lastActivity: z.date().default(() => new Date()),
});

export const insertTimeExtensionRequestSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  requestedMinutes: z.number().positive(),
  reason: z.string(),
  status: z.enum(["pending", "approved", "denied"]).default("pending"),
  adminId: z.string().optional(),
  adminResponse: z.string().optional(),
});

export const insertFacilityBookingSchema = z.object({
  facilityId: z.number(),
  userId: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  purpose: z.string(),
  participants: z.number().positive(),
  status: z.enum(["pending", "approved", "denied", "cancelled"]).default("pending"),
  adminId: z.string().optional(),
  adminResponse: z.string().optional(),
});

export const createFacilityBookingSchema = insertFacilityBookingSchema;

export const insertSystemAlertSchema = z.object({
  type: z.string(),
  severity: z.string(),
  title: z.string(),
  message: z.string(),
  userId: z.string().optional(),
  isRead: z.boolean().default(false),
});

export const insertActivityLogSchema = z.object({
  action: z.string(),
  details: z.string().optional(),
  userId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertOrzSession = z.infer<typeof insertOrzSessionSchema>;
export type OrzSession = any;
export type InsertTimeExtensionRequest = z.infer<typeof insertTimeExtensionRequestSchema>;
export type TimeExtensionRequest = any;
export type InsertFacilityBooking = z.infer<typeof insertFacilityBookingSchema>;
export type FacilityBooking = typeof facilityBookings.$inferSelect;
export type Facility = typeof facilities.$inferSelect;
export type ComputerStation = typeof computerStations.$inferSelect;
export type SystemAlert = typeof systemAlerts.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
