'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useChurchBranding } from '@/lib/hooks';
import { toast } from '@/lib/toast-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChurchLogo } from '@/components/layout/ChurchLogo';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const branding = useChurchBranding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data?.message ?? 'Login failed')
          : 'Login failed';
      const text = Array.isArray(message) ? message[0] : message;
      setError(text);
      toast.error(text);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <ChurchLogo
              name={branding.data?.name}
              logoUrl={branding.data?.logoUrl}
              variant="login"
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">
            {branding.data?.tagline || 'Sign in to your church dashboard'}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          )}
          <Input
            label="Email"
            type="email"
            name="email"
            placeholder="admin@church.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            suffix={
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
                className="rounded p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
          <Button type="submit" className="w-full" loading={submitting}>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          {branding.data?.name || 'Church Management System'}
        </p>
      </div>
    </main>
  );
}
