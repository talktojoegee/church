const NETWORK_PREFIXES: Record<string, string[]> = {
  MTN: ['0703', '0706', '0803', '0806', '0810', '0813', '0814', '0816', '0903'],
  Airtel: ['0701', '0708', '0802', '0808', '0812', '0901', '0902', '0907'],
  Glo: ['0705', '0805', '0807', '0811', '0815', '0905'],
  '9Mobile': ['0809', '0817', '0818', '0908', '0909'],
  Other: ['0702', '0704', '0707', '0709', '0819'],
};

export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234')) return `0${digits.slice(3)}`;
  if (digits.startsWith('0')) return digits;
  return null;
}

export function appendCountryCode(number: string): string {
  const trimmed = number.trim();
  if (!trimmed) return '';
  const digit = trimmed[0];
  const length = trimmed.length;
  if (digit === '0') {
    return `234${trimmed.slice(1, length)}`;
  }
  if (digit === '+') {
    return trimmed.slice(1, length);
  }
  if (trimmed.startsWith('234')) return trimmed;
  return `234${trimmed}`;
}

export function detectNetwork(phone: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 4) return 'unknown';
  const prefix = normalized.slice(0, 4);
  for (const [network, prefixes] of Object.entries(NETWORK_PREFIXES)) {
    if (prefixes.includes(prefix)) return network;
  }
  return 'unknown';
}

export function getRetailSmsRate(): number {
  return Number(process.env.RETAIL_SMS_COST ?? 5.95);
}

export function smsPages(message: string): number {
  return Math.max(1, Math.ceil(message.length / 160));
}

export function retailerSmsCost(pages = 1) {
  const unitCost = getRetailSmsRate();
  return { pages, unitCost, totalCost: unitCost * pages };
}

export function parsePhoneList(raw: string): string[] {
  const numbers: string[] = [];
  for (const part of raw.split(/[\s,]+/)) {
    const num = appendCountryCode(part.trim());
    if (num && num.length >= 10 && num.length <= 13) numbers.push(num);
  }
  return [...new Set(numbers)];
}

export function calculatePaystackCharge(amount: number): number {
  const percentageFee = Math.min(amount * 0.015, 2000);
  const flatFee = amount > 2500 ? 100 : 0;
  return Math.round((percentageFee + flatFee) * 100) / 100;
}

export const DEFAULT_SENDER_ID = 'SMS Channel';

export type RecipientDetail = {
  phone: string;
  status: string;
  detail?: string;
};

export function parseRecipientDetails(
  phoneNumbers: string,
  overallStatus: string,
  responseData: unknown,
): RecipientDetail[] {
  const phones = phoneNumbers
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const response = responseData as Record<string, unknown> | null | undefined;

  // Africa's Talking
  const atRecipients = (
    response?.SMSMessageData as { Recipients?: { phoneNumber?: string; number?: string; status?: string; message?: string }[] } | undefined
  )?.Recipients;
  if (atRecipients?.length) {
    const byPhone = new Map<string, { status?: string; message?: string }>();
    for (const r of atRecipients) {
      const key = String(r.phoneNumber ?? r.number ?? '').replace(/\D/g, '');
      if (key) byPhone.set(key, r);
    }
    return phones.map((phone) => {
      const key = phone.replace(/\D/g, '');
      const match = byPhone.get(key) ?? byPhone.get(key.replace(/^234/, '0'));
      return {
        phone,
        status: match?.status ?? overallStatus,
        detail: match?.message,
      };
    });
  }

  // KudiSMS — data array may contain per-recipient info
  const kudiData = (response?.data ?? (response?.raw as { data?: unknown[] } | undefined)?.data) as
    | Record<string, unknown>[]
    | undefined;
  if (Array.isArray(kudiData) && kudiData.length) {
    const byPhone = new Map<string, Record<string, unknown>>();
    for (const item of kudiData) {
      const key = String(item.phone ?? item.msisdn ?? item.recipient ?? item.number ?? '').replace(/\D/g, '');
      if (key) byPhone.set(key, item);
    }
    if (byPhone.size) {
      return phones.map((phone) => {
        const key = phone.replace(/\D/g, '');
        const match = byPhone.get(key);
        const itemStatus = match?.status ?? match?.delivery ?? match?.msg;
        return {
          phone,
          status: itemStatus ? String(itemStatus) : overallStatus,
          detail: match?.message ? String(match.message) : undefined,
        };
      });
    }
  }

  return phones.map((phone) => ({ phone, status: overallStatus }));
}
