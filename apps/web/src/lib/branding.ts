import { API_URL } from './api';

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
  try {
    const res = await fetch(`${API_URL}/settings/public`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
