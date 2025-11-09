import type { FacilityBooking, TimeExtensionRequest, User } from "@shared/schema";

/**
 * No-op email service used during Next.js migration. It mirrors the API of the
 * legacy nodemailer implementation but simply logs structured output so the
 * behaviour can be verified without SMTP credentials.
 */
class EmailService {
  private serialise(value: unknown): string {
    try {
      if (value === null || value === undefined) return String(value);
      if (typeof value === "string") return value;
      if (typeof value === "number" || typeof value === "boolean") return String(value);
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  async sendBookingConfirmation(booking: FacilityBooking, user: User, facilityName: string): Promise<void> {
    const destination = user?.email || "no-email";
    console.info("[emailService][noop] sendBookingConfirmation", {
      to: destination,
      userId: user?.id ?? null,
      facilityName: this.serialise(facilityName),
      bookingId: (booking as any)?.id ?? null,
      startTime: (booking as any)?.startTime ?? null,
      endTime: (booking as any)?.endTime ?? null,
    });
  }

  async sendBookingStatusUpdate(booking: FacilityBooking, user: User, facilityName: string): Promise<void> {
    const destination = user?.email || "no-email";
    console.info("[emailService][noop] sendBookingStatusUpdate", {
      to: destination,
      userId: user?.id ?? null,
      facilityName: this.serialise(facilityName),
      bookingId: (booking as any)?.id ?? null,
      status: (booking as any)?.status ?? null,
    });
  }

  async sendTimeExtensionResponse(request: TimeExtensionRequest, user: User): Promise<void> {
    const destination = user?.email || "no-email";
    console.info("[emailService][noop] sendTimeExtensionResponse", {
      to: destination,
      userId: user?.id ?? null,
      requestId: (request as any)?.id ?? null,
      status: (request as any)?.status ?? null,
      requestedMinutes: (request as any)?.requestedMinutes ?? null,
    });
  }

  async sendSecurityAlert(user: User, alertType: string, details: string): Promise<void> {
    const destination = user?.email || "no-email";
    console.info("[emailService][noop] sendSecurityAlert", {
      to: destination,
      userId: user?.id ?? null,
      alertType: this.serialise(alertType),
      details: this.serialise(details),
      timestamp: new Date().toISOString(),
    });
  }
}

export const emailService = new EmailService();
