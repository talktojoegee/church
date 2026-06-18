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
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-brand-700 to-flame px-5 py-5 text-white">
          <p className="text-sm font-medium">
            Has God done something wonderful in your life? Share your testimony with us.
          </p>
          <Link
            href="/stories/submit"
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-brand-900 hover:bg-gold-light"
          >
            Submit Testimony
          </Link>
        </div>
      </section>
      <TestimonyGrid testimonies={testimonies} />
    </>
  );
}
