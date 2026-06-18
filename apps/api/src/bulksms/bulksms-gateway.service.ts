import { Injectable, Logger } from '@nestjs/common';
import { appendCountryCode } from './sms-helper';

@Injectable()
export class BulkSmsGatewayService {
  private readonly logger = new Logger(BulkSmsGatewayService.name);

  async sendBulk(
    senderId: string,
    phoneNumbers: string[],
    message: string,
  ): Promise<{ success: boolean; gateway: string; response: unknown }> {
    const gateway = (process.env.SMS_DEFAULT_GATEWAY ?? 'kudisms').toLowerCase();

    if (gateway === 'kudisms' && process.env.KUDI_SMS_API_KEY) {
      const response = await this.sendViaKudi(senderId, phoneNumbers, message);
      return { success: response.success, gateway: 'kudisms', response };
    }

    if (gateway === 'termii' && process.env.SMS_API_KEY) {
      const response = await this.sendViaTermii(senderId, phoneNumbers, message);
      return { success: response.success, gateway: 'termii', response };
    }

    this.logger.log(
      `[Bulk SMS stub] Sender ${senderId} → ${phoneNumbers.length} recipients: ${message.slice(0, 80)}…`,
    );
    return {
      success: true,
      gateway: 'stub',
      response: { message: 'SMS logged (no gateway configured)' },
    };
  }

  async submitSenderIdToKudi(senderId: string, purpose: string) {
    const token = process.env.KUDI_SMS_API_KEY;
    if (!token) return { success: false, message: 'KudiSMS not configured' };

    try {
      const form = new FormData();
      form.append('token', token);
      form.append('senderID', senderId);
      form.append('message', purpose);

      const res = await fetch('https://my.kudisms.net/api/senderID', {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(30_000),
      });
      const body = (await res.json()) as { status?: string; msg?: string; error_code?: string };
      return {
        success: body.status === 'success',
        message: body.msg ?? 'No response',
        raw: body,
      };
    } catch (err) {
      this.logger.warn(
        `KudiSMS sender ID submit failed for ${senderId}: ${err instanceof Error ? err.message : err}`,
      );
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Could not reach KudiSMS',
      };
    }
  }

  async refreshSenderIdStatus(senderId: string) {
    const token = process.env.KUDI_SMS_API_KEY;
    if (!token) return { approved: false, message: 'KudiSMS not configured' };

    try {
      const url = `https://my.kudisms.net/api/check_senderID?token=${token}&senderID=${encodeURIComponent(senderId)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      const body = (await res.json()) as { msg?: string };
      const msg = body.msg ?? '';
      const approved = msg.toLowerCase().includes('approved');
      return { approved, message: msg };
    } catch (err) {
      this.logger.warn(
        `KudiSMS sender ID refresh failed for ${senderId}: ${err instanceof Error ? err.message : err}`,
      );
      return {
        approved: false,
        message: err instanceof Error ? err.message : 'Could not reach KudiSMS',
      };
    }
  }

  private async sendViaKudi(senderId: string, phoneNumbers: string[], message: string) {
    const token = process.env.KUDI_SMS_API_KEY;
    const baseUrl = process.env.KUDI_BASE_URL ?? 'https://my.kudisms.net/api/sms';
    const recipients = phoneNumbers.map((n) => appendCountryCode(n)).join(',');

    const params = new URLSearchParams({
      token: token!,
      senderID: senderId,
      recipients,
      message,
      gateway: '2',
    });

    try {
      const res = await fetch(`${baseUrl}?${params.toString()}`);
      const result = (await res.json()) as {
        status?: string;
        msg?: string;
        cost?: number;
        balance?: number;
        data?: unknown;
      };
      return {
        success: result.status === 'success',
        message: result.msg ?? null,
        cost: result.cost ?? null,
        balance: result.balance ?? null,
        data: result.data ?? [],
        raw: result,
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'KudiSMS request failed',
      };
    }
  }

  private async sendViaTermii(senderId: string, phoneNumbers: string[], message: string) {
    const apiKey = process.env.SMS_API_KEY!;
    const to = phoneNumbers.map((n) => appendCountryCode(n).replace(/^234/, '234'));

    try {
      const res = await fetch('https://api.ng.termii.com/api/sms/send/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          to,
          from: senderId,
          sms: message,
          type: 'plain',
          channel: 'generic',
        }),
      });
      const body = await res.json();
      return { success: res.ok, raw: body };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Termii request failed',
      };
    }
  }
}
