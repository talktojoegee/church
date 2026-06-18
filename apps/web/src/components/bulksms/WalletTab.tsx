'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranchQueryContext } from '@/lib/hooks';
import { Card, CardBody, CardHeader, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, SerialTh, SerialTd } from '@/components/ui/Table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { SMS_QUICK_AMOUNTS, calculatePaystackCharge, emailForPaystack, isPaystackValidEmail, loadPaystackScript } from '@/lib/sms-utils';

export function BulkSmsWalletTab() {
  const qc = useQueryClient();
  const { branchId, params, queryEnabled } = useBranchQueryContext();
  const { user, hasPermission } = useAuth();
  const [amount, setAmount] = useState<number | ''>('');
  const [payEmail, setPayEmail] = useState('');
  const [pendingPayment, setPendingPayment] = useState<{ reference: string; amount: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    setPayEmail(isPaystackValidEmail(user.email) ? user.email : '');
  }, [user]);

  const walletQuery = useQuery({
    queryKey: ['bulksms-wallet', branchId],
    queryFn: async () => (await api.get('/bulksms/wallet', { params })).data,
    enabled: queryEnabled,
  });

  const txsQuery = useQuery({
    queryKey: ['bulksms-wallet-txs', branchId],
    queryFn: async () => (await api.get('/bulksms/wallet/transactions', { params })).data,
    enabled: queryEnabled,
  });

  const verifyMutation = useMutation({
    mutationFn: (payload: { reference: string; amount: number }) =>
      api.post('/bulksms/wallet/verify', {
        ...payload,
        ...(branchId ? { branchId } : {}),
      }),
    meta: { successMessage: 'Wallet credited successfully', errorMessage: 'Payment verification failed' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bulksms-wallet'] });
      qc.invalidateQueries({ queryKey: ['bulksms-wallet-txs'] });
      setAmount('');
      setPendingPayment(null);
    },
    onError: (_err, variables) => {
      setPendingPayment(variables);
    },
  });

  const wallet = walletQuery.data;
  const txs = txsQuery.data?.items ?? [];
  const numericAmount = typeof amount === 'number' ? amount : 0;
  const paystackFee = numericAmount >= 100 ? calculatePaystackCharge(numericAmount) : 0;
  const totalCharge = numericAmount >= 100 ? Math.round((numericAmount + paystackFee) * 100) / 100 : 0;

  const payWithPaystack = async () => {
    if (!wallet?.paystackPublicKey || numericAmount < 100) return;
    const checkoutEmail = payEmail.trim() || emailForPaystack(user?.email, user?.id);
    if (!isPaystackValidEmail(checkoutEmail)) {
      return;
    }
    await loadPaystackScript();
    const ref = `SMS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    window.PaystackPop?.setup({
      key: wallet.paystackPublicKey,
      email: checkoutEmail,
      amount: Math.round(totalCharge * 100),
      ref,
      onClose: () => {},
      callback: (response) => {
        const payload = { reference: response.reference, amount: numericAmount };
        setPendingPayment(payload);
        verifyMutation.mutate(payload);
      },
    }).openIframe();
  };

  useEffect(() => {
    if (wallet?.paystackConfigured) {
      loadPaystackScript().catch(() => {});
    }
  }, [wallet?.paystackConfigured]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ColorStatCard
          label="Current Balance"
          value={formatCurrency(wallet?.balance ?? 0)}
          icon={<Wallet size={22} />}
          color="blue"
        />
        <ColorStatCard
          label="Total Credited"
          value={formatCurrency(wallet?.totalCredited ?? 0)}
          icon={<ArrowDownToLine size={22} />}
          color="emerald"
        />
        <ColorStatCard
          label="Total Debited"
          value={formatCurrency(wallet?.totalDebited ?? 0)}
          icon={<ArrowUpFromLine size={22} />}
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {hasPermission('comms.bulksms.wallet') && (
          <Card>
            <CardHeader title="Top Up Wallet" />
            <CardBody className="space-y-4">
              {wallet?.paystackConfigured ? (
                <>
                  <Input
                    label="Payment email"
                    type="email"
                    value={payEmail}
                    onChange={(e) => setPayEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                  {user?.email && !isPaystackValidEmail(user.email) && (
                    <p className="-mt-2 text-xs text-amber-700">
                      Your account email ({user.email}) cannot be used with Paystack. Enter a valid email for this payment.
                    </p>
                  )}
                  <Input
                    label="Amount (₦)"
                    type="number"
                    min={100}
                    step={50}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 5000"
                  />
                  <div className="flex flex-wrap gap-2">
                    {SMS_QUICK_AMOUNTS.map((a) => (
                      <Button key={a} type="button" variant="outline" size="sm" onClick={() => setAmount(a)}>
                        {formatCurrency(a)}
                      </Button>
                    ))}
                  </div>
                  {numericAmount >= 100 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Top-up amount</span>
                        <span>{formatCurrency(numericAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Paystack charge</span>
                        <span className="text-rose-600">+{formatCurrency(paystackFee)}</span>
                      </div>
                      <hr className="my-2 border-slate-200" />
                      <div className="flex justify-between font-semibold">
                        <span>Total to pay</span>
                        <span className="text-brand-700">{formatCurrency(totalCharge)}</span>
                      </div>
                    </div>
                  )}
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={numericAmount < 100 || !isPaystackValidEmail(payEmail.trim())}
                    loading={verifyMutation.isPending}
                    onClick={payWithPaystack}
                  >
                    <CreditCard size={16} /> Pay with Paystack
                  </Button>
                  {pendingPayment && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <p className="font-medium">Payment completed but wallet not credited yet?</p>
                      <p className="mt-1 text-xs text-amber-800">
                        Reference: <span className="font-mono">{pendingPayment.reference}</span>
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        loading={verifyMutation.isPending}
                        onClick={() => verifyMutation.mutate(pendingPayment)}
                      >
                        Retry verification
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-sm text-slate-500">
                  Paystack is not configured yet.
                  <br />
                  Add PAYSTACK_PUBLIC_KEY and PAYSTACK_SECRET_KEY to your .env file.
                </div>
              )}
            </CardBody>
          </Card>
        )}

        <Card className={hasPermission('comms.bulksms.wallet') ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <CardHeader title="Transaction History" />
          <CardBody className="p-0">
            <Table>
              <thead>
                <tr>
                  <SerialTh />
                  <Th>Type</Th>
                  <Th>Amount</Th>
                  <Th>Description</Th>
                  <Th>Reference</Th>
                  <Th>Date</Th>
                </tr>
              </thead>
              <tbody>
                {txsQuery.isLoading && <EmptyRow colSpan={6} message="Loading…" />}
                {!txsQuery.isLoading && txs.length === 0 && (
                  <EmptyRow colSpan={6} message="No transactions yet." />
                )}
                {txs.map((t: {
                  id: string;
                  type: string;
                  amount: number;
                  description: string;
                  reference: string | null;
                  createdAt: string;
                }, i: number) => (
                  <tr key={t.id}>
                    <SerialTd index={i} />
                    <Td>
                      <Badge tone={t.type === 'CREDIT' ? 'green' : 'red'}>{t.type}</Badge>
                    </Td>
                    <Td className={t.type === 'CREDIT' ? 'text-emerald-700' : 'text-rose-700'}>
                      {t.type === 'CREDIT' ? '+' : '-'}
                      {formatCurrency(t.amount)}
                    </Td>
                    <Td className="max-w-xs truncate text-slate-500">{t.description}</Td>
                    <Td className="font-mono text-xs text-slate-400">{t.reference ?? '—'}</Td>
                    <Td>{formatDate(t.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
