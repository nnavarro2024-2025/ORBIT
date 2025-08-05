import {
  users,
  orzSessions,
  timeExtensionRequests,
  facilityBookings,
  facilities,
  computerStations,
  systemAlerts,
  activityLogs,
  type User,
  type UpsertUser,
  type OrzSession,
  type InsertOrzSession,
  type TimeExtensionRequest,
  type InsertTimeExtensionRequest,
  type FacilityBooking,
  type InsertFacilityBooking,
  type Facility,
  type ComputerStation,
  type SystemAlert,
  type ActivityLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User management
  getUsersByRole(role: string): Promise<User[]>;
  updateUserStatus(userId: string, status: string): Promise<void>;
  
  // ORZ Session operations
  createOrzSession(session: InsertOrzSession): Promise<OrzSession>;
  getActiveOrzSession(userId: string): Promise<OrzSession | undefined>;
  updateOrzSession(sessionId: string, updates: Partial<OrzSession>): Promise<void>;
  endOrzSession(sessionId: string): Promise<void>;
  getOrzSessionsByUser(userId: string): Promise<OrzSession[]>;
  getAllActiveSessions(): Promise<OrzSession[]>;
  
  // Time extension operations
  createTimeExtensionRequest(request: InsertTimeExtensionRequest): Promise<TimeExtensionRequest>;
  getTimeExtensionRequest(id: string): Promise<TimeExtensionRequest | undefined>;
  updateTimeExtensionRequest(id: string, updates: Partial<TimeExtensionRequest>): Promise<void>;
  getPendingTimeExtensionRequests(): Promise<TimeExtensionRequest[]>;
  
  // Computer station operations
  getAllComputerStations(): Promise<ComputerStation[]>;
  getComputerStation(id: number): Promise<ComputerStation | undefined>;
  
  // Facility operations
  getAllFacilities(): Promise<Facility[]>;
  getFacility(id: number): Promise<Facility | undefined>;
  createFacility(facility: { name: string; description?: string; capacity: number }): Promise<Facility>;
  
  // Facility booking operations
  createFacilityBooking(booking: InsertFacilityBooking): Promise<FacilityBooking>;
  getFacilityBooking(id: string): Promise<FacilityBooking | undefined>;
  updateFacilityBooking(id: string, updates: Partial<FacilityBooking>): Promise<void>;
  getFacilityBookingsByUser(userId: string): Promise<FacilityBooking[]>;
  getPendingFacilityBookings(): Promise<FacilityBooking[]>;
  getFacilityBookingsByDateRange(start: Date, end: Date): Promise<FacilityBooking[]>;
  
  // System alerts
  createSystemAlert(alert: SystemAlert): Promise<SystemAlert>;
  getSystemAlerts(): Promise<SystemAlert[]>;
  markAlertAsRead(id: string): Promise<void>;
  
  // Activity logs
  createActivityLog(log: ActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  
  // Statistics
  getOrzUsageStats(): Promise<any>;
  getFacilityUsageStats(): Promise<any>;
  getAdminDashboardStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role as any));
  }

  async updateUserStatus(userId: string, status: string): Promise<void> {
    await db.update(users).set({ status: status as any, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  // ORZ Session operations
  async createOrzSession(session: InsertOrzSession): Promise<OrzSession> {
    const [newSession] = await db.insert(orzSessions).values(session).returning();
    return newSession;
  }

  async getActiveOrzSession(userId: string): Promise<OrzSession | undefined> {
    const [session] = await db
      .select()
      .from(orzSessions)
      .where(and(eq(orzSessions.userId, userId), eq(orzSessions.isActive, true)));
    return session;
  }

  async updateOrzSession(sessionId: string, updates: Partial<OrzSession>): Promise<void> {
    await db.update(orzSessions).set(updates).where(eq(orzSessions.id, sessionId));
  }

  async endOrzSession(sessionId: string): Promise<void> {
    await db.update(orzSessions).set({ isActive: false, endTime: new Date() }).where(eq(orzSessions.id, sessionId));
  }

  async getOrzSessionsByUser(userId: string): Promise<OrzSession[]> {
    return await db
      .select()
      .from(orzSessions)
      .where(eq(orzSessions.userId, userId))
      .orderBy(desc(orzSessions.createdAt));
  }

  async getAllActiveSessions(): Promise<OrzSession[]> {
    return await db
      .select()
      .from(orzSessions)
      .where(eq(orzSessions.isActive, true))
      .orderBy(desc(orzSessions.startTime));
  }

  // Time extension operations
  async createTimeExtensionRequest(request: InsertTimeExtensionRequest): Promise<TimeExtensionRequest> {
    const [newRequest] = await db.insert(timeExtensionRequests).values(request).returning();
    return newRequest;
  }

  async getTimeExtensionRequest(id: string): Promise<TimeExtensionRequest | undefined> {
    const [request] = await db.select().from(timeExtensionRequests).where(eq(timeExtensionRequests.id, id));
    return request;
  }

  async updateTimeExtensionRequest(id: string, updates: Partial<TimeExtensionRequest>): Promise<void> {
    await db.update(timeExtensionRequests).set({ ...updates, updatedAt: new Date() }).where(eq(timeExtensionRequests.id, id));
  }

  async getPendingTimeExtensionRequests(): Promise<TimeExtensionRequest[]> {
    return await db
      .select()
      .from(timeExtensionRequests)
      .where(eq(timeExtensionRequests.status, "pending"))
      .orderBy(desc(timeExtensionRequests.createdAt));
  }

  // Computer station operations
  async getAllComputerStations(): Promise<ComputerStation[]> {
    return await db.select().from(computerStations).where(eq(computerStations.isActive, true));
  }

  async getComputerStation(id: number): Promise<ComputerStation | undefined> {
    const [station] = await db.select().from(computerStations).where(eq(computerStations.id, id));
    return station;
  }

  // Facility operations
  async getAllFacilities(): Promise<Facility[]> {
    return await db.select().from(facilities).where(eq(facilities.isActive, true));
  }

  async getFacility(id: number): Promise<Facility | undefined> {
    const [facility] = await db.select().from(facilities).where(eq(facilities.id, id));
    return facility;
  }

  async createFacility(facilityData: { name: string; description?: string; capacity: number }): Promise<Facility> {
    const [facility] = await db.insert(facilities).values({
      name: facilityData.name,
      description: facilityData.description || "",
      capacity: facilityData.capacity,
      isActive: true,
      createdAt: new Date(),
    }).returning();
    return facility;
  }

  // Facility booking operations
  async createFacilityBooking(booking: InsertFacilityBooking): Promise<FacilityBooking> {
    const [newBooking] = await db.insert(facilityBookings).values(booking).returning();
    return newBooking;
  }

  async getFacilityBooking(id: string): Promise<FacilityBooking | undefined> {
    const [booking] = await db.select().from(facilityBookings).where(eq(facilityBookings.id, id));
    return booking;
  }

  async updateFacilityBooking(id: string, updates: Partial<FacilityBooking>): Promise<void> {
    await db.update(facilityBookings).set({ ...updates, updatedAt: new Date() }).where(eq(facilityBookings.id, id));
  }

  async getFacilityBookingsByUser(userId: string): Promise<FacilityBooking[]> {
    return await db
      .select()
      .from(facilityBookings)
      .where(eq(facilityBookings.userId, userId))
      .orderBy(desc(facilityBookings.createdAt));
  }

  async getPendingFacilityBookings(): Promise<FacilityBooking[]> {
    return await db
      .select()
      .from(facilityBookings)
      .where(eq(facilityBookings.status, "pending"))
      .orderBy(desc(facilityBookings.createdAt));
  }

  async getFacilityBookingsByDateRange(start: Date, end: Date): Promise<FacilityBooking[]> {
    return await db
      .select()
      .from(facilityBookings)
      .where(and(gte(facilityBookings.startTime, start), lte(facilityBookings.endTime, end)))
      .orderBy(desc(facilityBookings.startTime));
  }

  // System alerts
  async createSystemAlert(alert: SystemAlert): Promise<SystemAlert> {
    const [newAlert] = await db.insert(systemAlerts).values(alert).returning();
    return newAlert;
  }

  async getSystemAlerts(): Promise<SystemAlert[]> {
    return await db.select().from(systemAlerts).orderBy(desc(systemAlerts.createdAt));
  }

  async markAlertAsRead(id: string): Promise<void> {
    await db.update(systemAlerts).set({ isRead: true }).where(eq(systemAlerts.id, id));
  }

  // Activity logs
  async createActivityLog(log: ActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  async getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
  }

  // Statistics
  async getOrzUsageStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [todayStats] = await db
      .select({ count: count() })
      .from(orzSessions)
      .where(gte(orzSessions.createdAt, today));

    const [activeStats] = await db
      .select({ count: count() })
      .from(orzSessions)
      .where(eq(orzSessions.isActive, true));

    return {
      todaySessionsCount: todayStats.count,
      activeSessionsCount: activeStats.count,
    };
  }

  async getFacilityUsageStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [todayStats] = await db
      .select({ count: count() })
      .from(facilityBookings)
      .where(gte(facilityBookings.createdAt, today));

    const [pendingStats] = await db
      .select({ count: count() })
      .from(facilityBookings)
      .where(eq(facilityBookings.status, "pending"));

    return {
      todayBookingsCount: todayStats.count,
      pendingBookingsCount: pendingStats.count,
    };
  }

  async getAdminDashboardStats(): Promise<any> {
    const [activeUsers] = await db
      .select({ count: count() })
      .from(orzSessions)
      .where(eq(orzSessions.isActive, true));

    const [pendingBookings] = await db
      .select({ count: count() })
      .from(facilityBookings)
      .where(eq(facilityBookings.status, "pending"));

    const [systemAlertsCount] = await db
      .select({ count: count() })
      .from(systemAlerts)
      .where(eq(systemAlerts.isRead, false));

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
  }
}

export const storage = new DatabaseStorage();
