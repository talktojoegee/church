import { Injectable, Logger } from '@nestjs/common';

/** Pluggable SMS provider — Termii (Nigeria) or log-only stub. */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async send(to: string, message: string): Promise<void> {
    const provider = (process.env.SMS_PROVIDER ?? '').toLowerCase();
    const apiKey = process.env.SMS_API_KEY;
    const senderId = process.env.SMS_SENDER_ID ?? 'Church';

    if (provider === 'termii' && apiKey) {
      await this.sendTermii(to, message, apiKey, senderId);
      return;
    }

    this.logger.log(`[SMS stub] To ${to}: ${message.slice(0, 100)}${message.length > 100 ? '…' : ''}`);
  }

  private async sendTermii(
    to: string,
    message: string,
    apiKey: string,
    senderId: string,
  ): Promise<void> {
    const phone = to.replace(/^\+/, '').replace(/^0/, '234');
    const res = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        to: phone,
        from: senderId,
        sms: message,
        type: 'plain',
        channel: 'generic',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Termii SMS failed: ${err}`);
    }
  }

  isConfigured(): boolean {
    return process.env.SMS_PROVIDER === 'termii' && !!process.env.SMS_API_KEY;
  }
}
