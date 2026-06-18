import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchPublicSermon } from '@/lib/site-api';
import { PageHero } from '@/components/public/PageHero';
import { SermonDetailContent } from '@/components/public/SermonDetailContent';

export default async function SermonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sermon = await fetchPublicSermon(id);
  if (!sermon) notFound();

  return (
    <>
      <PageHero title={sermon.title} subtitle={sermon.speaker ?? 'Sermon message'} />
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <SermonDetailContent sermon={sermon} />
        <Link
          href="/messages"
          className="mt-10 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          ← All sermons
        </Link>
      </section>
    </>
  );
}
