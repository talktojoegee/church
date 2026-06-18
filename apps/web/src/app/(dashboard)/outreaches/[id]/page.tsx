'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Trash2,
  Megaphone,
  MapPin,
  CalendarDays,
  Users,
  Heart,
  User,
  ImagePlus,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { api, assetUrl, uploadFile } from '@/lib/api';
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

export default function OutreachDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<{
    url: string;
    caption: string | null;
  } | null>(null);

  const outreachQuery = useQuery({
    queryKey: ['outreach', id],
    queryFn: async () => (await api.get(`/outreaches/${id}`)).data,
  });

  const addImage = useMutation({
    mutationFn: (payload: { url: string; caption?: string }) =>
      api.post(`/outreaches/${id}/images`, payload),
    meta: { successMessage: 'Photo added', errorMessage: 'Failed to add photo' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreach', id] });
      qc.invalidateQueries({ queryKey: ['outreaches'] });
    },
  });

  const removeImage = useMutation({
    mutationFn: (imageId: string) => api.delete(`/outreaches/${id}/images/${imageId}`),
    meta: { successMessage: 'Photo removed', errorMessage: 'Failed to remove photo' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outreach', id] }),
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/outreaches/${id}`),
    meta: { successMessage: 'Outreach deleted', errorMessage: 'Failed to delete outreach' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outreaches'] });
      qc.invalidateQueries({ queryKey: ['outreaches-stats'] });
      router.push('/outreaches');
    },
  });

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { url } = await uploadFile(file);
        await addImage.mutateAsync({ url });
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (outreachQuery.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;

  const o = outreachQuery.data;
  if (!o) return <p className="text-sm text-slate-500">Outreach not found.</p>;

  const images: Array<{ id: string; url: string; caption: string | null }> = o.images ?? [];

  return (
    <div>
      <Link
        href="/outreaches"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft size={16} /> Back to outreaches
      </Link>

      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg">
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                <Megaphone size={13} /> Outreach
              </span>
              {o.type?.name && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                  {o.type.name}
                </span>
              )}
              <Badge tone={CONTENT_STATUS_TONES[o.status] ?? 'gray'}>
                {humanize(o.status)}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold">{o.title}</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/85">
              {o.state && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} /> {o.state}
                  {o.location ? ` · ${o.location}` : ''}
                </span>
              )}
              {o.startAt && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={15} /> {formatDate(o.startAt)}
                </span>
              )}
              {o.coordinator && (
                <span className="flex items-center gap-1.5">
                  <User size={15} /> {o.coordinator}
                </span>
              )}
            </div>
          </div>
          {hasPermission('content.outreach.delete') && (
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={() => {
                if (confirm('Delete this outreach?')) del.mutate();
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
          icon={<Users size={18} className="text-emerald-600" />}
          label="People reached"
          value={o.peopleReached ?? 0}
          color="bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-900 dark:from-emerald-950/50 dark:to-teal-950/30 dark:text-emerald-100"
        />
        <InfoTile
          icon={<Heart size={18} className="text-rose-600" />}
          label="Souls won"
          value={o.souls ?? 0}
          color="bg-gradient-to-br from-rose-100 to-pink-50 text-rose-900 dark:from-rose-950/50 dark:to-pink-950/30 dark:text-rose-100"
        />
        <InfoTile
          icon={<MapPin size={18} className="text-sky-600" />}
          label="State"
          value={o.state ?? '—'}
          color="bg-gradient-to-br from-sky-100 to-blue-50 text-sky-900 dark:from-sky-950/50 dark:to-blue-950/30 dark:text-sky-100"
        />
        <InfoTile
          icon={<Megaphone size={18} className="text-violet-600" />}
          label="Type"
          value={o.type?.name ?? '—'}
          color="bg-gradient-to-br from-violet-100 to-purple-50 text-violet-900 dark:from-violet-950/50 dark:to-purple-950/30 dark:text-violet-100"
        />
      </div>

      {o.description && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-teal-950/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Description
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-emerald-950 dark:text-emerald-100/90">
            {o.description}
          </p>
        </div>
      )}

      {o.outcome && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outcome</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
            {o.outcome}
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <ImagePlus size={20} className="text-emerald-600" /> Gallery
            </h2>
            <p className="text-sm text-slate-500">{images.length} photo{images.length === 1 ? '' : 's'}</p>
          </div>
          {hasPermission('content.outreach.update') && (
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleGalleryUpload}
                disabled={uploading}
              />
              <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:shadow-md">
                <ImagePlus size={16} />
                {uploading ? 'Uploading…' : 'Upload photos'}
              </span>
            </label>
          )}
        </div>

        {images.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400 dark:border-slate-700">
            No gallery photos yet. Upload pictures from the outreach.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
              >
                <button
                  type="button"
                  onClick={() => setLightbox({ url: img.url, caption: img.caption })}
                  className="block w-full"
                >
                  <img
                    src={assetUrl(img.url)}
                    alt={img.caption ?? 'Outreach photo'}
                    className="aspect-square w-full object-cover transition group-hover:scale-105"
                  />
                </button>
                {hasPermission('content.outreach.update') && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Remove this photo?')) removeImage.mutate(img.id);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                )}
                {img.caption && (
                  <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs text-white">
                    {img.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <div className="max-h-[90vh] max-w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={assetUrl(lightbox.url)}
              alt={lightbox.caption ?? 'Outreach photo'}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
            {lightbox.caption && (
              <p className="mt-3 text-center text-sm text-white/90">{lightbox.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
