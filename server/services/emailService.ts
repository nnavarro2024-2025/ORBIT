import * as nodemailer from 'nodemailer';

import { FacilityBooking, TimeExtensionRequest, User } from '../../shared/schema';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || '',
      },
    };

    this.transporter = nodemailer.createTransport(config);
  }

  private validateEmail(email: string | null | undefined): string {
    if (!email) {
      throw new Error('Cannot send email: recipient email is missing.');
    }
    return email;
  }

  async sendBookingConfirmation(booking: FacilityBooking, user: User, facilityName: string): Promise<void> {
    const toEmail = this.validateEmail(user.email);

    const mailOptions = {
      from: process.env.SMTP_USER || process.env.EMAIL_USER,
      to: toEmail,
      subject: 'Facility Booking Confirmation - ORBIT System',
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
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendBookingStatusUpdate(booking: FacilityBooking, user: User, facilityName: string): Promise<void> {
    const toEmail = this.validateEmail(user.email);
    const statusColor = booking.status === 'approved' ? '#388E3C' : '#D32F2F';
    const statusText = booking.status === 'approved' ? 'Approved' : 'Declined';

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
              ${booking.adminResponse ? `<li><strong>Admin Response:</strong> ${booking.adminResponse}</li>` : ''}
            </ul>
          </div>

          ${
            booking.status === 'approved'
              ? '<p>Please present your Student ID and this confirmation when using the facility.</p>'
              : '<p>If you have any questions, please contact the library administration.</p>'
          }

          <p>Best regards,<br>ORBIT System Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendTimeExtensionResponse(request: TimeExtensionRequest, user: User): Promise<void> {
    const toEmail = this.validateEmail(user.email);
    const statusColor = request.status === 'approved' ? '#388E3C' : '#D32F2F';
    const statusText = request.status === 'approved' ? 'Approved' : 'Denied';

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
              ${request.adminResponse ? `<li><strong>Admin Response:</strong> ${request.adminResponse}</li>` : ''}
            </ul>
          </div>

          <p>Best regards,<br>ORBIT System Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendSecurityAlert(user: User, alertType: string, details: string): Promise<void> {
    const toEmail = this.validateEmail(user.email);

    const mailOptions = {
      from: process.env.SMTP_USER || process.env.EMAIL_USER,
      to: toEmail,
      subject: 'Security Alert - ORBIT System',
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
              <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>

          <p>If this was not you, please contact the system administrator immediately.</p>

          <p>Best regards,<br>ORBIT System Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}

export const emailService = new EmailService();
