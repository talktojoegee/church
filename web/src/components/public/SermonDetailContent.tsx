import { BookOpen, CalendarDays, MapPin, Mic2, User } from 'lucide-react';
import type { PublicSermon } from '@/lib/site-api';
import { SermonMediaPlayer } from './SermonMediaPlayer';

function formatDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-NG', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

interface SermonDetailContentProps {
  sermon: PublicSermon;
}

export function SermonDetailContent({ sermon }: SermonDetailContentProps) {
  const tags = sermon.tags
    ? sermon.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
          <Mic2 size={13} /> Sermon
        </span>
        {sermon.seriesName && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-brand-900">
            <BookOpen size={13} /> {sermon.seriesName}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
        {sermon.speaker && (
          <span className="flex items-center gap-2">
            <User size={16} className="text-brand-600" />
            {sermon.speaker}
          </span>
        )}
        {sermon.preachedAt && (
          <span className="flex items-center gap-2">
            <CalendarDays size={16} className="text-brand-600" />
            {formatDate(sermon.preachedAt)}
          </span>
        )}
        {sermon.branchName && (
          <span className="flex items-center gap-2">
            <MapPin size={16} className="text-brand-600" />
            {sermon.branchName}
          </span>
        )}
      </div>

      {sermon.scripture && (
        <p className="text-base italic text-brand-800">{sermon.scripture}</p>
      )}

      <SermonMediaPlayer
        title={sermon.title}
        audioUrl={sermon.audioUrl}
        videoUrl={sermon.videoUrl}
      />

      {sermon.summary && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Summary</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {sermon.summary}
          </p>
        </div>
      )}

      {sermon.notes && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-800">Notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-amber-950">
            {sermon.notes}
          </p>
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
