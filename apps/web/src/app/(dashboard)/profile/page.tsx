'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Shield,
  Save,
  KeyRound,
  Mail,
  Phone,
  Building2,
  Clock,
} from 'lucide-react';
import { api, assetUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader, ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { FileUpload } from '@/components/ui/FileUpload';
import { formatDate } from '@/lib/utils';

const TABS = [
  { id: 'account', label: 'My account' },
  { id: 'security', label: 'Change password' },
];

function ProfilePageContent() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState(searchParams.get('tab') === 'security' ? 'security' : 'account');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    avatarUrl: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => (await api.get('/auth/me/profile')).data,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setForm({
        firstName: profileQuery.data.firstName ?? '',
        lastName: profileQuery.data.lastName ?? '',
        phone: profileQuery.data.phone ?? '',
        avatarUrl: profileQuery.data.avatarUrl ?? '',
      });
    }
  }, [profileQuery.data]);

  useEffect(() => {
    const avatar = profileQuery.data?.avatarUrl;
    if (avatar && avatar !== user?.avatarUrl) {
      void refreshUser();
    }
  }, [profileQuery.data?.avatarUrl, user?.avatarUrl, refreshUser]);

  useEffect(() => {
    const nextTab = searchParams.get('tab') === 'security' ? 'security' : 'account';
    setTab(nextTab);
  }, [searchParams]);

  const updateMutation = useMutation({
    mutationFn: () => api.patch('/auth/me', form),
    meta: { successMessage: 'Account updated', errorMessage: 'Failed to update account' },
    onSuccess: async () => {
      await refreshUser();
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });

  const saveAvatarMutation = useMutation({
    mutationFn: (avatarUrl: string) =>
      api.patch('/auth/me', {
        firstName: form.firstName || profileQuery.data?.firstName,
        lastName: form.lastName || profileQuery.data?.lastName,
        phone: form.phone || profileQuery.data?.phone,
        avatarUrl,
      }),
    meta: { successMessage: 'Profile photo saved', errorMessage: 'Failed to save profile photo' },
    onSuccess: async () => {
      await refreshUser();
      qc.invalidateQueries({ queryKey: ['my-profile'] });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      api.patch('/auth/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }),
    meta: { successMessage: 'Password changed', errorMessage: 'Failed to change password' },
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
  });

  const p = profileQuery.data;
  const initials = `${form.firstName?.[0] ?? ''}${form.lastName?.[0] ?? ''}`.toUpperCase();
  const passwordMismatch =
    passwordForm.confirmPassword.length > 0 && passwordForm.newPassword !== passwordForm.confirmPassword;

  return (
    <div>
      <PageHeader
        title="My profile"
        description="View and manage your personal account settings."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ColorStatCard
          label="Account"
          value={user?.email ?? '—'}
          hint="Login email"
          icon={<Mail size={22} />}
          color="violet"
        />
        <ColorStatCard
          label="Role"
          value={p?.roles?.[0]?.name ?? user?.roles?.[0] ?? '—'}
          hint={p?.roles?.length > 1 ? `+${p.roles.length - 1} more` : 'Assigned role'}
          icon={<Shield size={22} />}
          color="blue"
        />
        <ColorStatCard
          label="Branch"
          value={p?.branch?.name ?? '—'}
          hint={p?.branch?.code ?? 'Your branch'}
          icon={<Building2 size={22} />}
          color="emerald"
        />
        <ColorStatCard
          label="Last login"
          value={p?.lastLoginAt ? formatDate(p.lastLoginAt, true) : '—'}
          hint={`Member since ${p?.createdAt ? formatDate(p.createdAt) : '—'}`}
          icon={<Clock size={22} />}
          color="amber"
        />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'account' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader title="Profile photo" />
            <CardBody className="flex flex-col items-center gap-4">
              {form.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assetUrl(form.avatarUrl)}
                  alt="Profile"
                  className="h-28 w-28 rounded-full object-cover ring-4 ring-brand-100"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-3xl font-bold text-white ring-4 ring-brand-100">
                  {initials || <User size={36} />}
                </div>
              )}
              <FileUpload
                label="Upload photo"
                accept="image/*"
                value={form.avatarUrl}
                onChange={(url) => {
                  setForm((current) => ({ ...current, avatarUrl: url }));
                  saveAvatarMutation.mutate(url);
                }}
              />
              <p className="text-center text-xs text-slate-500">
                Photo saves automatically after upload.
              </p>
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader title="Account details" description="Update your name and contact information." />
            <CardBody>
              {p?.employee && (
                <div className="mb-4 rounded-xl border border-violet-100 bg-violet-50/60 p-4 text-sm text-violet-900">
                  <p className="font-semibold">Employee record linked</p>
                  <p className="mt-1 text-violet-800">
                    {p.employee.position ?? 'Staff'} · {p.employee.employeeNumber} ·{' '}
                    <Link href={`/hr/employees/${p.employee.id}`} className="font-medium underline">
                      View payroll profile
                    </Link>
                  </p>
                </div>
              )}
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  updateMutation.mutate();
                }}
              >
                <Input label="Email" value={p?.email ?? user?.email ?? ''} disabled />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="First name"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                  <Input
                    label="Last name"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                  />
                </div>
                <Input
                  label="Phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  suffix={<Phone size={16} className="text-slate-400" />}
                />
                <div className="flex justify-end pt-2">
                  <Button type="submit" loading={updateMutation.isPending}>
                    <Save size={16} /> Save changes
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'security' && (
        <Card className="max-w-xl">
          <CardHeader title="Change password" description="Use a strong password with at least 8 characters." />
          <CardBody>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (passwordMismatch) return;
                passwordMutation.mutate();
              }}
            >
              <Input
                label="Current password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
                autoComplete="current-password"
              />
              <Input
                label="New password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <Input
                label="Confirm new password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
                error={passwordMismatch ? 'Passwords do not match' : undefined}
              />
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  loading={passwordMutation.isPending}
                  disabled={passwordMismatch || passwordForm.newPassword.length < 8}
                >
                  <KeyRound size={16} /> Update password
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading profile…</p>}>
      <ProfilePageContent />
    </Suspense>
  );
}
