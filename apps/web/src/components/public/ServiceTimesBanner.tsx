import { Clock, MapPin } from 'lucide-react';

interface ServiceTimesBannerProps {
  serviceTimes?: string;
  address?: string;
  tagline?: string;
}

export function ServiceTimesBanner({ serviceTimes, address, tagline }: ServiceTimesBannerProps) {
  return (
    <section className="bg-gradient-to-r from-gold via-gold-light to-flame-orange py-4 text-brand-900">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
        <p className="text-center text-sm font-bold uppercase tracking-wide sm:text-left">
          {tagline || 'True Worship · True Witness'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-semibold">
          {serviceTimes && (
            <span className="flex items-center gap-1.5">
              <Clock size={16} />
              {serviceTimes}
            </span>
          )}
          {address && (
            <span className="flex items-center gap-1.5">
              <MapPin size={16} />
              {address}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
