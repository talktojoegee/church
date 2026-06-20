import { fetchPublicOutreaches } from '@/lib/site-api';
import { OutreachesPageClient } from '@/components/public/OutreachesPageClient';

export default async function OutreachesPage() {
  const outreaches = (await fetchPublicOutreaches()) ?? [];
  return <OutreachesPageClient outreaches={outreaches} />;
}
