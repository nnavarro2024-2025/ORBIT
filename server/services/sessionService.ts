import { storage } from '../storage';
import { OrzSession } from '@shared/schema';
import crypto from 'crypto'; // Required for crypto.randomUUID()

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
    });

    // Set up inactivity timer
    this.setupInactivityTimer(session.id, userId);

    return session;
  }

  async updateActivity(sessionId: string): Promise<void> {
    await storage.updateOrzSession(sessionId, { lastActivity: new Date() });

    // Reset inactivity timer
    this.clearInactivityTimer(sessionId);
    
    // Retrieve session to get userId for reset
    const session = await storage.getActiveOrzSession(sessionId);
    if (session) {
      this.setupInactivityTimer(sessionId, session.userId);
    }
  }

  async extendSession(sessionId: string, minutes: number): Promise<void> {
    const session = await storage.getActiveOrzSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const newEndTime = new Date(session.plannedEndTime.getTime() + minutes * 60 * 1000);
    await storage.updateOrzSession(sessionId, { plannedEndTime: newEndTime });
  }

  async endSession(sessionId: string): Promise<void> {
    await storage.endOrzSession(sessionId);
    this.clearInactivityTimer(sessionId);
  }

  private setupInactivityTimer(sessionId: string, userId: string | null): void {
    const timer = setTimeout(async () => {
      await this.endSession(sessionId);
      await storage.createSystemAlert({
        id: crypto.randomUUID(),
        createdAt: new Date(),
        userId: userId ?? null,
        type: 'system',
        severity: 'medium',
        title: 'Session Auto-Logout',
        message: `Session ${sessionId} was automatically logged out due to inactivity`,
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
