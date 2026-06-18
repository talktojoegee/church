'use client';

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { loadPaystackScript } from '@/lib/sms-utils';
import { toast } from '@/lib/toast-context';

interface GiveOnlineClientProps {
  publicKey: string;
  currency: string;
}

export function GiveOnlineClient({ publicKey, currency }: GiveOnlineClientProps) {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('1000');
  const [loading, setLoading] = useState(false);

  const pay = async () => {
    const value = Number(amount);
    if (!email || value < 100) {
      toast.error('Enter a valid email and amount (min ₦100)');
      return;
    }
    setLoading(true);
    try {
      await loadPaystackScript();
      const ref = `give_${Date.now()}`;
      window.PaystackPop?.setup({
        key: publicKey,
        email,
        amount: Math.round(value * 100),
        currency: currency === 'NGN' ? 'NGN' : 'NGN',
        ref,
        label: 'Church Giving',
        onClose: () => setLoading(false),
        callback: () => {
          toast.success('Thank you for your generous giving!');
          setLoading(false);
        },
      }).openIframe();
    } catch {
      toast.error('Could not start payment. Please try again.');
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
        Give securely with Paystack. You will receive a confirmation email after payment.
      </p>
      <div className="mt-5 space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label={`Amount (${currency})`}
          type="number"
          min={100}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <Button onClick={pay} disabled={loading} className="w-full">
          {loading ? 'Opening Paystack…' : 'Give with Paystack'}
        </Button>
      </div>
    </div>
  );
}
