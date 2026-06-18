export function smsPages(message: string): number {
  return Math.max(1, Math.ceil(message.length / 160));
}

export const DEFAULT_SENDER_ID = 'SMS Channel';

export const SMS_WEEKDAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
] as const;

export const SMS_QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000];

export function calculatePaystackCharge(amount: number): number {
  const percentageFee = Math.min(amount * 0.015, 2000);
  const flatFee = amount > 2500 ? 100 : 0;
  return Math.round((percentageFee + flatFee) * 100) / 100;
}

/** Paystack rejects reserved/invalid TLDs such as .local used in dev seeds. */
export function isPaystackValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(trimmed)) return false;
  const domain = trimmed.split('@')[1]?.toLowerCase() ?? '';
  return !domain.endsWith('.local') && !domain.endsWith('.invalid') && !domain.endsWith('.test');
}

/** Fallback when the signed-in account uses a dev-only email. */
export function emailForPaystack(email: string | undefined, userId?: string): string {
  if (email && isPaystackValidEmail(email)) return email.trim();
  const slug = (userId ?? 'guest').replace(/[^a-z0-9]/gi, '').slice(0, 16) || 'guest';
  return `wallet+${slug}@example.com`;
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        ref: string;
        onClose: () => void;
        callback: (response: { reference: string }) => void;
      }) => { openIframe: () => void };
    };
  }
}

export function loadPaystackScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.PaystackPop) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paystack'));
    document.body.appendChild(script);
  });
}
