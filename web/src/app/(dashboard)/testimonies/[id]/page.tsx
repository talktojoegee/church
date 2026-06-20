'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Trash2,
  Check,
  X,
  Star,
  Archive,
  User,
  Tag,
  CalendarDays,
  Heart,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CONTENT_STATUS_TONES, humanize } from '@/lib/constants';
import { formatDate, cn } from '@/lib/utils';

function InfoTile({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color: string;
}) {
  return (
    <div className={cn('rounded-xl p-4 shadow-sm', color)}>
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/60 shadow-sm dark:bg-white/10">
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-lg font-bold leading-snug">{value}</p>
    </div>
  );
}

export default function TestimonyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();

  const testimonyQuery = useQuery({
    queryKey: ['testimony', id],
    queryFn: async () => (await api.get(`/testimonies/${id}`)).data,
  });

  const review = useMutation({
    mutationFn: (status: string) => api.patch(`/testimonies/${id}/review`, { status }),
    meta: { successMessage: 'Testimony updated', errorMessage: 'Failed to update testimony' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['testimony', id] });
      qc.invalidateQueries({ queryKey: ['testimonies'] });
      qc.invalidateQueries({ queryKey: ['testimonies-stats'] });
    },
  });

  const feature = useMutation({
    mutationFn: (isFeatured: boolean) => api.patch(`/testimonies/${id}`, { isFeatured }),
    meta: { successMessage: 'Testimony updated', errorMessage: 'Failed to update testimony' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['testimony', id] });
      qc.invalidateQueries({ queryKey: ['testimonies'] });
      qc.invalidateQueries({ queryKey: ['testimonies-stats'] });
    },
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/testimonies/${id}`),
    meta: { successMessage: 'Testimony deleted', errorMessage: 'Failed to delete testimony' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['testimonies'] });
      qc.invalidateQueries({ queryKey: ['testimonies-stats'] });
      router.push('/testimonies');
    },
  });

  if (testimonyQuery.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;

  const t = testimonyQuery.data;
  if (!t) return <p className="text-sm text-slate-500">Testimony not found.</p>;

  const author = t.member
    ? `${t.member.firstName} ${t.member.lastName}`
    : t.authorName ?? 'Anonymous';

  return (
    <div>
      <Link
        href="/testimonies"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft size={16} /> Back to testimonies
      </Link>

      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 to-amber-600 p-6 text-white shadow-lg">
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                <Heart size={13} /> Testimony
              </span>
              {t.isFeatured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/30 px-2.5 py-0.5 text-xs font-medium">
                  <Star size={12} className="fill-amber-200 text-amber-200" /> Featured
                </span>
              )}
              <Badge tone={CONTENT_STATUS_TONES[t.status] ?? 'gray'}>
                {humanize(t.status)}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/85">
              <span className="flex items-center gap-1.5">
                <User size={15} /> {author}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays size={15} /> {formatDate(t.occurredAt ?? t.createdAt)}
              </span>
              {t.testimonyCategory?.name && (
                <span className="flex items-center gap-1.5">
                  <Tag size={15} /> {t.testimonyCategory.name}
                </span>
              )}
            </div>
          </div>
          {hasPermission('content.testimony.delete') && (
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={() => {
                if (confirm('Delete this testimony?')) del.mutate();
              }}
              loading={del.isPending}
            >
              <Trash2 size={16} /> Delete
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoTile
          icon={<User size={18} className="text-rose-600" />}
          label="Author"
          value={author}
          color="bg-gradient-to-br from-rose-100 to-pink-50 text-rose-900 dark:from-rose-950/50 dark:to-pink-950/30 dark:text-rose-100"
        />
        <InfoTile
          icon={<Tag size={18} className="text-amber-600" />}
          label="Category"
          value={t.testimonyCategory?.name ?? '—'}
          color="bg-gradient-to-br from-amber-100 to-orange-50 text-amber-900 dark:from-amber-950/50 dark:to-orange-950/30 dark:text-amber-100"
        />
        <InfoTile
          icon={<CalendarDays size={18} className="text-violet-600" />}
          label="Submitted"
          value={formatDate(t.createdAt)}
          color="bg-gradient-to-br from-violet-100 to-purple-50 text-violet-900 dark:from-violet-950/50 dark:to-purple-950/30 dark:text-violet-100"
        />
        <InfoTile
          icon={<Star size={18} className="text-emerald-600" />}
          label="Featured"
          value={t.isFeatured ? 'Yes' : 'No'}
          color="bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-900 dark:from-emerald-950/50 dark:to-teal-950/30 dark:text-emerald-100"
        />
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-amber-50 p-6 dark:border-rose-900/40 dark:from-rose-950/30 dark:to-amber-950/20">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">
          <Heart size={14} /> Testimony
        </p>
        <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-rose-950 dark:text-rose-100/90">
          {t.body}
        </p>
      </div>

      {hasPermission('content.testimony.manage') && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Review actions</p>
          <div className="flex flex-wrap gap-2">
            {t.status !== 'APPROVED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => review.mutate('APPROVED')}
                loading={review.isPending}
              >
                <Check size={14} /> Approve
              </Button>
            )}
            {t.status !== 'REJECTED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => review.mutate('REJECTED')}
                loading={review.isPending}
              >
                <X size={14} /> Reject
              </Button>
            )}
            {t.status !== 'ARCHIVED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => review.mutate('ARCHIVED')}
                loading={review.isPending}
              >
                <Archive size={14} /> Archive
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => feature.mutate(!t.isFeatured)}
              loading={feature.isPending}
            >
              <Star size={14} /> {t.isFeatured ? 'Unfeature' : 'Feature'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
