import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async send(to: string, subject: string, body: string, html?: string): Promise<void> {
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.logger.log(`[Email stub] To ${to} | ${subject}`);
      return;
    }

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });

    await transporter.sendMail({
      from: process.env.MAIL_FROM ?? 'Church <no-reply@church.local>',
      to,
      subject,
      text: body,
      html: html ?? body.replace(/\n/g, '<br>'),
    });
  }

  isConfigured(): boolean {
    return !!process.env.SMTP_HOST;
  }
}
