import { storage } from '../storage';
import { OrzSession } from '../../shared/schema';
import * as crypto from 'crypto'; // Required for crypto.randomUUID()

class SessionService {
  private inactivityTimer: Map<string, NodeJS.Timeout> = new Map();
  private readonly INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes

  async startSession(userId: string, stationId: number): Promise<OrzSession> {
    // Check if user already has an active session
    const existingSession = await storage.getActiveOrzSession(userId);
    if (existingSession) {
      throw new Error('User already has an active session');
    }

    // Create new session with 2-hour default duration
    const plannedEndTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const session = await storage.createOrzSession({
      userId,
      stationId,
      plannedEndTime,
      lastActivity: new Date(),
      isActive: true,
    });

    // Set up inactivity timer
    this.setupInactivityTimer(session.id, userId);

    return session;
  }

  async updateActivity(userId: string): Promise<void> {
    const session = await storage.getActiveOrzSession(userId);
    if (session) {
      await storage.updateOrzSession(session.id, { lastActivity: new Date() });

      // Reset inactivity timer
      this.clearInactivityTimer(session.id);
      this.setupInactivityTimer(session.id, userId);
    }
  }

  async extendSession(sessionId: string, minutes: number): Promise<void> {
    
    const session = await storage.getOrzSession(sessionId);
    if (!session) {
      console.error(`[SessionService] Session not found for sessionId: ${sessionId}`);
      throw new Error('Session not found');
    }

    
    const newEndTime = new Date(session.plannedEndTime.getTime() + minutes * 60 * 1000);
    
    await storage.updateOrzSession(sessionId, { plannedEndTime: newEndTime });
    
  }

  async endSession(sessionId: string): Promise<void> {
    await storage.endOrzSession(sessionId);
    await storage.deletePendingTimeExtensionRequestsBySession(sessionId); // Add this line
    this.clearInactivityTimer(sessionId);
  }

  private setupInactivityTimer(sessionId: string, userId: string | null): void {
    console.log(`[SessionService] Inactivity timer started for session ${sessionId}. Will expire in ${this.INACTIVITY_LIMIT / 1000} seconds.`);
    const timer = setTimeout(async () => {
      console.log(`[SessionService] Session ${sessionId} auto-logged out due to inactivity.`);
      await this.endSession(sessionId);
      await storage.createSystemAlert({
        id: crypto.randomUUID(),
        createdAt: new Date(),
        userId: userId ?? null,
        type: 'system',
        severity: 'medium',
        title: 'Session Automatically Logged Out',
        message: `The computer session for this user was automatically logged out due to inactivity. (Session ID: ${sessionId})`,
        isRead: false,
      });
    }, this.INACTIVITY_LIMIT);

    this.inactivityTimer.set(sessionId, timer);
  }

  private clearInactivityTimer(sessionId: string): void {
    const timer = this.inactivityTimer.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.inactivityTimer.delete(sessionId);
      console.log(`[SessionService] Inactivity timer cleared for session ${sessionId}.`);
    }
  }

  async checkExpiredSessions(): Promise<void> {
    const activeSessions = await storage.getAllActiveSessions();
    const now = new Date();

    for (const session of activeSessions) {
      if (session.plannedEndTime <= now) {
        await this.endSession(session.id);
      }
    }
  }
}

export const sessionService = new SessionService();

// Run session cleanup every 5 minutes
setInterval(() => {
  sessionService.checkExpiredSessions();
}, 5 * 60 * 1000);