import { FacilityBooking, TimeExtensionRequest, User } from '../../shared/schema';

/**
 * emailService (no-op)
 *
 * The original project used nodemailer + SMTP (Gmail) here. The file was removed
 * and the application started failing due to missing imports. This replacement
 * preserves the same exported API but does not attempt to send real emails.
 * Instead it logs structured messages so developers can see what *would* have
 * been sent. This avoids shipping secrets or relying on SMTP configuration.
 */
class EmailService {
  constructor() {}

  private safe(val: any): string {
    try {
      if (val === null || val === undefined) return String(val);
      if (typeof val === 'string') return val;
      if (typeof val === 'number' || typeof val === 'boolean') return String(val);
      return JSON.stringify(val);
    } catch (e) {
      return String(val);
    }
  }

  async sendBookingConfirmation(booking: FacilityBooking, user: User, facilityName: string): Promise<void> {
    const to = user?.email || 'no-email';
    console.info('[emailService][noop] sendBookingConfirmation', {
      to,
      userId: user?.id ?? null,
      facilityName: this.safe(facilityName),
      bookingId: (booking as any)?.id ?? null,
      startTime: (booking as any)?.startTime ?? null,
      endTime: (booking as any)?.endTime ?? null,
    });
    return Promise.resolve();
  }

  async sendBookingStatusUpdate(booking: FacilityBooking, user: User, facilityName: string): Promise<void> {
    const to = user?.email || 'no-email';
    console.info('[emailService][noop] sendBookingStatusUpdate', {
      to,
      userId: user?.id ?? null,
      facilityName: this.safe(facilityName),
      bookingId: (booking as any)?.id ?? null,
      status: (booking as any)?.status ?? null,
    });
    return Promise.resolve();
  }

  async sendTimeExtensionResponse(request: TimeExtensionRequest, user: User): Promise<void> {
    const to = user?.email || 'no-email';
    console.info('[emailService][noop] sendTimeExtensionResponse', {
      to,
      userId: user?.id ?? null,
      requestId: (request as any)?.id ?? null,
      status: (request as any)?.status ?? null,
      requestedMinutes: (request as any)?.requestedMinutes ?? null,
    });
    return Promise.resolve();
  }

  async sendSecurityAlert(user: User, alertType: string, details: string): Promise<void> {
    const to = user?.email || 'no-email';
    console.info('[emailService][noop] sendSecurityAlert', {
      to,
      userId: user?.id ?? null,
      alertType: this.safe(alertType),
      details: this.safe(details),
      time: new Date().toISOString(),
    });
    return Promise.resolve();
  }
}

export const emailService = new EmailService();
