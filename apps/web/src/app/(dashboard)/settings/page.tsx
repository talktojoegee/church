'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ImageIcon,
  Globe,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/layout/PageHeader';
import { ColorStatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { FileUpload } from '@/components/ui/FileUpload';
import { ChurchLogo } from '@/components/layout/ChurchLogo';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'profile', label: 'Church Profile' },
  { id: 'branding', label: 'Branding' },
  { id: 'seo', label: 'SEO & Discovery' },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState('profile');

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    currency: 'NGN',
    locale: 'en-NG',
    timezone: 'Africa/Lagos',
    logoUrl: '',
  });

  const [extras, setExtras] = useState({
    church_tagline: '',
    service_times: '',
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    seo_og_image: '',
    seo_allow_crawl: 'true',
  });

  const profileQuery = useQuery({
    queryKey: ['church-profile'],
    queryFn: async () => (await api.get('/settings/church')).data,
  });

  const settingsQuery = useQuery({
    queryKey: ['church-settings'],
    queryFn: async () => (await api.get('/settings')).data as Record<string, string>,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfile({
        name: profileQuery.data.name ?? '',
        email: profileQuery.data.email ?? '',
        phone: profileQuery.data.phone ?? '',
        address: profileQuery.data.address ?? '',
        currency: profileQuery.data.currency ?? 'NGN',
        locale: profileQuery.data.locale ?? 'en-NG',
        timezone: profileQuery.data.timezone ?? 'Africa/Lagos',
        logoUrl: profileQuery.data.logoUrl ?? '',
      });
    }
  }, [profileQuery.data]);

  useEffect(() => {
    if (settingsQuery.data) {
      setExtras((prev) => ({
        ...prev,
        church_tagline: settingsQuery.data.church_tagline ?? '',
        service_times: settingsQuery.data.service_times ?? '',
        seo_title: settingsQuery.data.seo_title ?? '',
        seo_description: settingsQuery.data.seo_description ?? '',
        seo_keywords: settingsQuery.data.seo_keywords ?? '',
        seo_og_image: settingsQuery.data.seo_og_image ?? '',
        seo_allow_crawl: settingsQuery.data.seo_allow_crawl ?? 'true',
      }));
    }
  }, [settingsQuery.data]);

  const saveProfile = useMutation({
    mutationFn: () => api.patch('/settings/church', profile),
    meta: { successMessage: 'Profile saved', errorMessage: 'Failed to save profile' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['church-profile'] });
      qc.invalidateQueries({ queryKey: ['church-branding'] });
    },
  });

  const saveExtras = useMutation({
    mutationFn: () => api.post('/settings/bulk', extras),
    meta: { successMessage: 'Settings saved', errorMessage: 'Failed to save settings' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['church-settings'] });
      qc.invalidateQueries({ queryKey: ['church-branding'] });
    },
  });

  const canEdit = hasPermission('org.settings.update');
  const crawlEnabled = extras.seo_allow_crawl !== 'false';

  return (
    <div>
      <PageHeader title="Settings" description="Church profile, branding, and SEO preferences." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ColorStatCard
          label="Church"
          value={profile.name || '—'}
          hint="Organization name"
          icon={<Building2 size={22} />}
          color="violet"
          dense
        />
        <ColorStatCard
          label="Branding"
          value={profile.logoUrl ? 'Logo set' : 'No logo'}
          hint={extras.church_tagline || 'Add a tagline'}
          icon={<ImageIcon size={22} />}
          color="emerald"
          dense
        />
        <ColorStatCard
          label="SEO crawling"
          value={crawlEnabled ? 'Enabled' : 'Blocked'}
          hint={crawlEnabled ? 'Search engines allowed' : 'robots.txt blocks all'}
          icon={crawlEnabled ? <Eye size={22} /> : <EyeOff size={22} />}
          color={crawlEnabled ? 'blue' : 'rose'}
          dense
        />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'profile' && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Church profile</h2>
            <p className="text-sm text-slate-500">Organization details used across the system.</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canEdit) saveProfile.mutate();
            }}
            className="space-y-4 p-6"
          >
            <Input
              label="Church name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              disabled={!canEdit}
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                disabled={!canEdit}
              />
              <Input
                label="Phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <Input
              label="Address"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              disabled={!canEdit}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Currency"
                value={profile.currency}
                onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
                disabled={!canEdit}
              >
                <option value="NGN">NGN — Nigerian Naira</option>
                <option value="USD">USD — US Dollar</option>
                <option value="GBP">GBP — British Pound</option>
              </Select>
              <Input
                label="Locale"
                value={profile.locale}
                onChange={(e) => setProfile({ ...profile, locale: e.target.value })}
                disabled={!canEdit}
              />
              <Input
                label="Timezone"
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            {canEdit && (
              <Button type="submit" loading={saveProfile.isPending}>
                <Save size={16} /> Save profile
              </Button>
            )}
          </form>
        </div>
      )}

      {tab === 'branding' && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4">
              <h2 className="font-semibold text-slate-900">Logo & identity</h2>
              <p className="text-sm text-slate-500">Upload a logo — it will scale to fit the sidebar navbar.</p>
            </div>
            <div className="space-y-4 p-6">
              <FileUpload
                label="Church logo"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                value={profile.logoUrl}
                onChange={(url) => setProfile({ ...profile, logoUrl: url })}
                hint="PNG, JPG, WebP or SVG. Recommended: horizontal logo, min 200×60px."
                previewClassName="!h-10 !w-auto !max-w-[160px] !rounded-lg !object-contain"
              />
              <Input
                label="Tagline"
                value={extras.church_tagline}
                onChange={(e) => setExtras({ ...extras, church_tagline: e.target.value })}
                disabled={!canEdit}
                placeholder="e.g. Raising a generation of believers"
              />
              <Input
                label="Service times"
                value={extras.service_times}
                onChange={(e) => setExtras({ ...extras, service_times: e.target.value })}
                disabled={!canEdit}
                placeholder="e.g. Sun 8am & 10am · Wed 6pm"
              />
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    loading={saveProfile.isPending}
                    onClick={() => saveProfile.mutate()}
                  >
                    Save logo
                  </Button>
                  <Button type="button" variant="outline" loading={saveExtras.isPending} onClick={() => saveExtras.mutate()}>
                    Save tagline & times
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
              <div className="border-b border-slate-800 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Navbar preview
              </div>
              <div className="flex h-16 items-center px-4">
                <ChurchLogo
                  name={profile.name}
                  logoUrl={profile.logoUrl}
                  variant="sidebar"
                  showName={!profile.logoUrl}
                />
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-50 via-slate-50 to-slate-100 shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Login page preview
              </div>
              <div className="flex flex-col items-center p-8 text-center">
                <ChurchLogo name={profile.name} logoUrl={profile.logoUrl} variant="login" />
                {extras.church_tagline && (
                  <p className="mt-2 text-sm text-slate-500">{extras.church_tagline}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'seo' && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 to-blue-50 px-6 py-4">
            <h2 className="font-semibold text-slate-900">SEO & search discovery</h2>
            <p className="text-sm text-slate-500">
              Control how your church appears in search engines and social previews.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canEdit) saveExtras.mutate();
            }}
            className="space-y-4 p-6"
          >
            <div
              className={cn(
                'flex items-center justify-between rounded-xl border p-4 transition',
                crawlEnabled ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50',
              )}
            >
              <div>
                <p className="font-medium text-slate-900">Allow search engine crawling</p>
                <p className="text-sm text-slate-500">
                  When disabled, robots.txt blocks all crawlers and a noindex meta tag is applied.
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={crawlEnabled}
                  onClick={() =>
                    setExtras({
                      ...extras,
                      seo_allow_crawl: crawlEnabled ? 'false' : 'true',
                    })
                  }
                  className={cn(
                    'relative h-7 w-12 shrink-0 rounded-full transition',
                    crawlEnabled ? 'bg-emerald-500' : 'bg-slate-300',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition',
                      crawlEnabled ? 'left-5' : 'left-0.5',
                    )}
                  />
                </button>
              )}
            </div>

            <Input
              label="Meta title"
              value={extras.seo_title}
              onChange={(e) => setExtras({ ...extras, seo_title: e.target.value })}
              disabled={!canEdit}
              placeholder={profile.name || 'Church Management System'}
            />
            <p className="-mt-2 text-xs text-slate-400">Browser tab title and search result headline (50–60 chars ideal)</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Meta description</label>
              <textarea
                value={extras.seo_description}
                onChange={(e) => setExtras({ ...extras, seo_description: e.target.value })}
                disabled={!canEdit}
                rows={3}
                placeholder="Brief description for search engines and social sharing…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50"
              />
            </div>
            <Input
              label="Keywords"
              value={extras.seo_keywords}
              onChange={(e) => setExtras({ ...extras, seo_keywords: e.target.value })}
              disabled={!canEdit}
              placeholder="church, worship, Lagos, …"
            />
            <p className="-mt-2 text-xs text-slate-400">Comma-separated keywords</p>
            <FileUpload
              label="Open Graph image"
              accept="image/png,image/jpeg,image/webp"
              value={extras.seo_og_image}
              onChange={(url) => setExtras({ ...extras, seo_og_image: url })}
              hint="Recommended 1200×630px for social link previews"
              previewClassName="!h-20 !w-full !max-w-xs !rounded-lg !object-cover"
            />

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Search preview</p>
              <p className="text-lg text-blue-700">{extras.seo_title || profile.name || 'Church name'}</p>
              <p className="text-sm text-emerald-700">yourchurch.org</p>
              <p className="mt-1 text-sm text-slate-600">
                {extras.seo_description || 'Add a meta description to improve click-through from search results.'}
              </p>
            </div>

            {canEdit && (
              <Button type="submit" loading={saveExtras.isPending}>
                <Globe size={16} /> Save SEO settings
              </Button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
