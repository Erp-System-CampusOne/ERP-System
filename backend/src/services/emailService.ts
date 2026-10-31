import nodemailer from 'nodemailer';

export interface SendPasswordResetOptions {
  toEmail: string;
  campusId?: string;
  name?: string;
  resetUrl: string;
}

export interface SentEmailRecord {
  toEmail: string;
  campusId?: string;
  name?: string;
  resetUrl: string;
  sentAt: Date;
}

const mockSentEmails: SentEmailRecord[] = [];

/**
 * Custom error thrown when email delivery is not configured on the host.
 */
export class EmailServiceNotConfiguredError extends Error {
  constructor(message = 'Password recovery email delivery is currently not configured.') {
    super(message);
    this.name = 'EmailServiceNotConfiguredError';
  }
}

/**
 * Checks whether outbound email delivery is configured via real SMTP environment variables.
 */
export function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  return Boolean(host && host.trim().length > 0 && user && user.trim().length > 0);
}

/**
 * Checks whether outbound email delivery is configured via SMTP environment variables
 * or active in test/mock mode.
 */
export function isEmailConfigured(): boolean {
  if (isSmtpConfigured()) {
    return true;
  }
  if (process.env.NODE_ENV === 'test' || process.env.MOCK_EMAIL === 'true') {
    return true;
  }
  return false;
}

/**
 * Dispatches a password reset email using the configured SMTP provider or mock sink.
 * Fails safely if email delivery is not configured.
 * Never logs raw tokens or reset links.
 */
export async function sendPasswordResetEmail(options: SendPasswordResetOptions): Promise<{ success: boolean; mode: 'smtp' | 'mock' }> {
  if (!isEmailConfigured()) {
    throw new EmailServiceNotConfiguredError(
      'Password recovery email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to enable outbound mail.'
    );
  }

  // 1. In test or mock mode, record to in-memory sink for automated assertion
  if (process.env.NODE_ENV === 'test' || process.env.MOCK_EMAIL === 'true') {
    mockSentEmails.push({
      toEmail: options.toEmail,
      campusId: options.campusId,
      name: options.name,
      resetUrl: options.resetUrl,
      sentAt: new Date()
    });
    return { success: true, mode: 'mock' };
  }

  // 2. Production / configured SMTP delivery
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const from = process.env.SMTP_FROM || `"CampusOne Support" <${process.env.SMTP_USER}>`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your CampusOne Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #0284c7; padding: 16px; border-radius: 8px; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 24px;">CampusOne ERP</h1>
  </div>
  <div style="padding: 24px 0;">
    <p>Hello${options.name ? ` ${options.name}` : ''},</p>
    <p>A password reset request was received for your CampusOne account${options.campusId ? ` (${options.campusId})` : ''}.</p>
    <p>Please click the button below to set a new password. This link is single-use and will expire in 15 minutes.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${options.resetUrl}" style="background-color: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
    </div>
    <p style="font-size: 13px; color: #666;">If the button does not work, copy and paste this address into your browser:<br>
    <span style="word-break: break-all; color: #0284c7;">${options.resetUrl}</span></p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="font-size: 12px; color: #888;">If you did not request this password reset, please ignore this email or notify your system administrator immediately. No changes have been made to your account.</p>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
CampusOne ERP - Password Reset

Hello${options.name ? ` ${options.name}` : ''},

A password reset request was received for your CampusOne account${options.campusId ? ` (${options.campusId})` : ''}.
Please visit the link below to set a new password. This link is single-use and will expire in 15 minutes:

${options.resetUrl}

If you did not request this reset, please ignore this message.
  `.trim();

  await transporter.sendMail({
    from,
    to: options.toEmail,
    subject: 'CampusOne ERP — Password Reset Instructions',
    text: textContent,
    html: htmlContent,
  });

  return { success: true, mode: 'smtp' };
}

/**
 * Access sent emails recorded in mock mode (strictly for automated test fixtures).
 */
export function getSentEmailsForTesting(): SentEmailRecord[] {
  return [...mockSentEmails];
}

/**
 * Clear mock emails (strictly for test fixture teardown).
 */
export function clearSentEmailsForTesting(): void {
  mockSentEmails.length = 0;
}
