import { API_URL } from './api';
import { fetchWithTimeout } from './fetch-with-timeout';

export interface PublicBranding {
  name: string;
  logoUrl?: string | null;
  email?: string;
  phone?: string;
  address?: string;
  currency?: string;
  tagline?: string;
  serviceTimes?: string;
  seo: {
    title: string;
    description: string;
    keywords: string;
    ogImage: string;
    allowCrawl: boolean;
  };
}

export async function fetchPublicBranding(): Promise<PublicBranding | null> {
  const res = await fetchWithTimeout(`${API_URL}/settings/public`, { revalidate: 60 });
  if (!res?.ok) return null;
  return res.json();
}
