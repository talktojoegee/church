import Link from 'next/link';
import { fetchPublicTestimonies } from '@/lib/site-api';
import { PageHero } from '@/components/public/PageHero';
import { TestimonyGrid } from '@/components/public/TestimonyGrid';

export default async function TestimoniesPage() {
  const testimonies = (await fetchPublicTestimonies()) ?? [];

  return (
    <>
      <PageHero
        title="Testimonies"
        subtitle="Stories of God's faithfulness in our community"
      />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-brand-50 px-5 py-4">
          <p className="text-sm text-slate-700">
            Has God done something wonderful in your life? Share your testimony with us.
          </p>
          <Link
            href="/stories/submit"
            className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Submit Testimony
          </Link>
        </div>
      </section>
      <TestimonyGrid testimonies={testimonies} />
    </>
  );
}
