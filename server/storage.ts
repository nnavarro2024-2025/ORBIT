import {
  users,
  // orzSessions, // ORZ removed
  // timeExtensionRequests, // ORZ removed
  facilityBookings,
  facilities,
  computerStations,
  systemAlerts,
  activityLogs,
  type User,
  type UpsertUser,
  // ORZ types removed
  type FacilityBooking,
  type InsertFacilityBooking,
  type Facility,
  type ComputerStation,
  type SystemAlert,
  type ActivityLog,
  createFacilityBookingSchema,
  userRoleEnum,
  userStatusEnum,
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, count, sql, isNotNull, or, lt, gt, ne } from "drizzle-orm";
import { z } from "zod";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  
  
  
  
  
  
  
  
            updateUserStatus(userId: string, status: typeof userStatusEnum.enumValues[number]): Promise<void>;
  banUser(userId: string, reason: string, banEndDate: Date | null): Promise<void>;
  unbanUser(userId: string): Promise<void>;
  updateUserRole(userId: string, role: typeof userRoleEnum.enumValues[number]): Promise<void>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  
  // ORZ Session operations removed
  
  // Time extension operations removed
  
  // Computer station operations
  getAllComputerStations(): Promise<ComputerStation[]>;
  getComputerStation(id: number): Promise<ComputerStation | undefined>;
  createComputerStation(station: { name: string; location: string; isActive?: boolean }): Promise<ComputerStation>;
  
  // Facility operations
  getAllFacilities(): Promise<Facility[]>;
  getFacility(id: number): Promise<Facility | undefined>;
  createFacility(facility: { name: string; description?: string; capacity: number }): Promise<Facility>;
  updateFacility(facilityId: number, updates: Partial<Facility>): Promise<void>;
  
  // Facility booking operations
  createFacilityBooking(booking: InsertFacilityBooking): Promise<FacilityBooking>;
  getFacilityBooking(id: string): Promise<FacilityBooking | undefined>;
  updateFacilityBooking(id: string, updates: Partial<FacilityBooking>): Promise<void>;
  getAllFacilityBookings(): Promise<FacilityBooking[]>; // New function
  
  
  getFacilityBookingsByUser(userId: string): Promise<FacilityBooking[]>;
  // Check only approved bookings for conflicts (used when creating new pending requests)
  checkApprovedBookingConflicts(facilityId: number, startTime: Date, endTime: Date, excludeBookingId?: string): Promise<FacilityBooking[]>;
  checkUserOverlappingBookings(userId: string, startTime: Date, endTime: Date, excludeBookingId?: string): Promise<FacilityBooking[]>;
  cancelAllUserBookings(userId: string, adminId: string, reason: string): Promise<number>;
  getPendingFacilityBookings(): Promise<FacilityBooking[]>;
  getFacilityBookingsByDateRange(start: Date, end: Date): Promise<FacilityBooking[]>;
  
  // System alerts
  createSystemAlert(alert: SystemAlert): Promise<SystemAlert>;
  getSystemAlerts(): Promise<SystemAlert[]>;
  markAlertAsRead(id: string): Promise<number>;
  markAlertAsReadForUser(id: string, userId: string): Promise<number>;
  markAlertAsReadForAdmin(id: string): Promise<number>;
  
  // Activity logs
  createActivityLog(log: ActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  
  // Statistics
  getOrzUsageStats(): Promise<any>; // returns empty data now that ORZ is removed
  getFacilityUsageStats(): Promise<any>;
  getAdminDashboardStats(): Promise<any>;
}

class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({ target: users.id, set: user })
      .returning();
    return newUser;
  }

  async getUsersByRole(role: typeof userRoleEnum.enumValues[number]): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUserStatus(userId: string, status: typeof userStatusEnum.enumValues[number]): Promise<void> {
    await db.update(users).set({ status } as any).where(eq(users.id, userId));
  }

  async banUser(userId: string, reason: string, banEndDate: Date | null): Promise<void> {
    await db.update(users).set({ 
      status: "banned",
      banReason: reason,
      banEndDate: banEndDate,
      bannedAt: new Date()
    } as any).where(eq(users.id, userId));
  }

  async unbanUser(userId: string): Promise<void> {
    await db.update(users).set({ 
      status: "active",
      banReason: null,
      banEndDate: null,
      bannedAt: null
    } as any).where(eq(users.id, userId));
  }

  async updateUserRole(userId: string, role: typeof userRoleEnum.enumValues[number]): Promise<void> {
    await db.update(users).set({ role } as any).where(eq(users.id, userId));
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
    if (!updatedUser) {
      throw new Error(`User with ID ${userId} not found.`);
    }
    return updatedUser;
  }

  // ORZ Session operations removed - provide safe fallbacks
  async createOrzSession(session: any): Promise<any> {
    // ORZ feature removed; return a placeholder object
    return null as any;
  }

  async getActiveOrzSession(userId: string): Promise<any | undefined> {
    // ORZ feature removed; always return undefined
    return undefined;
  }

  async updateOrzSession(sessionId: string, updates: Partial<any>): Promise<void> {
    // No-op
    return;
  }

  async endOrzSession(sessionId: string): Promise<void> {
    // No-op
    return;
  }

  async endAllUserSessions(userId: string): Promise<void> {
    // No-op
    return;
  }

  async getOrzSessionsByUser(userId: string): Promise<any[]> {
    return [];
  }

  async getAllActiveSessions(): Promise<any[]> {
    return [];
  }

  async getAllEndedSessions(): Promise<any[]> {
    return [];
  }

  async getOrzSession(id: string): Promise<any | undefined> {
    return undefined;
  }

  // Time extension operations removed - return safe defaults
  async createTimeExtensionRequest(request: any): Promise<any> {
    return null as any;
  }

  async getTimeExtensionRequest(id: string): Promise<any | undefined> {
    return undefined;
  }

  async updateTimeExtensionRequest(id: string, updates: Partial<any>): Promise<void> {
    return;
  }

  async getPendingTimeExtensionRequests(): Promise<any[]> {
    return [];
  }

  async deletePendingTimeExtensionRequestsBySession(sessionId: string): Promise<void> {
    return;
  }

  // Computer station operations
  async getAllComputerStations(): Promise<ComputerStation[]> {
    return db.select().from(computerStations);
  }

  async getComputerStation(id: number): Promise<ComputerStation | undefined> {
    const [station] = await db.select().from(computerStations).where(eq(computerStations.id, id));
    return station;
  }

  async createComputerStation(station: { name: string; location: string; isActive?: boolean }): Promise<ComputerStation> {
    const [newStation] = await db.insert(computerStations).values(station as any).returning();
    return newStation;
  }

  // Facility operations
  async getAllFacilities(): Promise<Facility[]> {
    return db.select().from(facilities).orderBy(asc(facilities.id));
  }

  async getFacility(id: number): Promise<Facility | undefined> {
    const [facility] = await db.select().from(facilities).where(eq(facilities.id, id));
    return facility;
  }

  async createFacility(facility: { name: string; description?: string; capacity: number }): Promise<Facility> {
    const [newFacility] = await db.insert(facilities).values(facility as any).returning();
    return newFacility;
  }

  async updateFacility(facilityId: number, updates: Partial<Facility>): Promise<void> {
    await db.update(facilities).set(updates).where(eq(facilities.id, facilityId));
  }

  // Facility booking operations
  async createFacilityBooking(booking: InsertFacilityBooking): Promise<FacilityBooking> {
    const [newBooking] = await db.insert(facilityBookings).values(booking as any).returning();
    return newBooking;
  }

  async getFacilityBooking(id: string): Promise<FacilityBooking | undefined> {
    const [booking] = await db.select().from(facilityBookings).where(eq(facilityBookings.id, id));
    return booking;
  }

  async updateFacilityBooking(id: string, updates: Partial<FacilityBooking>): Promise<void> {
    await db.update(facilityBookings).set(updates).where(eq(facilityBookings.id, id));
  }

  async getAllFacilityBookings(): Promise<FacilityBooking[]> {
    return db.select().from(facilityBookings).orderBy(desc(facilityBookings.createdAt));
  }

  async getFacilityBookingsByUser(userId: string): Promise<FacilityBooking[]> {
    return db.select().from(facilityBookings).where(eq(facilityBookings.userId, userId)).orderBy(desc(facilityBookings.createdAt));
  }

  async checkApprovedBookingConflicts(facilityId: number, startTime: Date, endTime: Date, excludeBookingId?: string): Promise<FacilityBooking[]> {
    let query = db.select().from(facilityBookings)
      .where(
        and(
          eq(facilityBookings.facilityId, facilityId),
          // Only check approved bookings
          eq(facilityBookings.status, "approved"),
          // Time overlap
          and(
            lt(facilityBookings.startTime, endTime),
            gt(facilityBookings.endTime, startTime)
          )
        )
      );

    if (excludeBookingId) {
      query = db.select().from(facilityBookings).where(
        and(
          eq(facilityBookings.facilityId, facilityId),
          eq(facilityBookings.status, "approved"),
          and(
            lt(facilityBookings.startTime, endTime),
            gt(facilityBookings.endTime, startTime)
          ),
          ne(facilityBookings.id, excludeBookingId)
        )
      );
    }

    return query;
  }

  async checkBookingConflicts(facilityId: number, startTime: Date, endTime: Date, excludeBookingId?: string): Promise<FacilityBooking[]> {
    let query = db.select().from(facilityBookings)
      .where(
        and(
          eq(facilityBookings.facilityId, facilityId),
          // Only check approved bookings that are not cancelled
          or(
            eq(facilityBookings.status, "approved"),
            eq(facilityBookings.status, "pending")
          ),
          // Check for time overlap: new booking overlaps with existing if:
          // new start < existing end AND new end > existing start
          and(
            lt(facilityBookings.startTime, endTime),
            gt(facilityBookings.endTime, startTime)
          )
        )
      );

    if (excludeBookingId) {
      query = db.select().from(facilityBookings).where(
        and(
          eq(facilityBookings.facilityId, facilityId),
          or(
            eq(facilityBookings.status, "approved"),
            eq(facilityBookings.status, "pending")
          ),
          and(
            lt(facilityBookings.startTime, endTime),
            gt(facilityBookings.endTime, startTime)
          ),
          ne(facilityBookings.id, excludeBookingId)
        )
      );
    }

    return query;
  }

  async checkUserOverlappingBookings(userId: string, startTime: Date, endTime: Date, excludeBookingId?: string): Promise<FacilityBooking[]> {
    let query = db.select().from(facilityBookings)
      .where(
        and(
          eq(facilityBookings.userId, userId),
          // Only check active bookings (approved or pending)
          or(
            eq(facilityBookings.status, "approved"),
            eq(facilityBookings.status, "pending")
          ),
          // Check for time overlap: new booking overlaps with existing if:
          // new start < existing end AND new end > existing start
          and(
            lt(facilityBookings.startTime, endTime),
            gt(facilityBookings.endTime, startTime)
          )
        )
      );

    if (excludeBookingId) {
      query = db.select().from(facilityBookings).where(
        and(
          eq(facilityBookings.userId, userId),
          or(
            eq(facilityBookings.status, "approved"),
            eq(facilityBookings.status, "pending")
          ),
          and(
            lt(facilityBookings.startTime, endTime),
            gt(facilityBookings.endTime, startTime)
          ),
          ne(facilityBookings.id, excludeBookingId)
        )
      );
    }

    return query;
  }

  async checkUserFacilityBookings(userId: string, facilityId: number, excludeBookingId?: string): Promise<FacilityBooking[]> {
    let query = db.select().from(facilityBookings)
      .where(
        and(
          eq(facilityBookings.userId, userId),
          eq(facilityBookings.facilityId, facilityId),
          // Only check active bookings (approved or pending)
          or(
            eq(facilityBookings.status, "approved"),
            eq(facilityBookings.status, "pending")
          )
        )
      );

    if (excludeBookingId) {
      query = db.select().from(facilityBookings).where(
        and(
          eq(facilityBookings.userId, userId),
          eq(facilityBookings.facilityId, facilityId),
          or(
            eq(facilityBookings.status, "approved"),
            eq(facilityBookings.status, "pending")
          ),
          ne(facilityBookings.id, excludeBookingId)
        )
      );
    }

    return query;
  }

  async cancelAllUserBookings(userId: string, adminId: string, reason: string): Promise<number> {
    // Cancel all bookings that are not already cancelled or denied
    // This includes pending and approved bookings
    const result = await db.update(facilityBookings)
      .set({ 
        status: "cancelled",
        adminId: adminId,
        adminResponse: `Booking cancelled due to user ban. Reason: ${reason}`,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(facilityBookings.userId, userId),
          sql`${facilityBookings.status} IN ('pending', 'approved')`
        )
      );

    // Return the number of cancelled bookings
    return result.rowCount || 0;
  }

  async getPendingFacilityBookings(): Promise<FacilityBooking[]> {
    return db.select().from(facilityBookings).where(eq(facilityBookings.status, "pending")).orderBy(desc(facilityBookings.createdAt));
  }

  async getFacilityBookingsByDateRange(start: Date, end: Date): Promise<FacilityBooking[]> {
    return db.select().from(facilityBookings).where(and(gte(facilityBookings.startTime, start), lte(facilityBookings.endTime, end))).orderBy(desc(facilityBookings.createdAt));
  }

  // System alerts
  async createSystemAlert(alert: SystemAlert): Promise<SystemAlert> {
    const [newAlert] = await db.insert(systemAlerts).values(alert as any).returning();
    return newAlert;
  }

  async getSystemAlerts(): Promise<SystemAlert[]> {
    return db.select().from(systemAlerts).orderBy(desc(systemAlerts.createdAt));
  }

  async markAlertAsRead(id: string): Promise<number> {
    const result = await db.update(systemAlerts).set({ isRead: true }).where(eq(systemAlerts.id, id));
    // drizzle returns a result with rowCount in some drivers; fall back to 0 when missing
    // @ts-ignore
    return (result && (result as any).rowCount) || 0;
  }

  // Mark an alert as read only if it belongs to the specified user.
  async markAlertAsReadForUser(id: string, userId: string): Promise<number> {
    const result = await db.update(systemAlerts).set({ isRead: true }).where(and(eq(systemAlerts.id, id), eq(systemAlerts.userId, userId)));
    // @ts-ignore
    return (result && (result as any).rowCount) || 0;
  }

  // Mark a global/admin alert as read (only when userId IS NULL). Intended for admin routes.
  async markAlertAsReadForAdmin(id: string): Promise<number> {
    const result = await db.update(systemAlerts).set({ isRead: true }).where(and(eq(systemAlerts.id, id), sql`${systemAlerts.userId} IS NULL`));
    // @ts-ignore
    return (result && (result as any).rowCount) || 0;
  }

  // Activity logs
  async createActivityLog(log: ActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log as any).returning();
    return newLog;
  }

  async getActivityLogs(limit?: number): Promise<ActivityLog[]> {
    if (limit) {
      return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
    }
    return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt));
  }

  // Statistics
  async getOrzUsageStats(): Promise<any> {
    // Implement ORZ usage stats logic here
    return {};
  }

  async getFacilityUsageStats(): Promise<any> {
    // Implement facility usage stats logic here
    return {};
  }

  async getAdminDashboardStats(): Promise<any> {
    try {
  // ORZ removed -> no active ORZ session metric. Default to 0.
  const activeUsers = { count: 0 } as any;

      const [pendingBookings] = await db
        .select({ count: count() })
        .from(facilityBookings)
        .where(eq(facilityBookings.status, "pending"));

      const [systemAlertsCount] = await db
        .select({ count: count() })
        .from(systemAlerts)
        // Only count unread alerts that are global/admin (userId IS NULL) and of type 'booking'
        .where(and(
          eq(systemAlerts.isRead, false),
          eq(systemAlerts.type, 'booking'),
          sql`${systemAlerts.userId} IS NULL`
        ));

      const [bannedUsers] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.status, "banned"));

      return {
        activeUsers: activeUsers.count,
        pendingBookings: pendingBookings.count,
        systemAlerts: systemAlertsCount.count,
        bannedUsers: bannedUsers.count,
      };
    } catch (error) {
      console.error("❌ [STORAGE] Error fetching admin dashboard stats:", error);
      throw error; // Re-throw the error so it can be caught by the route handler
    }
  }
}

export const storage = new DatabaseStorage();