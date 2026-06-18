import { notFound } from 'next/navigation';
import { fetchPublicOutreach } from '@/lib/site-api';
import { OutreachDetailClient } from '@/components/public/OutreachesPageClient';

export default async function OutreachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const outreach = await fetchPublicOutreach(id);
  if (!outreach) notFound();

  return <OutreachDetailClient outreach={outreach} />;
}
