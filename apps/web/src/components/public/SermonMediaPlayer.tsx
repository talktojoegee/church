import { Download, Headphones, Video } from 'lucide-react';
import { assetUrl } from '@/lib/api';

function mediaFilename(url: string): string {
  const path = url.split('?')[0];
  const name = path.split('/').pop();
  return name ? decodeURIComponent(name) : 'sermon-media';
}

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

interface SermonMediaPlayerProps {
  title: string;
  audioUrl?: string | null;
  videoUrl?: string | null;
}

export function SermonMediaPlayer({ title, audioUrl, videoUrl }: SermonMediaPlayerProps) {
  if (!audioUrl && !videoUrl) return null;

  const audioSrc = audioUrl ? assetUrl(audioUrl) : null;
  const videoSrc = videoUrl ? assetUrl(videoUrl) : null;
  const youtubeEmbed = videoUrl ? youtubeEmbedUrl(videoUrl) : null;

  return (
    <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-slate-50 p-6">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
        <Headphones size={14} /> Listen or watch
      </p>

      {audioSrc && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-slate-700">Audio</p>
          <audio controls className="w-full" src={audioSrc} preload="metadata">
            Your browser does not support audio playback.
          </audio>
          <a
            href={audioSrc}
            download={mediaFilename(audioUrl!)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            <Download size={16} /> Download audio
          </a>
        </div>
      )}

      {videoUrl && (
        <div className={audioSrc ? 'mt-8' : 'mt-5'}>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
            <Video size={16} /> Video
          </p>
          {youtubeEmbed ? (
            <div className="aspect-video overflow-hidden rounded-xl border border-slate-200 bg-black shadow-sm">
              <iframe
                title={`${title} video`}
                src={youtubeEmbed}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : videoSrc ? (
            <video
              controls
              className="w-full rounded-xl border border-slate-200 bg-black shadow-sm"
              src={videoSrc}
              preload="metadata"
            >
              Your browser does not support video playback.
            </video>
          ) : (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Watch video
            </a>
          )}
        </div>
      )}
    </div>
  );
}
