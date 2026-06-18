'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Trash2,
  Pencil,
  Mic2,
  User,
  BookOpen,
  CalendarDays,
  MapPin,
  FileText,
  Play,
  Video,
  Headphones,
  Tag,
  Download,
  Link2,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import { api, assetUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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

function mediaFilename(url: string): string {
  const path = url.split('?')[0];
  const name = path.split('/').pop();
  return name ? decodeURIComponent(name) : url;
}

function MediaUrlRow({
  label,
  url,
  icon,
  accent,
}: {
  label: string;
  url: string;
  icon: React.ReactNode;
  accent: string;
}) {
  const [copied, setCopied] = useState(false);
  const fullUrl = assetUrl(url);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('rounded-xl border p-4', accent)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
            <p className="mt-0.5 break-all font-mono text-sm">{fullUrl}</p>
            <p className="mt-1 text-xs opacity-60">File: {mediaFilename(url)}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={copyUrl}
            className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 bg-white/60 px-3 py-1.5 text-xs font-medium hover:bg-white/80 dark:bg-white/10"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy URL'}
          </button>
          <a
            href={fullUrl}
            download={mediaFilename(url)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-white dark:bg-white/20 dark:text-white"
          >
            <Download size={14} /> Download
          </a>
          <a
            href={fullUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-white dark:bg-white/20 dark:text-white"
          >
            <Link2 size={14} /> Open
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SermonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();

  const sermonQuery = useQuery({
    queryKey: ['sermon', id],
    queryFn: async () => (await api.get(`/sermons/${id}`)).data,
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/sermons/${id}`),
    meta: { successMessage: 'Sermon deleted', errorMessage: 'Failed to delete sermon' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sermons'] });
      qc.invalidateQueries({ queryKey: ['sermons-stats'] });
      qc.invalidateQueries({ queryKey: ['sermon-series'] });
      qc.invalidateQueries({ queryKey: ['sermon-playlists'] });
      router.push('/sermons');
    },
  });

  if (sermonQuery.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;

  const s = sermonQuery.data;
  if (!s) return <p className="text-sm text-slate-500">Sermon not found.</p>;

  const tags = s.tags
    ? s.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    : [];

  return (
    <div>
      <Link
        href="/sermons"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft size={16} /> Back to sermons
      </Link>

      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-700 p-6 text-white shadow-lg">
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                <Mic2 size={13} /> Sermon
              </span>
              {s.sermonSeries?.name && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                  <BookOpen size={13} /> {s.sermonSeries.name}
                </span>
              )}
              <Badge tone={s.isPublished ? 'green' : 'gray'}>
                {s.isPublished ? 'Published' : 'Draft'}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold">{s.title}</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/85">
              {s.speaker && (
                <span className="flex items-center gap-1.5">
                  <User size={15} /> {s.speaker}
                </span>
              )}
              {s.preachedAt && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={15} /> {formatDate(s.preachedAt)}
                </span>
              )}
              {s.branch?.name && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} /> {s.branch.name}
                </span>
              )}
            </div>
            {s.scripture && (
              <p className="mt-3 text-sm italic text-white/75">{s.scripture}</p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            {hasPermission('content.sermon.update') && (
              <Button
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                onClick={() => router.push(`/sermons?edit=${s.id}`)}
              >
                <Pencil size={16} /> Edit
              </Button>
            )}
            {hasPermission('content.sermon.delete') && (
              <Button
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                onClick={() => {
                  if (confirm('Delete this sermon?')) del.mutate();
                }}
                loading={del.isPending}
              >
                <Trash2 size={16} /> Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoTile
          icon={<User size={18} className="text-indigo-600" />}
          label="Speaker"
          value={s.speaker ?? '—'}
          color="bg-gradient-to-br from-indigo-100 to-violet-50 text-indigo-900 dark:from-indigo-950/50 dark:to-violet-950/30 dark:text-indigo-100"
        />
        <InfoTile
          icon={<BookOpen size={18} className="text-sky-600" />}
          label="Series"
          value={s.sermonSeries?.name ?? '—'}
          color="bg-gradient-to-br from-sky-100 to-blue-50 text-sky-900 dark:from-sky-950/50 dark:to-blue-950/30 dark:text-sky-100"
        />
        <InfoTile
          icon={<FileText size={18} className="text-emerald-600" />}
          label="Scripture"
          value={s.scripture ?? '—'}
          color="bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-900 dark:from-emerald-950/50 dark:to-teal-950/30 dark:text-emerald-100"
        />
        <InfoTile
          icon={<CalendarDays size={18} className="text-amber-600" />}
          label="Preached on"
          value={s.preachedAt ? formatDate(s.preachedAt) : '—'}
          color="bg-gradient-to-br from-amber-100 to-orange-50 text-amber-900 dark:from-amber-950/50 dark:to-orange-950/30 dark:text-amber-100"
        />
      </div>

      {(s.audioUrl || s.videoUrl) && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-sky-50 p-5 dark:border-indigo-900/40 dark:from-indigo-950/30 dark:to-sky-950/20">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-400">
            <Play size={14} /> Media
          </p>

          <div className="mt-4 space-y-3">
            {s.audioUrl && (
              <MediaUrlRow
                label="Audio URL"
                url={s.audioUrl}
                icon={<Headphones size={18} className="text-violet-600" />}
                accent="border-violet-200 bg-violet-50/80 text-violet-950 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-100"
              />
            )}
            {s.videoUrl && (
              <MediaUrlRow
                label="Video URL"
                url={s.videoUrl}
                icon={<Video size={18} className="text-indigo-600" />}
                accent="border-indigo-200 bg-indigo-50/80 text-indigo-950 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-100"
              />
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {s.videoUrl && (
              <a
                href={assetUrl(s.videoUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:shadow-md"
              >
                <Video size={16} /> Watch video
              </a>
            )}
            {s.audioUrl && (
              <a
                href={assetUrl(s.audioUrl)}
                download={mediaFilename(s.audioUrl)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:shadow-md"
              >
                <Download size={16} /> Download audio
              </a>
            )}
          </div>

          {s.videoUrl && (
            <div className="mt-4">
              <video
                controls
                className="w-full max-w-2xl rounded-xl border border-indigo-200 bg-black shadow-sm dark:border-indigo-800"
                src={assetUrl(s.videoUrl)}
              >
                Your browser does not support video playback.
              </video>
            </div>
          )}
          {s.audioUrl && (
            <div className="mt-4">
              <audio controls className="w-full max-w-2xl" src={assetUrl(s.audioUrl)}>
                Your browser does not support audio playback.
              </audio>
            </div>
          )}
        </div>
      )}

      {s.summary && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <FileText size={14} /> Summary
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {s.summary}
          </p>
        </div>
      )}

      {s.notes && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-orange-950/20">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            <FileText size={14} /> Notes
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-amber-950 dark:text-amber-100/90">
            {s.notes}
          </p>
        </div>
      )}

      {tags.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Tag size={14} /> Tags
          </p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag: string) => (
              <Badge key={tag} tone="brand">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
