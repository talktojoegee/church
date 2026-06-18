'use client';

import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  emailForGiving,
  isPaystackValidEmail,
  loadPaystackScript,
  openPaystackCheckout,
} from '@/lib/sms-utils';
import { verifyGivingPayment } from '@/lib/site-api';
import { toast } from '@/lib/toast-context';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000, 50000];

interface GiveOnlineClientProps {
  publicKey: string;
  currency: string;
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency || 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function GiveOnlineClient({ publicKey, currency }: GiveOnlineClientProps) {
  const [donorName, setDonorName] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('5000');
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  const numericAmount = Number(amount);

  useEffect(() => {
    loadPaystackScript()
      .then(() => setScriptReady(true))
      .catch(() => setScriptReady(false));
  }, []);

  const pay = async () => {
    const name = donorName.trim();
    if (!name) {
      toast.error('Please enter your full name');
      return;
    }
    if (numericAmount < 100) {
      toast.error('Minimum giving amount is ₦100');
      return;
    }
    if (email.trim() && !isPaystackValidEmail(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!publicKey?.trim()) {
      toast.error('Paystack is not configured. Contact the church office.');
      return;
    }

    const checkoutEmail = emailForGiving(name, email.trim() || undefined);

    setLoading(true);
    try {
      await loadPaystackScript();
      const ref = `give_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      openPaystackCheckout({
        key: publicKey,
        email: checkoutEmail,
        amount: Math.round(numericAmount * 100),
        ref,
        onClose: () => setLoading(false),
        callback: (response) => {
          verifyGivingPayment({
            reference: response.reference,
            amount: numericAmount,
            donorName: name,
            email: email.trim() || checkoutEmail,
          })
            .then((result) => {
              if (result.receiptNumber) {
                toast.success(
                  `Thank you for your generous giving! Receipt: ${result.receiptNumber}`,
                );
              } else {
                toast.success('Thank you for your generous giving!');
              }
              setDonorName('');
              setEmail('');
              setAmount('5000');
            })
            .catch((err) => {
              toast.error(err instanceof Error ? err.message : 'Could not confirm payment');
            })
            .finally(() => setLoading(false));
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not start payment. Please try again.';
      toast.error(
        message.includes('load') || message.includes('initialize')
          ? 'Could not load Paystack. Check your internet connection and try again.'
          : message,
      );
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <CreditCard className="text-gold" size={22} />
        Give Online
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Give securely with Paystack. Choose an amount, enter your details, and complete payment in
        the popup.
      </p>

      <div className="mt-5 space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Select amount</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(String(value))}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  Number(amount) === value
                    ? 'border-brand-700 bg-brand-700 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'
                }`}
              >
                {formatAmount(value, currency)}
              </button>
            ))}
          </div>
        </div>

        <Input
          label={`Custom amount (${currency})`}
          type="number"
          min={100}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <Input
          label="Full name"
          value={donorName}
          onChange={(e) => setDonorName(e.target.value)}
          placeholder="As you would like it recorded"
          required
        />

        <Input
          label="Email address (optional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="For Paystack receipt"
        />

        <Button onClick={pay} disabled={loading} className="w-full">
          {loading
            ? 'Opening Paystack…'
            : `Give ${formatAmount(numericAmount >= 100 ? numericAmount : 0, currency)} with Paystack`}
        </Button>

        {!scriptReady && !loading && (
          <p className="text-center text-xs text-slate-500">Loading secure payment…</p>
        )}
      </div>
    </div>
  );
}
